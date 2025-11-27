/**
 * Interactive chessboard component with drag-and-drop and tap/click support.
 */

import React, { useState, useCallback, useEffect } from "react";

import {
  createInitialBoardState,
  validateMove,
  applyMove,
  getLegalMoves
} from "../lib/chessEngine";
import type { BoardState, Move, Square } from "../lib/types";

/**
 * Unicode chess piece symbols.
 */
const PIECE_SYMBOLS: Record<string, string> = {
  whitePawn: "♙",
  whiteRook: "♜",
  whiteKnight: "♞",
  whiteBishop: "♝",
  whiteQueen: "♛",
  whiteKing: "♚",
  blackPawn: "♟",
  blackRook: "♖",
  blackKnight: "♘",
  blackBishop: "♗",
  blackQueen: "♕",
  blackKing: "♔"
};

/**
 * Gets the Unicode symbol for a piece.
 */
function getPieceSymbol(color: string, type: string): string {
  const key = `${color}${type.charAt(0).toUpperCase() + type.slice(1)}`;
  return PIECE_SYMBOLS[key] || "";
}

/**
 * Converts square coordinates to algebraic notation (e.g., 0,0 -> "a1").
 */
function squareToNotation(file: number, rank: number): Square {
  const fileChar = String.fromCharCode(97 + file);
  const rankNum = 8 - rank;
  return `${fileChar}${rankNum}`;
}

/**
 * ChessBoard component props.
 */
export interface ChessBoardProps {
  /**
   * Current board state. If not provided, uses standard starting position.
   */
  boardState?: BoardState;
  /**
   * Callback invoked when a move is successfully applied.
   */
  onMove?: (move: Move) => void;
}

/**
 * Interactive chessboard component.
 */
export const ChessBoard: React.FC<ChessBoardProps> = ({
  boardState: externalBoardState,
  onMove
}) => {
  const [internalBoardState, setInternalBoardState] = useState<BoardState>(
    externalBoardState || createInitialBoardState()
  );

  // Use external board state if provided, otherwise use internal state
  const boardState = externalBoardState ?? internalBoardState;

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);

  // Reset selection when external board state changes
  useEffect(() => {
    if (externalBoardState) {
      setSelectedSquare(null);
      setDraggedSquare(null);
    }
  }, [externalBoardState]);

  /**
   * Gets legal destination squares for the currently selected or dragged piece.
   */
  const getCurrentLegalMoves = useCallback((): Set<Square> => {
    const activeSquare = selectedSquare || draggedSquare;
    if (!activeSquare) {
      return new Set();
    }
    const legalMoves = getLegalMoves(boardState, activeSquare);
    return new Set(legalMoves);
  }, [boardState, selectedSquare, draggedSquare]);

  /**
   * Attempts to make a move, validating with the rules engine.
   */
  const handleMoveAttempt = useCallback(
    (from: Square, to: Square) => {
      const movingPiece = boardState.squares.get(from);
      if (!movingPiece) {
        return;
      }

      const stateForMove: BoardState =
        externalBoardState != null ? { ...boardState, activeColor: movingPiece.color } : boardState;

      const move: Move = { from, to };
      const validation = validateMove(stateForMove, move);

      if (validation.valid) {
        const newBoardState = applyMove(stateForMove, move);
        // Only update internal state if we're managing it ourselves
        if (!externalBoardState) {
          setInternalBoardState(newBoardState);
        }
        if (onMove) {
          onMove(move);
        }
      }
      // If invalid, the move is simply not applied (visual revert happens automatically)
    },
    [boardState, onMove]
  );

  /**
   * Handles piece selection (for tap/click mode).
   */
  const handleSquareClick = useCallback(
    (square: Square) => {
      if (selectedSquare === null) {
        // First click: select source square
        const piece = boardState.squares.get(square);
        if (piece) {
          setSelectedSquare(square);
        }
      } else if (selectedSquare === square) {
        // Clicking the same square: deselect
        setSelectedSquare(null);
      } else {
        // Check if clicking on another piece of the same color
        const piece = boardState.squares.get(square);
        if (piece) {
          // Select the new piece instead
          setSelectedSquare(square);
        } else {
          // Second click: attempt move
          handleMoveAttempt(selectedSquare, square);
          setSelectedSquare(null);
        }
      }
    },
    [selectedSquare, boardState, handleMoveAttempt]
  );

  /**
   * Handles drag start.
   */
  const handleDragStart = useCallback(
    (square: Square) => {
      const piece = boardState.squares.get(square);
      if (piece) {
        setDraggedSquare(square);
      }
    },
    [boardState]
  );

  /**
   * Handles drag end.
   */
  const handleDragEnd = useCallback(() => {
    setDraggedSquare(null);
  }, []);

  /**
   * Handles drop on a square.
   */
  const handleDrop = useCallback(
    (targetSquare: Square) => {
      if (draggedSquare && draggedSquare !== targetSquare) {
        handleMoveAttempt(draggedSquare, targetSquare);
      }
      setDraggedSquare(null);
    },
    [draggedSquare, handleMoveAttempt]
  );

  /**
   * Prevents default drag behavior.
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  /**
   * Renders a single square.
   */
  const renderSquare = useCallback(
    (file: number, rank: number) => {
      const square = squareToNotation(file, rank);
      const piece = boardState.squares.get(square);
      const isLight = (file + rank) % 2 === 0;
      const isSelected = selectedSquare === square;
      const isDragged = draggedSquare === square;
      const legalMoves = getCurrentLegalMoves();
      const isLegalMove = legalMoves.has(square);
      const hasPiece = !!piece;

      return (
        <div
          key={square}
          role="gridcell"
          aria-label={`square ${square}`}
          className={`chess-square ${isLight ? "light" : "dark"} ${isSelected ? "selected" : ""} ${
            isDragged ? "dragging" : ""
          } ${isLegalMove ? "legal-move" : ""} ${isLegalMove && hasPiece ? "legal-move-capture" : ""}`}
          onClick={() => handleSquareClick(square)}
          draggable={!!piece}
          onDragStart={() => handleDragStart(square)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(square)}
        >
          {piece && (
            <span className="chess-piece" aria-label={`${piece.color} ${piece.type}`}>
              {getPieceSymbol(piece.color, piece.type)}
            </span>
          )}
        </div>
      );
    },
    [
      boardState,
      selectedSquare,
      draggedSquare,
      getCurrentLegalMoves,
      handleSquareClick,
      handleDragStart,
      handleDragEnd,
      handleDrop,
      handleDragOver
    ]
  );

  return (
    <div className="chess-board-container">
      <div className="chess-turn-indicator">
        <span>{boardState.activeColor === "white" ? "White" : "Black"}&apos;s turn</span>
      </div>
      <div className="chess-board" role="grid" aria-label="Chess board">
        {Array.from({ length: 8 }, (_, rank) =>
          Array.from({ length: 8 }, (_, file) => renderSquare(file, rank))
        )}
      </div>
    </div>
  );
};
