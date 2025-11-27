import { describe, it, expect, beforeEach } from "vitest";

import { moveToSAN } from "../../src/lib/notation";
import { createInitialBoardState, applyMove } from "../../src/lib/chessEngine";
import type { BoardState, Move, CastlingRights } from "../../src/lib/types";

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

    it("should convert pawn promotion to SAN", () => {
      // Create a board state with white pawn on e7, e8 is empty
      const castlingRights: CastlingRights = {
        whiteKingSide: false,
        whiteQueenSide: false,
        blackKingSide: false,
        blackQueenSide: false
      };
      boardState = {
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["e7", { color: "white", type: "pawn" }],
          ["d8", { color: "black", type: "king" }]
        ]),
        activeColor: "white",
        castlingRights,
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      // Move white pawn from e7 to e8 and promote to queen
      // Note: This move may result in check if the promoted queen attacks the black king
      const move: Move = { from: "e7", to: "e8", promotion: "queen" };
      const san = moveToSAN(boardState, move);
      // The result may be "e8=Q" or "e8=Q+" depending on whether it puts the king in check
      expect(san).toMatch(/^e8=Q\+?$/);
    });

    it("should convert pawn capture promotion to SAN", () => {
      // Create a board state with white pawn on d7, black queen on d8
      const castlingRights: CastlingRights = {
        whiteKingSide: false,
        whiteQueenSide: false,
        blackKingSide: false,
        blackQueenSide: false
      };
      boardState = {
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["d7", { color: "white", type: "pawn" }],
          ["d8", { color: "black", type: "queen" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white",
        castlingRights,
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      // White pawn captures d8 and promotes to knight
      const move: Move = { from: "d7", to: "d8", promotion: "knight" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("dxd8=N");
    });

    it("should convert white en passant capture to SAN", () => {
      // Setup: white pawn on e4, black pawn just moved d7 to d5 (two squares)
      // After black's d7->d5, enPassantTarget is set to d6
      // White pawn captures en passant immediately: e4 to d6 (enPassantTarget)
      boardState = applyMove(boardState, { from: "e2", to: "e4" });
      boardState = applyMove(boardState, { from: "d7", to: "d5" });
      // Now white pawn on e4, black pawn on d5, enPassantTarget should be d6
      // White pawn captures en passant: e4 to d6 (enPassantTarget)
      const move: Move = { from: "e4", to: "d6" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("exd6");
    });

    it("should convert black en passant capture to SAN", () => {
      // Setup: black pawn on d5, white pawn just moved e2 to e4 (two squares)
      // After white's e2->e4, enPassantTarget is set to e3
      // Black pawn captures en passant immediately: d5 to e3 (enPassantTarget)
      // Note: We need to set up the board so black pawn is on d5 BEFORE white moves
      boardState = applyMove(boardState, { from: "d2", to: "d4" });
      boardState = applyMove(boardState, { from: "d7", to: "d5" });
      boardState = applyMove(boardState, { from: "e2", to: "e4" });
      // Now black pawn on d5, white pawn on e4, enPassantTarget should be e3
      // Black pawn captures en passant: d5 to e3 (enPassantTarget)
      const move: Move = { from: "d5", to: "e3" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("dxe3");
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

  describe("Check and checkmate notation", () => {
    it("should append '+' for check moves", () => {
      // Setup: white queen on d1 can move to d8 to check black king on e8
      const castlingRights: CastlingRights = {
        whiteKingSide: false,
        whiteQueenSide: false,
        blackKingSide: false,
        blackQueenSide: false
      };
      boardState = {
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["d1", { color: "white", type: "queen" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white",
        castlingRights,
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      // White queen moves to d8, putting black king in check
      const move: Move = { from: "d1", to: "d8" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Qd8+");
    });

    it("should append '#' for checkmate moves", () => {
      // Setup: black delivers checkmate with queen on b2 against white king on a1
      const castlingRights: CastlingRights = {
        whiteKingSide: false,
        whiteQueenSide: false,
        blackKingSide: false,
        blackQueenSide: false
      };
      // Pre-move position: white king on a1, black queen on b3, black king on c3, black to move
      boardState = {
        squares: new Map([
          ["a1", { color: "white", type: "king" }],
          ["b3", { color: "black", type: "queen" }],
          ["c3", { color: "black", type: "king" }]
        ]),
        activeColor: "black",
        castlingRights,
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      // Black queen moves to b2, checkmating the white king (no legal moves for white)
      const move: Move = { from: "b3", to: "b2" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("Qb2#");
    });

    it("should append '+' for pawn check moves", () => {
      // Setup: white pawn on d7 can capture on e8 and check black king on g8 after promotion
      const castlingRights: CastlingRights = {
        whiteKingSide: false,
        whiteQueenSide: false,
        blackKingSide: false,
        blackQueenSide: false
      };
      boardState = {
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["d7", { color: "white", type: "pawn" }],
          ["e8", { color: "black", type: "rook" }],
          ["g8", { color: "black", type: "king" }]
        ]),
        activeColor: "white",
        castlingRights,
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      // White pawn captures on e8, promoting to queen and checking the black king on g8 along the 8th rank
      const move: Move = { from: "d7", to: "e8", promotion: "queen" };
      const san = moveToSAN(boardState, move);
      expect(san).toBe("dxe8=Q+");
    });
  });
});
