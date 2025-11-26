/**
 * Chess notation utilities for converting moves to Standard Algebraic Notation (SAN).
 */

import type { BoardState, Move, Piece, Square } from "./types";
import { getLegalMoves } from "./chessEngine";

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

  // Handle castling (simplified - would need more logic for actual castling detection)
  if (piece.type === "king") {
    const fileDelta = move.to.charCodeAt(0) - move.from.charCodeAt(0);
    if (Math.abs(fileDelta) === 2) {
      return fileDelta > 0 ? "O-O" : "O-O-O";
    }
  }

  // Handle pawn moves
  if (piece.type === "pawn") {
    return formatPawnMove(boardState, move, piece);
  }

  // Handle piece moves
  return formatPieceMove(boardState, move, piece);
}

/**
 * Formats a pawn move in SAN notation.
 */
function formatPawnMove(boardState: BoardState, move: Move, piece: Piece): string {
  const destinationPiece = boardState.squares.get(move.to);
  const isCapture = destinationPiece !== undefined && destinationPiece.color !== piece.color;
  const fileFrom = move.from[0];
  const promotion = move.promotion;

  let san = "";

  if (isCapture) {
    san += `${fileFrom}x${move.to}`;
  } else {
    san += move.to;
  }

  if (promotion) {
    san += `=${PIECE_SYMBOLS[promotion]}`;
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
