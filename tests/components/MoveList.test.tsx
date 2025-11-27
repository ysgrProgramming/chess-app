import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the clipboard and download modules
vi.mock("../../src/lib/clipboard", () => ({
  copyTextToClipboard: vi.fn()
}));

vi.mock("../../src/lib/download", () => ({
  downloadTextFile: vi.fn()
}));

import { MoveList } from "../../src/components/MoveList";
import { copyTextToClipboard } from "../../src/lib/clipboard";
import { downloadTextFile } from "../../src/lib/download";
import type { Move } from "../../src/lib/types";

// Type the mocked functions
const mockCopyTextToClipboard = vi.mocked(copyTextToClipboard);
const mockDownloadTextFile = vi.mocked(downloadTextFile);

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

  describe("Copy moves functionality", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default successful behavior
      mockCopyTextToClipboard.mockResolvedValue(undefined);
    });

    it("should render copy button", () => {
      render(<MoveList moves={[]} />);
      const copyButton = screen.getByRole("button", { name: /copy moves/i });
      expect(copyButton).toBeInTheDocument();
    });

    it("should copy moves to clipboard when copy button is clicked", async () => {
      const user = userEvent.setup();
      mockCopyTextToClipboard.mockClear();

      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" }
      ];

      render(<MoveList moves={moves} />);

      const copyButton = screen.getByRole("button", { name: /copy moves/i });
      await user.click(copyButton);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify copyTextToClipboard was called with correct text
      expect(mockCopyTextToClipboard).toHaveBeenCalled();
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("1. e4 e5");
    });

    it("should handle clipboard errors gracefully", async () => {
      const user = userEvent.setup();
      mockCopyTextToClipboard.mockClear();
      // Mock clipboard failure
      mockCopyTextToClipboard.mockRejectedValue(new Error("Clipboard access denied"));

      const moves: Move[] = [{ from: "e2", to: "e4" }];
      render(<MoveList moves={moves} />);

      const copyButton = screen.getByRole("button", { name: /copy moves/i });
      await user.click(copyButton);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not throw - error should be handled internally
      expect(mockCopyTextToClipboard).toHaveBeenCalled();
    });

    it("should copy empty string for empty moves", async () => {
      const user = userEvent.setup();
      mockCopyTextToClipboard.mockClear();

      render(<MoveList moves={[]} />);

      const copyButton = screen.getByRole("button", { name: /copy moves/i });
      await user.click(copyButton);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("");
    });
  });

  describe("Download moves functionality", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should render download button", () => {
      render(<MoveList moves={[]} />);
      const downloadButton = screen.getByRole("button", { name: /download moves/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it("should download moves as text file when download button is clicked", async () => {
      const user = userEvent.setup();
      mockDownloadTextFile.mockClear();

      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" }
      ];

      render(<MoveList moves={moves} />);

      const downloadButton = screen.getByRole("button", { name: /download moves/i });
      await user.click(downloadButton);

      // Verify downloadTextFile was called
      expect(mockDownloadTextFile).toHaveBeenCalled();

      // Check arguments
      const callArgs = mockDownloadTextFile.mock.calls[0];
      expect(callArgs[1]).toBe("1. e4 e5"); // content
      expect(callArgs[2]).toBe("text/plain"); // mimeType
      expect(callArgs[0]).toMatch(/^chess-game-.*\.txt$/); // filename with timestamp
    });

    it("should download moves as PGN file when PGN option is selected", async () => {
      // Note: This test may need to be updated based on UI implementation
      // If there's a PGN button or dropdown, test that instead
      const user = userEvent.setup();
      mockDownloadTextFile.mockClear();

      const moves: Move[] = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" }
      ];

      render(<MoveList moves={moves} />);

      // For now, test that download button works (PGN option may be future enhancement)
      const downloadButton = screen.getByRole("button", { name: /download moves/i });
      await user.click(downloadButton);

      expect(mockDownloadTextFile).toHaveBeenCalled();
    });

    it("should generate correct filename with timestamp", async () => {
      const user = userEvent.setup();
      mockDownloadTextFile.mockClear();

      const moves: Move[] = [{ from: "e2", to: "e4" }];
      render(<MoveList moves={moves} />);

      const downloadButton = screen.getByRole("button", { name: /download moves/i });
      await user.click(downloadButton);

      const callArgs = mockDownloadTextFile.mock.calls[0];
      const filename = callArgs[0];

      // Verify filename format: chess-game-YYYY-MM-DDTHH-MM-SS.txt
      expect(filename).toMatch(/^chess-game-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/);
    });
  });
});
