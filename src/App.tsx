import React, { useCallback, useMemo, useReducer } from "react";

import { ChessBoard } from "./components/ChessBoard";
import { MoveList } from "./components/MoveList";
import { createInitialBoardState, applyMove } from "./lib/chessEngine";
import type { Move, BoardState } from "./lib/types";

interface GameState {
  moveHistory: readonly Move[];
  currentMoveIndex: number;
}

type GameAction =
  | { type: "MOVE"; move: Move }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "JUMP_TO_MOVE"; targetIndex: number };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "MOVE": {
      const { move } = action;
      if (state.currentMoveIndex < state.moveHistory.length - 1) {
        // If we're not at the end, truncate history and add new move
        const truncatedHistory = state.moveHistory.slice(0, state.currentMoveIndex + 1);
        const newHistory = [...truncatedHistory, move];
        return {
          moveHistory: newHistory,
          currentMoveIndex: newHistory.length - 1
        };
      } else {
        // Normal case: append to end
        const newHistory = [...state.moveHistory, move];
        return {
          moveHistory: newHistory,
          currentMoveIndex: newHistory.length - 1
        };
      }
    }
    case "UNDO": {
      if (state.currentMoveIndex >= 0) {
        return {
          ...state,
          currentMoveIndex: state.currentMoveIndex - 1
        };
      }
      return state;
    }
    case "RESET": {
      return {
        moveHistory: [],
        currentMoveIndex: -1
      };
    }
    case "JUMP_TO_MOVE": {
      const { targetIndex } = action;
      if (targetIndex >= -1 && targetIndex < state.moveHistory.length) {
        return {
          ...state,
          currentMoveIndex: targetIndex
        };
      }
      return state;
    }
    default:
      return state;
  }
}

export const App: React.FC = () => {
  const [{ moveHistory, currentMoveIndex }, dispatch] = useReducer(gameReducer, {
    moveHistory: [],
    currentMoveIndex: -1
  });

  /**
   * Computes the current board state based on move history and current position.
   */
  const currentBoardState = useMemo((): BoardState => {
    let boardState = createInitialBoardState();
    const movesToApply = moveHistory.slice(0, currentMoveIndex + 1);
    for (const move of movesToApply) {
      const movingPiece = boardState.squares.get(move.from);
      if (!movingPiece) {
        break;
      }
      const stateForMove: BoardState = { ...boardState, activeColor: movingPiece.color };
      boardState = applyMove(stateForMove, move);
    }
    return boardState;
  }, [moveHistory, currentMoveIndex]);

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
  }, []);

  /**
   * Handles jumping to a specific move index in the kifu.
   */
  const handleJumpToMove = useCallback((targetIndex: number) => {
    dispatch({ type: "JUMP_TO_MOVE", targetIndex });
  }, []);

  const canUndo = currentMoveIndex >= 0;
  const visibleMoves = moveHistory.slice(0, currentMoveIndex + 1);

  return (
    <main className="app-container">
      <header className="app-header">
        <h1>Chess Practice App</h1>
        <p className="app-subtitle">
          Local two-player chess and kifu review (practice-focused, no engine).
        </p>
      </header>
      <div className="app-content">
        <section className="app-board-section">
          <div className="app-board-controls">
            <button type="button" onClick={handleUndo} disabled={!canUndo} aria-label="Undo move">
              Undo
            </button>
            <button type="button" onClick={handleReset} aria-label="Reset game">
              New Game
            </button>
          </div>
          <ChessBoard boardState={currentBoardState} onMove={handleMove} />
        </section>
        <aside className="app-sidebar">
          <MoveList
            moves={visibleMoves}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={handleJumpToMove}
          />
        </aside>
      </div>
    </main>
  );
};
