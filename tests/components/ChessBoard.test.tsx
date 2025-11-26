import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChessBoard } from "../../src/components/ChessBoard";
import { validateMove, applyMove } from "../../src/lib/chessEngine";

// Mock the chess engine functions to track calls
vi.mock("../../src/lib/chessEngine", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/chessEngine")>(
    "../../src/lib/chessEngine"
  );
  return {
    ...actual,
    validateMove: vi.fn(actual.validateMove),
    applyMove: vi.fn(actual.applyMove)
  };
});

describe("ChessBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering with initial state", () => {
    it("should render an 8x8 board with correct initial piece placement", () => {
      render(<ChessBoard />);

      // Check that board has 64 squares (8x8)
      const squares = screen.getAllByRole("gridcell");
      expect(squares).toHaveLength(64);

      // Check that white pieces are in correct positions
      const whiteRook = screen.getByLabelText(/white rook/i);
      expect(whiteRook).toBeInTheDocument();
      const whiteKing = screen.getByLabelText(/white king/i);
      expect(whiteKing).toBeInTheDocument();

      // Check that black pieces are in correct positions
      const blackRook = screen.getByLabelText(/black rook/i);
      expect(blackRook).toBeInTheDocument();
      const blackKing = screen.getByLabelText(/black king/i);
      expect(blackKing).toBeInTheDocument();
    });

    it("should display whose turn it is", () => {
      render(<ChessBoard />);

      expect(screen.getByText(/white.*turn/i)).toBeInTheDocument();
    });
  });

  describe("Interaction calling the rules engine for validation", () => {
    it("should call validateMove when attempting a move via tap/click", async () => {
      const user = userEvent.setup();
      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);
      const toSquare = screen.getByLabelText(/square e4/i);

      // Click source square
      await user.click(fromSquare);
      // Click destination square
      await user.click(toSquare);

      await waitFor(() => {
        expect(validateMove).toHaveBeenCalled();
        const calls = vi.mocked(validateMove).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const lastCall = calls[calls.length - 1];
        expect(lastCall[1]).toEqual({ from: "e2", to: "e4" });
      });
    });

    it("should revert illegal moves visually", async () => {
      const user = userEvent.setup();
      // Mock validateMove to return invalid for e2->e5 (pawn cannot move 3 squares)
      vi.mocked(validateMove).mockImplementation((state, move) => {
        if (move.from === "e2" && move.to === "e5") {
          return { valid: false, reason: "Invalid pawn move" };
        }
        // For other moves, call the actual implementation
        const actualModule = vi.importActual<typeof import("../../src/lib/chessEngine")>(
          "../../src/lib/chessEngine"
        );
        return actualModule.validateMove(state, move);
      });

      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);
      const toSquare = screen.getByLabelText(/square e5/i);

      // Verify initial state: pawn is on e2
      expect(fromSquare).toHaveTextContent("♙");

      await user.click(fromSquare);
      await user.click(toSquare);

      await waitFor(() => {
        // Piece should remain on e2 (original position) - illegal move reverted
        expect(screen.getByLabelText(/square e2/i)).toHaveTextContent("♙");
        expect(screen.getByLabelText(/square e5/i)).not.toHaveTextContent("♙");
      });
    });

    it("should apply legal moves and update the board", async () => {
      const user = userEvent.setup();
      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);
      const toSquare = screen.getByLabelText(/square e4/i);

      // Verify initial state: pawn is on e2
      expect(fromSquare).toHaveTextContent("♙");
      expect(toSquare).not.toHaveTextContent("♙");

      await user.click(fromSquare);
      await user.click(toSquare);

      await waitFor(() => {
        expect(validateMove).toHaveBeenCalled();
        expect(applyMove).toHaveBeenCalled();
        // Piece should move to e4
        expect(screen.getByLabelText(/square e4/i)).toHaveTextContent("♙");
        expect(screen.getByLabelText(/square e2/i)).not.toHaveTextContent("♙");
      });
    });
  });
});

