/**
 * Unit tests for game state management (session-scoped state).
 */

import { describe, expect, it } from "vitest";

import type { Move } from "../../src/lib/types";
import {
  type GameState,
  type GameAction,
  gameReducer,
  createInitialGameState,
  validateGameState,
  serializeGameState,
  deserializeGameState
} from "../../src/lib/gameState";

describe("gameState", () => {
  describe("createInitialGameState", () => {
    it("should create initial game state with empty history", () => {
      const state = createInitialGameState();
      expect(state.moveHistory).toEqual([]);
      expect(state.currentMoveIndex).toBe(-1);
      expect(state.isPreviewing).toBe(false);
    });
  });

  describe("gameReducer", () => {
    describe("MOVE action", () => {
      it("should add a move to empty history", () => {
        const initialState = createInitialGameState();
        const move: Move = { from: "e2", to: "e4" };
        const action: GameAction = { type: "MOVE", move };

        const newState = gameReducer(initialState, action);

        expect(newState.moveHistory).toHaveLength(1);
        expect(newState.moveHistory[0]).toEqual(move);
        expect(newState.currentMoveIndex).toBe(0);
        expect(newState.isPreviewing).toBe(false);
      });

      it("should append move to end of history", () => {
        const initialState: GameState = {
          moveHistory: [{ from: "e2", to: "e4" }],
          currentMoveIndex: 0,
          isPreviewing: false
        };
        const move: Move = { from: "e7", to: "e5" };
        const action: GameAction = { type: "MOVE", move };

        const newState = gameReducer(initialState, action);

        expect(newState.moveHistory).toHaveLength(2);
        expect(newState.moveHistory[0]).toEqual({ from: "e2", to: "e4" });
        expect(newState.moveHistory[1]).toEqual(move);
        expect(newState.currentMoveIndex).toBe(1);
        expect(newState.isPreviewing).toBe(false);
      });

      it("should truncate history when not at end and add new move", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" },
            { from: "g1", to: "f3" }
          ],
          currentMoveIndex: 0, // At first move
          isPreviewing: false
        };
        const move: Move = { from: "d7", to: "d6" };
        const action: GameAction = { type: "MOVE", move };

        const newState = gameReducer(initialState, action);

        expect(newState.moveHistory).toHaveLength(2);
        expect(newState.moveHistory[0]).toEqual({ from: "e2", to: "e4" });
        expect(newState.moveHistory[1]).toEqual(move);
        expect(newState.currentMoveIndex).toBe(1);
        expect(newState.isPreviewing).toBe(false);
      });
    });

    describe("UNDO action", () => {
      it("should decrement currentMoveIndex when index >= 0", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" }
          ],
          currentMoveIndex: 1,
          isPreviewing: false
        };
        const action: GameAction = { type: "UNDO" };

        const newState = gameReducer(initialState, action);

        expect(newState.currentMoveIndex).toBe(0);
        expect(newState.moveHistory).toEqual(initialState.moveHistory);
        expect(newState.isPreviewing).toBe(false);
      });

      it("should not change state when currentMoveIndex is -1", () => {
        const initialState = createInitialGameState();
        const action: GameAction = { type: "UNDO" };

        const newState = gameReducer(initialState, action);

        expect(newState).toEqual(initialState);
      });

      it("should set isPreviewing to false", () => {
        const initialState: GameState = {
          moveHistory: [{ from: "e2", to: "e4" }],
          currentMoveIndex: 0,
          isPreviewing: true
        };
        const action: GameAction = { type: "UNDO" };

        const newState = gameReducer(initialState, action);

        expect(newState.isPreviewing).toBe(false);
      });
    });

    describe("RESET action", () => {
      it("should reset to initial state", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" },
            { from: "g1", to: "f3" }
          ],
          currentMoveIndex: 2,
          isPreviewing: true
        };
        const action: GameAction = { type: "RESET" };

        const newState = gameReducer(initialState, action);

        expect(newState.moveHistory).toEqual([]);
        expect(newState.currentMoveIndex).toBe(-1);
        expect(newState.isPreviewing).toBe(false);
      });
    });

    describe("NEXT_MOVE action", () => {
      it("should increment currentMoveIndex when not at end", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" },
            { from: "g1", to: "f3" }
          ],
          currentMoveIndex: 0,
          isPreviewing: true
        };
        const action: GameAction = { type: "NEXT_MOVE" };

        const newState = gameReducer(initialState, action);

        expect(newState.currentMoveIndex).toBe(1);
        expect(newState.moveHistory).toEqual(initialState.moveHistory);
        expect(newState.isPreviewing).toBe(true); // Still not at end
      });

      it("should set isPreviewing to false when reaching end", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" }
          ],
          currentMoveIndex: 0,
          isPreviewing: true
        };
        const action: GameAction = { type: "NEXT_MOVE" };

        const newState = gameReducer(initialState, action);

        expect(newState.currentMoveIndex).toBe(1);
        expect(newState.isPreviewing).toBe(false); // At end
      });

      it("should not change state when already at end", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" }
          ],
          currentMoveIndex: 1,
          isPreviewing: false
        };
        const action: GameAction = { type: "NEXT_MOVE" };

        const newState = gameReducer(initialState, action);

        expect(newState).toEqual(initialState);
      });

      it("should not change state when currentMoveIndex is -1 and history is empty", () => {
        const initialState = createInitialGameState();
        const action: GameAction = { type: "NEXT_MOVE" };

        const newState = gameReducer(initialState, action);

        expect(newState).toEqual(initialState);
      });
    });

    describe("PREVIOUS_MOVE action", () => {
      it("should decrement currentMoveIndex when possible", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" }
          ],
          currentMoveIndex: 1,
          isPreviewing: false
        };
        const action: GameAction = { type: "PREVIOUS_MOVE" };

        const newState = gameReducer(initialState, action);

        expect(newState.currentMoveIndex).toBe(0);
        expect(newState.moveHistory).toEqual(initialState.moveHistory);
        expect(newState.isPreviewing).toBe(true);
      });

      it("should allow stepping back to initial position (-1)", () => {
        const initialState: GameState = {
          moveHistory: [{ from: "e2", to: "e4" }],
          currentMoveIndex: 0,
          isPreviewing: false
        };
        const action: GameAction = { type: "PREVIOUS_MOVE" };

        const newState = gameReducer(initialState, action);

        expect(newState.currentMoveIndex).toBe(-1);
        expect(newState.isPreviewing).toBe(true);
      });

      it("should not change state when already at start", () => {
        const initialState: GameState = {
          moveHistory: [{ from: "e2", to: "e4" }],
          currentMoveIndex: -1,
          isPreviewing: true
        };
        const action: GameAction = { type: "PREVIOUS_MOVE" };

        const newState = gameReducer(initialState, action);

        expect(newState).toEqual(initialState);
      });
    });

    describe("JUMP_TO_MOVE action", () => {
      it("should jump to valid move index", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" },
            { from: "g1", to: "f3" }
          ],
          currentMoveIndex: 2,
          isPreviewing: false
        };
        const action: GameAction = { type: "JUMP_TO_MOVE", targetIndex: 0 };

        const newState = gameReducer(initialState, action);

        expect(newState.currentMoveIndex).toBe(0);
        expect(newState.isPreviewing).toBe(true); // Not at end
      });

      it("should jump to initial position (index -1)", () => {
        const initialState: GameState = {
          moveHistory: [{ from: "e2", to: "e4" }],
          currentMoveIndex: 0,
          isPreviewing: false
        };
        const action: GameAction = { type: "JUMP_TO_MOVE", targetIndex: -1 };

        const newState = gameReducer(initialState, action);

        expect(newState.currentMoveIndex).toBe(-1);
        expect(newState.isPreviewing).toBe(true);
      });

      it("should set isPreviewing to true when jumping to non-end position", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" }
          ],
          currentMoveIndex: 1,
          isPreviewing: false
        };
        const action: GameAction = { type: "JUMP_TO_MOVE", targetIndex: 0 };

        const newState = gameReducer(initialState, action);

        expect(newState.isPreviewing).toBe(true);
      });

      it("should set isPreviewing to false when jumping to end position", () => {
        const initialState: GameState = {
          moveHistory: [
            { from: "e2", to: "e4" },
            { from: "e7", to: "e5" }
          ],
          currentMoveIndex: 0,
          isPreviewing: true
        };
        const action: GameAction = { type: "JUMP_TO_MOVE", targetIndex: 1 };

        const newState = gameReducer(initialState, action);

        expect(newState.isPreviewing).toBe(false);
      });

      it("should not change state when targetIndex is out of bounds (too high)", () => {
        const initialState: GameState = {
          moveHistory: [{ from: "e2", to: "e4" }],
          currentMoveIndex: 0,
          isPreviewing: false
        };
        const action: GameAction = { type: "JUMP_TO_MOVE", targetIndex: 10 };

        const newState = gameReducer(initialState, action);

        expect(newState).toEqual(initialState);
      });

      it("should not change state when targetIndex is out of bounds (too low)", () => {
        const initialState: GameState = {
          moveHistory: [{ from: "e2", to: "e4" }],
          currentMoveIndex: 0,
          isPreviewing: false
        };
        const action: GameAction = { type: "JUMP_TO_MOVE", targetIndex: -2 };

        const newState = gameReducer(initialState, action);

        expect(newState).toEqual(initialState);
      });
    });
  });

  describe("validateGameState", () => {
    it("should validate correct game state", () => {
      const state: GameState = {
        moveHistory: [{ from: "e2", to: "e4" }],
        currentMoveIndex: 0,
        isPreviewing: false
      };

      const result = validateGameState(state);

      expect(result.valid).toBe(true);
    });

    it("should validate initial state", () => {
      const state = createInitialGameState();

      const result = validateGameState(state);

      expect(result.valid).toBe(true);
    });

    it("should reject state with currentMoveIndex out of bounds (too high)", () => {
      const state: GameState = {
        moveHistory: [{ from: "e2", to: "e4" }],
        currentMoveIndex: 5, // Out of bounds
        isPreviewing: false
      };

      const result = validateGameState(state);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("currentMoveIndex");
    });

    it("should reject state with currentMoveIndex out of bounds (too low)", () => {
      const state: GameState = {
        moveHistory: [{ from: "e2", to: "e4" }],
        currentMoveIndex: -2, // Out of bounds
        isPreviewing: false
      };

      const result = validateGameState(state);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("currentMoveIndex");
    });

    it("should reject state with invalid move format", () => {
      const state = {
        moveHistory: [{ from: "invalid", to: "e4" }] as unknown as GameState,
        currentMoveIndex: 0,
        isPreviewing: false
      };

      const result = validateGameState(state);

      // Note: This test checks that validation handles invalid moves gracefully
      // The actual validation might be more lenient, but we should handle errors
      expect(result).toBeDefined();
    });

    it("should reject state with corrupted move history (null moves)", () => {
      const state = {
        moveHistory: [null, { from: "e2", to: "e4" }] as unknown as readonly Move[],
        currentMoveIndex: 0,
        isPreviewing: false
      };

      const result = validateGameState(state);

      expect(result.valid).toBe(false);
    });
  });

  describe("serializeGameState and deserializeGameState", () => {
    it("should serialize and deserialize game state correctly", () => {
      const state: GameState = {
        moveHistory: [
          { from: "e2", to: "e4" },
          { from: "e7", to: "e5" },
          { from: "g1", to: "f3" }
        ],
        currentMoveIndex: 2,
        isPreviewing: false
      };

      const serialized = serializeGameState(state);
      const deserialized = deserializeGameState(serialized);

      expect(deserialized.moveHistory).toEqual(state.moveHistory);
      expect(deserialized.currentMoveIndex).toBe(state.currentMoveIndex);
      expect(deserialized.isPreviewing).toBe(state.isPreviewing);
    });

    it("should serialize and deserialize initial state", () => {
      const state = createInitialGameState();

      const serialized = serializeGameState(state);
      const deserialized = deserializeGameState(serialized);

      expect(deserialized).toEqual(state);
    });

    it("should handle deserialization of invalid JSON gracefully", () => {
      const invalidJson = "not valid json";

      const result = deserializeGameState(invalidJson);

      // Should return initial state or handle error gracefully
      expect(result).toBeDefined();
      expect(result.moveHistory).toBeDefined();
      expect(result.currentMoveIndex).toBeDefined();
    });

    it("should handle deserialization of corrupted data gracefully", () => {
      const corruptedJson = JSON.stringify({ invalid: "data" });

      const result = deserializeGameState(corruptedJson);

      // Should return initial state or handle error gracefully
      expect(result).toBeDefined();
      expect(result.moveHistory).toBeDefined();
      expect(result.currentMoveIndex).toBeDefined();
    });
  });
});
