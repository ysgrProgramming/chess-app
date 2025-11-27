/**
 * React Context for centralized game state management with session persistence.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo
} from "react";

import {
  type GameState,
  type GameAction,
  gameReducer,
  loadGameStateFromSession,
  saveGameStateToSession,
  clearGameStateFromSession,
  validateGameState
} from "../lib/gameState";
import { createInitialBoardState, applyMove } from "../lib/chessEngine";
import type { Move, BoardState, Color } from "../lib/types";

/**
 * Context value type for game state.
 */
interface GameStateContextValue {
  readonly state: GameState;
  readonly dispatch: React.Dispatch<GameAction>;
  readonly currentBoardState: BoardState;
  readonly handleMove: (move: Move) => void;
  readonly handleUndo: () => void;
  readonly handleReset: () => void;
  readonly handleJumpToMove: (targetIndex: number) => void;
  readonly canUndo: boolean;
  readonly visibleMoves: readonly Move[];
}

/**
 * Game state context.
 */
const GameStateContext = createContext<GameStateContextValue | null>(null);

/**
 * Props for GameStateProvider component.
 */
export interface GameStateProviderProps {
  readonly children: React.ReactNode;
}

/**
 * Provider component that manages game state with session persistence.
 */
export function GameStateProvider({ children }: GameStateProviderProps): React.JSX.Element {
  // Initialize state from sessionStorage or create initial state
  const [state, dispatch] = useReducer(gameReducer, null, () => loadGameStateFromSession());

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    // Validate state before saving
    const validation = validateGameState(state);
    if (validation.valid) {
      saveGameStateToSession(state);
    } else {
      // If state is invalid, reset to initial state
      console.warn("Invalid game state detected, resetting:", validation.reason);
      dispatch({ type: "RESET" });
    }
  }, [state]);

  /**
   * Computes the current board state based on move history and current position.
   */
  const currentBoardState = useMemo((): BoardState => {
    let boardState = createInitialBoardState();
    let lastAppliedMoveColor: Color | null = null;
    const movesToApply = state.moveHistory.slice(0, state.currentMoveIndex + 1);
    for (const move of movesToApply) {
      const movingPiece = boardState.squares.get(move.from);
      if (!movingPiece) {
        break;
      }
      lastAppliedMoveColor = movingPiece.color;
      const stateForMove: BoardState = { ...boardState, activeColor: movingPiece.color };
      boardState = applyMove(stateForMove, move);
    }
    if (state.isPreviewing && lastAppliedMoveColor) {
      boardState = { ...boardState, activeColor: lastAppliedMoveColor };
    }
    return boardState;
  }, [state.moveHistory, state.currentMoveIndex, state.isPreviewing]);

  /**
   * Handles a new move, implementing linear history (overwrites future moves if any).
   */
  const handleMove = useCallback((move: Move) => {
    dispatch({ type: "MOVE", move });
  }, []);

  /**
   * Handles undo: steps back one move.
   */
  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  /**
   * Handles reset: returns to initial position and clears kifu.
   */
  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    clearGameStateFromSession();
  }, []);

  /**
   * Handles jumping to a specific move index in the kifu.
   */
  const handleJumpToMove = useCallback((targetIndex: number) => {
    dispatch({ type: "JUMP_TO_MOVE", targetIndex });
  }, []);

  const canUndo = state.currentMoveIndex >= 0;
  const visibleMoves = state.moveHistory.slice(0, state.currentMoveIndex + 1);

  const contextValue: GameStateContextValue = {
    state,
    dispatch,
    currentBoardState,
    handleMove,
    handleUndo,
    handleReset,
    handleJumpToMove,
    canUndo,
    visibleMoves
  };

  return <GameStateContext.Provider value={contextValue}>{children}</GameStateContext.Provider>;
}

/**
 * Hook to access game state context.
 * Throws error if used outside GameStateProvider.
 */
export function useGameState(): GameStateContextValue {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameState must be used within GameStateProvider");
  }
  return context;
}
