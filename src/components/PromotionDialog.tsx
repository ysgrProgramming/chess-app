/**
 * Dialog component for selecting promotion piece when a pawn reaches the final rank.
 */

import React from "react";

import type { PieceType } from "../lib/types";

/**
 * Unicode chess piece symbols for promotion selection.
 */
const PROMOTION_PIECE_SYMBOLS: Record<string, string> = {
  queen: "♛",
  rook: "♜",
  bishop: "♝",
  knight: "♞"
};

/**
 * Available promotion piece types (excluding pawn and king).
 */
const PROMOTION_PIECES: PieceType[] = ["queen", "rook", "bishop", "knight"];

/**
 * Props for PromotionDialog component.
 */
export interface PromotionDialogProps {
  /**
   * Color of the pawn being promoted ("white" or "black").
   */
  readonly pawnColor: "white" | "black";
  /**
   * Callback invoked when a promotion piece is selected.
   */
  readonly onSelect: (promotionType: PieceType) => void;
  /**
   * Callback invoked when the dialog is cancelled.
   */
  readonly onCancel: () => void;
}

/**
 * Dialog component for selecting promotion piece.
 */
export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  pawnColor: _pawnColor,
  onSelect,
  onCancel
}) => {
  const pieceSymbols = PROMOTION_PIECE_SYMBOLS;
  const pieces = PROMOTION_PIECES;

  return (
    <div
      className="promotion-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Select promotion piece"
      onClick={(e) => {
        // Close dialog when clicking on overlay
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="promotion-dialog">
        <h2 className="promotion-dialog-title">Select Promotion Piece</h2>
        <div className="promotion-dialog-pieces">
          {pieces.map((pieceType) => (
            <button
              key={pieceType}
              type="button"
              className="promotion-dialog-piece-button"
              aria-label={`Promote to ${pieceType}`}
              onClick={() => onSelect(pieceType)}
            >
              <span className="promotion-dialog-piece-symbol">{pieceSymbols[pieceType]}</span>
              <span className="promotion-dialog-piece-name">{pieceType}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="promotion-dialog-cancel-button"
          onClick={onCancel}
          aria-label="Cancel promotion"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
