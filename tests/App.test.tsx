import React from "react";
import { describe, expect, it, test, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../src/App";
import { GameStateProvider } from "../src/contexts/GameStateContext";

/**
 * Helper function to render App with GameStateProvider.
 */
function renderApp(): void {
  render(
    <GameStateProvider>
      <App />
    </GameStateProvider>
  );
}

/**
 * Clears sessionStorage before each test to ensure isolation.
 */
beforeEach(() => {
  if (typeof window !== "undefined" && window.sessionStorage) {
    window.sessionStorage.clear();
  }
});

afterEach(() => {
  cleanup();
});

describe("App", () => {
  test("renders application title and chessboard", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Chess Practice App" })).toBeInTheDocument();

    // Check that chessboard is rendered
    expect(screen.getByRole("grid", { name: "Chess board" })).toBeInTheDocument();
  });

  describe("Undo functionality", () => {
    it("should render undo button", () => {
      renderApp();
      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toBeInTheDocument();
    });

    it("should be disabled when there are no moves", () => {
      renderApp();
      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toBeDisabled();
    });

    it("should undo exactly one move and update board and kifu", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make a move: e2 -> e4
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
        expect(screen.getByText(/e4/)).toBeInTheDocument();
      });

      // Undo the move
      const undoButton = screen.getByRole("button", { name: /undo/i });
      await user.click(undoButton);

      await waitFor(() => {
        // Board should be back to initial state
        expect(e2Square).toHaveTextContent("♙");
        expect(e4Square).not.toHaveTextContent("♙");
        // Kifu should not show e4
        expect(screen.queryByText(/e4/)).not.toBeInTheDocument();
      });
    });

    it("should undo multiple moves one at a time", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make two moves: e2->e4, e7->e5
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
        expect(screen.getByText(/e5/)).toBeInTheDocument();
      });

      // Undo first move (e5)
      const undoButton = screen.getByRole("button", { name: /undo/i });
      await user.click(undoButton);

      await waitFor(() => {
        expect(e5Square).not.toHaveTextContent("♟");
        expect(screen.queryByText(/e5/)).not.toBeInTheDocument();
        // e4 should still be there
        expect(e4Square).toHaveTextContent("♙");
        expect(screen.getByText(/e4/)).toBeInTheDocument();
      });

      // Undo second move (e4)
      await user.click(undoButton);

      await waitFor(() => {
        expect(e4Square).not.toHaveTextContent("♙");
        expect(e2Square).toHaveTextContent("♙");
        expect(screen.queryByText(/e4/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Jump to move functionality", () => {
    it("should allow clicking a move in kifu to jump to that position", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make three moves: e2->e4, e7->e5, g1->f3
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
      });

      const g1Square = screen.getByLabelText(/square g1/i);
      const f3Square = screen.getByLabelText(/square f3/i);
      await user.click(g1Square);
      await user.click(f3Square);

      await waitFor(() => {
        expect(f3Square).toHaveTextContent("♞");
      });

      // Click on the first move (e4) in the kifu
      const e4Move = screen.getByText(/e4/);
      await user.click(e4Move);

      await waitFor(() => {
        // Board should show position after e4 (before e5)
        expect(e4Square).toHaveTextContent("♙");
        expect(e5Square).not.toHaveTextContent("♟");
        expect(f3Square).not.toHaveTextContent("♞");
      });
    });

    it("should update current move pointer when jumping to a move", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make two moves: e2->e4, e7->e5
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
      });

      // Jump to first move
      const e4Move = screen.getByText(/e4/);
      await user.click(e4Move);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      // Make a new move after jumping back
      const g1Square = screen.getByLabelText(/square g1/i);
      const f3Square = screen.getByLabelText(/square f3/i);
      await user.click(g1Square);
      await user.click(f3Square);

      await waitFor(() => {
        // e5 should be gone (overwritten by linear history)
        expect(screen.queryByText(/e5/)).not.toBeInTheDocument();
        // f3 should be there
        expect(f3Square).toHaveTextContent("♞");
        expect(screen.getByText(/Nf3/)).toBeInTheDocument();
      });
    });
  });

  describe("Reset/New Game functionality", () => {
    it("should render reset button", () => {
      renderApp();
      const resetButton = screen.getByRole("button", { name: /reset|new game/i });
      expect(resetButton).toBeInTheDocument();
    });

    it("should reset to initial position and clear kifu", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make a move
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
        expect(screen.getByText(/e4/)).toBeInTheDocument();
      });

      // Reset
      const resetButton = screen.getByRole("button", { name: /reset|new game/i });
      await user.click(resetButton);

      await waitFor(() => {
        // Board should be back to initial state
        expect(e2Square).toHaveTextContent("♙");
        expect(e4Square).not.toHaveTextContent("♙");
        // Kifu should be empty
        expect(screen.queryByText(/e4/)).not.toBeInTheDocument();
        const moveList = screen.getByRole("list", { name: /move list/i });
        expect(moveList).toBeEmptyDOMElement();
      });
    });

    it("should reset from arbitrary state", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make multiple moves
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
      });

      // Reset
      const resetButton = screen.getByRole("button", { name: /reset|new game/i });
      await user.click(resetButton);

      await waitFor(() => {
        // All pieces should be in initial positions
        expect(e2Square).toHaveTextContent("♙");
        expect(e4Square).not.toHaveTextContent("♙");
        expect(e5Square).not.toHaveTextContent("♟");
        // Kifu should be empty
        const moveList = screen.getByRole("list", { name: /move list/i });
        expect(moveList).toBeEmptyDOMElement();
      });
    });
  });

  describe("Local two-player game flow (Issue #8)", () => {
    it("should display turn indicator at all times", () => {
      renderApp();
      // Initially white's turn
      const turnIndicator = screen.getByText(/white/i);
      expect(turnIndicator).toBeInTheDocument();
      expect(turnIndicator.textContent).toMatch(/white.*turn/i);
    });

    it("should allow two players to alternate moves on the same device", async () => {
      const user = userEvent.setup();
      renderApp();

      // Player 1 (White) makes first move: e2 -> e4
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
        // Turn should switch to Black
        const turnIndicator = screen.getByText(/black/i);
        expect(turnIndicator).toBeInTheDocument();
        expect(turnIndicator.textContent).toMatch(/black.*turn/i);
      });

      // Player 2 (Black) makes second move: e7 -> e5
      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
        // Turn should switch back to White
        const turnIndicator = screen.getByText(/white/i);
        expect(turnIndicator).toBeInTheDocument();
        expect(turnIndicator.textContent).toMatch(/white.*turn/i);
      });

      // Player 1 (White) makes third move: g1 -> f3
      const g1Square = screen.getByLabelText(/square g1/i);
      const f3Square = screen.getByLabelText(/square f3/i);
      await user.click(g1Square);
      await user.click(f3Square);

      await waitFor(() => {
        expect(f3Square).toHaveTextContent("♞");
        // Turn should switch to Black
        const turnIndicator = screen.getByText(/black/i);
        expect(turnIndicator).toBeInTheDocument();
        expect(turnIndicator.textContent).toMatch(/black.*turn/i);
      });
    });

    it("should prevent players from moving opponent pieces", async () => {
      const user = userEvent.setup();
      renderApp();

      // White's turn - try to move black piece (should fail)
      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);

      // Verify initial state: black pawn is on e7
      expect(e7Square).toHaveTextContent("♟");
      expect(e5Square).not.toHaveTextContent("♟");

      // Click black pawn (e7) - it can be selected but move will be rejected
      await user.click(e7Square);
      // Click destination (e5) - move should be rejected
      await user.click(e5Square);

      await waitFor(
        () => {
          // Black pawn should still be on e7 (move rejected)
          // Note: The piece might be temporarily selected, but the move should not execute
          const e7SquareAfterAttempt = screen.getByLabelText(/square e7/i);
          expect(e7SquareAfterAttempt.textContent).toContain("♟");
          expect(e5Square).not.toHaveTextContent("♟");
          // Turn should still be White (no move was made)
          const turnIndicator = screen.getByText(/white/i);
          expect(turnIndicator).toBeInTheDocument();
          expect(turnIndicator.textContent).toMatch(/white.*turn/i);
        },
        { timeout: 3000 }
      );
    });

    it("should update turn indicator after each move", async () => {
      const user = userEvent.setup();
      renderApp();

      // Initially White's turn
      const initialTurnIndicator = screen.getByText(/white/i);
      expect(initialTurnIndicator).toBeInTheDocument();
      expect(initialTurnIndicator.textContent).toMatch(/white.*turn/i);

      // White moves
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        const turnIndicator = screen.getByText(/black/i);
        expect(turnIndicator).toBeInTheDocument();
        expect(turnIndicator.textContent).toMatch(/black.*turn/i);
      });

      // Black moves
      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        const turnIndicator = screen.getByText(/white/i);
        expect(turnIndicator).toBeInTheDocument();
        expect(turnIndicator.textContent).toMatch(/white.*turn/i);
      });
    });

    it("should not display authentication or user account UI", () => {
      renderApp();

      // Check that no authentication-related elements exist
      expect(
        screen.queryByText(/login|sign in|sign up|register|account|user|profile/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: /email|username|password/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /login|sign in|sign up|register/i })
      ).not.toBeInTheDocument();
    });

    it("should support full game flow: start, play moves, undo, reset, continue play", async () => {
      const user = userEvent.setup();
      renderApp();

      // Start game - make initial moves
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
        expect(screen.getByText(/e4/)).toBeInTheDocument();
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
        expect(screen.getByText(/e5/)).toBeInTheDocument();
      });

      // Undo last move
      const undoButton = screen.getByRole("button", { name: /undo/i });
      await user.click(undoButton);

      await waitFor(() => {
        expect(e5Square).not.toHaveTextContent("♟");
        expect(screen.queryByText(/e5/)).not.toBeInTheDocument();
      });

      // After undo, the board should be back to the state after e4
      // After e4, it becomes Black's turn, so after undoing e5, it should be Black's turn
      await waitFor(() => {
        // Verify the board state: e4 should still be there
        expect(e4Square).toHaveTextContent("♙");
        // The turn indicator should reflect the current board state (Black's turn after e4)
        const turnIndicator = screen.getByText(/black/i);
        expect(turnIndicator).toBeInTheDocument();
        expect(turnIndicator.textContent).toMatch(/black.*turn/i);
      });

      // Reset game
      const resetButton = screen.getByRole("button", { name: /reset|new game/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(e2Square).toHaveTextContent("♙");
        expect(e4Square).not.toHaveTextContent("♙");
        expect(screen.queryByText(/e4/)).not.toBeInTheDocument();
        // After reset, turn should be White (initial state)
        const turnIndicatorAfterReset = screen.getByText(/white/i);
        expect(turnIndicatorAfterReset).toBeInTheDocument();
        expect(turnIndicatorAfterReset.textContent).toMatch(/white.*turn/i);
      });

      // Continue play after reset
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
        expect(screen.getByText(/e4/)).toBeInTheDocument();
        const turnIndicator = screen.getByText(/black/i);
        expect(turnIndicator).toBeInTheDocument();
        expect(turnIndicator.textContent).toMatch(/black.*turn/i);
      });
    });
  });

  describe("Kifu review / replay controls (Issue #10)", () => {
    it("should render Previous move and Next move buttons", () => {
      renderApp();
      const previousButton = screen.getByRole("button", { name: /previous move/i });
      const nextButton = screen.getByRole("button", { name: /next move/i });
      expect(previousButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it("should disable Previous move button at start of game", () => {
      renderApp();
      const previousButton = screen.getByRole("button", { name: /previous move/i });
      expect(previousButton).toBeDisabled();
    });

    it("should disable Next move button at end of game", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make a move to have some history
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      // Next move button should be disabled at end
      const nextButton = screen.getByRole("button", { name: /next move/i });
      expect(nextButton).toBeDisabled();
    });

    it("should step backward through moves with Previous move button", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make two moves: e2->e4, e7->e5
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
      });

      // Click Previous move button
      const previousButton = screen.getByRole("button", { name: /previous move/i });
      await user.click(previousButton);

      await waitFor(() => {
        // Board should show position after first move (e4)
        expect(e4Square).toHaveTextContent("♙");
        expect(e5Square).not.toHaveTextContent("♟");
        // First move should be highlighted in kifu
        const e4Move = screen.getByText(/e4/);
        expect(e4Move).toHaveClass("current-move");
      });
    });

    it("should step forward through moves with Next move button", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make two moves: e2->e4, e7->e5
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
      });

      // Jump back to first move
      const e4Move = screen.getByText(/e4/);
      await user.click(e4Move);

      await waitFor(() => {
        expect(e5Square).not.toHaveTextContent("♟");
      });

      // Click Next move button
      const nextButton = screen.getByRole("button", { name: /next move/i });
      await user.click(nextButton);

      await waitFor(() => {
        // Board should show position after second move (e5)
        expect(e4Square).toHaveTextContent("♙");
        expect(e5Square).toHaveTextContent("♟");
        // Second move should be highlighted in kifu
        const e5Move = screen.getByText(/e5/);
        expect(e5Move).toHaveClass("current-move");
      });
    });

    it("should correctly handle boundary conditions at start of game", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make a move
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const previousButton = screen.getByRole("button", { name: /previous move/i });
      const nextButton = screen.getByRole("button", { name: /next move/i });

      // Step back to initial position
      await user.click(previousButton);

      await waitFor(() => {
        expect(e4Square).not.toHaveTextContent("♙");
      });

      expect(previousButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();

      // Clicking Previous again should not change state
      await user.click(previousButton);

      await waitFor(() => {
        expect(e4Square).not.toHaveTextContent("♙");
      });
    });

    it("should correctly handle boundary conditions at end of game", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make a move
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      // Next move button should be disabled at end
      const nextButton = screen.getByRole("button", { name: /next move/i });
      expect(nextButton).toBeDisabled();

      // Clicking it should not change state
      await user.click(nextButton);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });
    });

    it("should sync board state and kifu highlight when stepping through moves", async () => {
      const user = userEvent.setup();
      renderApp();

      // Make three moves: e2->e4, e7->e5, g1->f3
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      const e7Square = screen.getByLabelText(/square e7/i);
      const e5Square = screen.getByLabelText(/square e5/i);
      await user.click(e7Square);
      await user.click(e5Square);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
      });

      const g1Square = screen.getByLabelText(/square g1/i);
      const f3Square = screen.getByLabelText(/square f3/i);
      await user.click(g1Square);
      await user.click(f3Square);

      await waitFor(() => {
        expect(f3Square).toHaveTextContent("♞");
      });

      const previousButton = screen.getByRole("button", { name: /previous move/i });

      // Step back through the entire kifu to reach the initial board
      await user.click(previousButton);
      await user.click(previousButton);
      await user.click(previousButton);

      await waitFor(() => {
        expect(e4Square).not.toHaveTextContent("♙");
        expect(e5Square).not.toHaveTextContent("♟");
        expect(f3Square).not.toHaveTextContent("♞");
      });

      // Even while previewing the start, the full move list should remain visible
      const e5MoveElementPreview = screen.getByText(/e5/);
      expect(e5MoveElementPreview).toBeInTheDocument();
      expect(e5MoveElementPreview).not.toHaveClass("current-move");

      // Step forward through moves
      const nextButton = screen.getByRole("button", { name: /next move/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
        const e4MoveElement = screen.getByText(/e4/);
        expect(e4MoveElement).toHaveClass("current-move");
      });

      await user.click(nextButton);

      await waitFor(() => {
        expect(e5Square).toHaveTextContent("♟");
        const e5MoveElement = screen.getByText(/e5/);
        expect(e5MoveElement).toHaveClass("current-move");
      });

      await user.click(nextButton);

      await waitFor(() => {
        expect(f3Square).toHaveTextContent("♞");
        const f3MoveElement = screen.getByText(/Nf3/);
        expect(f3MoveElement).toHaveClass("current-move");
      });

      // Step backward
      await user.click(previousButton);

      await waitFor(() => {
        expect(f3Square).not.toHaveTextContent("♞");
        expect(e5Square).toHaveTextContent("♟");
        const e5MoveElement = screen.getByText(/e5/);
        expect(e5MoveElement).toHaveClass("current-move");
      });
    });
  });

  describe("Responsive layout (Issue #11)", () => {
    it("should render board and kifu in the layout structure", () => {
      renderApp();

      const boardSection = document.querySelector(".app-board-section");
      const sidebar = document.querySelector(".app-sidebar");
      const content = document.querySelector(".app-content");

      expect(boardSection).toBeInTheDocument();
      expect(sidebar).toBeInTheDocument();
      expect(content).toBeInTheDocument();

      // Verify that content container has the expected class for styling
      expect(content).toHaveClass("app-content");
    });

    it("should render both board and kifu elements", () => {
      renderApp();

      const boardSection = document.querySelector(".app-board-section");
      const sidebar = document.querySelector(".app-sidebar");

      expect(boardSection).toBeInTheDocument();
      expect(sidebar).toBeInTheDocument();

      // Both elements should be rendered and accessible
      const board = screen.getByRole("grid", { name: "Chess board" });
      const moveList = screen.getByRole("list", { name: /move list/i });

      expect(board).toBeInTheDocument();
      expect(moveList).toBeInTheDocument();
    });

    it("should have responsive CSS classes applied", () => {
      renderApp();

      const content = document.querySelector(".app-content");
      const boardSection = document.querySelector(".app-board-section");
      const sidebar = document.querySelector(".app-sidebar");

      // Verify CSS classes are present for responsive styling
      expect(content).toHaveClass("app-content");
      expect(boardSection).toHaveClass("app-board-section");
      expect(sidebar).toHaveClass("app-sidebar");
    });
  });
});
