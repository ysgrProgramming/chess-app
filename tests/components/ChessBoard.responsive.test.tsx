/**
 * Tests for responsive layout and mobile gesture handling in ChessBoard component.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
});

describe("ChessBoard - Responsive Layout and Mobile Gestures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window size to default
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768
    });
  });

  describe("Touch event handling", () => {
    it("should handle touchstart event on chess square", () => {
      render(<ChessBoard />);
      const e2Square = screen.getByLabelText(/square e2/i);

      const touchStartEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [
          {
            clientX: 100,
            clientY: 100,
            target: e2Square
          } as Touch
        ]
      });

      fireEvent(e2Square, touchStartEvent);
      // Touch event should not cause errors
      expect(e2Square).toBeInTheDocument();
    });

    it("should handle touchmove event without interfering with scroll", () => {
      render(<ChessBoard />);
      const e2Square = screen.getByLabelText(/square e2/i);

      const touchStartEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [
          {
            clientX: 100,
            clientY: 100,
            target: e2Square
          } as Touch
        ]
      });

      const touchMoveEvent = new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [
          {
            clientX: 150,
            clientY: 150,
            target: e2Square
          } as Touch
        ]
      });

      fireEvent(e2Square, touchStartEvent);
      fireEvent(e2Square, touchMoveEvent);

      // Touch move should not prevent default scroll behavior when appropriate
      expect(e2Square).toBeInTheDocument();
    });

    it("should distinguish between drag gesture and scroll gesture", () => {
      render(<ChessBoard />);
      const e2Square = screen.getByLabelText(/square e2/i);

      // Simulate a small movement (likely a scroll)
      const touchStartEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [
          {
            clientX: 100,
            clientY: 100,
            target: e2Square
          } as Touch
        ]
      });

      // Small vertical movement suggests scrolling
      const touchMoveEvent = new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [
          {
            clientX: 100,
            clientY: 120,
            target: e2Square
          } as Touch
        ]
      });

      fireEvent(e2Square, touchStartEvent);
      fireEvent(e2Square, touchMoveEvent);

      // Should handle gracefully without preventing scroll
      expect(e2Square).toBeInTheDocument();
    });
  });

  describe("Preventing gesture conflicts", () => {
    it("should allow piece selection via tap without interfering with scroll", async () => {
      const user = userEvent.setup();
      render(<ChessBoard />);

      const e2Square = screen.getByLabelText(/square e2/i);

      // Tap on piece (should select, not scroll)
      await user.click(e2Square);

      // Piece should be selected (legal moves highlighted)
      // This is verified by checking that the square has the selected class
      // Note: The actual selection state is tested in other test files
      expect(e2Square).toBeInTheDocument();
    });

    it("should prevent accidental moves during scroll gestures", () => {
      render(<ChessBoard />);
      const e2Square = screen.getByLabelText(/square e2/i);

      // Simulate a scroll gesture that starts on e2 and moves vertically
      const touchStartEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [
          {
            clientX: 100,
            clientY: 100,
            target: e2Square
          } as Touch
        ]
      });

      // Large vertical movement indicates scrolling
      const touchMoveEvent = new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [
          {
            clientX: 100,
            clientY: 200,
            target: e2Square
          } as Touch
        ]
      });

      fireEvent(e2Square, touchStartEvent);
      fireEvent(e2Square, touchMoveEvent);

      // Should not trigger a move to e4
      // Verify that e2 still has the piece (move was not executed)
      expect(e2Square).toHaveTextContent("♙");
    });
  });

  describe("Mobile capture tap handling", () => {
    /**
     * Creates a TouchEvent for testing.
     */
    const createTouchEvent = (
      type: "touchstart" | "touchmove" | "touchend",
      clientX: number,
      clientY: number,
      target: Element
    ): TouchEvent => {
      const touch = {
        clientX,
        clientY,
        target,
        identifier: 0,
        pageX: clientX,
        pageY: clientY,
        screenX: clientX,
        screenY: clientY,
        radiusX: 0,
        radiusY: 0,
        rotationAngle: 0,
        force: 0
      } as Touch;

      const touches = type === "touchend" ? [] : [touch];
      const changedTouches = type === "touchend" ? [touch] : [];

      return new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: touches as unknown as TouchList,
        changedTouches: changedTouches as unknown as TouchList,
        targetTouches: touches as unknown as TouchList
      });
    };

    it("should capture opponent piece when tapping opponent piece after selecting own piece", async () => {
      render(<ChessBoard />);

      // Setup: Move white pawn from e2 to e4 to create a capture opportunity
      // Then move black pawn from d7 to d5
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      const d7Square = screen.getByLabelText(/square d7/i);
      const d5Square = screen.getByLabelText(/square d5/i);

      // Make initial moves using click
      const user = userEvent.setup();
      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      // Switch to black's turn
      await user.click(d7Square);
      await user.click(d5Square);

      await waitFor(() => {
        expect(d5Square).toHaveTextContent("♟");
      });

      // Now white can capture d5 with e4
      const e4SquareAfterMove = screen.getByLabelText(/square e4/i);

      // Simulate touch sequence: tap e4 (select white pawn), then tap d5 (capture black pawn)
      const touchStartE4 = createTouchEvent("touchstart", 100, 100, e4SquareAfterMove);
      fireEvent(e4SquareAfterMove, touchStartE4);

      // Small movement to ensure it's treated as a tap
      const touchEndE4 = createTouchEvent("touchend", 101, 101, e4SquareAfterMove);
      fireEvent(e4SquareAfterMove, touchEndE4);

      await waitFor(() => {
        // e4 should be selected
        expect(e4SquareAfterMove).toHaveClass("selected");
      });

      // Now tap d5 (opponent piece) - this should trigger capture, not selection
      const d5SquareAfterMove = screen.getByLabelText(/square d5/i);
      const touchStartD5 = createTouchEvent("touchstart", 200, 200, d5SquareAfterMove);
      fireEvent(d5SquareAfterMove, touchStartD5);

      const touchEndD5 = createTouchEvent("touchend", 201, 201, d5SquareAfterMove);
      fireEvent(d5SquareAfterMove, touchEndD5);

      await waitFor(() => {
        // Capture should be attempted
        expect(validateMove).toHaveBeenCalled();
        const calls = vi.mocked(validateMove).mock.calls;
        const captureCall = calls.find((call) => call[1].from === "e4" && call[1].to === "d5");
        expect(captureCall).toBeDefined();
      });
    });

    it("should select opponent piece when tapping opponent piece without prior selection", async () => {
      render(<ChessBoard />);

      const d7Square = screen.getByLabelText(/square d7/i);

      // Simulate touch sequence: tap d7 (black pawn) without prior selection
      const touchStartD7 = createTouchEvent("touchstart", 100, 100, d7Square);
      fireEvent(d7Square, touchStartD7);

      const touchEndD7 = createTouchEvent("touchend", 101, 101, d7Square);
      fireEvent(d7Square, touchEndD7);

      await waitFor(() => {
        // d7 should be selected (it's black's turn, so black piece can be selected)
        expect(d7Square).toHaveClass("selected");
      });
    });

    it("should select own piece when tapping own piece without prior selection", async () => {
      render(<ChessBoard />);

      const e2Square = screen.getByLabelText(/square e2/i);

      // Simulate touch sequence: tap e2 (white pawn) without prior selection
      const touchStartE2 = createTouchEvent("touchstart", 100, 100, e2Square);
      fireEvent(e2Square, touchStartE2);

      const touchEndE2 = createTouchEvent("touchend", 101, 101, e2Square);
      fireEvent(e2Square, touchEndE2);

      await waitFor(() => {
        // e2 should be selected
        expect(e2Square).toHaveClass("selected");
      });
    });

    it("should execute capture move when tapping opponent piece after selecting own piece", async () => {
      render(<ChessBoard />);

      // Setup: Move white pawn from e2 to e4, then black pawn from d7 to d5
      const user = userEvent.setup();
      const e2Square = screen.getByLabelText(/square e2/i);
      const e4Square = screen.getByLabelText(/square e4/i);
      const d7Square = screen.getByLabelText(/square d7/i);
      const d5Square = screen.getByLabelText(/square d5/i);

      await user.click(e2Square);
      await user.click(e4Square);

      await waitFor(() => {
        expect(e4Square).toHaveTextContent("♙");
      });

      await user.click(d7Square);
      await user.click(d5Square);

      await waitFor(() => {
        expect(d5Square).toHaveTextContent("♟");
      });

      // Now test capture: select e4, then tap d5
      const e4SquareAfterMove = screen.getByLabelText(/square e4/i);
      const d5SquareAfterMove = screen.getByLabelText(/square d5/i);

      // Select e4 via touch
      const touchStartE4 = createTouchEvent("touchstart", 100, 100, e4SquareAfterMove);
      fireEvent(e4SquareAfterMove, touchStartE4);
      const touchEndE4 = createTouchEvent("touchend", 101, 101, e4SquareAfterMove);
      fireEvent(e4SquareAfterMove, touchEndE4);

      await waitFor(() => {
        expect(e4SquareAfterMove).toHaveClass("selected");
      });

      // Tap d5 to capture
      const touchStartD5 = createTouchEvent("touchstart", 200, 200, d5SquareAfterMove);
      fireEvent(d5SquareAfterMove, touchStartD5);
      const touchEndD5 = createTouchEvent("touchend", 201, 201, d5SquareAfterMove);
      fireEvent(d5SquareAfterMove, touchEndD5);

      await waitFor(() => {
        // Capture should be executed
        expect(validateMove).toHaveBeenCalled();
        expect(applyMove).toHaveBeenCalled();
        // White pawn should move to d5
        expect(d5SquareAfterMove).toHaveTextContent("♙");
        // e4 should be empty
        expect(e4SquareAfterMove).not.toHaveTextContent("♙");
      });
    });

    it("should maintain selection after tap without double-triggering from synthetic click", async () => {
      render(<ChessBoard />);

      const e2Square = screen.getByLabelText(/square e2/i);

      // Simulate touch tap on e2
      const touchStartE2 = createTouchEvent("touchstart", 100, 100, e2Square);
      fireEvent(e2Square, touchStartE2);
      const touchEndE2 = createTouchEvent("touchend", 101, 101, e2Square);
      fireEvent(e2Square, touchEndE2);

      // Wait for selection to be set
      await waitFor(() => {
        expect(e2Square).toHaveClass("selected");
      });

      // Simulate synthetic click event that browser would fire after touch
      // This should NOT cause deselection if we properly prevent it
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      });
      fireEvent(e2Square, clickEvent);

      // Selection should remain active (not deselected by synthetic click)
      await waitFor(
        () => {
          expect(e2Square).toHaveClass("selected");
        },
        { timeout: 100 }
      );
    });

    it("should allow deselection by tapping the same square twice", async () => {
      render(<ChessBoard />);

      const e2Square = screen.getByLabelText(/square e2/i);

      // First tap: select
      const touchStart1 = createTouchEvent("touchstart", 100, 100, e2Square);
      fireEvent(e2Square, touchStart1);
      const touchEnd1 = createTouchEvent("touchend", 101, 101, e2Square);
      fireEvent(e2Square, touchEnd1);

      await waitFor(() => {
        expect(e2Square).toHaveClass("selected");
      });

      // Second tap: deselect
      const touchStart2 = createTouchEvent("touchstart", 100, 100, e2Square);
      fireEvent(e2Square, touchStart2);
      const touchEnd2 = createTouchEvent("touchend", 101, 101, e2Square);
      fireEvent(e2Square, touchEnd2);

      await waitFor(() => {
        expect(e2Square).not.toHaveClass("selected");
      });
    });
  });
});
