/**
 * Chess rules engine implementation.
 */

import {
  type BoardState,
  type Move,
  type MoveValidationResult,
  type Color,
  type Piece,
  type CastlingRights,
  type Square,
  type GameResult
} from "./types";

/**
 * Creates the initial chess board state.
 */
export function createInitialBoardState(): BoardState {
  const squares = new Map<string, Piece>();

  // Place white pieces
  squares.set("a1", { color: "white", type: "rook" });
  squares.set("b1", { color: "white", type: "knight" });
  squares.set("c1", { color: "white", type: "bishop" });
  squares.set("d1", { color: "white", type: "queen" });
  squares.set("e1", { color: "white", type: "king" });
  squares.set("f1", { color: "white", type: "bishop" });
  squares.set("g1", { color: "white", type: "knight" });
  squares.set("h1", { color: "white", type: "rook" });

  for (let file = 0; file < 8; file++) {
    const square = String.fromCharCode(97 + file) + "2";
    squares.set(square, { color: "white", type: "pawn" });
  }

  // Place black pieces
  squares.set("a8", { color: "black", type: "rook" });
  squares.set("b8", { color: "black", type: "knight" });
  squares.set("c8", { color: "black", type: "bishop" });
  squares.set("d8", { color: "black", type: "queen" });
  squares.set("e8", { color: "black", type: "king" });
  squares.set("f8", { color: "black", type: "bishop" });
  squares.set("g8", { color: "black", type: "knight" });
  squares.set("h8", { color: "black", type: "rook" });

  for (let file = 0; file < 8; file++) {
    const square = String.fromCharCode(97 + file) + "7";
    squares.set(square, { color: "black", type: "pawn" });
  }

  const castlingRights: CastlingRights = {
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true
  };

  return {
    squares,
    activeColor: "white",
    castlingRights,
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1
  };
}

/**
 * Validates if a move is legal according to chess rules.
 */
export function validateMove(boardState: BoardState, move: Move): MoveValidationResult {
  // Check if it's the active player's turn
  const piece = boardState.squares.get(move.from);
  if (!piece) {
    return { valid: false, reason: "Cannot move from empty square" };
  }

  if (piece.color !== boardState.activeColor) {
    return {
      valid: false,
      reason: `It is ${boardState.activeColor}'s turn, not ${piece.color}'s`
    };
  }

  // Check if destination square is occupied by own piece
  const destinationPiece = boardState.squares.get(move.to);
  if (destinationPiece && destinationPiece.color === piece.color) {
    return { valid: false, reason: "Cannot move to square occupied by own piece" };
  }

  // Validate piece-specific move rules
  const pieceValidation = validatePieceMove(boardState, move, piece);
  if (!pieceValidation.valid) {
    return pieceValidation;
  }

  // Check if move would put own king in check
  const simulatedState = applyMoveInternal(boardState, move);
  if (isKingInCheck(simulatedState, boardState.activeColor)) {
    return { valid: false, reason: "Move would put own king in check" };
  }

  return { valid: true };
}

/**
 * Validates piece-specific move rules.
 */
function validatePieceMove(boardState: BoardState, move: Move, piece: Piece): MoveValidationResult {
  const fromFile = move.from.charCodeAt(0) - 97;
  const fromRank = parseInt(move.from[1], 10);
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = parseInt(move.to[1], 10);

  const fileDelta = toFile - fromFile;
  const rankDelta = toRank - fromRank;

  switch (piece.type) {
    case "pawn":
      return validatePawnMove(boardState, move, piece, fileDelta, rankDelta);
    case "rook":
      return validateRookMove(boardState, move, fileDelta, rankDelta);
    case "knight":
      return validateKnightMove(fileDelta, rankDelta);
    case "bishop":
      return validateBishopMove(boardState, move, fileDelta, rankDelta);
    case "queen":
      return validateQueenMove(boardState, move, fileDelta, rankDelta);
    case "king":
      return validateKingMove(boardState, move, piece, fileDelta, rankDelta);
    default:
      return { valid: false, reason: "Unknown piece type" };
  }
}

/**
 * Validates pawn move.
 */
function validatePawnMove(
  boardState: BoardState,
  move: Move,
  piece: Piece,
  fileDelta: number,
  rankDelta: number
): MoveValidationResult {
  const direction = piece.color === "white" ? 1 : -1;
  const startRank = piece.color === "white" ? 2 : 7;

  const fromRank = parseInt(move.from[1], 10);

  // Forward move
  if (fileDelta === 0) {
    const destinationPiece = boardState.squares.get(move.to);
    if (destinationPiece) {
      return { valid: false, reason: "Pawn cannot capture forward" };
    }

    // Single square forward
    if (rankDelta === direction) {
      return { valid: true };
    }

    // Double square forward from starting position
    if (fromRank === startRank && rankDelta === 2 * direction) {
      // Check that intermediate square is clear
      const intermediateRank = fromRank + direction;
      const intermediateSquare = move.from[0] + intermediateRank.toString();
      const intermediatePiece = boardState.squares.get(intermediateSquare);
      if (intermediatePiece) {
        return { valid: false, reason: "Path is blocked" };
      }
      return { valid: true };
    }

    return { valid: false, reason: "Invalid pawn move" };
  }

  // Capture move (diagonal)
  if (Math.abs(fileDelta) === 1 && rankDelta === direction) {
    const destinationPiece = boardState.squares.get(move.to);
    if (destinationPiece && destinationPiece.color !== piece.color) {
      return { valid: true };
    }
    // En passant capture check
    if (boardState.enPassantTarget === move.to) {
      // Check if pawn is on correct rank for en passant
      // White pawns on rank 5 can capture en passant, black pawns on rank 4
      const enPassantRank = piece.color === "white" ? 5 : 4;
      if (fromRank === enPassantRank) {
        // Check if there's an opponent pawn on the adjacent square
        const fromFile = move.from.charCodeAt(0);
        const toFile = move.to.charCodeAt(0);
        const adjacentFile = fromFile < toFile ? fromFile + 1 : fromFile - 1;
        const adjacentSquare = String.fromCharCode(adjacentFile) + fromRank.toString();
        const adjacentPiece = boardState.squares.get(adjacentSquare);
        if (adjacentPiece && adjacentPiece.type === "pawn" && adjacentPiece.color !== piece.color) {
          return { valid: true };
        }
      }
    }
    return { valid: false, reason: "Pawn can only capture diagonally" };
  }

  return { valid: false, reason: "Invalid pawn move" };
}

/**
 * Validates rook move.
 */
function validateRookMove(
  boardState: BoardState,
  move: Move,
  fileDelta: number,
  rankDelta: number
): MoveValidationResult {
  // Rook moves horizontally or vertically
  if (fileDelta !== 0 && rankDelta !== 0) {
    return { valid: false, reason: "Rook can only move horizontally or vertically" };
  }

  // Check if path is clear
  if (!isPathClear(boardState, move)) {
    return { valid: false, reason: "Path is blocked" };
  }

  return { valid: true };
}

/**
 * Validates knight move.
 */
function validateKnightMove(fileDelta: number, rankDelta: number): MoveValidationResult {
  const absFileDelta = Math.abs(fileDelta);
  const absRankDelta = Math.abs(rankDelta);

  // Knight moves in L-shape: (2,1) or (1,2)
  if ((absFileDelta === 2 && absRankDelta === 1) || (absFileDelta === 1 && absRankDelta === 2)) {
    return { valid: true };
  }

  return { valid: false, reason: "Invalid knight move" };
}

/**
 * Validates bishop move.
 */
function validateBishopMove(
  boardState: BoardState,
  move: Move,
  fileDelta: number,
  rankDelta: number
): MoveValidationResult {
  // Bishop moves diagonally
  if (Math.abs(fileDelta) !== Math.abs(rankDelta)) {
    return { valid: false, reason: "Bishop can only move diagonally" };
  }

  // Check if path is clear
  if (!isPathClear(boardState, move)) {
    return { valid: false, reason: "Path is blocked" };
  }

  return { valid: true };
}

/**
 * Validates queen move.
 */
function validateQueenMove(
  boardState: BoardState,
  move: Move,
  fileDelta: number,
  rankDelta: number
): MoveValidationResult {
  // Queen moves like rook or bishop
  const isHorizontalOrVertical = fileDelta === 0 || rankDelta === 0;
  const isDiagonal = Math.abs(fileDelta) === Math.abs(rankDelta);

  if (!isHorizontalOrVertical && !isDiagonal) {
    return { valid: false, reason: "Invalid queen move" };
  }

  // Check if path is clear
  if (!isPathClear(boardState, move)) {
    return { valid: false, reason: "Path is blocked" };
  }

  return { valid: true };
}

/**
 * Validates king move, including castling.
 */
function validateKingMove(
  boardState: BoardState,
  move: Move,
  piece: Piece,
  fileDelta: number,
  rankDelta: number
): MoveValidationResult {
  // Check for castling (king moves two squares horizontally)
  if (rankDelta === 0 && Math.abs(fileDelta) === 2) {
    return validateCastling(boardState, move, piece, fileDelta);
  }

  // King moves one square in any direction
  if (Math.abs(fileDelta) > 1 || Math.abs(rankDelta) > 1) {
    return { valid: false, reason: "King can only move one square" };
  }

  return { valid: true };
}

/**
 * Validates castling move.
 */
function validateCastling(
  boardState: BoardState,
  move: Move,
  piece: Piece,
  fileDelta: number
): MoveValidationResult {
  const isKingSide = fileDelta > 0;
  const color = piece.color;
  const kingRank = color === "white" ? 1 : 8;
  const kingSquare = `e${kingRank}`;
  const rookSquare = isKingSide ? `h${kingRank}` : `a${kingRank}`;
  const kingDestination = isKingSide ? `g${kingRank}` : `c${kingRank}`;
  const transitSquare = isKingSide ? `f${kingRank}` : `d${kingRank}`;

  // Check if king is on starting square
  if (move.from !== kingSquare) {
    return { valid: false, reason: "Castling can only be performed from king's starting square" };
  }

  // Check if rook is on starting square
  const rook = boardState.squares.get(rookSquare);
  if (!rook || rook.type !== "rook" || rook.color !== color) {
    return { valid: false, reason: "Castling requires rook on starting square" };
  }

  // Check castling rights
  const castlingRight = isKingSide
    ? color === "white"
      ? boardState.castlingRights.whiteKingSide
      : boardState.castlingRights.blackKingSide
    : color === "white"
      ? boardState.castlingRights.whiteQueenSide
      : boardState.castlingRights.blackQueenSide;

  if (!castlingRight) {
    return { valid: false, reason: "Castling rights have been lost" };
  }

  // Check if path is clear (including destination square - castling cannot capture)
  const pathSquares = isKingSide
    ? [transitSquare, kingDestination]
    : [transitSquare, `b${kingRank}`, kingDestination];
  for (const square of pathSquares) {
    if (boardState.squares.has(square)) {
      return { valid: false, reason: "Path between king and rook is not clear" };
    }
  }

  // Check if king is in check
  if (isKingInCheck(boardState, color)) {
    return { valid: false, reason: "Cannot castle while in check" };
  }

  // Check if transit square is under attack
  const opponentColor: Color = color === "white" ? "black" : "white";
  const transitSquares = new Map(boardState.squares);
  transitSquares.delete(kingSquare);
  transitSquares.set(transitSquare, piece);
  const simulatedTransitState: BoardState = {
    squares: transitSquares,
    activeColor: opponentColor,
    castlingRights: boardState.castlingRights,
    enPassantTarget: boardState.enPassantTarget,
    halfMoveClock: boardState.halfMoveClock,
    fullMoveNumber: boardState.fullMoveNumber
  };

  if (isKingInCheck(simulatedTransitState, color)) {
    return { valid: false, reason: "Cannot castle through attacked square" };
  }

  // Check if destination square is under attack
  const destSquares = new Map(boardState.squares);
  destSquares.delete(kingSquare);
  destSquares.set(kingDestination, piece);
  const simulatedDestState: BoardState = {
    squares: destSquares,
    activeColor: opponentColor,
    castlingRights: boardState.castlingRights,
    enPassantTarget: boardState.enPassantTarget,
    halfMoveClock: boardState.halfMoveClock,
    fullMoveNumber: boardState.fullMoveNumber
  };

  if (isKingInCheck(simulatedDestState, color)) {
    return { valid: false, reason: "Cannot castle to attacked square" };
  }

  return { valid: true };
}

/**
 * Checks if the path between from and to squares is clear.
 */
function isPathClear(boardState: BoardState, move: Move): boolean {
  const fromFile = move.from.charCodeAt(0);
  const fromRank = parseInt(move.from[1], 10);
  const toFile = move.to.charCodeAt(0);
  const toRank = parseInt(move.to[1], 10);

  const fileStep = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
  const rankStep = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;

  let currentFile = fromFile + fileStep;
  let currentRank = fromRank + rankStep;

  while (currentFile !== toFile || currentRank !== toRank) {
    const square = String.fromCharCode(currentFile) + currentRank.toString();
    if (boardState.squares.has(square)) {
      return false;
    }
    currentFile += fileStep;
    currentRank += rankStep;
  }

  return true;
}

/**
 * Checks if the path between from and to squares is clear for attack (excluding the destination square).
 * All pieces on the path block the attack.
 */
function isPathClearForAttack(
  boardState: BoardState,
  fromSquare: Square,
  toSquare: Square
): boolean {
  const fromFile = fromSquare.charCodeAt(0);
  const fromRank = parseInt(fromSquare[1], 10);
  const toFile = toSquare.charCodeAt(0);
  const toRank = parseInt(toSquare[1], 10);

  const fileStep = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
  const rankStep = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;

  let currentFile = fromFile + fileStep;
  let currentRank = fromRank + rankStep;

  // Check path excluding the destination square
  while (currentFile !== toFile || currentRank !== toRank) {
    const square = String.fromCharCode(currentFile) + currentRank.toString();
    if (boardState.squares.has(square)) {
      return false;
    }
    currentFile += fileStep;
    currentRank += rankStep;
  }

  return true;
}

/**
 * Checks if a piece can attack a target square.
 */
function canPieceAttackSquare(
  boardState: BoardState,
  pieceSquare: Square,
  piece: Piece,
  targetSquare: Square
): boolean {
  const fromFile = pieceSquare.charCodeAt(0);
  const fromRank = parseInt(pieceSquare[1], 10);
  const toFile = targetSquare.charCodeAt(0);
  const toRank = parseInt(targetSquare[1], 10);

  const fileDelta = toFile - fromFile;
  const rankDelta = toRank - fromRank;

  switch (piece.type) {
    case "pawn": {
      const direction = piece.color === "white" ? 1 : -1;
      // Pawn attacks diagonally
      return Math.abs(fileDelta) === 1 && rankDelta === direction;
    }
    case "rook": {
      const isHorizontalOrVertical = fileDelta === 0 || rankDelta === 0;
      return isHorizontalOrVertical && isPathClearForAttack(boardState, pieceSquare, targetSquare);
    }
    case "knight": {
      const absFileDelta = Math.abs(fileDelta);
      const absRankDelta = Math.abs(rankDelta);
      return (
        (absFileDelta === 2 && absRankDelta === 1) || (absFileDelta === 1 && absRankDelta === 2)
      );
    }
    case "bishop": {
      const isDiagonal = Math.abs(fileDelta) === Math.abs(rankDelta);
      return isDiagonal && isPathClearForAttack(boardState, pieceSquare, targetSquare);
    }
    case "queen": {
      const isHorizontalOrVertical = fileDelta === 0 || rankDelta === 0;
      const isDiagonal = Math.abs(fileDelta) === Math.abs(rankDelta);
      return (
        (isHorizontalOrVertical || isDiagonal) &&
        isPathClearForAttack(boardState, pieceSquare, targetSquare)
      );
    }
    case "king": {
      return Math.abs(fileDelta) <= 1 && Math.abs(rankDelta) <= 1;
    }
    default:
      return false;
  }
}

/**
 * Checks if the king of the given color is in check.
 */
export function isKingInCheck(boardState: BoardState, color: Color): boolean {
  // Find the king
  let kingSquare: string | undefined;
  for (const [square, piece] of boardState.squares.entries()) {
    if (piece.type === "king" && piece.color === color) {
      kingSquare = square;
      break;
    }
  }

  if (!kingSquare) {
    return false;
  }

  // Check if any opponent piece can attack the king
  const opponentColor: Color = color === "white" ? "black" : "white";
  for (const [square, piece] of boardState.squares.entries()) {
    if (piece.color === opponentColor) {
      if (canPieceAttackSquare(boardState, square, piece, kingSquare)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gets all legal destination squares for a piece on the given square.
 * Returns an empty array if the square is empty, contains an opponent piece,
 * or if there are no legal moves.
 */
export function getLegalMoves(boardState: BoardState, fromSquare: Square): Square[] {
  const piece = boardState.squares.get(fromSquare);

  // Return empty array if square is empty
  if (!piece) {
    return [];
  }

  // Return empty array if it's not the active player's piece
  if (piece.color !== boardState.activeColor) {
    return [];
  }

  const legalMoves: Square[] = [];

  // Check all possible destination squares (a1-h8)
  for (let file = 0; file < 8; file++) {
    for (let rank = 1; rank <= 8; rank++) {
      const toSquare = String.fromCharCode(97 + file) + rank.toString();

      // Skip if same square
      if (toSquare === fromSquare) {
        continue;
      }

      // Validate the move
      const move: Move = { from: fromSquare, to: toSquare };
      const validation = validateMove(boardState, move);

      if (validation.valid) {
        legalMoves.push(toSquare);
      }
    }
  }

  return legalMoves;
}

/**
 * Applies a move to the board state.
 * Throws an error if the move is invalid.
 */
export function applyMove(boardState: BoardState, move: Move): BoardState {
  const validation = validateMove(boardState, move);
  if (!validation.valid) {
    throw new Error(`Invalid move: ${validation.reason}`);
  }

  return applyMoveInternal(boardState, move);
}

/**
 * Internal function to apply a move without validation.
 */
function applyMoveInternal(boardState: BoardState, move: Move): BoardState {
  const newSquares = new Map(boardState.squares);
  const piece = boardState.squares.get(move.from);

  if (!piece) {
    throw new Error("Cannot apply move: no piece at source square");
  }

  // Handle castling
  if (piece.type === "king") {
    const fromFile = move.from.charCodeAt(0) - 97;
    const fromRank = parseInt(move.from[1], 10);
    const toFile = move.to.charCodeAt(0) - 97;
    const toRank = parseInt(move.to[1], 10);
    const fileDelta = toFile - fromFile;
    const rankDelta = toRank - fromRank;

    // Check if this is a castling move (king moves two squares horizontally)
    if (rankDelta === 0 && Math.abs(fileDelta) === 2) {
      const isKingSide = fileDelta > 0;
      const rookSquare = isKingSide ? `h${fromRank}` : `a${fromRank}`;
      const rookDestination = isKingSide ? `f${fromRank}` : `d${fromRank}`;
      const rook = newSquares.get(rookSquare);

      if (rook && rook.type === "rook" && rook.color === piece.color) {
        // Move the rook
        newSquares.delete(rookSquare);
        newSquares.set(rookDestination, rook);
      }
    }
  }

  // Handle en passant capture
  let isEnPassantCapture = false;
  if (piece.type === "pawn" && boardState.enPassantTarget === move.to) {
    const fromFile = move.from.charCodeAt(0);
    const fromRank = parseInt(move.from[1], 10);
    const toFile = move.to.charCodeAt(0);
    // Remove the captured pawn from the adjacent square
    const adjacentFile = fromFile < toFile ? fromFile + 1 : fromFile - 1;
    const capturedPawnSquare = String.fromCharCode(adjacentFile) + fromRank.toString();
    newSquares.delete(capturedPawnSquare);
    isEnPassantCapture = true;
  }

  // Move the piece
  newSquares.delete(move.from);
  newSquares.set(move.to, piece);

  // Handle pawn promotion
  const toRank = parseInt(move.to[1], 10);
  if (piece.type === "pawn" && (toRank === 8 || toRank === 1)) {
    const promotedType = move.promotion || "queen";
    newSquares.set(move.to, { ...piece, type: promotedType });
  }

  // Update castling rights if king or rook moves or is captured
  const capturedPiece = boardState.squares.get(move.to);
  const newCastlingRights = updateCastlingRights(
    boardState.castlingRights,
    move,
    piece,
    capturedPiece
  );

  // Update en passant target
  // Set when pawn makes a double-step move (target is the intermediate square), clear otherwise
  let newEnPassantTarget: Square | null = null;
  if (piece.type === "pawn") {
    const fromRank = parseInt(move.from[1], 10);
    const toRank = parseInt(move.to[1], 10);
    const rankDelta = toRank - fromRank;
    if (Math.abs(rankDelta) === 2) {
      // Set en passant target to the intermediate square
      const intermediateRank = fromRank + rankDelta / 2;
      newEnPassantTarget = move.to[0] + intermediateRank.toString();
    }
  }

  // Update half move clock (increments for non-pawn moves and non-captures)
  // Reset for pawn moves or captures (including en passant)
  const destinationPiece = boardState.squares.get(move.to);
  const newHalfMoveClock =
    piece.type === "pawn" || destinationPiece || isEnPassantCapture
      ? 0
      : boardState.halfMoveClock + 1;

  // Update full move number (increments when black moves)
  const newFullMoveNumber =
    boardState.activeColor === "black" ? boardState.fullMoveNumber + 1 : boardState.fullMoveNumber;

  // Switch active color
  const newActiveColor: Color = boardState.activeColor === "white" ? "black" : "white";

  return {
    squares: newSquares,
    activeColor: newActiveColor,
    castlingRights: newCastlingRights,
    enPassantTarget: newEnPassantTarget,
    halfMoveClock: newHalfMoveClock,
    fullMoveNumber: newFullMoveNumber
  };
}

/**
 * Updates castling rights based on the move.
 */
function updateCastlingRights(
  currentRights: CastlingRights,
  move: Move,
  piece: Piece,
  capturedPiece?: Piece
): CastlingRights {
  const newRights = { ...currentRights };

  // If king moves, lose all castling rights for that color
  if (piece.type === "king") {
    if (piece.color === "white") {
      newRights.whiteKingSide = false;
      newRights.whiteQueenSide = false;
    } else {
      newRights.blackKingSide = false;
      newRights.blackQueenSide = false;
    }
  }

  // If rook moves, lose castling rights for that side
  if (piece.type === "rook") {
    if (move.from === "a1") {
      newRights.whiteQueenSide = false;
    } else if (move.from === "h1") {
      newRights.whiteKingSide = false;
    } else if (move.from === "a8") {
      newRights.blackQueenSide = false;
    } else if (move.from === "h8") {
      newRights.blackKingSide = false;
    }
  }

  // If rook is captured, lose castling rights for that side
  if (capturedPiece && capturedPiece.type === "rook") {
    if (move.to === "a1") {
      newRights.whiteQueenSide = false;
    } else if (move.to === "h1") {
      newRights.whiteKingSide = false;
    } else if (move.to === "a8") {
      newRights.blackQueenSide = false;
    } else if (move.to === "h8") {
      newRights.blackKingSide = false;
    }
  }

  return newRights;
}

/**
 * Evaluates the game result (checkmate, stalemate, or ongoing).
 *
 * @param boardState - The current board state.
 * @returns The game result.
 */
export function evaluateGameResult(boardState: BoardState): GameResult {
  const activeColor = boardState.activeColor;
  const inCheck = isKingInCheck(boardState, activeColor);

  // Get all legal moves for the active player
  const allLegalMoves: Square[] = [];
  for (const [square, piece] of boardState.squares.entries()) {
    if (piece.color === activeColor) {
      const legalMoves = getLegalMoves(boardState, square);
      allLegalMoves.push(...legalMoves);
    }
  }

  // If no legal moves available
  if (allLegalMoves.length === 0) {
    if (inCheck) {
      // Checkmate: opponent wins
      const winner: Color = activeColor === "white" ? "black" : "white";
      return { type: "checkmate", winner };
    } else {
      // Stalemate: draw
      return { type: "stalemate" };
    }
  }

  // Game is ongoing
  return { type: "ongoing" };
}
