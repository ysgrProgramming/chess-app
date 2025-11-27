import React from "react";
import { describe, expect, it, test } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../src/App";

describe("App", () => {
  test("renders application title and chessboard", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Chess Practice App" })).toBeInTheDocument();

    // Check that chessboard is rendered
    expect(screen.getByRole("grid", { name: "Chess board" })).toBeInTheDocument();
  });

  describe("Undo functionality", () => {
    it("should render undo button", () => {
      render(<App />);
      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toBeInTheDocument();
    });

    it("should be disabled when there are no moves", () => {
      render(<App />);
      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toBeDisabled();
    });

    it("should undo exactly one move and update board and kifu", async () => {
      const user = userEvent.setup();
      render(<App />);

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
      render(<App />);

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
      render(<App />);

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
      render(<App />);

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
      render(<App />);
      const resetButton = screen.getByRole("button", { name: /reset|new game/i });
      expect(resetButton).toBeInTheDocument();
    });

    it("should reset to initial position and clear kifu", async () => {
      const user = userEvent.setup();
      render(<App />);

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
      render(<App />);

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
      render(<App />);
      // Initially white's turn
      const turnIndicator = screen.getByText(/white/i);
      expect(turnIndicator).toBeInTheDocument();
      expect(turnIndicator.textContent).toMatch(/white.*turn/i);
    });

    it("should allow two players to alternate moves on the same device", async () => {
      const user = userEvent.setup();
      render(<App />);

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
      render(<App />);

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
      render(<App />);

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
      render(<App />);

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
      render(<App />);

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
});
