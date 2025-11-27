/**
 * Centralized game state management with session-scoped persistence.
 */

import type { Move, Color, GameResult } from "./types";

/**
 * Represents the game state (move history and current position).
 */
export interface GameState {
  readonly moveHistory: readonly Move[];
  readonly currentMoveIndex: number;
  readonly isPreviewing: boolean;
  readonly drawOfferBy: Color | null;
  readonly gameResult: GameResult;
}

/**
 * Actions that can be dispatched to modify game state.
 */
export type GameAction =
  | { type: "MOVE"; move: Move }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "JUMP_TO_MOVE"; targetIndex: number }
  | { type: "NEXT_MOVE" }
  | { type: "PREVIOUS_MOVE" }
  | { type: "OFFER_DRAW" }
  | { type: "ACCEPT_DRAW" }
  | { type: "DECLINE_DRAW" }
  | { type: "RESIGN" };

/**
 * Validation result for game state.
 */
export type GameStateValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * Creates the initial game state.
 */
export function createInitialGameState(): GameState {
  return {
    moveHistory: [],
    currentMoveIndex: -1,
    isPreviewing: false,
    drawOfferBy: null,
    gameResult: { type: "ongoing" }
  };
}

/**
 * Reducer function for game state updates.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "MOVE": {
      // Cannot make moves if game is over
      if (state.gameResult && state.gameResult.type !== "ongoing") {
        return state;
      }
      const { move } = action;
      const newState = {
        ...state,
        drawOfferBy: null // Expire draw offer when a move is made
      };
      if (state.currentMoveIndex < state.moveHistory.length - 1) {
        // If we're not at the end, truncate history and add new move
        const truncatedHistory = state.moveHistory.slice(0, state.currentMoveIndex + 1);
        const newHistory = [...truncatedHistory, move];
        return {
          ...newState,
          moveHistory: newHistory,
          currentMoveIndex: newHistory.length - 1,
          isPreviewing: false
        };
      } else {
        // Normal case: append to end
        const newHistory = [...state.moveHistory, move];
        return {
          ...newState,
          moveHistory: newHistory,
          currentMoveIndex: newHistory.length - 1,
          isPreviewing: false
        };
      }
    }
    case "UNDO": {
      if (state.currentMoveIndex >= 0) {
        return {
          ...state,
          currentMoveIndex: state.currentMoveIndex - 1,
          isPreviewing: false
        };
      }
      return state;
    }
    case "RESET": {
      return createInitialGameState();
    }
    case "NEXT_MOVE": {
      // Can only move forward if not at the end and history is not empty
      if (state.currentMoveIndex < state.moveHistory.length - 1 && state.moveHistory.length > 0) {
        const newIndex = state.currentMoveIndex + 1;
        return {
          ...state,
          currentMoveIndex: newIndex,
          isPreviewing: newIndex < state.moveHistory.length - 1
        };
      }
      return state;
    }
    case "PREVIOUS_MOVE": {
      if (state.currentMoveIndex >= 0) {
        const newIndex = state.currentMoveIndex - 1;
        return {
          ...state,
          currentMoveIndex: newIndex,
          isPreviewing:
            newIndex < state.moveHistory.length - 1 ||
            (newIndex === -1 && state.moveHistory.length > 0)
        };
      }
      return state;
    }
    case "JUMP_TO_MOVE": {
      const { targetIndex } = action;
      if (targetIndex >= -1 && targetIndex < state.moveHistory.length) {
        return {
          ...state,
          currentMoveIndex: targetIndex,
          isPreviewing:
            targetIndex < state.moveHistory.length - 1 ||
            (targetIndex === -1 && state.moveHistory.length > 0)
        };
      }
      return state;
    }
    case "OFFER_DRAW": {
      // Cannot offer draw if game is over
      if (state.gameResult && state.gameResult.type !== "ongoing") {
        return state;
      }
      // Determine who is offering (opposite of active color)
      // We need to know the active color, which is computed from move history
      // For now, we'll use a helper to determine active color
      // This is a simplification - in a real implementation, we'd pass activeColor
      return {
        ...state,
        drawOfferBy: getActiveColorFromState(state)
      };
    }
    case "ACCEPT_DRAW": {
      // Can only accept if there is an active draw offer
      if ((state.gameResult && state.gameResult.type !== "ongoing") || !state.drawOfferBy) {
        return state;
      }
      return {
        ...state,
        gameResult: { type: "draw", reason: "agreed" },
        drawOfferBy: null
      };
    }
    case "DECLINE_DRAW": {
      // Simply clear the draw offer
      return {
        ...state,
        drawOfferBy: null
      };
    }
    case "RESIGN": {
      // Cannot resign if game is over
      if (state.gameResult && state.gameResult.type !== "ongoing") {
        return state;
      }
      const activeColor = getActiveColorFromState(state);
      const winner: Color = activeColor === "white" ? "black" : "white";
      return {
        ...state,
        gameResult: { type: "resignation", winner },
        drawOfferBy: null
      };
    }
    default:
      return state;
  }
}

/**
 * Helper function to determine active color from game state.
 * White starts, alternates with each move.
 */
function getActiveColorFromState(state: GameState): Color {
  // White starts, so:
  // currentMoveIndex = -1 (initial) → White's turn
  // currentMoveIndex = 0 (after white's first move) → Black's turn
  // currentMoveIndex = 1 (after black's first move) → White's turn
  // So: (currentMoveIndex + 1) % 2 === 0 means White's turn
  if (state.currentMoveIndex === -1) {
    return "white";
  }
  return (state.currentMoveIndex + 1) % 2 === 0 ? "white" : "black";
}

/**
 * Validates game state for consistency and safety.
 */
export function validateGameState(state: GameState): GameStateValidationResult {
  // Check currentMoveIndex bounds
  if (state.currentMoveIndex < -1 || state.currentMoveIndex >= state.moveHistory.length) {
    return {
      valid: false,
      reason: `currentMoveIndex (${state.currentMoveIndex}) is out of bounds. History length: ${state.moveHistory.length}`
    };
  }

  // Check for null or invalid moves in history
  for (let i = 0; i < state.moveHistory.length; i++) {
    const move = state.moveHistory[i];
    if (!move || typeof move !== "object") {
      return {
        valid: false,
        reason: `Invalid move at index ${i}: move is null or not an object`
      };
    }
    if (typeof move.from !== "string" || typeof move.to !== "string") {
      return {
        valid: false,
        reason: `Invalid move at index ${i}: missing 'from' or 'to' property`
      };
    }
  }

  return { valid: true };
}

/**
 * Serializes game state to JSON string for storage.
 */
export function serializeGameState(state: GameState): string {
  return JSON.stringify({
    moveHistory: state.moveHistory,
    currentMoveIndex: state.currentMoveIndex,
    isPreviewing: state.isPreviewing,
    drawOfferBy: state.drawOfferBy,
    gameResult: state.gameResult
  });
}

/**
 * Deserializes game state from JSON string.
 * Returns initial state if deserialization fails or validation fails.
 */
export function deserializeGameState(json: string): GameState {
  try {
    const parsed = JSON.parse(json);
    const state: GameState = {
      moveHistory: parsed.moveHistory || [],
      currentMoveIndex: parsed.currentMoveIndex ?? -1,
      isPreviewing: parsed.isPreviewing ?? false,
      drawOfferBy: parsed.drawOfferBy ?? null,
      gameResult: parsed.gameResult ?? { type: "ongoing" }
    };

    // Validate the deserialized state
    const validation = validateGameState(state);
    if (!validation.valid) {
      // Return initial state if validation fails
      return createInitialGameState();
    }

    return state;
  } catch {
    // Return initial state if JSON parsing fails
    return createInitialGameState();
  }
}

/**
 * Storage key for session-scoped game state.
 */
const SESSION_STORAGE_KEY = "chess-app-game-state";

/**
 * Loads game state from sessionStorage.
 * Returns initial state if not found or invalid.
 */
export function loadGameStateFromSession(): GameState {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return createInitialGameState();
  }

  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return createInitialGameState();
    }

    return deserializeGameState(stored);
  } catch {
    // If sessionStorage access fails, return initial state
    return createInitialGameState();
  }
}

/**
 * Saves game state to sessionStorage.
 * Silently handles errors (e.g., quota exceeded, private browsing).
 */
export function saveGameStateToSession(state: GameState): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  try {
    const serialized = serializeGameState(state);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } catch (error) {
    // Silently handle storage errors (e.g., quota exceeded, private browsing)
    // In a production app, you might want to log this or show a notification
    console.warn("Failed to save game state to sessionStorage:", error);
  }
}

/**
 * Clears game state from sessionStorage.
 */
export function clearGameStateFromSession(): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    // Silently handle storage errors
    console.warn("Failed to clear game state from sessionStorage:", error);
  }
}
