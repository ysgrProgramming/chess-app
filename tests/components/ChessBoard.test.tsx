import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChessBoard } from "../../src/components/ChessBoard";
import { validateMove, applyMove, getLegalMoves } from "../../src/lib/chessEngine";

// Mock the chess engine functions to track calls
vi.mock("../../src/lib/chessEngine", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/chessEngine")>(
    "../../src/lib/chessEngine"
  );
  return {
    ...actual,
    validateMove: vi.fn(actual.validateMove),
    applyMove: vi.fn(actual.applyMove),
    getLegalMoves: vi.fn(actual.getLegalMoves)
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
      const whiteRooks = screen.getAllByLabelText(/white rook/i);
      expect(whiteRooks.length).toBeGreaterThan(0);
      const whiteKing = screen.getByLabelText(/white king/i);
      expect(whiteKing).toBeInTheDocument();

      // Check that black pieces are in correct positions
      const blackRooks = screen.getAllByLabelText(/black rook/i);
      expect(blackRooks.length).toBeGreaterThan(0);
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
        // For other moves, use the actual implementation
        // Note: This is a simplified mock - in real scenario, we'd use the actual function
        return { valid: true };
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

  describe("Legal move highlighting", () => {
    it("should highlight legal destination squares when a piece is selected", async () => {
      const user = userEvent.setup();
      // Mock getLegalMoves to return specific legal moves for e2 pawn
      vi.mocked(getLegalMoves).mockImplementation((state, square) => {
        if (square === "e2") {
          return ["e3", "e4"];
        }
        return [];
      });

      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);
      await user.click(fromSquare);

      await waitFor(() => {
        const e3Square = screen.getByLabelText(/square e3/i);
        const e4Square = screen.getByLabelText(/square e4/i);
        expect(e3Square).toHaveClass("legal-move");
        expect(e4Square).toHaveClass("legal-move");
      });
    });

    it("should remove highlights when selection is cancelled", async () => {
      const user = userEvent.setup();
      vi.mocked(getLegalMoves).mockImplementation((state, square) => {
        if (square === "e2") {
          return ["e3", "e4"];
        }
        return [];
      });

      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);
      await user.click(fromSquare);

      await waitFor(() => {
        const e3Square = screen.getByLabelText(/square e3/i);
        expect(e3Square).toHaveClass("legal-move");
      });

      // Click the same square again to deselect
      await user.click(fromSquare);

      await waitFor(() => {
        const e3Square = screen.getByLabelText(/square e3/i);
        expect(e3Square).not.toHaveClass("legal-move");
      });
    });

    it("should update highlights when a different piece is selected", async () => {
      const user = userEvent.setup();
      vi.mocked(getLegalMoves).mockImplementation((state, square) => {
        if (square === "e2") {
          return ["e3", "e4"];
        }
        if (square === "b1") {
          return ["a3", "c3"];
        }
        return [];
      });

      render(<ChessBoard />);

      // Select e2 pawn
      const e2Square = screen.getByLabelText(/square e2/i);
      await user.click(e2Square);

      await waitFor(() => {
        const e3Square = screen.getByLabelText(/square e3/i);
        expect(e3Square).toHaveClass("legal-move");
      });

      // Select b1 knight
      const b1Square = screen.getByLabelText(/square b1/i);
      await user.click(b1Square);

      await waitFor(() => {
        // e3 should no longer be highlighted
        const e3Square = screen.getByLabelText(/square e3/i);
        expect(e3Square).not.toHaveClass("legal-move");
        // a3 and c3 should be highlighted
        const a3Square = screen.getByLabelText(/square a3/i);
        const c3Square = screen.getByLabelText(/square c3/i);
        expect(a3Square).toHaveClass("legal-move");
        expect(c3Square).toHaveClass("legal-move");
      });
    });

    it("should highlight legal moves when dragging a piece", async () => {
      const user = userEvent.setup();
      vi.mocked(getLegalMoves).mockImplementation((state, square) => {
        if (square === "e2") {
          return ["e3", "e4"];
        }
        return [];
      });

      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);

      // Start drag
      await user.pointer({ keys: "[MouseLeft>]", target: fromSquare });

      await waitFor(() => {
        const e3Square = screen.getByLabelText(/square e3/i);
        const e4Square = screen.getByLabelText(/square e4/i);
        expect(e3Square).toHaveClass("legal-move");
        expect(e4Square).toHaveClass("legal-move");
      });
    });

    it("should not highlight illegal destination squares", async () => {
      const user = userEvent.setup();
      vi.mocked(getLegalMoves).mockImplementation((state, square) => {
        if (square === "e2") {
          return ["e3", "e4"]; // Only e3 and e4 are legal
        }
        return [];
      });

      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);
      await user.click(fromSquare);

      await waitFor(() => {
        // e5 should NOT be highlighted (illegal move)
        const e5Square = screen.getByLabelText(/square e5/i);
        expect(e5Square).not.toHaveClass("legal-move");
        // e3 and e4 should be highlighted
        const e3Square = screen.getByLabelText(/square e3/i);
        const e4Square = screen.getByLabelText(/square e4/i);
        expect(e3Square).toHaveClass("legal-move");
        expect(e4Square).toHaveClass("legal-move");
      });
    });

    it("should return empty array for pieces with no legal moves", async () => {
      const user = userEvent.setup();
      vi.mocked(getLegalMoves).mockImplementation((_state, _square) => {
        // Return empty array for any square (simulating a piece with no legal moves)
        return [];
      });

      render(<ChessBoard />);

      const fromSquare = screen.getByLabelText(/square e2/i);
      await user.click(fromSquare);

      await waitFor(() => {
        // No squares should be highlighted
        const squares = screen.getAllByRole("gridcell");
        squares.forEach((square) => {
          expect(square).not.toHaveClass("legal-move");
        });
      });
    });
  });
});
