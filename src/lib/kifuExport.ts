/**
 * Kifu export utilities for converting move history to text and PGN formats.
 */

import { moveToSAN } from "./notation";
import { createInitialBoardState, applyMove } from "./chessEngine";
import type { Move } from "./types";

/**
 * Converts an array of moves to a human-readable text format.
 *
 * @param moves - Array of moves in the game history.
 * @returns Text representation of the moves (e.g., "1. e4 e5 2. Nf3 Nc6").
 */
export function movesToText(moves: readonly Move[]): string {
  if (moves.length === 0) {
    return "";
  }

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

  return movePairs
    .map((pair, index) => {
      const moveNumber = index + 1;
      if (pair.black) {
        return `${moveNumber}. ${pair.white} ${pair.black}`;
      }
      return `${moveNumber}. ${pair.white}`;
    })
    .join(" ");
}

/**
 * Converts an array of moves to PGN (Portable Game Notation) format.
 *
 * @param moves - Array of moves in the game history.
 * @returns PGN format string with headers and moves.
 */
export function movesToPGN(moves: readonly Move[]): string {
  const headers = [
    '[Event "Chess Practice Game"]',
    '[Site "Local"]',
    `[Date "${new Date().toISOString().split("T")[0]}"]`,
    '[Round "?"]',
    '[White "Player 1"]',
    '[Black "Player 2"]',
    '[Result "*"]'
  ].join("\n");

  const movesText = movesToText(moves);

  return `${headers}\n\n${movesText}`;
}
