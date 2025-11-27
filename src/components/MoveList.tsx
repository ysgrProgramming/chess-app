/**
 * MoveList component displays the game history (kifu) in Standard Algebraic Notation (SAN).
 */

import React, { useCallback } from "react";

import { copyTextToClipboard } from "../lib/clipboard";
import { downloadTextFile } from "../lib/download";
import { movesToText, movesToPGN } from "../lib/kifuExport";
import { moveToSAN } from "../lib/notation";
import { createInitialBoardState, applyMove } from "../lib/chessEngine";
import type { Move } from "../lib/types";

/**
 * MoveList component props.
 */
export interface MoveListProps {
  /**
   * Array of moves in the game history.
   */
  readonly moves: readonly Move[];
}

/**
 * MoveList component that displays chess moves in SAN notation.
 */
export const MoveList: React.FC<MoveListProps> = ({ moves }) => {
  // Reconstruct board state for each move to generate SAN notation
  let currentBoardState = createInitialBoardState();
  const movePairs: Array<{ white: string; black?: string }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];

    const whiteSAN = moveToSAN(currentBoardState, whiteMove);
    currentBoardState = applyMove(currentBoardState, whiteMove);

    let blackSAN: string | undefined;
    if (blackMove) {
      blackSAN = moveToSAN(currentBoardState, blackMove);
      currentBoardState = applyMove(currentBoardState, blackMove);
    }

    movePairs.push({ white: whiteSAN, black: blackSAN });
  }

  /**
   * Handles copying moves to clipboard.
   */
  const handleCopyMoves = useCallback(async () => {
    try {
      const text = movesToText(moves);
      await copyTextToClipboard(text);
    } catch (error) {
      // Silently handle clipboard errors (e.g., permission denied)
      // In a production app, you might want to show a toast notification
      console.error("Failed to copy moves to clipboard:", error);
    }
  }, [moves]);

  /**
   * Handles downloading moves as a file.
   *
   * @param format - File format: "text" or "pgn"
   */
  const handleDownloadMoves = useCallback(
    (format: "text" | "pgn" = "text") => {
      const content = format === "pgn" ? movesToPGN(moves) : movesToText(moves);
      const extension = format === "pgn" ? "pgn" : "txt";
      const mimeType = format === "pgn" ? "application/x-chess-pgn" : "text/plain";

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `chess-game-${timestamp}.${extension}`;

      downloadTextFile(filename, content, mimeType);
    },
    [moves]
  );

  return (
    <div className="move-list-container">
      <div className="move-list-header">
        <h2 className="move-list-title">Move List</h2>
        <div className="move-list-actions">
          <button
            type="button"
            className="move-list-button move-list-button-copy"
            onClick={handleCopyMoves}
            aria-label="Copy moves"
          >
            Copy moves
          </button>
          <button
            type="button"
            className="move-list-button move-list-button-download"
            onClick={() => handleDownloadMoves("text")}
            aria-label="Download moves"
          >
            Download moves
          </button>
        </div>
      </div>
      <ol className="move-list" role="list" aria-label="Move list">
        {movePairs.map((pair, index) => (
          <li key={index} className="move-pair">
            <span className="move-number">{index + 1}.</span>
            <span className="move-white">{pair.white}</span>
            {pair.black && <span className="move-black">{pair.black}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
};
