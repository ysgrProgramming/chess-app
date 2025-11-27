import { describe, it, expect, beforeEach } from "vitest";

import {
  createInitialBoardState,
  validateMove,
  applyMove,
  getLegalMoves,
  evaluateGameResult
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

    it("should validate capture moves for all piece types", () => {
      // Test case from Issue #44: 1. e4 e5 2. Nf3 Nc6 -> Nxe5
      let boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["e4", { color: "white", type: "pawn" }],
          ["f3", { color: "white", type: "knight" }],
          ["e8", { color: "black", type: "king" }],
          ["e5", { color: "black", type: "pawn" }],
          ["c6", { color: "black", type: "knight" }]
        ]),
        activeColor: "white"
      };

      // Test knight capture (Nxe5)
      const knightCapture: Move = { from: "f3", to: "e5" };
      let result = validateMove(boardState, knightCapture);
      expect(result.valid).toBe(true);
    });

    it("should validate rook capture move", () => {
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["a1", { color: "white", type: "rook" }],
          ["a7", { color: "black", type: "pawn" }],
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      const move: Move = { from: "a1", to: "a7" };
      const result = validateMove(boardState, move);

      expect(result.valid).toBe(true);
    });

    it("should validate bishop capture move", () => {
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["c1", { color: "white", type: "bishop" }],
          ["g5", { color: "black", type: "pawn" }],
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      const move: Move = { from: "c1", to: "g5" };
      const result = validateMove(boardState, move);

      expect(result.valid).toBe(true);
    });

    it("should validate queen capture move", () => {
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["d1", { color: "white", type: "queen" }],
          ["d7", { color: "black", type: "pawn" }],
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      const move: Move = { from: "d1", to: "d7" };
      const result = validateMove(boardState, move);

      expect(result.valid).toBe(true);
    });

    it("should validate king capture move", () => {
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["e2", { color: "black", type: "pawn" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      const move: Move = { from: "e1", to: "e2" };
      const result = validateMove(boardState, move);

      expect(result.valid).toBe(true);
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

    it("should handle knight capture move correctly", () => {
      // Set up a board where white knight can capture black piece
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["b1", { color: "white", type: "knight" }],
          ["d2", { color: "black", type: "pawn" }],
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      // Verify initial state: black pawn is on d2
      expect(boardState.squares.get("d2")).toEqual({ color: "black", type: "pawn" });
      const move: Move = { from: "b1", to: "d2" };
      const newBoardState = applyMove(boardState, move);

      // Verify capturing piece moved to destination
      expect(newBoardState.squares.get("d2")).toEqual({ color: "white", type: "knight" });
      // Verify capturing piece removed from source
      expect(newBoardState.squares.get("b1")).toBeUndefined();
      // Verify captured piece is removed (destination should have capturing piece, not captured piece)
      const capturedPieceOnD2 = newBoardState.squares.get("d2");
      expect(capturedPieceOnD2).not.toEqual({ color: "black", type: "pawn" });
      expect(capturedPieceOnD2).toEqual({ color: "white", type: "knight" });
    });

    it("should handle bishop capture move correctly", () => {
      // Set up a board where white bishop can capture black piece
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["c1", { color: "white", type: "bishop" }],
          ["g5", { color: "black", type: "pawn" }],
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      // Verify initial state: black pawn is on g5
      expect(boardState.squares.get("g5")).toEqual({ color: "black", type: "pawn" });
      const move: Move = { from: "c1", to: "g5" };
      const newBoardState = applyMove(boardState, move);

      // Verify capturing piece moved to destination
      expect(newBoardState.squares.get("g5")).toEqual({ color: "white", type: "bishop" });
      // Verify capturing piece removed from source
      expect(newBoardState.squares.get("c1")).toBeUndefined();
      // Verify captured piece is removed
      const capturedPieceOnG5 = newBoardState.squares.get("g5");
      expect(capturedPieceOnG5).not.toEqual({ color: "black", type: "pawn" });
      expect(capturedPieceOnG5).toEqual({ color: "white", type: "bishop" });
    });

    it("should handle rook capture move correctly", () => {
      // Set up a board where white rook can capture black piece
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["a1", { color: "white", type: "rook" }],
          ["a7", { color: "black", type: "pawn" }],
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      // Verify initial state: black pawn is on a7
      expect(boardState.squares.get("a7")).toEqual({ color: "black", type: "pawn" });
      const move: Move = { from: "a1", to: "a7" };
      const newBoardState = applyMove(boardState, move);

      // Verify capturing piece moved to destination
      expect(newBoardState.squares.get("a7")).toEqual({ color: "white", type: "rook" });
      // Verify capturing piece removed from source
      expect(newBoardState.squares.get("a1")).toBeUndefined();
      // Verify captured piece is removed
      const capturedPieceOnA7 = newBoardState.squares.get("a7");
      expect(capturedPieceOnA7).not.toEqual({ color: "black", type: "pawn" });
      expect(capturedPieceOnA7).toEqual({ color: "white", type: "rook" });
    });

    it("should handle queen capture move correctly", () => {
      // Set up a board where white queen can capture black piece
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["d1", { color: "white", type: "queen" }],
          ["d7", { color: "black", type: "pawn" }],
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      // Verify initial state: black pawn is on d7
      expect(boardState.squares.get("d7")).toEqual({ color: "black", type: "pawn" });
      const move: Move = { from: "d1", to: "d7" };
      const newBoardState = applyMove(boardState, move);

      // Verify capturing piece moved to destination
      expect(newBoardState.squares.get("d7")).toEqual({ color: "white", type: "queen" });
      // Verify capturing piece removed from source
      expect(newBoardState.squares.get("d1")).toBeUndefined();
      // Verify captured piece is removed
      const capturedPieceOnD7 = newBoardState.squares.get("d7");
      expect(capturedPieceOnD7).not.toEqual({ color: "black", type: "pawn" });
      expect(capturedPieceOnD7).toEqual({ color: "white", type: "queen" });
    });

    it("should handle king capture move correctly", () => {
      // Set up a board where white king can capture black piece
      const boardState: BoardState = {
        ...initialBoardState,
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["e2", { color: "black", type: "pawn" }],
          ["e8", { color: "black", type: "king" }]
        ]),
        activeColor: "white"
      };
      // Verify initial state: black pawn is on e2
      expect(boardState.squares.get("e2")).toEqual({ color: "black", type: "pawn" });
      const move: Move = { from: "e1", to: "e2" };
      const newBoardState = applyMove(boardState, move);

      // Verify capturing piece moved to destination
      expect(newBoardState.squares.get("e2")).toEqual({ color: "white", type: "king" });
      // Verify capturing piece removed from source
      expect(newBoardState.squares.get("e1")).toBeUndefined();
      // Verify captured piece is removed
      const capturedPieceOnE2 = newBoardState.squares.get("e2");
      expect(capturedPieceOnE2).not.toEqual({ color: "black", type: "pawn" });
      expect(capturedPieceOnE2).toEqual({ color: "white", type: "king" });
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

      it("should reject castling when destination square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["g1", { color: "black", type: "pawn" }] // Occupying destination square
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
          expect(result.reason).toContain("not clear");
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

      it("should reject black king-side castling when destination square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["h1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["h8", { color: "black", type: "rook" }],
            ["g8", { color: "white", type: "pawn" }] // Occupying destination square
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

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toContain("not clear");
        }
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

      it("should reject queen-side castling when destination square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["c1", { color: "black", type: "pawn" }] // Occupying destination square
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
        if (!result.valid) {
          expect(result.reason).toContain("not clear");
        }
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

      it("should reject black queen-side castling when destination square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["a1", { color: "white", type: "rook" }],
            ["e8", { color: "black", type: "king" }],
            ["a8", { color: "black", type: "rook" }],
            ["c8", { color: "white", type: "pawn" }] // Occupying destination square
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

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toContain("not clear");
        }
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

  describe("En passant", () => {
    let initialBoardState: BoardState;

    beforeEach(() => {
      initialBoardState = createInitialBoardState();
    });

    describe("White pawn en passant capture", () => {
      it("should validate white pawn en passant capture immediately after black pawn double-step", () => {
        // Black pawn moves d7 -> d5 (double step)
        const boardStateAfterBlackDoubleStep: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e5", { color: "white", type: "pawn" }], // White pawn on e5
            ["d5", { color: "black", type: "pawn" }], // Black pawn just moved to d5
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: "d6" // Target square exposed by black's double-step
        };
        const move: Move = { from: "e5", to: "d6" };
        const result = validateMove(boardStateAfterBlackDoubleStep, move);

        expect(result.valid).toBe(true);
      });

      it("should apply white pawn en passant capture correctly", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e5", { color: "white", type: "pawn" }],
            ["d5", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: "d6"
        };
        const move: Move = { from: "e5", to: "d6" };
        const newBoardState = applyMove(boardState, move);

        // White pawn should be on d6
        expect(newBoardState.squares.get("d6")).toEqual({ color: "white", type: "pawn" });
        // Black pawn on d5 should be removed
        expect(newBoardState.squares.get("d5")).toBeUndefined();
        // White pawn should be removed from e5
        expect(newBoardState.squares.get("e5")).toBeUndefined();
        // enPassantTarget should be cleared
        expect(newBoardState.enPassantTarget).toBeNull();
        // halfMoveClock should reset (pawn move)
        expect(newBoardState.halfMoveClock).toBe(0);
      });

      it("should include en passant capture in legal moves", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e5", { color: "white", type: "pawn" }],
            ["d5", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: "d6"
        };
        const legalMoves = getLegalMoves(boardState, "e5");

        expect(legalMoves).toContain("d6"); // En passant capture
        expect(legalMoves).toContain("e6"); // Forward move
      });
    });

    describe("Black pawn en passant capture", () => {
      it("should validate black pawn en passant capture immediately after white pawn double-step", () => {
        // White pawn moves e2 -> e4 (double step)
        const boardStateAfterWhiteDoubleStep: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e4", { color: "white", type: "pawn" }], // White pawn just moved to e4
            ["d4", { color: "black", type: "pawn" }], // Black pawn on d4
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "black",
          enPassantTarget: "e3" // Target square exposed by white's double-step
        };
        const move: Move = { from: "d4", to: "e3" };
        const result = validateMove(boardStateAfterWhiteDoubleStep, move);

        expect(result.valid).toBe(true);
      });

      it("should apply black pawn en passant capture correctly", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e4", { color: "white", type: "pawn" }],
            ["d4", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "black",
          enPassantTarget: "e3"
        };
        const move: Move = { from: "d4", to: "e3" };
        const newBoardState = applyMove(boardState, move);

        // Black pawn should be on e3
        expect(newBoardState.squares.get("e3")).toEqual({ color: "black", type: "pawn" });
        // White pawn on e4 should be removed
        expect(newBoardState.squares.get("e4")).toBeUndefined();
        // Black pawn should be removed from d4
        expect(newBoardState.squares.get("d4")).toBeUndefined();
        // enPassantTarget should be cleared
        expect(newBoardState.enPassantTarget).toBeNull();
        // halfMoveClock should reset (pawn move)
        expect(newBoardState.halfMoveClock).toBe(0);
      });

      it("should include en passant capture in legal moves for black", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e4", { color: "white", type: "pawn" }],
            ["d4", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "black",
          enPassantTarget: "e3"
        };
        const legalMoves = getLegalMoves(boardState, "d4");

        expect(legalMoves).toContain("e3"); // En passant capture
        expect(legalMoves).toContain("d3"); // Forward move
      });
    });

    describe("Invalid en passant attempts", () => {
      it("should reject en passant when enPassantTarget is null", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e5", { color: "white", type: "pawn" }],
            ["d5", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: null // No en passant target
        };
        const move: Move = { from: "e5", to: "d6" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });

      it("should reject en passant when pawn is not on correct rank", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e4", { color: "white", type: "pawn" }], // Wrong rank (should be e5)
            ["d4", { color: "black", type: "pawn" }], // Pawn that just moved from d7 to d5 to d4 is NOT a real scenario; this is just to ensure the square is occupied
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: "d5"
        };
        const move: Move = { from: "e4", to: "d5" }; // Attempts to move to enPassantTarget from wrong rank
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
      });

      it("should reject en passant when target square does not match enPassantTarget", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e5", { color: "white", type: "pawn" }],
            ["d5", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: "f6" // Wrong target square
        };
        const move: Move = { from: "e5", to: "d6" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
      });

      it("should reject en passant when capture would expose king to check", () => {
        // Setup: White king on e1, white pawn on e5, black pawn on d5
        // Black queen on e8 is currently blocked by the white pawn on e5
        // After en passant (e5xd6 ep), the e-file becomes open and the king would be in check
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e5", { color: "white", type: "pawn" }], // Blocks queen on e8
            ["d5", { color: "black", type: "pawn" }],
            ["e8", { color: "black", type: "queen" }],
            ["g8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: "d6"
        };
        const move: Move = { from: "e5", to: "d6" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toContain("check");
        }
      });

      it("should reject en passant when not immediately after double-step (enPassantTarget cleared)", () => {
        // After another move, enPassantTarget should be cleared
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e5", { color: "white", type: "pawn" }],
            ["d5", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          enPassantTarget: null // Cleared after another move
        };
        const move: Move = { from: "e5", to: "d6" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
      });
    });
  });

  describe("Pawn double-step path clearance", () => {
    let initialBoardState: BoardState;

    beforeEach(() => {
      initialBoardState = createInitialBoardState();
    });

    describe("White pawn double-step", () => {
      it("should validate white pawn double-step when path is clear", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e2", { color: "white", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white"
        };
        const move: Move = { from: "e2", to: "e4" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(true);
      });

      it("should reject white pawn double-step when intermediate square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e2", { color: "white", type: "pawn" }],
            ["e3", { color: "black", type: "pawn" }], // Blocking intermediate square
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white"
        };
        const move: Move = { from: "e2", to: "e4" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });

      it("should reject white pawn double-step when destination square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e2", { color: "white", type: "pawn" }],
            ["e4", { color: "black", type: "pawn" }], // Blocking destination square
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white"
        };
        const move: Move = { from: "e2", to: "e4" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });
    });

    describe("Black pawn double-step", () => {
      it("should validate black pawn double-step when path is clear", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e7", { color: "black", type: "pawn" }],
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "black"
        };
        const move: Move = { from: "e7", to: "e5" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(true);
      });

      it("should reject black pawn double-step when intermediate square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e7", { color: "black", type: "pawn" }],
            ["e6", { color: "white", type: "pawn" }], // Blocking intermediate square
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "black"
        };
        const move: Move = { from: "e7", to: "e5" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });

      it("should reject black pawn double-step when destination square is occupied", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e7", { color: "black", type: "pawn" }],
            ["e5", { color: "white", type: "pawn" }], // Blocking destination square
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "black"
        };
        const move: Move = { from: "e7", to: "e5" };
        const result = validateMove(boardState, move);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.reason).toBeDefined();
        }
      });
    });

    describe("getLegalMoves respects path clearance", () => {
      it("should not include double-step in legal moves when intermediate square is blocked", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e2", { color: "white", type: "pawn" }],
            ["e3", { color: "black", type: "pawn" }], // Blocking intermediate square
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white"
        };
        const legalMoves = getLegalMoves(boardState, "e2");

        expect(legalMoves).not.toContain("e4"); // Double-step should not be legal
        expect(legalMoves).not.toContain("e3"); // Single-step should also be blocked (forward moves require empty square)
        // Diagonal capture moves may still be legal
      });

      it("should not include double-step in legal moves when destination square is blocked", () => {
        const boardState: BoardState = {
          ...initialBoardState,
          squares: new Map([
            ["e2", { color: "white", type: "pawn" }],
            ["e4", { color: "black", type: "pawn" }], // Blocking destination square
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white"
        };
        const legalMoves = getLegalMoves(boardState, "e2");

        expect(legalMoves).not.toContain("e4"); // Double-step should not be legal
      });
    });
  });

  describe("evaluateGameResult", () => {
    it("should return ongoing for initial board state", () => {
      const boardState = createInitialBoardState();
      const result = evaluateGameResult(boardState);

      expect(result.type).toBe("ongoing");
    });

    it("should detect checkmate when king is in check and has no legal moves", () => {
      // Simple checkmate: white king on a1, black queen on b2, black king on c3
      // White king is in check and has no legal moves (all squares are attacked or blocked)
      const boardState: BoardState = {
        ...createInitialBoardState(),
        squares: new Map([
          ["a1", { color: "white", type: "king" }],
          ["b2", { color: "black", type: "queen" }],
          ["c3", { color: "black", type: "king" }]
        ]),
        activeColor: "white",
        castlingRights: {
          whiteKingSide: false,
          whiteQueenSide: false,
          blackKingSide: false,
          blackQueenSide: false
        },
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      const result = evaluateGameResult(boardState);

      expect(result.type).toBe("checkmate");
      if (result.type === "checkmate") {
        expect(result.winner).toBe("black");
      }
    });

    it("should detect stalemate when king is not in check but has no legal moves", () => {
      // Stalemate position: white king on a8, black king on c7, black rook on b7
      // White to move, not in check, but no legal moves (all squares are attacked or blocked)
      const boardState: BoardState = {
        ...createInitialBoardState(),
        squares: new Map([
          ["a8", { color: "white", type: "king" }],
          ["c7", { color: "black", type: "king" }],
          ["b7", { color: "black", type: "rook" }]
        ]),
        activeColor: "white",
        castlingRights: {
          whiteKingSide: false,
          whiteQueenSide: false,
          blackKingSide: false,
          blackQueenSide: false
        },
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      const result = evaluateGameResult(boardState);

      expect(result.type).toBe("stalemate");
    });

    it("should return ongoing when king is in check but has legal moves", () => {
      // King in check but can move away
      // Set up proper check position
      const correctedState: BoardState = {
        ...createInitialBoardState(),
        squares: new Map([
          ["e1", { color: "white", type: "king" }],
          ["e8", { color: "black", type: "king" }],
          ["d8", { color: "black", type: "queen" }] // Queen attacks e1 from d8
        ]),
        activeColor: "white"
      };
      const result = evaluateGameResult(correctedState);

      expect(result.type).toBe("ongoing");
    });

    it("should detect checkmate for black when black king is checkmated", () => {
      // Black king checkmated: black king on a8, white queen on b7, white king on c6
      // Black king is in check (queen attacks a8) and has no legal moves
      // All escape squares (a7, b8, b7) are attacked by queen or blocked
      const boardState: BoardState = {
        ...createInitialBoardState(),
        squares: new Map([
          ["a8", { color: "black", type: "king" }],
          ["b7", { color: "white", type: "queen" }],
          ["c6", { color: "white", type: "king" }]
        ]),
        activeColor: "black",
        castlingRights: {
          whiteKingSide: false,
          whiteQueenSide: false,
          blackKingSide: false,
          blackQueenSide: false
        },
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
      };
      const result = evaluateGameResult(boardState);

      expect(result.type).toBe("checkmate");
      if (result.type === "checkmate") {
        expect(result.winner).toBe("white");
      }
    });

    describe("Threefold repetition detection", () => {
      it("should detect threefold repetition when same board state occurs three times", () => {
        // Create a board state that will be repeated
        const repeatedState: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }],
            ["g1", { color: "white", type: "rook" }],
            ["g8", { color: "black", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: null,
          halfMoveClock: 0,
          fullMoveNumber: 1
        };

        // Create history with the same state appearing three times
        const boardStateHistory: BoardState[] = [repeatedState, repeatedState, repeatedState];
        const result = evaluateGameResult(repeatedState, boardStateHistory);

        expect(result.type).toBe("draw");
        if (result.type === "draw") {
          expect(result.reason).toBe("threefold repetition");
        }
      });

      it("should not detect threefold repetition when same state occurs only twice", () => {
        const repeatedState: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: null,
          halfMoveClock: 0,
          fullMoveNumber: 1
        };

        const boardStateHistory: BoardState[] = [repeatedState, repeatedState];
        const result = evaluateGameResult(repeatedState, boardStateHistory);

        expect(result.type).toBe("ongoing");
      });

      it("should consider activeColor when detecting threefold repetition", () => {
        const state1: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: null,
          halfMoveClock: 0,
          fullMoveNumber: 1
        };

        const state2: BoardState = {
          ...state1,
          activeColor: "black"
        };

        // Same squares but different activeColor should not be considered the same
        const boardStateHistory: BoardState[] = [state1, state2, state1];
        const result = evaluateGameResult(state1, boardStateHistory);

        expect(result.type).toBe("ongoing");
      });

      it("should consider castlingRights when detecting threefold repetition", () => {
        const state1: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: null,
          halfMoveClock: 0,
          fullMoveNumber: 1
        };

        const state2: BoardState = {
          ...state1,
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          }
        };

        // Same squares but different castlingRights should not be considered the same
        const boardStateHistory: BoardState[] = [state1, state2, state1];
        const result = evaluateGameResult(state1, boardStateHistory);

        expect(result.type).toBe("ongoing");
      });

      it("should consider enPassantTarget when detecting threefold repetition", () => {
        const state1: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: "e3",
          halfMoveClock: 0,
          fullMoveNumber: 1
        };

        const state2: BoardState = {
          ...state1,
          enPassantTarget: null
        };

        // Same squares but different enPassantTarget should not be considered the same
        const boardStateHistory: BoardState[] = [state1, state2, state1];
        const result = evaluateGameResult(state1, boardStateHistory);

        expect(result.type).toBe("ongoing");
      });
    });

    describe("50-move rule detection", () => {
      it("should detect draw when halfMoveClock reaches 50", () => {
        const boardState: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }],
            ["a1", { color: "white", type: "rook" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: null,
          halfMoveClock: 50,
          fullMoveNumber: 1
        };
        const result = evaluateGameResult(boardState);

        expect(result.type).toBe("draw");
        if (result.type === "draw") {
          expect(result.reason).toBe("50-move rule");
        }
      });

      it("should not detect draw when halfMoveClock is less than 50", () => {
        const boardState: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: null,
          halfMoveClock: 49,
          fullMoveNumber: 1
        };
        const result = evaluateGameResult(boardState);

        expect(result.type).toBe("ongoing");
      });

      it("should detect draw when halfMoveClock exceeds 50", () => {
        const boardState: BoardState = {
          ...createInitialBoardState(),
          squares: new Map([
            ["e1", { color: "white", type: "king" }],
            ["e8", { color: "black", type: "king" }]
          ]),
          activeColor: "white",
          castlingRights: {
            whiteKingSide: false,
            whiteQueenSide: false,
            blackKingSide: false,
            blackQueenSide: false
          },
          enPassantTarget: null,
          halfMoveClock: 51,
          fullMoveNumber: 1
        };
        const result = evaluateGameResult(boardState);

        expect(result.type).toBe("draw");
        if (result.type === "draw") {
          expect(result.reason).toBe("50-move rule");
        }
      });
    });
  });
});
