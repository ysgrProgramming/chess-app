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
  /**
   * When false, the board becomes read-only and no new moves can be made.
   */
  isInteractive?: boolean;
}

/**
 * Interactive chessboard component.
 */
export const ChessBoard: React.FC<ChessBoardProps> = ({
  boardState: externalBoardState,
  onMove,
  isInteractive = true
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
  const [touchStartSquare, setTouchStartSquare] = useState<Square | null>(null);
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
      setTouchStartSquare(null);
      setIsDragging(false);
      setPendingPromotionMove(null);
    }
  }, [externalBoardState]);

  /**
   * Gets legal destination squares for the currently selected or dragged piece.
   */
  const getCurrentLegalMoves = useCallback((): Set<Square> => {
    if (!isInteractive) {
      return new Set();
    }
    const activeSquare = selectedSquare || draggedSquare;
    if (!activeSquare) {
      return new Set();
    }
    const legalMoves = getLegalMoves(boardState, activeSquare);
    return new Set(legalMoves);
  }, [boardState, selectedSquare, draggedSquare, isInteractive]);

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
      if (!isInteractive) {
        return;
      }
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
    [boardState, externalBoardState, onMove, isInteractive]
  );

  /**
   * Attempts to make a move, validating with the rules engine.
   * Shows promotion dialog if pawn reaches final rank.
   */
  const handleMoveAttempt = useCallback(
    (from: Square, to: Square) => {
      if (!isInteractive) {
        return;
      }
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
   * @param square - The square that was clicked/tapped
   * @param currentSelectedSquare - Optional override for selectedSquare (used for touch events)
   */
  const handleSquareClick = useCallback(
    (square: Square, currentSelectedSquare?: Square | null) => {
      if (!isInteractive) {
        return;
      }
      // Use currentSelectedSquare if provided (for touch events), otherwise use selectedSquare
      const effectiveSelectedSquare =
        currentSelectedSquare !== undefined ? currentSelectedSquare : selectedSquare;

      if (effectiveSelectedSquare === null) {
        // First click: select source square
        const piece = boardState.squares.get(square);
        if (piece) {
          setSelectedSquare(square);
        }
      } else if (effectiveSelectedSquare === square) {
        // Clicking the same square: deselect
        setSelectedSquare(null);
      } else {
        // Different square: handle move or capture
        const targetPiece = boardState.squares.get(square);
        const sourcePiece = boardState.squares.get(effectiveSelectedSquare);

        if (!sourcePiece) {
          // Source square has no piece (shouldn't happen, but handle gracefully)
          return;
        }

        if (targetPiece && targetPiece.color !== sourcePiece.color) {
          // Attempt capture on opponent piece
          handleMoveAttempt(effectiveSelectedSquare, square);
          setSelectedSquare(null);
        } else if (targetPiece && targetPiece.color === sourcePiece.color) {
          // Select the new piece if it's the same color
          setSelectedSquare(square);
        } else {
          // Second click: attempt move to empty square
          handleMoveAttempt(effectiveSelectedSquare, square);
          setSelectedSquare(null);
        }
      }
    },
    [selectedSquare, boardState, handleMoveAttempt, isInteractive]
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
      if (!isInteractive) {
        return;
      }
      if (draggedSquare && draggedSquare !== targetSquare) {
        handleMoveAttempt(draggedSquare, targetSquare);
      }
      setDraggedSquare(null);
    },
    [draggedSquare, handleMoveAttempt, isInteractive]
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
  const handleTouchStart = useCallback((event: React.TouchEvent, square: Square) => {
    const touch = event.touches[0];
    if (touch) {
      setTouchStartPosition({ x: touch.clientX, y: touch.clientY });
      setTouchStartSquare(square);
      setIsDragging(false);
      // Don't update selection here - let handleTouchEnd handle it
      // This ensures we have the correct selection state when handleSquareClick is called
    }
  }, []);

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
        setTouchStartSquare(null);
      }
    },
    [touchStartPosition]
  );

  /**
   * Handles touch end event to complete move or cancel gesture.
   */
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent, square: Square) => {
      if (!touchStartPosition || !touchStartSquare) {
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
        // Use touchStartSquare to determine the actual square that was tapped
        // This ensures we have the correct selection state when handleSquareClick is called
        const tappedSquare = touchStartSquare;

        // Use current selectedSquare state directly
        // handleSquareClick will handle the logic:
        // - If no selection and tapped square has a piece: select it
        // - If selected square equals tapped square: deselect
        // - If selected square differs and tapped square has opponent piece: capture
        // - If selected square differs and tapped square has same-color piece: update selection
        // - If selected square differs and tapped square is empty: move
        handleSquareClick(tappedSquare);
      }

      // Reset touch state
      setTouchStartPosition(null);
      setTouchStartSquare(null);
      setIsDragging(false);
      setDraggedSquare(null);
    },
    [
      touchStartPosition,
      touchStartSquare,
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
