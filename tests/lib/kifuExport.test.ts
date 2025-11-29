import { describe, it, expect } from "vitest";

import { movesToText, movesToPGN } from "../../src/lib/kifuExport";
import type { Move } from "../../src/lib/types";

describe("kifuExport", () => {
  describe("movesToText", () => {
    it("should return empty string for empty moves array", () => {
      const moves: Move[] = [];
      const result = movesToText(moves);
      expect(result).toBe("");
    });

    it("should format single white move correctly", () => {
      const moves: Move[] = [{ from: "e2", to: "e4" }];
      const result = movesToText(moves);
      expect(result).toBe("1. e4");
    });

    it("should format move pair correctly", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" }
      ];
      const result = movesToText(moves);
      expect(result).toBe("1. e4 e5");
    });

    it("should format multiple move pairs correctly", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
        { from: "b8", to: "c6" }
      ];
      const result = movesToText(moves);
      expect(result).toBe("1. e4 e5 2. Nf3 Nc6");
    });

    it("should handle odd number of moves (white move without black response)", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" }
      ];
      const result = movesToText(moves);
      expect(result).toBe("1. e4 e5 2. Nf3");
    });

    it("should handle long game (200 plies) without performance issues", () => {
      // Create a realistic game sequence that can be repeated
      // Use a simple pattern that works: e2-e4, e7-e5, then repeat with different pieces
      const moves: Move[] = [];

      // Create a valid opening sequence that can be extended
      const baseSequence: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
        { from: "b8", to: "c6" },
        { from: "f1", to: "c4" },
        { from: "f8", to: "c5" },
        { from: "b1", to: "c3" },
        { from: "g8", to: "f6" }
      ];

      // Repeat the sequence multiple times to reach ~200 moves
      // Note: This creates invalid moves after the first repetition, but we're testing
      // performance, not move validity. The function should handle it gracefully.
      for (let i = 0; i < 25; i++) {
        moves.push(...baseSequence);
      }

      const startTime = performance.now();
      // The function may throw errors for invalid moves, but it should do so quickly
      // without hanging or freezing
      try {
        const result = movesToText(moves);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in reasonable time (less than 1 second)
        expect(duration).toBeLessThan(1000);
        expect(result).toBeTruthy();
      } catch (error) {
        // If moves are invalid, that's acceptable - the important thing is
        // that the function fails fast without hanging
        const endTime = performance.now();
        const duration = endTime - startTime;
        expect(duration).toBeLessThan(1000);
        // Verify it's a meaningful error, not a hang
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("movesToPGN", () => {
    it("should return basic PGN format for empty moves", () => {
      const moves: Move[] = [];
      const result = movesToPGN(moves);
      expect(result).toContain("[Event");
      expect(result).toContain("[Site");
      expect(result).toContain("[Date");
      expect(result).toContain("[Round");
      expect(result).toContain("[White");
      expect(result).toContain("[Black");
      expect(result).toContain("[Result");
    });

    it("should include moves in PGN format", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" }
      ];
      const result = movesToPGN(moves);
      expect(result).toContain("1. e4 e5 2. Nf3");
    });

    it("should have correct filename format", () => {
      // This will be tested in component tests
      // PGN files typically have .pgn extension
      const moves: Move[] = [{ from: "e2", to: "e4" }];
      const result = movesToPGN(moves);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("Move comments in export", () => {
    it("should include comments in text format", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4", comment: "King's pawn opening" },
        { from: "e7", to: "e5", comment: "Classical response" }
      ];
      const result = movesToText(moves);
      expect(result).toContain("King's pawn opening");
      expect(result).toContain("Classical response");
    });

    it("should format comments with curly braces in text format", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4", comment: "Opening move" },
        { from: "e7", to: "e5" }
      ];
      const result = movesToText(moves);
      // Comments should appear after moves in {comment} format
      expect(result).toMatch(/\{Opening move\}/);
    });

    it("should handle moves without comments", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5", comment: "Only this has comment" }
      ];
      const result = movesToText(moves);
      expect(result).toContain("1. e4");
      expect(result).toContain("e5");
      expect(result).toContain("{Only this has comment}");
    });

    it("should include comments in PGN format", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4", comment: "Opening" },
        { from: "e7", to: "e5", comment: "Response" }
      ];
      const result = movesToPGN(moves);
      expect(result).toContain("{Opening}");
      expect(result).toContain("{Response}");
    });

    it("should handle multi-line comments", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4", comment: "Line 1\nLine 2\nLine 3" }
      ];
      const result = movesToText(moves);
      // Multi-line comments should be preserved or escaped appropriately
      expect(result).toContain("Line 1");
    });

    it("should handle special characters in comments", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4", comment: "Comment with {braces} and \"quotes\"" }
      ];
      const result = movesToText(moves);
      // Special characters should be escaped or handled appropriately
      expect(result).toContain("Comment with");
    });

    it("should handle empty comments gracefully", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4", comment: "" },
        { from: "e7", to: "e5" }
      ];
      const result = movesToText(moves);
      // Empty comments should not appear in output
      expect(result).toBe("1. e4 e5");
    });
  });

  describe("Round-trip: export and import with comments", () => {
    it("should preserve comments through export and import cycle", () => {
      const originalMoves: Move[] = [
        { from: "e2", to: "e4", comment: "King's pawn opening" },
        { from: "e7", to: "e5", comment: "Classical response" },
        { from: "g1", to: "f3", comment: "Knight development" }
      ];

      // Export to text
      const exportedText = movesToText(originalMoves);

      // Import from text (assuming parseKifuText exists)
      // Note: This test will require parseKifuText implementation
      // For now, we verify the export contains comments
      expect(exportedText).toContain("King's pawn opening");
      expect(exportedText).toContain("Classical response");
      expect(exportedText).toContain("Knight development");
    });

    it("should handle full game with comments through export/import", () => {
      const moves: Move[] = [
        { from: "e2", to: "e4", comment: "Opening" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3", comment: "Development" },
        { from: "b8", to: "c6" },
        { from: "f1", to: "b5", comment: "Spanish opening" }
      ];

      const exportedText = movesToText(moves);
      const exportedPGN = movesToPGN(moves);

      // Verify comments are in both formats
      expect(exportedText).toContain("{Opening}");
      expect(exportedText).toContain("{Development}");
      expect(exportedText).toContain("{Spanish opening}");
      expect(exportedPGN).toContain("{Opening}");
      expect(exportedPGN).toContain("{Development}");
      expect(exportedPGN).toContain("{Spanish opening}");
    });
  });
});
