import React from "react";

import { ChessBoard } from "./components/ChessBoard";
import { MoveList } from "./components/MoveList";
import { useGameState } from "./contexts/GameStateContext";

export const App: React.FC = () => {
  const {
    currentBoardState,
    gameResult,
    isGameOver,
    drawOfferBy,
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
    visibleMoves,
    state: { currentMoveIndex }
  } = useGameState();

  const renderGameResultMessage = (): string => {
    if (gameResult.type === "checkmate") {
      const winnerText = gameResult.winner === "white" ? "White" : "Black";
      return `${winnerText} wins by checkmate`;
    }
    if (gameResult.type === "stalemate") {
      return "Draw by stalemate";
    }
    if (gameResult.type === "draw") {
      return "Draw by agreement";
    }
    if (gameResult.type === "resignation") {
      const winnerText = gameResult.winner === "white" ? "White" : "Black";
      const loserText = gameResult.winner === "white" ? "Black" : "White";
      return `${winnerText} wins (${loserText} resigned)`;
    }
    return "";
  };

  const hasActiveDrawOffer = drawOfferBy !== null && !isGameOver;

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
            <button
              type="button"
              onClick={handlePreviousMove}
              disabled={!canGoToPreviousMove}
              aria-label="Previous move"
            >
              Previous move
            </button>
            <button
              type="button"
              onClick={handleNextMove}
              disabled={!canGoToNextMove}
              aria-label="Next move"
            >
              Next move
            </button>
            <button type="button" onClick={handleReset} aria-label="Reset game">
              New Game
            </button>
            <button
              type="button"
              onClick={handleOfferDraw}
              disabled={isGameOver || hasActiveDrawOffer}
              aria-label="Offer draw"
            >
              Offer draw
            </button>
            <button type="button" onClick={handleResign} disabled={isGameOver} aria-label="Resign">
              Resign
            </button>
          </div>
          {hasActiveDrawOffer && (
            <div className="draw-offer-banner" role="alert" aria-live="polite">
              <div>
                <span>Draw offer: {drawOfferBy === "white" ? "White" : "Black"} offers a draw</span>
                <div className="draw-offer-actions">
                  <button type="button" onClick={handleAcceptDraw} aria-label="Accept draw">
                    Accept draw
                  </button>
                  <button type="button" onClick={handleDeclineDraw} aria-label="Decline draw">
                    Decline draw
                  </button>
                </div>
              </div>
            </div>
          )}
          {gameResult.type !== "ongoing" && (
            <div className="game-result-banner" role="status" aria-live="polite">
              {renderGameResultMessage()}
            </div>
          )}
          <ChessBoard
            boardState={currentBoardState}
            onMove={isGameOver ? undefined : handleMove}
            isInteractive={!isGameOver}
          />
        </section>
        <aside className="app-sidebar">
          <MoveList
            moves={visibleMoves}
            currentMoveIndex={currentMoveIndex}
            gameResult={gameResult}
            onMoveClick={handleJumpToMove}
          />
        </aside>
      </div>
    </main>
  );
};
