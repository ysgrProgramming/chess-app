/**
 * Performance tests for MoveList component.
 * Validates that rendering and scrolling remain smooth for large move histories (200+ plies).
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { MoveList } from "../../src/components/MoveList";
import { createInitialBoardState, applyMove } from "../../src/lib/chessEngine";
import type { Move } from "../../src/lib/types";

/**
 * Maximum acceptable time for rendering a large move list (in milliseconds).
 * This is a reasonable threshold for ensuring smooth scrolling.
 */
const LARGE_MOVE_LIST_RENDER_TIME_LIMIT_MS = 500;

/**
 * Minimum number of plies to test worst-case scenario.
 */
const WORST_CASE_PLY_COUNT = 200;

/**
 * Generates a sequence of alternating moves for testing.
 * Creates a realistic game sequence with white and black moves alternating.
 *
 * @param count - Number of plies (half-moves) to generate
 * @returns Array of moves
 */
function generateMoveSequence(count: number): Move[] {
  const moves: Move[] = [];
  let boardState = createInitialBoardState();

  // Common opening moves to create a realistic sequence
  const openingMoves: Move[] = [
    { from: "e2", to: "e4" },
    { from: "e7", to: "e5" },
    { from: "g1", to: "f3" },
    { from: "b8", to: "c6" },
    { from: "f1", to: "b5" },
    { from: "g8", to: "f6" },
    { from: "e1", to: "g1" },
    { from: "d7", to: "d6" }
  ];

  // Apply opening moves first
  for (const move of openingMoves) {
    try {
      boardState = applyMove(boardState, move);
      moves.push(move);
      if (moves.length >= count) {
        return moves.slice(0, count);
      }
    } catch {
      // If move fails, skip it
      continue;
    }
  }

  // Generate additional moves using a simple pattern
  // This creates a repetitive but valid sequence
  const patterns: Move[] = [
    { from: "d2", to: "d3" },
    { from: "d7", to: "d5" },
    { from: "c2", to: "c3" },
    { from: "c7", to: "c5" },
    { from: "b2", to: "b3" },
    { from: "b7", to: "b5" },
    { from: "a2", to: "a3" },
    { from: "a7", to: "a5" }
  ];

  let patternIndex = 0;
  while (moves.length < count) {
    const patternMove = patterns[patternIndex % patterns.length];
    try {
      // Try to apply the pattern move
      const testMove: Move = {
        from: patternMove.from,
        to: patternMove.to
      };
      boardState = applyMove(boardState, testMove);
      moves.push(testMove);
    } catch {
      // If pattern move fails, try a simple pawn move
      const file = String.fromCharCode(97 + (moves.length % 8));
      const rank = boardState.activeColor === "white" ? 2 : 7;
      const targetRank = boardState.activeColor === "white" ? 3 : 6;
      try {
        const fallbackMove: Move = {
          from: `${file}${rank}`,
          to: `${file}${targetRank}`
        };
        boardState = applyMove(boardState, fallbackMove);
        moves.push(fallbackMove);
      } catch {
        // If all moves fail, break to avoid infinite loop
        break;
      }
    }
    patternIndex++;
  }

  return moves.slice(0, count);
}

describe("MoveList Performance", () => {
  describe("Large move list rendering", () => {
    beforeEach(() => {
      // Clear any previous renders
      document.body.innerHTML = "";
    });

    it("should render worst-case move list (200+ plies) within acceptable time", () => {
      const moves = generateMoveSequence(WORST_CASE_PLY_COUNT);

      const startTime = performance.now();
      render(<MoveList moves={moves} currentMoveIndex={moves.length - 1} />);
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      // Verify that the move list was rendered
      const moveList = screen.getByRole("list", { name: /move list/i });
      expect(moveList).toBeInTheDocument();

      // Verify performance threshold
      expect(elapsedTime).toBeLessThan(LARGE_MOVE_LIST_RENDER_TIME_LIMIT_MS);
    });

    it("should handle very large move list (300+ plies) without catastrophic slowdown", () => {
      const veryLargeMoveCount = 300;
      const moves = generateMoveSequence(veryLargeMoveCount);

      const startTime = performance.now();
      render(<MoveList moves={moves} currentMoveIndex={moves.length - 1} />);
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      // Verify that the move list was rendered
      const moveList = screen.getByRole("list", { name: /move list/i });
      expect(moveList).toBeInTheDocument();

      // For very large lists, allow more time but still ensure it's reasonable
      // Should not exceed 2 seconds even for 300 moves
      const veryLargeListTimeLimit = 2000;
      expect(elapsedTime).toBeLessThan(veryLargeListTimeLimit);
    });

    it("should render move list efficiently regardless of current move index", () => {
      const moves = generateMoveSequence(WORST_CASE_PLY_COUNT);

      // Test rendering at different positions in the move history
      const testIndices = [0, Math.floor(moves.length / 2), moves.length - 1];

      for (const index of testIndices) {
        const startTime = performance.now();
        const { unmount } = render(<MoveList moves={moves} currentMoveIndex={index} />);
        const endTime = performance.now();
        const elapsedTime = endTime - startTime;

        expect(elapsedTime).toBeLessThan(LARGE_MOVE_LIST_RENDER_TIME_LIMIT_MS);

        // Clean up before next render
        unmount();
      }
    });
  });

  describe("Move list update performance", () => {
    it("should handle rapid move list updates efficiently", () => {
      const initialMoves = generateMoveSequence(50);
      const { rerender } = render(
        <MoveList moves={initialMoves} currentMoveIndex={initialMoves.length - 1} />
      );

      // Simulate rapid updates by adding moves one by one
      let currentMoves = [...initialMoves];
      const additionalMoves = generateMoveSequence(50).slice(50);

      for (let i = 0; i < Math.min(10, additionalMoves.length); i++) {
        currentMoves = [...currentMoves, additionalMoves[i]];

        const startTime = performance.now();
        rerender(<MoveList moves={currentMoves} currentMoveIndex={currentMoves.length - 1} />);
        const endTime = performance.now();
        const elapsedTime = endTime - startTime;

        // Each update should be fast
        expect(elapsedTime).toBeLessThan(LARGE_MOVE_LIST_RENDER_TIME_LIMIT_MS);
      }
    });
  });
});
