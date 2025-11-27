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
import { createInitialBoardState, applyMove, evaluateGameResult } from "../lib/chessEngine";
import type { Move, BoardState, Color, GameResult } from "../lib/types";

/**
 * Context value type for game state.
 */
interface GameStateContextValue {
  readonly state: GameState;
  readonly dispatch: React.Dispatch<GameAction>;
  readonly currentBoardState: BoardState;
  readonly gameResult: GameResult;
  readonly isGameOver: boolean;
  readonly drawOfferBy: Color | null;
  readonly activeColor: Color;
  readonly handleMove: (move: Move) => void;
  readonly handleUndo: () => void;
  readonly handleReset: () => void;
  readonly handleJumpToMove: (targetIndex: number) => void;
  readonly handlePreviousMove: () => void;
  readonly handleNextMove: () => void;
  readonly handleOfferDraw: () => void;
  readonly handleAcceptDraw: () => void;
  readonly handleDeclineDraw: () => void;
  readonly handleResign: () => void;
  readonly canUndo: boolean;
  readonly canGoToPreviousMove: boolean;
  readonly canGoToNextMove: boolean;
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
   * Computes the active color based on move history.
   */
  const activeColor = useMemo((): Color => {
    // White starts, so:
    // currentMoveIndex = -1 (initial) → White's turn
    // currentMoveIndex = 0 (after white's first move) → Black's turn
    // currentMoveIndex = 1 (after black's first move) → White's turn
    // So: (currentMoveIndex + 1) % 2 === 0 means White's turn
    if (state.currentMoveIndex === -1) {
      return "white";
    }
    return (state.currentMoveIndex + 1) % 2 === 0 ? "white" : "black";
  }, [state.currentMoveIndex]);

  /**
   * Evaluates the current game result (ongoing, checkmate, stalemate, draw, or resignation).
   * Game over is only considered in the canonical position (not while previewing).
   * Draw and resignation results come from state.gameResult.
   */
  const gameResult = useMemo((): GameResult => {
    if (state.isPreviewing) {
      return { type: "ongoing" };
    }
    // If state has a draw or resignation result, use that
    if (state.gameResult.type === "draw" || state.gameResult.type === "resignation") {
      return state.gameResult;
    }
    // Otherwise, evaluate from board state (checkmate/stalemate)
    return evaluateGameResult(currentBoardState);
  }, [currentBoardState, state.isPreviewing, state.gameResult]);

  const isGameOver = gameResult.type !== "ongoing";

  /**
   * Handles a new move, implementing linear history (overwrites future moves if any).
   */
  const handleMove = useCallback(
    (move: Move) => {
      if (isGameOver) {
        return;
      }
      dispatch({ type: "MOVE", move });
    },
    [isGameOver, dispatch]
  );

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

  /**
   * Handles stepping backward one move in the kifu (previous move).
   */
  const handlePreviousMove = useCallback(() => {
    dispatch({ type: "PREVIOUS_MOVE" });
  }, []);

  /**
   * Handles stepping forward one move in the kifu (next move).
   */
  const handleNextMove = useCallback(() => {
    dispatch({ type: "NEXT_MOVE" });
  }, []);

  /**
   * Handles offering a draw.
   */
  const handleOfferDraw = useCallback(() => {
    if (isGameOver) {
      return;
    }
    dispatch({ type: "OFFER_DRAW" });
  }, [isGameOver]);

  /**
   * Handles accepting a draw offer.
   */
  const handleAcceptDraw = useCallback(() => {
    if (isGameOver || !state.drawOfferBy) {
      return;
    }
    dispatch({ type: "ACCEPT_DRAW" });
  }, [isGameOver, state.drawOfferBy]);

  /**
   * Handles declining a draw offer.
   */
  const handleDeclineDraw = useCallback(() => {
    dispatch({ type: "DECLINE_DRAW" });
  }, []);

  /**
   * Handles resigning the game.
   */
  const handleResign = useCallback(() => {
    if (isGameOver) {
      return;
    }
    dispatch({ type: "RESIGN" });
  }, [isGameOver]);

  const canUndo = state.currentMoveIndex >= 0;
  const canGoToPreviousMove = state.currentMoveIndex >= 0;
  const canGoToNextMove =
    state.currentMoveIndex < state.moveHistory.length - 1 && state.moveHistory.length > 0;
  const visibleMoves = state.isPreviewing
    ? state.moveHistory
    : state.moveHistory.slice(0, state.currentMoveIndex + 1);

  const contextValue: GameStateContextValue = {
    state,
    dispatch,
    currentBoardState,
    gameResult,
    isGameOver,
    drawOfferBy: state.drawOfferBy,
    activeColor,
    handleMove,
    handleUndo,
    handleReset,
    handleJumpToMove,
    handlePreviousMove,
    handleNextMove,
    handleOfferDraw,
    handleAcceptDraw,
    handleDeclineDraw,
    handleResign,
    canUndo,
    canGoToPreviousMove,
    canGoToNextMove,
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
