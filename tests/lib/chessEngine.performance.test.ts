/**
 * Performance tests for chess engine operations.
 * Validates that move validation, board updates, and legal move calculation
 * complete within acceptable time limits (~100ms).
 */

import { describe, it, expect } from "vitest";

import {
  createInitialBoardState,
  validateMove,
  applyMove,
  getLegalMoves
} from "../../src/lib/chessEngine";
import type { Move } from "../../src/lib/types";

/**
 * Maximum acceptable time for move validation and board update (in milliseconds).
 */
const MOVE_VALIDATION_TIME_LIMIT_MS = 100;

/**
 * Maximum acceptable time for legal move calculation (in milliseconds).
 */
const LEGAL_MOVES_TIME_LIMIT_MS = 100;

describe("Chess Engine Performance", () => {
  describe("Move validation performance", () => {
    it("should validate move within acceptable time limit", () => {
      const boardState = createInitialBoardState();
      const move: Move = { from: "e2", to: "e4" };

      const startTime = performance.now();
      const result = validateMove(boardState, move);
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(elapsedTime).toBeLessThan(MOVE_VALIDATION_TIME_LIMIT_MS);
    });

    it("should validate complex move (with check validation) within time limit", () => {
      const boardState = createInitialBoardState();
      // Apply several moves to create a more complex position
      let currentState = boardState;
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
        { from: "b8", to: "c6" },
        { from: "f1", to: "b5" }
      ];

      for (const move of moves) {
        currentState = applyMove(currentState, move);
      }

      const testMove: Move = { from: "d7", to: "d6" };
      const startTime = performance.now();
      validateMove(currentState, testMove);
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      expect(elapsedTime).toBeLessThan(MOVE_VALIDATION_TIME_LIMIT_MS);
    });
  });

  describe("Board update performance", () => {
    it("should apply move and update board within acceptable time limit", () => {
      const boardState = createInitialBoardState();
      const move: Move = { from: "e2", to: "e4" };

      const startTime = performance.now();
      const newBoardState = applyMove(boardState, move);
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      expect(newBoardState.squares.get("e4")).toBeDefined();
      expect(elapsedTime).toBeLessThan(MOVE_VALIDATION_TIME_LIMIT_MS);
    });

    it("should handle multiple consecutive moves efficiently", () => {
      const boardState = createInitialBoardState();
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
        { from: "b8", to: "c6" },
        { from: "f1", to: "b5" },
        { from: "g8", to: "f6" }
      ];

      const startTime = performance.now();
      let currentState = boardState;
      for (const move of moves) {
        currentState = applyMove(currentState, move);
      }
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      // Total time for 6 moves should be reasonable
      // Average per move should be well under 100ms
      const averageTimePerMove = elapsedTime / moves.length;
      expect(averageTimePerMove).toBeLessThan(MOVE_VALIDATION_TIME_LIMIT_MS);
    });
  });

  describe("Legal moves calculation performance", () => {
    it("should calculate legal moves within acceptable time limit", () => {
      const boardState = createInitialBoardState();

      const startTime = performance.now();
      const legalMoves = getLegalMoves(boardState, "e2");
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      expect(legalMoves.length).toBeGreaterThan(0);
      expect(elapsedTime).toBeLessThan(LEGAL_MOVES_TIME_LIMIT_MS);
    });

    it("should calculate legal moves for complex position within time limit", () => {
      const boardState = createInitialBoardState();
      // Create a complex position with many pieces
      let currentState = boardState;
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
        { from: "b8", to: "c6" },
        { from: "f1", to: "b5" },
        { from: "g8", to: "f6" },
        { from: "d2", to: "d3" },
        { from: "d7", to: "d6" }
      ];

      for (const move of moves) {
        currentState = applyMove(currentState, move);
      }

      // Test legal moves for a piece with many options (queen or rook)
      const startTime = performance.now();
      const legalMoves = getLegalMoves(currentState, "d1");
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      expect(legalMoves.length).toBeGreaterThanOrEqual(0);
      expect(elapsedTime).toBeLessThan(LEGAL_MOVES_TIME_LIMIT_MS);
    });

    it("should handle worst-case scenario (all pieces on board) efficiently", () => {
      const boardState = createInitialBoardState();
      // Start with full board - worst case for legal move calculation
      // Calculate legal moves for a central piece (queen)
      const startTime = performance.now();
      const legalMoves = getLegalMoves(boardState, "d1");
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      expect(legalMoves.length).toBeGreaterThanOrEqual(0);
      expect(elapsedTime).toBeLessThan(LEGAL_MOVES_TIME_LIMIT_MS);
    });
  });
});
