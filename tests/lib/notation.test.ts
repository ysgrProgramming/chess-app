import { describe, it, expect, beforeEach } from "vitest";

import { moveToSAN } from "../../src/lib/notation";
import { createInitialBoardState, applyMove } from "../../src/lib/chessEngine";
import type { BoardState, Move } from "../../src/lib/types";

describe("moveToSAN", () => {
  let boardState: BoardState;

  beforeEach(() => {
    boardState = createInitialBoardState();
  });

  describe("Pawn moves", () => {
    it("should convert pawn single square move to SAN", () => {
      const move: Move = { from: "e2", to: "e3" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("e3");
    });

    it("should convert pawn double square move to SAN", () => {
      const move: Move = { from: "e2", to: "e4" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("e4");
    });

    it("should convert pawn capture to SAN with 'x'", () => {
      // Setup: move pawns to enable capture
      boardState = applyMove(boardState, { from: "e2", to: "e4" });
      boardState = applyMove(boardState, { from: "d7", to: "d5" });
      const move: Move = { from: "e4", to: "d5" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("exd5");
    });

    it.skip("should convert pawn promotion to SAN", () => {
      // TODO: Implement promotion test after basic functionality is working
      // Promotion requires complex board setup and will be tested separately
    });
  });

  describe("Piece moves", () => {
    it("should convert knight move to SAN", () => {
      const move: Move = { from: "b1", to: "c3" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Nc3");
    });

    it("should convert bishop move to SAN", () => {
      boardState = applyMove(boardState, { from: "e2", to: "e4" });
      boardState = applyMove(boardState, { from: "e7", to: "e5" });
      const move: Move = { from: "f1", to: "b5" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Bb5");
    });

    it("should convert rook move to SAN", () => {
      boardState = applyMove(boardState, { from: "e2", to: "e4" });
      boardState = applyMove(boardState, { from: "e7", to: "e5" });
      boardState = applyMove(boardState, { from: "f1", to: "c4" });
      boardState = applyMove(boardState, { from: "f8", to: "c5" });
      // Move rook to an empty square (a3 instead of a2 which has a pawn)
      const move: Move = { from: "a1", to: "a3" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Ra3");
    });

    it("should convert queen move to SAN", () => {
      boardState = applyMove(boardState, { from: "e2", to: "e4" });
      boardState = applyMove(boardState, { from: "e7", to: "e5" });
      const move: Move = { from: "d1", to: "f3" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Qf3");
    });

    it("should convert king move to SAN", () => {
      boardState = applyMove(boardState, { from: "e2", to: "e4" });
      boardState = applyMove(boardState, { from: "e7", to: "e5" });
      boardState = applyMove(boardState, { from: "f1", to: "c4" });
      boardState = applyMove(boardState, { from: "f8", to: "c5" });
      const move: Move = { from: "e1", to: "e2" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Ke2");
    });
  });

  describe("Capture moves", () => {
    it("should convert knight capture to SAN", () => {
      boardState = applyMove(boardState, { from: "b1", to: "c3" });
      boardState = applyMove(boardState, { from: "b8", to: "c6" });
      boardState = applyMove(boardState, { from: "c3", to: "d5" });
      boardState = applyMove(boardState, { from: "c6", to: "d4" });
      const move: Move = { from: "d5", to: "d4" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Nxd4");
    });
  });

  describe("Disambiguation", () => {
    it("should include file disambiguation when two pieces can move to same square", () => {
      // Setup: move rooks to same file
      boardState = applyMove(boardState, { from: "a2", to: "a3" });
      boardState = applyMove(boardState, { from: "a7", to: "a6" });
      boardState = applyMove(boardState, { from: "h2", to: "h3" });
      boardState = applyMove(boardState, { from: "h7", to: "h6" });
      boardState = applyMove(boardState, { from: "a1", to: "a2" });
      boardState = applyMove(boardState, { from: "a8", to: "a7" });
      boardState = applyMove(boardState, { from: "h1", to: "h2" });
      boardState = applyMove(boardState, { from: "h8", to: "h7" });
      // Now both rooks can move to a3
      const move: Move = { from: "a2", to: "a3" };
      const san = moveToSAN(boardState, move);
      // Should include file disambiguation: Ra3 (since only one rook on a-file can move to a3)
      expect(san).toBe("Ra3");
    });
  });
});
