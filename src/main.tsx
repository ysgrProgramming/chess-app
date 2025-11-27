import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { GameStateProvider } from "./contexts/GameStateContext";
import "./styles.css";

const rootElement: HTMLElement | null = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' was not found in the document.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <GameStateProvider>
      <App />
    </GameStateProvider>
  </React.StrictMode>
);
