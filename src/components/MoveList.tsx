/**
 * MoveList component displays the game history (kifu) in Standard Algebraic Notation (SAN).
 */

import React from "react";

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

  return (
    <div className="move-list-container">
      <h2 className="move-list-title">Move List</h2>
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
