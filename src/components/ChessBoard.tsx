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
import type { BoardState, Move, Square, PieceType } from "../lib/types";

import { PromotionDialog } from "./PromotionDialog";

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
  const [touchStartPosition, setTouchStartPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [pendingPromotionMove, setPendingPromotionMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // Reset selection when external board state changes
  useEffect(() => {
    if (externalBoardState) {
      setSelectedSquare(null);
      setDraggedSquare(null);
      setTouchStartPosition(null);
      setIsDragging(false);
      setPendingPromotionMove(null);
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
   * Checks if a pawn move requires promotion.
   */
  const requiresPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      const piece = boardState.squares.get(from);
      if (!piece || piece.type !== "pawn") {
        return false;
      }
      const toRank = parseInt(to[1], 10);
      return (piece.color === "white" && toRank === 8) || (piece.color === "black" && toRank === 1);
    },
    [boardState]
  );

  /**
   * Applies a move with optional promotion.
   */
  const applyMoveWithPromotion = useCallback(
    (from: Square, to: Square, promotion?: PieceType) => {
      const stateForMove: BoardState = boardState;
      const move: Move = { from, to, promotion };
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
    },
    [boardState, externalBoardState, onMove]
  );

  /**
   * Attempts to make a move, validating with the rules engine.
   * Shows promotion dialog if pawn reaches final rank.
   */
  const handleMoveAttempt = useCallback(
    (from: Square, to: Square) => {
      const movingPiece = boardState.squares.get(from);
      if (!movingPiece) {
        return;
      }

      // Check if this is a promotion move
      if (requiresPromotion(from, to)) {
        // Show promotion dialog
        setPendingPromotionMove({ from, to });
        return;
      }

      // Regular move
      applyMoveWithPromotion(from, to);
    },
    [boardState, requiresPromotion, applyMoveWithPromotion]
  );

  /**
   * Handles promotion piece selection.
   */
  const handlePromotionSelect = useCallback(
    (promotionType: PieceType) => {
      if (pendingPromotionMove) {
        applyMoveWithPromotion(pendingPromotionMove.from, pendingPromotionMove.to, promotionType);
        setPendingPromotionMove(null);
      }
    },
    [pendingPromotionMove, applyMoveWithPromotion]
  );

  /**
   * Handles promotion cancellation.
   */
  const handlePromotionCancel = useCallback(() => {
    setPendingPromotionMove(null);
    // Reset selection state
    setSelectedSquare(null);
    setDraggedSquare(null);
  }, []);

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
   * Threshold for distinguishing between drag and scroll gestures (in pixels).
   */
  const GESTURE_THRESHOLD = 10;

  /**
   * Handles touch start event for mobile gesture detection.
   */
  const handleTouchStart = useCallback(
    (event: React.TouchEvent, square: Square) => {
      const touch = event.touches[0];
      if (touch) {
        setTouchStartPosition({ x: touch.clientX, y: touch.clientY });
        setIsDragging(false);

        // Select piece on touch start if it's a piece square
        const piece = boardState.squares.get(square);
        if (piece) {
          setSelectedSquare(square);
        }
      }
    },
    [boardState]
  );

  /**
   * Handles touch move event to distinguish between drag and scroll gestures.
   */
  const handleTouchMove = useCallback(
    (event: React.TouchEvent, square: Square) => {
      if (!touchStartPosition) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosition.y);

      // If horizontal movement is significant, treat as drag gesture
      if (deltaX > GESTURE_THRESHOLD && deltaX > deltaY) {
        setIsDragging(true);
        setDraggedSquare(square);
        // Prevent scrolling when dragging horizontally
        event.preventDefault();
      }
      // If vertical movement is significant, treat as scroll gesture
      else if (deltaY > GESTURE_THRESHOLD && deltaY > deltaX) {
        // Allow scrolling - don't prevent default
        setIsDragging(false);
        setDraggedSquare(null);
        setSelectedSquare(null);
      }
    },
    [touchStartPosition]
  );

  /**
   * Handles touch end event to complete move or cancel gesture.
   */
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent, square: Square) => {
      if (!touchStartPosition) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosition.y);

      // If it was a drag gesture (horizontal movement), attempt move
      if (isDragging && deltaX > GESTURE_THRESHOLD && deltaX > deltaY) {
        const piece = boardState.squares.get(square);
        if (piece && selectedSquare && selectedSquare !== square) {
          // Moving to a different square - attempt move
          handleMoveAttempt(selectedSquare, square);
        }
      }
      // If it was a tap (small movement), handle as click
      else if (deltaX < GESTURE_THRESHOLD && deltaY < GESTURE_THRESHOLD) {
        handleSquareClick(square);
      }

      // Reset touch state
      setTouchStartPosition(null);
      setIsDragging(false);
      setDraggedSquare(null);
    },
    [
      touchStartPosition,
      isDragging,
      selectedSquare,
      boardState,
      handleMoveAttempt,
      handleSquareClick
    ]
  );

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
          onTouchStart={(e) => handleTouchStart(e, square)}
          onTouchMove={(e) => handleTouchMove(e, square)}
          onTouchEnd={(e) => handleTouchEnd(e, square)}
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
      handleDragOver,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd
    ]
  );

  const pawnColor = pendingPromotionMove
    ? (boardState.squares.get(pendingPromotionMove.from)?.color ?? "white")
    : "white";

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
      {pendingPromotionMove && (
        <PromotionDialog
          pawnColor={pawnColor}
          onSelect={handlePromotionSelect}
          onCancel={handlePromotionCancel}
        />
      )}
    </div>
  );
};
