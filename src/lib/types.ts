/**
 * Chess domain model type definitions.
 */

/**
 * Color of a chess piece.
 */
export type Color = 'white' | 'black';

/**
 * Type of chess piece.
 */
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

/**
 * Chess square notation (e.g., 'a1', 'e4').
 */
export type Square = string;

/**
 * Represents a chess piece with its color and type.
 */
export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

/**
 * Castling rights for both colors.
 */
export interface CastlingRights {
  readonly whiteKingSide: boolean;
  readonly whiteQueenSide: boolean;
  readonly blackKingSide: boolean;
  readonly blackQueenSide: boolean;
}

/**
 * Represents a chess move.
 */
export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: PieceType;
}

/**
 * Represents the state of the chess board.
 */
export interface BoardState {
  readonly squares: ReadonlyMap<Square, Piece>;
  readonly activeColor: Color;
  readonly castlingRights: CastlingRights;
  readonly enPassantTarget: Square | null;
  readonly halfMoveClock: number;
  readonly fullMoveNumber: number;
}

/**
 * Represents the complete game state.
 */
export interface Game {
  readonly boardState: BoardState;
  readonly moveHistory: readonly Move[];
}

/**
 * Result of move validation.
 */
export type MoveValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

