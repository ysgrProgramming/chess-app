import { describe, it, expect, beforeEach } from "vitest";

import {
  createInitialBoardState,
  validateMove,
  applyMove,
  getLegalMoves
} from "../../src/lib/chessEngine";
import type { Move, BoardState } from "../../src/lib/types";

describe("Chess Engine", () => {
  describe("createInitialBoardState", () => {
    it("should create initial board state with all pieces in correct positions", () => {
      const boardState = createInitialBoardState();

      expect(boardState.activeColor).toBe("white");
      expect(boardState.squares.get("a1")).toEqual({ color: "white", type: "rook" });
      expect(boardState.squares.get("e1")).toEqual({ color: "white", type: "king" });
      expect(boardState.squares.get("a8")).toEqual({ color: "black", type: "rook" });
      expect(boardState.squares.get("e8")).toEqual({ color: "black", type: "king" });
      expect(boardState.castlingRights.whiteKingSide).toBe(true);
      expect(boardState.castlingRights.whiteQueenSide).toBe(true);
      expect(boardState.castlingRights.blackKingSide).toBe(true);
      expect(boardState.castlingRights.blackQueenSide).toBe(true);
    });
  });

  describe("validateMove", () => {
    let initialBoardState: BoardState;

    beforeEach(() => {
      initialBoardState = createInitialBoardState();
    });

    it("should validate legal pawn move from e2 to e4", () => {
      const move: Move = { from: "e2", to: "e4" };
      const result = validateMove(initialBoardState, move);

      expect(result.valid).toBe(true);
    });

    it("should reject illegal pawn move from e2 to e5 (too far)", () => {
      const move: Move = { from: "e2", to: "e5" };
      const result = validateMove(initialBoardState, move);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBeDefined();
      }
    });

    it("should reject move when it is not the active player's turn", () => {
      const boardState: BoardState = {
        ...initialBoardState,
        activeColor: "black"
      };
      const move: Move = { from: "e2", to: "e4" };
      const result = validateMove(boardState, move);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("turn");
      }
    });

    it("should reject move from empty square", () => {
      const move: Move = { from: "e4", to: "e5" };
      const result = validateMove(initialBoardState, move);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("empty");
      }
    });

    it("should reject move to square occupied by own piece", () => {
      const move: Move = { from: "e2", to: "e1" };
      const result = validateMove(initialBoardState, move);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("own piece");
      }
    });

    it("should validate legal knight move from b1 to c3", () => {
      const move: Move = { from: "b1", to: "c3" };
      const result = validateMove(initialBoardState, move);

      expect(result.valid).toBe(true);
    });

    it("should reject illegal knight move", () => {
      const move: Move = { from: "b1", to: "b2" };
      const result = validateMove(initialBoardState, move);

      expect(result.valid).toBe(false);
    });

    it("should reject move that puts own king in check", () => {
      // Create a board state where moving a piece would expose the king
      // f1 rook protects e1 king from e8 queen (vertical attack).
      // Moving the rook away exposes the king to check.
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["f1", { color: "white", type: "rook" }], // Rook on f1 protects e1
          ["e8", { color: "black", type: "queen" }], // Queen attacks vertically from e8
          ["f8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      // Move rook away, exposing king to check
      const move: Move = { from: "f1", to: "f2" };
      const result = validateMove(boardState, move);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("check");
      }
    });
  });

  describe("applyMove", () => {
    let initialBoardState: BoardState;

    beforeEach(() => {
      initialBoardState = createInitialBoardState();
    });

    it("should apply legal pawn move and update board state", () => {
      const move: Move = { from: "e2", to: "e4" };
      const newBoardState = applyMove(initialBoardState, move);

      expect(newBoardState.squares.get("e2")).toBeUndefined();
      expect(newBoardState.squares.get("e4")).toEqual({ color: "white", type: "pawn" });
      expect(newBoardState.activeColor).toBe("black");
    });

    it("should throw error when applying illegal move", () => {
      const move: Move = { from: "e2", to: "e5" };
      const validation = validateMove(initialBoardState, move);

      if (!validation.valid) {
        expect(() => applyMove(initialBoardState, move)).toThrow();
      }
    });

    it("should update turn order after applying move", () => {
      const move: Move = { from: "e2", to: "e4" };
      const newBoardState = applyMove(initialBoardState, move);

      expect(newBoardState.activeColor).toBe("black");
    });

    it("should handle capture move correctly", () => {
      // Set up a board where white can capture black piece
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["e2", { color: "white", type: "pawn" }],
          ["d3", { color: "black", type: "pawn" }]
        ]),
        activeColor: "white"
      };
      const move: Move = { from: "e2", to: "d3" };
      const newBoardState = applyMove(boardState, move);

      expect(newBoardState.squares.get("d3")).toEqual({ color: "white", type: "pawn" });
      expect(newBoardState.squares.get("e2")).toBeUndefined();
    });
  });

  describe("Turn order enforcement", () => {
    it("should enforce White → Black → White turn order", () => {
      let boardState = createInitialBoardState();

      expect(boardState.activeColor).toBe("white");

      const move1: Move = { from: "e2", to: "e4" };
      boardState = applyMove(boardState, move1);
      expect(boardState.activeColor).toBe("black");

      const move2: Move = { from: "e7", to: "e5" };
      boardState = applyMove(boardState, move2);
      expect(boardState.activeColor).toBe("white");
    });
  });

  describe("getLegalMoves", () => {
    let initialBoardState: BoardState;

    beforeEach(() => {
      initialBoardState = createInitialBoardState();
    });

    it("should return legal moves for a pawn in opening position", () => {
      const legalMoves = getLegalMoves(initialBoardState, "e2");

      expect(legalMoves).toContain("e3");
      expect(legalMoves).toContain("e4");
      expect(legalMoves.length).toBe(2);
    });

    it("should return legal moves for a knight in opening position", () => {
      const legalMoves = getLegalMoves(initialBoardState, "b1");

      expect(legalMoves).toContain("a3");
      expect(legalMoves).toContain("c3");
      expect(legalMoves.length).toBe(2);
    });

    it("should return empty array for empty square", () => {
      const legalMoves = getLegalMoves(initialBoardState, "e4");

      expect(legalMoves).toEqual([]);
    });

    it("should return empty array for opponent piece", () => {
      const legalMoves = getLegalMoves(initialBoardState, "e7");

      expect(legalMoves).toEqual([]);
    });

    it("should return legal moves excluding moves that put king in check", () => {
      // Create a board state where moving a piece would expose the king
      // f1 rook protects e1 king from e8 queen (vertical attack)
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["f1", { color: "white", type: "rook" }], // Rook on f1 protects e1
          ["e8", { color: "black", type: "queen" }], // Queen attacks vertically from e8
          ["f8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      // Moving rook away (f2, f3, etc.) would expose king to check
      // In this setup, all moves from f1 expose the king, so no legal moves
      const legalMoves = getLegalMoves(boardState, "f1");

      expect(legalMoves).not.toContain("f2");
      expect(legalMoves).not.toContain("f3");
      expect(legalMoves).not.toContain("f4");
      // Verify that moves that would expose king are excluded
      // Note: In this specific setup, f1 rook has no legal moves because
      // all moves expose the king to check from e8 queen
      expect(legalMoves).toEqual([]);
    });

    it("should return legal moves for a piece that can capture", () => {
      // Set up a board where white pawn can capture black piece
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["e2", { color: "white", type: "pawn" }],
          ["d3", { color: "black", type: "pawn" }]
        ]),
        activeColor: "white"
      };
      const legalMoves = getLegalMoves(boardState, "e2");

      expect(legalMoves).toContain("d3"); // Capture move
      expect(legalMoves).toContain("e3"); // Forward move
      expect(legalMoves).toContain("e4"); // Double forward move
    });
  });

  describe("Castling", () => {
    let initialBoardState: BoardState;

    beforeEach(() => {
      initialBoardState = createInitialBoardState();
    });

    describe("King-side castling", () => {
      it("should validate white king-side castling when conditions are met", () => {
        // Clear path between king and rook
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "g1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(true);
      });

      it("should validate black king-side castling when conditions are met", () => {
        // Clear path between king and rook
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }]
          ]),
          activeColor: "black",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e8", to: "g8" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(true);
      });

      it("should reject castling when king has moved", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false, // King has moved
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "g1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });

      it("should reject castling when rook has moved", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false, // Rook has moved
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "g1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
      });

      it("should reject castling when path is blocked", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["f1", { color: "white", type: "bishop" }], // Blocking path
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "g1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });

      it("should reject castling when king is in check", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["e7", { color: "black", type: "queen" }] // Attacking e1
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "g1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toContain("check");
        }
      });

      it("should reject castling when transit square is under attack", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["f7", { color: "black", type: "queen" }] // Attacking f1
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "g1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });

      it("should apply white king-side castling correctly", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "g1" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.squares.get("e1")).toBeUndefined();
        expect(newBoardState.squares.get("g1")).toEqual({ color: "white", type: "king" });
        expect(newBoardState.squares.get("h1")).toBeUndefined();
        expect(newBoardState.squares.get("f1")).toEqual({ color: "white", type: "rook" });
        expect(newBoardState.castlingRights.whiteKingSide).toBe(false);
        expect(newBoardState.castlingRights.whiteQueenSide).toBe(false);
      });

      it("should apply black king-side castling correctly", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }]
          ]),
          activeColor: "black",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e8", to: "g8" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.squares.get("e8")).toBeUndefined();
        expect(newBoardState.squares.get("g8")).toEqual({ color: "black", type: "king" });
        expect(newBoardState.squares.get("h8")).toBeUndefined();
        expect(newBoardState.squares.get("f8")).toEqual({ color: "black", type: "rook" });
        expect(newBoardState.castlingRights.blackKingSide).toBe(false);
        expect(newBoardState.castlingRights.blackQueenSide).toBe(false);
      });
    });

    describe("Queen-side castling", () => {
      it("should validate white queen-side castling when conditions are met", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["a8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "c1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(true);
      });

      it("should validate black queen-side castling when conditions are met", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["a8", { color: "black", type: "rook" }]
          ]),
          activeColor: "black",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e8", to: "c8" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(true);
      });

      it("should reject queen-side castling when path is blocked", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["b1", { color: "white", type: "knight" }], // Blocking path
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["a8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "c1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
      });

      it("should reject queen-side castling when transit square is under attack", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["d7", { color: "black", type: "queen" }] // Attacking d1
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "c1" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
      });

      it("should apply white queen-side castling correctly", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["a8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e1", to: "c1" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.squares.get("e1")).toBeUndefined();
        expect(newBoardState.squares.get("c1")).toEqual({ color: "white", type: "king" });
        expect(newBoardState.squares.get("a1")).toBeUndefined();
        expect(newBoardState.squares.get("d1")).toEqual({ color: "white", type: "rook" });
        expect(newBoardState.castlingRights.whiteKingSide).toBe(false);
        expect(newBoardState.castlingRights.whiteQueenSide).toBe(false);
      });

      it("should apply black queen-side castling correctly", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["a8", { color: "black", type: "rook" }]
          ]),
          activeColor: "black",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "e8", to: "c8" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.squares.get("e8")).toBeUndefined();
        expect(newBoardState.squares.get("c8")).toEqual({ color: "black", type: "king" });
        expect(newBoardState.squares.get("a8")).toBeUndefined();
        expect(newBoardState.squares.get("d8")).toEqual({ color: "black", type: "rook" });
        expect(newBoardState.castlingRights.blackKingSide).toBe(false);
        expect(newBoardState.castlingRights.blackQueenSide).toBe(false);
      });
    });

    describe("Castling rights revocation on rook capture", () => {
      it("should revoke white king-side castling right when h1 rook is captured", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["h8", { color: "black", type: "queen" }]
          ]),
          activeColor: "black",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "h8", to: "h1" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.castlingRights.whiteKingSide).toBe(false);
        expect(newBoardState.castlingRights.whiteQueenSide).toBe(true);
      });

      it("should revoke white queen-side castling right when a1 rook is captured", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["a8", { color: "black", type: "queen" }]
          ]),
          activeColor: "black",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "a8", to: "a1" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.castlingRights.whiteQueenSide).toBe(false);
        expect(newBoardState.castlingRights.whiteKingSide).toBe(true);
      });

      it("should revoke black king-side castling right when h8 rook is captured", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }],
            ["h1", { color: "white", type: "queen" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "h1", to: "h8" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.castlingRights.blackKingSide).toBe(false);
        expect(newBoardState.castlingRights.blackQueenSide).toBe(true);
      });

      it("should revoke black queen-side castling right when a8 rook is captured", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e8", { color: "black", type: "king" }],
            ["a8", { color: "black", type: "rook" }],
            ["a1", { color: "white", type: "queen" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
          }
        };
        const move: Move = { from: "a1", to: "a8" };
        const newBoardState = applyMove(boardState, move);

        expect(newBoardState.castlingRights.blackQueenSide).toBe(false);
        expect(newBoardState.castlingRights.blackKingSide).toBe(true);
      });
    });
  });
});
