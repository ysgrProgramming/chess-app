/**
 * MoveList component displays the game history (kifu) in Standard Algebraic Notation (SAN).
 */

import React, { useCallback } from "react";

import { copyTextToClipboard } from "../lib/clipboard";
import { downloadTextFile } from "../lib/download";
import { movesToText, movesToPGN } from "../lib/kifuExport";
import { moveToSAN } from "../lib/notation";
import { createInitialBoardState, applyMove } from "../lib/chessEngine";
import type { BoardState, Move, GameResult } from "../lib/types";

/**
 * MoveList component props.
 */
export interface MoveListProps {
  /**
   * Array of moves in the game history.
   */
  readonly moves: readonly Move[];
  /**
   * Current move index (0-based). -1 means initial position.
   */
  readonly currentMoveIndex: number;
  /**
   * Game result (ongoing, checkmate, stalemate, draw, or resignation).
   * If omitted, the game is treated as ongoing (no result text shown).
   */
  readonly gameResult?: GameResult;
  /**
   * Callback invoked when a move is clicked to jump to that position.
   * @param moveIndex - The index of the move to jump to (0-based, -1 for initial position)
   */
  readonly onMoveClick?: (moveIndex: number) => void;
  /**
   * Callback invoked when a move comment is updated.
   * @param moveIndex - The index of the move (0-based)
   * @param comment - The comment text (empty string to remove comment)
   */
  readonly onCommentUpdate?: (moveIndex: number, comment: string) => void;
}

/**
 * Formats game result for display in move list.
 */
function formatGameResult(gameResult: GameResult): string {
  if (gameResult.type === "draw") {
    if (gameResult.reason === "threefold repetition") {
      return "1/2-1/2 (threefold repetition)";
    }
    if (gameResult.reason === "50-move rule") {
      return "1/2-1/2 (50-move rule)";
    }
    return "1/2-1/2 (draw agreed)";
  }
  if (gameResult.type === "resignation") {
    if (gameResult.winner === "white") {
      return "1-0 (Black resigned)";
    }
    return "0-1 (White resigned)";
  }
  return "";
}

/**
 * MoveList component that displays chess moves in SAN notation.
 */
export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentMoveIndex,
  gameResult,
  onMoveClick,
  onCommentUpdate
}) => {
  const [editingCommentIndex, setEditingCommentIndex] = React.useState<number | null>(null);
  const [commentInput, setCommentInput] = React.useState<string>("");
  const effectiveGameResult: GameResult = gameResult ?? { type: "ongoing" };
  // Reconstruct board state for each move to generate SAN notation
  let currentBoardState = createInitialBoardState();
  const movePairs: Array<{
    white: string;
    black?: string;
    whiteMoveIndex: number;
    blackMoveIndex?: number;
  }> = [];

  // moves is always a slice from the beginning of moveHistory, so indices match
  for (let i = 0; i < moves.length; i += 2) {
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];

    const whitePiece = currentBoardState.squares.get(whiteMove.from);
    if (!whitePiece) {
      break;
    }
    const whiteState: BoardState = { ...currentBoardState, activeColor: whitePiece.color };
    const whiteSAN = moveToSAN(whiteState, whiteMove);
    currentBoardState = applyMove(whiteState, whiteMove);

    let blackSAN: string | undefined;
    let blackMoveIndex: number | undefined;
    if (blackMove) {
      const blackPiece = currentBoardState.squares.get(blackMove.from);
      if (!blackPiece) {
        break;
      }
      const blackState: BoardState = { ...currentBoardState, activeColor: blackPiece.color };
      blackSAN = moveToSAN(blackState, blackMove);
      currentBoardState = applyMove(blackState, blackMove);
      blackMoveIndex = i + 1;
    }

    // Store the index in the moves array, which matches moveHistory index
    movePairs.push({
      white: whiteSAN,
      black: blackSAN,
      whiteMoveIndex: i,
      blackMoveIndex
    });
  }

  /**
   * Handles copying moves to clipboard.
   */
  const handleCopyMoves = useCallback(async () => {
    try {
      const text = movesToText(moves, gameResult);
      await copyTextToClipboard(text);
    } catch (error) {
      // Silently handle clipboard errors (e.g., permission denied)
      // In a production app, you might want to show a toast notification
      console.error("Failed to copy moves to clipboard:", error);
    }
  }, [moves, gameResult]);

  /**
   * Handles downloading moves as a file.
   *
   * @param format - File format: "text" or "pgn"
   */
  const handleDownloadMoves = useCallback(
    (format: "text" | "pgn" = "text") => {
      const content =
        format === "pgn" ? movesToPGN(moves, gameResult) : movesToText(moves, gameResult);
      const extension = format === "pgn" ? "pgn" : "txt";
      const mimeType = format === "pgn" ? "application/x-chess-pgn" : "text/plain";

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `chess-game-${timestamp}.${extension}`;

      downloadTextFile(filename, content, mimeType);
    },
    [moves, gameResult]
  );

  /**
   * Handles starting comment editing for a move.
   */
  const handleStartEditComment = useCallback(
    (moveIndex: number) => {
      const move = moves[moveIndex];
      setEditingCommentIndex(moveIndex);
      setCommentInput(move?.comment || "");
    },
    [moves]
  );

  /**
   * Handles saving a comment.
   */
  const handleSaveComment = useCallback(() => {
    if (editingCommentIndex !== null && onCommentUpdate) {
      onCommentUpdate(editingCommentIndex, commentInput.trim());
      setEditingCommentIndex(null);
      setCommentInput("");
    }
  }, [editingCommentIndex, commentInput, onCommentUpdate]);

  /**
   * Handles canceling comment editing.
   */
  const handleCancelEditComment = useCallback(() => {
    setEditingCommentIndex(null);
    setCommentInput("");
  }, []);

  /**
   * Handles key press in comment input.
   */
  const handleCommentKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSaveComment();
      } else if (event.key === "Escape") {
        handleCancelEditComment();
      }
    },
    [handleSaveComment, handleCancelEditComment]
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
        {movePairs.map((pair, index) => {
          const isWhiteCurrent = pair.whiteMoveIndex === currentMoveIndex;
          const isBlackCurrent = pair.blackMoveIndex === currentMoveIndex;
          const whiteMove = moves[pair.whiteMoveIndex];
          const blackMove = pair.blackMoveIndex !== undefined ? moves[pair.blackMoveIndex] : undefined;
          const isEditingWhite = editingCommentIndex === pair.whiteMoveIndex;
          const isEditingBlack =
            pair.blackMoveIndex !== undefined && editingCommentIndex === pair.blackMoveIndex;

          return (
            <li key={index} className="move-pair">
              <span className="move-number">{index + 1}.</span>
              <div className="move-white-container">
                <span
                  className={`move-white ${isWhiteCurrent ? "current-move" : ""} ${
                    onMoveClick ? "clickable-move" : ""
                  }`}
                  onClick={() => onMoveClick?.(pair.whiteMoveIndex)}
                  role={onMoveClick ? "button" : undefined}
                  aria-label={onMoveClick ? `Jump to move ${pair.whiteMoveIndex + 1}` : undefined}
                >
                  {pair.white}
                </span>
                {whiteMove?.comment && !isEditingWhite && (
                  <div className="move-comment">
                    {whiteMove.comment}
                    {onCommentUpdate && (
                      <button
                        type="button"
                        className="comment-edit-button"
                        onClick={() => handleStartEditComment(pair.whiteMoveIndex)}
                        aria-label={`Edit comment for move ${pair.whiteMoveIndex + 1}`}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
                {isEditingWhite && (
                  <div className="comment-editor">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={handleCommentKeyPress}
                      className="comment-input"
                      aria-label={`Comment for move ${pair.whiteMoveIndex + 1}`}
                      rows={3}
                    />
                    <div className="comment-editor-actions">
                      <button
                        type="button"
                        onClick={handleSaveComment}
                        className="comment-save-button"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditComment}
                        className="comment-cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {!whiteMove?.comment && !isEditingWhite && onCommentUpdate && (
                  <button
                    type="button"
                    className="comment-add-button"
                    onClick={() => handleStartEditComment(pair.whiteMoveIndex)}
                    aria-label={`Add comment for move ${pair.whiteMoveIndex + 1}`}
                  >
                    Add comment
                  </button>
                )}
              </div>
              {pair.black && (
                <div className="move-black-container">
                  <span
                    className={`move-black ${isBlackCurrent ? "current-move" : ""} ${
                      onMoveClick ? "clickable-move" : ""
                    }`}
                    onClick={() => onMoveClick?.(pair.blackMoveIndex!)}
                    role={onMoveClick ? "button" : undefined}
                    aria-label={onMoveClick ? `Jump to move ${pair.blackMoveIndex! + 1}` : undefined}
                  >
                    {pair.black}
                  </span>
                  {blackMove?.comment && !isEditingBlack && (
                    <div className="move-comment">
                      {blackMove.comment}
                      {onCommentUpdate && (
                        <button
                          type="button"
                          className="comment-edit-button"
                          onClick={() => handleStartEditComment(pair.blackMoveIndex!)}
                          aria-label={`Edit comment for move ${pair.blackMoveIndex! + 1}`}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                  {isEditingBlack && (
                    <div className="comment-editor">
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={handleCommentKeyPress}
                        className="comment-input"
                        aria-label={`Comment for move ${pair.blackMoveIndex! + 1}`}
                        rows={3}
                      />
                      <div className="comment-editor-actions">
                        <button
                          type="button"
                          onClick={handleSaveComment}
                          className="comment-save-button"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditComment}
                          className="comment-cancel-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {!blackMove?.comment && !isEditingBlack && onCommentUpdate && (
                    <button
                      type="button"
                      className="comment-add-button"
                      onClick={() => handleStartEditComment(pair.blackMoveIndex!)}
                      aria-label={`Add comment for move ${pair.blackMoveIndex! + 1}`}
                    >
                      Add comment
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {effectiveGameResult.type !== "ongoing" && (
        <div className="game-result-text">{formatGameResult(effectiveGameResult)}</div>
      )}
    </div>
  );
};
