import React, { useState, useCallback } from "react";

import { ChessBoard } from "./components/ChessBoard";
import { MoveList } from "./components/MoveList";
import type { Move } from "./lib/types";

export const App: React.FC = () => {
  const [moveHistory, setMoveHistory] = useState<readonly Move[]>([]);

  const handleMove = useCallback((move: Move) => {
    setMoveHistory((prev) => [...prev, move]);
  }, []);

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
          <ChessBoard onMove={handleMove} />
        </section>
        <aside className="app-sidebar">
          <MoveList moves={moveHistory} />
        </aside>
      </div>
    </main>
  );
};
