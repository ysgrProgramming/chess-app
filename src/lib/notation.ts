/**
 * Chess notation utilities for converting moves to Standard Algebraic Notation (SAN).
 */

import type { BoardState, Move, Piece, Square, Color } from "./types";
import {
  getLegalMoves,
  applyMove,
  evaluateGameResult,
  isKingInCheck,
  validateMove,
  createInitialBoardState
} from "./chessEngine";

/**
 * Piece type to SAN symbol mapping.
 */
const PIECE_SYMBOLS: Record<string, string> = {
  king: "K",
  queen: "Q",
  rook: "R",
  bishop: "B",
  knight: "N",
  pawn: ""
};

/**
 * Converts a move to Standard Algebraic Notation (SAN).
 *
 * @param boardState - The current board state before the move.
 * @param move - The move to convert.
 * @returns The move in SAN notation.
 */
export function moveToSAN(boardState: BoardState, move: Move): string {
  const piece = boardState.squares.get(move.from);
  if (!piece) {
    throw new Error(`No piece at source square: ${move.from}`);
  }

  let san: string;

  // Handle castling (simplified - would need more logic for actual castling detection)
  if (piece.type === "king") {
    const fileDelta = move.to.charCodeAt(0) - move.from.charCodeAt(0);
    if (Math.abs(fileDelta) === 2) {
      san = fileDelta > 0 ? "O-O" : "O-O-O";
      const suffix = getCheckOrCheckmateSuffix(boardState, move, piece.color);
      return san + suffix;
    }
  }

  // Handle pawn moves vs other pieces
  san =
    piece.type === "pawn"
      ? formatPawnMove(boardState, move, piece)
      : formatPieceMove(boardState, move, piece);

  const suffix = getCheckOrCheckmateSuffix(boardState, move, piece.color);
  return san + suffix;
}

/**
 * Checks if the opponent king is in check after a move.
 * This is a helper function to determine if we should append '+' to SAN notation.
 */
function isKingInCheckAfterMove(boardState: BoardState, movedColor: Color): boolean {
  const opponentColor: Color = movedColor === "white" ? "black" : "white";
  return isKingInCheck(boardState, opponentColor);
}

/**
 * Computes the suffix for SAN notation indicating check ('+') or checkmate ('#').
 * If the move is not legal according to the engine (e.g., in synthetic test positions),
 * this function will fall back to returning an empty suffix.
 */
function getCheckOrCheckmateSuffix(boardState: BoardState, move: Move, movedColor: Color): string {
  try {
    const newBoardState = applyMove(boardState, move);
    const gameResult = evaluateGameResult(newBoardState);
    if (gameResult.type === "checkmate") {
      return "#";
    }
    if (isKingInCheckAfterMove(newBoardState, movedColor)) {
      return "+";
    }
    return "";
  } catch {
    // If the move is not legal for the given synthetic board state,
    // we still return a best-effort SAN string without check indicators.
    return "";
  }
}

/**
 * Formats a pawn move in SAN notation.
 */
function formatPawnMove(boardState: BoardState, move: Move, piece: Piece): string {
  const destinationPiece = boardState.squares.get(move.to);
  const fileFrom = move.from[0];
  const toRank = parseInt(move.to[1], 10);

  // Check for en passant capture
  const isEnPassant = boardState.enPassantTarget === move.to;

  // Check for regular capture (destination has opponent piece)
  const isRegularCapture = destinationPiece !== undefined && destinationPiece.color !== piece.color;

  // En passant is always a capture
  const isCapture = isEnPassant || isRegularCapture;

  // Check for promotion (pawn reaches 8th rank for white or 1st rank for black)
  const isPromotion =
    (piece.color === "white" && toRank === 8) || (piece.color === "black" && toRank === 1);
  const promotionType = move.promotion || (isPromotion ? "queen" : undefined);

  let san = "";

  if (isCapture) {
    san += `${fileFrom}x${move.to}`;
  } else {
    san += move.to;
  }

  if (promotionType) {
    san += `=${PIECE_SYMBOLS[promotionType]}`;
  }

  return san;
}

/**
 * Formats a piece move in SAN notation.
 */
function formatPieceMove(boardState: BoardState, move: Move, piece: Piece): string {
  const symbol = PIECE_SYMBOLS[piece.type];
  const destinationPiece = boardState.squares.get(move.to);
  const isCapture = destinationPiece !== undefined && destinationPiece.color !== piece.color;
  const disambiguation = getDisambiguation(boardState, move, piece);

  let san = symbol;

  if (disambiguation) {
    san += disambiguation;
  }

  if (isCapture) {
    san += "x";
  }

  san += move.to;

  // Note: Check and checkmate detection would be added here
  // For now, we'll keep it simple

  return san;
}

/**
 * Gets disambiguation string (file, rank, or both) when multiple pieces can move to the same square.
 */
function getDisambiguation(boardState: BoardState, move: Move, piece: Piece): string {
  // Find all pieces of the same type and color that can legally move to the destination
  const candidates: Square[] = [];

  for (const [square, candidatePiece] of boardState.squares.entries()) {
    if (
      candidatePiece.type === piece.type &&
      candidatePiece.color === piece.color &&
      square !== move.from
    ) {
      const legalMoves = getLegalMoves(boardState, square);
      if (legalMoves.includes(move.to)) {
        candidates.push(square);
      }
    }
  }

  // If no other pieces can move to the destination, no disambiguation needed
  if (candidates.length === 0) {
    return "";
  }

  // Check if file disambiguation is sufficient
  const fileFrom = move.from[0];
  const allSameFile = candidates.every((sq) => sq[0] === fileFrom);
  if (allSameFile) {
    return fileFrom;
  }

  // Check if rank disambiguation is sufficient
  const rankFrom = move.from[1];
  const allSameRank = candidates.every((sq) => sq[1] === rankFrom);
  if (allSameRank) {
    return rankFrom;
  }

  // Need both file and rank
  return move.from;
}

/**
 * Parsed kifu result containing moves and metadata.
 */
export interface ParsedKifu {
  readonly moves: readonly Move[];
}

/**
 * Parses kifu text (SAN notation) into moves with optional comments.
 * Supports both plain text format (e.g., "1. e4 e5") and PGN format.
 *
 * @param kifuText - The kifu text to parse (may include PGN headers).
 * @returns Parsed kifu with moves and comments.
 */
export function parseKifuText(kifuText: string): ParsedKifu {
  // Remove PGN headers if present
  const movesSection = kifuText.split("\n\n").pop() || kifuText;
  const cleanedText = movesSection.trim();

  if (!cleanedText) {
    return { moves: [] };
  }

  const moves: Move[] = [];
  let currentBoardState = createInitialBoardState();

  // Tokenize the text: split by move numbers, preserving comments
  // Pattern: "1. e4 {comment} e5 {comment} 2. Nf3 ..."
  const tokens: Array<{ type: "number" | "move" | "comment"; value: string }> = [];
  let currentIndex = 0;

  // Tokenize the text
  while (currentIndex < cleanedText.length) {
    // Match move number: "1.", "2.", etc.
    const numberMatch = cleanedText.slice(currentIndex).match(/^(\d+)\.\s*/);
    if (numberMatch) {
      tokens.push({ type: "number", value: numberMatch[1] });
      currentIndex += numberMatch[0].length;
      continue;
    }

    // Match comment: "{...}"
    const commentMatch = cleanedText.slice(currentIndex).match(/^\{([^}]*)\}\s*/);
    if (commentMatch) {
      tokens.push({ type: "comment", value: commentMatch[1] });
      currentIndex += commentMatch[0].length;
      continue;
    }

    // Match move: SAN notation (e.g., "e4", "Nf3", "O-O")
    const moveMatch = cleanedText.slice(currentIndex).match(/^([^\s{]+)\s*/);
    if (moveMatch) {
      tokens.push({ type: "move", value: moveMatch[1] });
      currentIndex += moveMatch[0].length;
      continue;
    }

    // Skip whitespace
    if (cleanedText[currentIndex].match(/\s/)) {
      currentIndex++;
      continue;
    }

    // Unknown token, skip
    currentIndex++;
  }

  // Parse tokens into moves
  let i = 0;
  while (i < tokens.length) {
    // Expect move number
    if (tokens[i].type !== "number") {
      i++;
      continue;
    }

    i++; // Skip number

    // Parse white move
    if (i >= tokens.length || tokens[i].type !== "move") {
      continue;
    }
    const whiteSAN = tokens[i].value;
    i++;

    // Check for white comment
    let whiteComment: string | undefined;
    if (i < tokens.length && tokens[i].type === "comment") {
      whiteComment = unescapeComment(tokens[i].value);
      i++;
    }

    // Parse white move
    try {
      const whiteMove = parseSANToMove(currentBoardState, whiteSAN);
      if (whiteMove) {
        moves.push(whiteComment ? { ...whiteMove, comment: whiteComment } : whiteMove);
        const whitePiece = currentBoardState.squares.get(whiteMove.from);
        if (whitePiece) {
          const stateForMove: BoardState = {
            ...currentBoardState,
            activeColor: whitePiece.color
          };
          currentBoardState = applyMove(stateForMove, whiteMove);
        }
      }
    } catch {
      // Skip invalid moves
    }

    // Check for black move
    if (i >= tokens.length) {
      continue;
    }

    // If next token is a number, we've moved to the next move pair
    if (tokens[i].type === "number") {
      continue;
    }

    // Parse black move
    if (tokens[i].type !== "move") {
      continue;
    }
    const blackSAN = tokens[i].value;
    i++;

    // Check for black comment
    let blackComment: string | undefined;
    if (i < tokens.length && tokens[i].type === "comment") {
      blackComment = unescapeComment(tokens[i].value);
      i++;
    }

    // Parse black move
    try {
      const blackMove = parseSANToMove(currentBoardState, blackSAN);
      if (blackMove) {
        moves.push(blackComment ? { ...blackMove, comment: blackComment } : blackMove);
        const blackPiece = currentBoardState.squares.get(blackMove.from);
        if (blackPiece) {
          const stateForMove: BoardState = {
            ...currentBoardState,
            activeColor: blackPiece.color
          };
          currentBoardState = applyMove(stateForMove, blackMove);
        }
      }
    } catch {
      // Skip invalid moves
    }
  }

  // Fallback: try to parse without move numbers if regex didn't match
  if (moves.length === 0) {
    const simpleMoves = cleanedText.split(/\s+/).filter((token) => {
      // Filter out move numbers and comments
      return !token.match(/^\d+\.?$/) && !token.match(/^\{.*\}$/);
    });

    currentBoardState = createInitialBoardState();
    for (const san of simpleMoves) {
      try {
        const move = parseSANToMove(currentBoardState, san);
        if (move) {
          moves.push(move);
          currentBoardState = applyMove(currentBoardState, move);
        }
      } catch {
        // Skip invalid moves
      }
    }
  }

  return { moves };
}

/**
 * Unescapes comment text from exported format.
 */
function unescapeComment(comment: string): string {
  return comment
    .replace(/\\n/g, "\n") // Unescape newlines
    .replace(/\\"/g, '"') // Unescape quotes
    .replace(/\\}/g, "}") // Unescape closing braces
    .replace(/\\{/g, "{") // Unescape opening braces
    .replace(/\\\\/g, "\\"); // Unescape backslashes (must be last)
}

/**
 * Parses a SAN move string into a Move object.
 * This is a simplified parser - a full implementation would handle all SAN edge cases.
 *
 * @param boardState - Current board state before the move.
 * @param san - SAN notation string (e.g., "e4", "Nf3", "O-O").
 * @returns Move object or null if parsing fails.
 */
function parseSANToMove(boardState: BoardState, san: string): Move | null {
  const trimmed = san.trim();
  if (!trimmed) {
    return null;
  }

  // Handle castling
  if (trimmed === "O-O" || trimmed === "0-0") {
    const kingSquare = boardState.activeColor === "white" ? "e1" : "e8";
    return { from: kingSquare, to: kingSquare[0] === "e" ? "g" + kingSquare[1] : kingSquare };
  }
  if (trimmed === "O-O-O" || trimmed === "0-0-0") {
    const kingSquare = boardState.activeColor === "white" ? "e1" : "e8";
    return { from: kingSquare, to: kingSquare[0] === "e" ? "c" + kingSquare[1] : kingSquare };
  }

  // Remove check/checkmate symbols
  const cleanSAN = trimmed.replace(/[+#]$/, "");

  // Handle promotion
  const promotionMatch = cleanSAN.match(/=([QRNB])$/);
  const promotionType = promotionMatch
    ? ({ Q: "queen", R: "rook", N: "knight", B: "bishop" } as Record<string, PieceType>)[
        promotionMatch[1]
      ]
    : undefined;
  const sanWithoutPromotion = cleanSAN.replace(/=[QRNB]$/, "");

  // Handle captures
  const sanWithoutCapture = sanWithoutPromotion.replace("x", "");

  // Extract destination square (last 2 characters)
  const destinationMatch = sanWithoutCapture.match(/([a-h][1-8])$/);
  if (!destinationMatch) {
    return null;
  }
  const to = destinationMatch[1];

  // Determine piece type and source square
  const pieceSymbol = sanWithoutCapture[0];
  const isPieceMove = /[KQRNB]/.test(pieceSymbol);

  if (isPieceMove) {
    // Piece move - need to find source square
    const pieceTypeMap: Record<string, PieceType> = {
      K: "king",
      Q: "queen",
      R: "rook",
      N: "knight",
      B: "bishop"
    };
    const pieceType = pieceTypeMap[pieceSymbol];
    if (!pieceType) {
      return null;
    }

    // Find the piece that can move to the destination
    for (const [square, piece] of boardState.squares.entries()) {
      if (piece.type === pieceType && piece.color === boardState.activeColor) {
        const legalMoves = getLegalMoves(boardState, square);
        if (legalMoves.includes(to)) {
          return { from: square, to, promotion: promotionType };
        }
      }
    }
  } else {
    // Pawn move
    const file = sanWithoutCapture[0];
    const fromFile = file.match(/[a-h]/) ? file : to[0];
    const rank = boardState.activeColor === "white" ? to[1] === "8" ? "7" : "6" : to[1] === "1" ? "2" : "3";
    const from = fromFile + rank;

    // Verify the pawn exists at the source
    const piece = boardState.squares.get(from);
    if (piece?.type === "pawn" && piece.color === boardState.activeColor) {
      return { from, to, promotion: promotionType };
    }

    // Try alternative source squares for pawn moves
    for (let r = 1; r <= 8; r++) {
      const testFrom = fromFile + r;
      const testPiece = boardState.squares.get(testFrom);
      if (testPiece?.type === "pawn" && testPiece.color === boardState.activeColor) {
        const testMove: Move = { from: testFrom, to, promotion: promotionType };
        const validation = validateMove(boardState, testMove);
        if (validation.valid) {
          return testMove;
        }
      }
    }
  }

  return null;
}
