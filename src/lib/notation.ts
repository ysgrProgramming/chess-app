/**
 * Chess notation utilities for converting moves to Standard Algebraic Notation (SAN).
 */

import type { BoardState, Move, Piece, Square, Color } from "./types";
import { getLegalMoves, applyMove, evaluateGameResult, isKingInCheck } from "./chessEngine";

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
