import React from "react";

import { ChessBoard } from "./components/ChessBoard";

export const App: React.FC = () => {
  return (
    <main className="app-container">
      <header className="app-header">
        <h1>Chess Practice App</h1>
        <p className="app-subtitle">
          Local two-player chess and kifu review (practice-focused, no engine).
        </p>
      </header>
      <section className="app-placeholder">
        <ChessBoard />
      </section>
    </main>
  );
};
