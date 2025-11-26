import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { MoveList } from "../../src/components/MoveList";
import type { Move } from "../../src/lib/types";

describe("MoveList", () => {
  describe("Rendering", () => {
    it("should render empty list when no moves provided", () => {
      render(<MoveList moves={[]} />);
      const moveList = screen.getByRole("list", { name: /move list/i });
      expect(moveList).toBeInTheDocument();
      expect(moveList).toBeEmptyDOMElement();
    });

    it("should render moves in SAN notation", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" }
      ];
      render(<MoveList moves={moves} />);

      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText(/e4/)).toBeInTheDocument();
      expect(screen.getByText(/e5/)).toBeInTheDocument();
      expect(screen.getByText(/Nf3/)).toBeInTheDocument();
    });

    it("should display move numbers correctly", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
        { from: "b8", to: "c6" }
      ];
      render(<MoveList moves={moves} />);

      // First move pair (1. e4 e5)
      expect(screen.getByText(/1\./)).toBeInTheDocument();
      // Second move pair (2. Nf3 Nc6)
      expect(screen.getByText(/2\./)).toBeInTheDocument();
    });

    it("should handle odd number of moves (white move without black response)", () => {
      const moves: Move[] = [{ from: "e2", to: "e4" }];
      render(<MoveList moves={moves} />);

      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText(/e4/)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA label", () => {
      render(<MoveList moves={[]} />);
      const moveList = screen.getByRole("list", { name: /move list/i });
      expect(moveList).toBeInTheDocument();
    });
  });
});
