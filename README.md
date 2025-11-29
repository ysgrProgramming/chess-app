# Chess Practice App

A browser-based chess practice web application that allows users to play local two-player games and review move sequences (kifu) on an interactive board. Built with TypeScript and React.

## Table of Contents

- [User Guide](#user-guide)
- [Developer Guide](#developer-guide)
- [Development Ecosystem](#development-ecosystem)

---

# User Guide

## Getting Started

### Live Application

The application is available online at: **[https://ysgrProgramming.github.io/chess-app/](https://ysgrProgramming.github.io/chess-app/)**

The application is automatically deployed to GitHub Pages whenever code is merged to the `main` branch. You can check the deployment status in the [GitHub Actions workflow runs](https://github.com/ysgrProgramming/chess-app/actions/workflows/deploy.yml).

### Starting a Local Game

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open the application** in your browser (typically `http://localhost:5173`).

4. The game starts with White's turn. The turn indicator at the top of the board shows the current active player.

### Making Moves

- **Click/Tap**: Click or tap a piece to select it, then click/tap the destination square. Legal destination squares are highlighted automatically.
- **Drag and Drop**: Drag a piece to its destination square and drop it.
- **Mobile**: On touch devices, tap to select, then tap the destination. Horizontal drag gestures are also supported.

Only legal moves are accepted. If you attempt an illegal move, the piece will return to its original position or the move will be cancelled.

### Undo and Reset

- **Undo**: Click the "Undo" button to step back exactly one move. The board and move list update accordingly.
- **Previous move / Next move**: Use these buttons to navigate through the move history step by step.
- **New Game**: Click "New Game" to reset the board to the initial position and clear the move list.

### Replaying Moves (Kifu Review)

- **Jump to any move**: Click any move in the Move List sidebar to jump to that position in the game.
- **Preview mode**: When viewing an earlier position, you can preview future moves. If you make a new move from a preview position, all moves after that point are discarded, and play continues from the selected position.
- **Navigation**: Use "Previous move" and "Next move" buttons to step through the game history.

### Copying and Downloading the Kifu

- **Copy moves**: Click the "Copy moves" button in the Move List sidebar to copy all moves to your clipboard in text format (e.g., "1. e4 e5 2. Nf3 Nc6").
- **Download moves**: Click the "Download moves" button to download the move list as a text file (`.txt`). The file includes move numbers, SAN notation, and game result if applicable.

Note: The application uses Standard Algebraic Notation (SAN) for move representation, including check (`+`) and checkmate (`#`) indicators.

### Adding Comments to Moves

You can add comments to any move in the game history:

- **Add comment**: Click the "Add comment" button next to any move in the Move List to add a comment.
- **Edit comment**: Click the "Edit" button next to an existing comment to modify it.
- **Remove comment**: Edit a comment and clear the text, then save to remove it.
- **Multi-line comments**: Comments support multiple lines. Press Enter to create a new line, or Shift+Enter to submit.

Comments are included when you copy or download the kifu. The format follows PGN-style comments: `{Your comment here}`.

**Example:**
```
1. e4 {King's pawn opening} e5 {Classical response}
2. Nf3 {Knight development} Nc6
```

Comments are preserved when exporting and can be imported back if you paste a kifu with comments.

### Game End Conditions

The game ends automatically when:
- **Checkmate**: The opponent's king is in checkmate.
- **Stalemate**: The active player has no legal moves and is not in check.
- **Draw by threefold repetition**: The same board position occurs three times.
- **Draw by 50-move rule**: 50 moves have been made without a pawn move or capture.

You can also:
- **Offer draw**: Click "Offer draw" to propose a draw. The opponent can accept or decline.
- **Resign**: Click "Resign" to forfeit the game.

### Supported Browsers

The application is designed to work on modern browsers that support:
- ES2020+ JavaScript features
- CSS Grid and Flexbox
- Drag and Drop API
- Touch Events API (for mobile support)

**Recommended browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

**Assumptions:**
- JavaScript is enabled
- Local storage (sessionStorage) is available for game state persistence within a session
- The viewport is at least 320px wide (mobile-friendly)

---

# Developer Guide

## Architecture Overview

The application is built with React and TypeScript, following a component-based architecture with centralized state management.

### High-Level Components

```
App
├── ChessBoard (interactive board with drag-and-drop)
│   └── PromotionDialog (pawn promotion selection)
├── MoveList (kifu sidebar with move history)
└── GameStateContext (centralized game state management)
```

### Core Modules

#### 1. **Chess Engine** (`src/lib/chessEngine.ts`)

The rules engine handles all chess logic:
- **Board state management**: Represents the 64-square board with pieces, castling rights, en passant targets, and move counters.
- **Move validation**: Validates moves according to chess rules (piece movement, check detection, castling, en passant).
- **Game result evaluation**: Detects checkmate, stalemate, threefold repetition, and 50-move rule draws.
- **Legal move generation**: Computes all legal moves for a given piece or position.

**Key functions:**
- `createInitialBoardState()`: Creates the standard starting position.
- `validateMove()`: Validates if a move is legal.
- `applyMove()`: Applies a move to the board state.
- `getLegalMoves()`: Returns all legal destination squares for a piece.
- `evaluateGameResult()`: Determines the current game result.

#### 2. **Game State Management** (`src/lib/gameState.ts` & `src/contexts/GameStateContext.tsx`)

Manages the overall game state:
- **Move history**: Stores all moves in the game.
- **Current position pointer**: Tracks which move is currently displayed (for replay/preview).
- **Session persistence**: Saves game state to `sessionStorage` for persistence within a browser session.
- **State reducer**: Uses React's `useReducer` for predictable state updates.

**Key concepts:**
- Linear history: Making a move from a preview position discards future moves.
- Preview mode: When viewing an earlier position, `isPreviewing` is true, and the game is not considered "over" until returning to the canonical position.

#### 3. **Notation** (`src/lib/notation.ts`)

Converts moves to Standard Algebraic Notation (SAN):
- **Move to SAN**: Converts a `Move` object to SAN string (e.g., "e4", "Nf3", "O-O").
- **Disambiguation**: Handles cases where multiple pieces can move to the same square (e.g., "Nbd2" vs "Nfd2").
- **Check/Checkmate indicators**: Appends `+` for check and `#` for checkmate.

#### 4. **Kifu Export** (`src/lib/kifuExport.ts`)

Exports move history in various formats:
- **Text format**: Human-readable move list (e.g., "1. e4 e5 2. Nf3 Nc6").
- **PGN format**: Portable Game Notation with headers and moves.
- **Comments**: Move comments are included in exports using PGN-style `{comment}` format.

#### 5. **Kifu Import** (`src/lib/notation.ts`)

Parses kifu text (SAN notation) into moves:
- **Text parsing**: Converts text format (e.g., "1. e4 e5") into `Move` objects.
- **PGN parsing**: Handles PGN format with headers and moves.
- **Comment parsing**: Extracts comments from `{comment}` format and attaches them to moves.
- **Round-trip support**: Comments are preserved through export → import cycles.

### Data Flow

```
User Interaction (click/drag)
    ↓
ChessBoard Component
    ↓
handleMove callback
    ↓
GameStateContext.handleMove()
    ↓
gameReducer (updates state)
    ↓
Board state recomputed from move history
    ↓
ChessBoard re-renders with new position
    ↓
MoveList updates with new move
```

### Adding New Features

To add new features without breaking existing functionality:

1. **Follow TDD**: Write tests first, then implement.
2. **Extend types**: Add new fields to `GameState` or `BoardState` in `src/lib/types.ts` if needed.
3. **Update reducer**: Add new action types to `GameAction` and handle them in `gameReducer`.
4. **Maintain backward compatibility**: When modifying state structure, ensure old session data can be migrated or ignored gracefully.
5. **Test edge cases**: Consider preview mode, undo/redo, and game end conditions.

**Example: Adding a new game end condition**

```typescript
// 1. Add result type to GameResult union in types.ts
type GameResult = 
  | { type: "ongoing" }
  | { type: "checkmate"; winner: Color }
  | { type: "stalemate" }
  | { type: "draw"; reason: "threefold repetition" | "50-move rule" | "agreement" }
  | { type: "resignation"; winner: Color }
  | { type: "new-condition"; /* ... */ }; // Add new condition

// 2. Update evaluateGameResult() in chessEngine.ts
export function evaluateGameResult(...): GameResult {
  // ... existing checks ...
  if (/* new condition detected */) {
    return { type: "new-condition", /* ... */ };
  }
  // ...
}

// 3. Update UI components to handle new result type
// (App.tsx, MoveList.tsx, etc.)
```

### Component Integration Example

To integrate the chess game component into a host page:

```tsx
import React from "react";
import { GameStateProvider } from "./contexts/GameStateContext";
import { App } from "./App";

function MyHostPage() {
  return (
    <GameStateProvider>
      <App />
    </GameStateProvider>
  );
}

export default MyHostPage;
```

The `GameStateProvider` must wrap the `App` component (or any component that uses `useGameState()`). The `App` component includes the board, move list, and all controls.

For a minimal integration with just the board:

```tsx
import React, { useState } from "react";
import { ChessBoard } from "./components/ChessBoard";
import { createInitialBoardState, applyMove, validateMove } from "./lib/chessEngine";
import type { BoardState, Move } from "./lib/types";

function MinimalChessBoard() {
  const [boardState, setBoardState] = useState(createInitialBoardState());

  const handleMove = (move: Move) => {
    const validation = validateMove(boardState, move);
    if (validation.valid) {
      const newState = applyMove(boardState, move);
      setBoardState(newState);
    }
  };

  return <ChessBoard boardState={boardState} onMove={handleMove} />;
}
```

### Deployment

The application is automatically deployed to GitHub Pages whenever code is pushed to the `main` branch.

**Deployment Process:**

1. **Automatic Trigger**: The deployment workflow (`.github/workflows/deploy.yml`) runs automatically on every push to `main`
2. **Quality Gates**: Before deployment, the workflow runs:
   - Lint checks (`make lint`)
   - Test suite (`make test`)
   - Build process (`npm run build`)
3. **Deployment**: If all checks pass, the built application is deployed to GitHub Pages
4. **Live URL**: The application is available at [https://ysgrProgramming.github.io/chess-app/](https://ysgrProgramming.github.io/chess-app/)

**Checking Deployment Status:**

- View deployment workflow runs: [GitHub Actions - Deploy workflow](https://github.com/ysgrProgramming/chess-app/actions/workflows/deploy.yml)
- The workflow shows the deployment status, including any failures
- Note: Pull requests do not trigger deployment; only merges to `main` branch trigger automatic deployment

**Repository Settings:**

- GitHub Pages source must be set to "GitHub Actions" (not a branch)
- The workflow requires `pages: write` and `id-token: write` permissions

---

# Development Ecosystem

## Project Design: Cursor × GitHub CLI "Self-Validating" AI Development Ecosystem

## 1\. 概要 (Executive Summary)

本プロジェクトは、AIコードエディタ **Cursor** と **GitHub CLI**、そして **CI (GitHub Actions)** を組み合わせ、論理的整合性と品質を担保しながらソフトウェア開発を行う「半自律型AI開発エコシステム」の設計書です。

このシステムの核心は、単一のAIにすべてを任せるのではなく、**「要件定義」「管理・レビュー」「実装」という3つの役割（ロール）を明確に分割し、システム的に手順を強制する**点にあります。これにより、LLM特有の「幻覚（ハルシネーション）」や「自己正当化」を防ぎ、人間の関与を最小限かつ高レイヤーな意思決定のみに集中させます。

## 2\. コアコンセプト (Core Concepts)

### A. 役割の分断とコンテキストの分離

一人の人間に二重人格を演じさせるのではなく、\*\*完全に独立したチャットセッション（コンテキスト）\*\*で異なる役割をAIに実行させます。

- **Architect:** 曖昧なアイデアを尋問し、定義書に落とし込む。
- **Manager:** 実装コードを書かず、仕様管理とレビューに徹する（長期記憶）。
- **Engineer:** Issueごとに生成され、タスク完了と共に破棄される（短期記憶）。

### B. CIによる客観的バリデーション

AIの「動くはずです」という言葉は信用しません。
**GitHub Actions** 上で `make test` (単体テスト) と `make lint` (静的解析) が通過しない限り、プルリクエスト（PR）のレビュー段階に進むことをシステム的に禁止します。

### C. Human-in-the-Loop の定型化

人間は「AIの思考」には介入しません。人間が行うのは以下の2点のみです。

1.  **承認と意思決定**（GO/NO-GOの判断）
2.  **物理的なスイッチング**（AIからの「指示サイン」に従い、適切なエージェントを呼び出す）

## 3\. ロール定義 (Role Definitions)

システムは `.cursor/rules/*.mdc` によって定義される以下の3つのロールで構成されます。

| ロール                            | 担当フェーズ                           | 振る舞い・権限                                                                                                                                                      |
| :-------------------------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Architect**<br>(`ai-architect`) | 企画・要件定義                         | **「尋問官」**<br>人間からの入力が曖昧な場合、`REQUIREMENT.md` が埋まるまで質問を繰り返す。定義が完了するまで実装フェーズへの移行を許可しない。                     |
| **Manager**<br>(`ai-manager`)     | タスク分解<br>レビュー<br>メタチェック | **「PM兼レビュアー」**<br>要件定義からIssueを作成する。PRに対し、コードそのものではなく「論理と要件の整合性」をレビューする。プロジェクト全体の設計歪みを検知する。 |
| **Engineer**<br>(`ai-engineer`)   | 実装<br>テスト                         | **「使い捨て実装者」**<br>Issue単位で起動する。TDD（テスト駆動開発）を厳守し、PR作成時にはコードの変更理由を論理的に解説する義務を持つ。                            |

## 4\. アーキテクチャ構成 (Architecture)

- **Interface:** Cursor (Composer機能)
- **Context Control:** ロールごとに「New Chat」を行い、コンテキストを汚染させない。
- **Communication:** GitHub Issue / PR (全ての決定事項と議論はここに集約)
- **Tools:**
  - `gh` (GitHub CLI): AIによるIssue/PRの操作
  - `make`: テスト・Lintコマンドの統一
  - `GitHub Actions`: CIによる品質ゲート

## 5\. 運用フロー (Workflow)

### Phase 0: 要件定義 (Architect)

1.  人間が「こういうアプリを作りたい」と Architect を呼び出す。
2.  Architect は `REQUIREMENT.md` のテンプレートに基づき、不足情報を人間にヒアリングする。
3.  全ての定義が埋まったら、Manager への引き継ぎサインを出す。

### Phase 1: タスク分解 (Manager)

1.  Manager は要件定義書を読み込み、実装可能な粒度の `task` Issue に分解して登録する。
2.  最初の Issue に着手するためのプロンプトを人間に提示する。

### Phase 2: 実装 (Engineer)

1.  人間は「Issue \#X をやって」と Engineer を呼び出す（**必ずNew Chat**）。
2.  Engineer は以下の厳格なループを実行する：
    - **TDD:** テスト作成 → 失敗(Red) → 実装 → 成功(Green)
    - **Lint:** `make lint` の通過
    - **Isolation:** `.env` 等の秘匿情報には触れない。実験コードはコミットしない。
3.  PRを作成する。この際、\*\*「要件ごとの論理的解決策（Self-Walkthrough）」\*\*を記述する。

### Phase 3: レビュー (Manager)

1.  **CI (GitHub Actions)** が自動実行される。失敗したPRはレビュー対象外。
2.  Manager はPRを読み、以下を確認する：
    - CIがGreenであるか。
    - PRの「論理的解決策」が理にかなっているか。
    - Diffが要件を満たしているか。
3.  問題なければマージ（Approve）、問題があれば修正指示（Reject）。

### Phase 4: メタレビュー (Manager)

1.  マージ完了後、Manager は「今回の変更がアーキテクチャ全体に悪影響（歪み）を与えていないか」を診断する。
2.  リファクタリングが必要と判断した場合、自らは修正せず、新たな `refactor` Issue を作成してバックログに積む。

## 6\. インターフェース仕様 (Human Interaction)

人間が迷わず操作できるよう、AIはアクションが必要なタイミングで必ず以下の\*\*「アクションブロック」\*\*を表示します。

```markdown
::: action 🛑 人間の操作が必要です
**状況:** [現在のステータス (例: PR作成完了)]
**操作:** [次に人間がすべき物理操作 (例: New Chatを開く)]
**次のプロンプト:**
(ここにあるテキストをコピーして、次のチャットに入力するだけ)

> @ai-manager.mdc PR #15 のレビューをお願いします。
> :::
```

## 7\. ディレクトリ構造 (Project Structure)

```text
root/
├── .cursor/
│   └── rules/              # 各AIロールの振る舞い定義 (.mdc)
│       ├── ai-architect.mdc
│       ├── ai-manager.mdc
│       ├── ai-engineer.mdc
│       └── tech-stack.mdc  # 技術選定・コーディング規約
├── .github/
│   ├── workflows/          # CI定義 (push時に test/lint 実行)
│   ├── ISSUE_TEMPLATE/     # タスク定義用テンプレート
│   └── PULL_REQUEST_TEMPLATE.md # Self-Walkthrough記述用
├── REQUIREMENT.md          # アーキテクトが管理する要件定義書
├── ROADMAP.md              # マネージャーが管理する進捗表
├── Makefile                # コマンド集約 (test, lint)
└── src/                    # ソースコード
```

## 8\. 安全装置と制約 (Guardrails)

1.  **TDD & Lint 強制:** ローカルで `make test` `make lint` が通らないコードはPush禁止。さらにCIでダブルチェックを行う。
2.  **シーケンシャル処理:** 複数のIssueを同時に進行させない。常に「1つのIssue、1つのEngineerセッション」で完結させ、コンテキストの混濁を防ぐ。
3.  **秘匿情報の保護:** AIには `.env` などのCredentialファイルへのアクセス権限を与えず、モックデータでのテストを原則とする。

## 9\. 開発環境セットアップ (Development Setup)

### 前提条件

- **Node.js**: バージョン 20.0.0 以上が必要（`package.json`の`engines`フィールドを参照）
- **npm**: Node.jsに付属し、PATHに含まれていること

### セットアップ手順

1. **依存関係のインストール**

   ```bash
   make setup
   # または
   npm install
   ```

2. **動作確認**
   ```bash
   make test    # すべてのテストが通過することを確認
   make lint    # Lintエラーがないことを確認
   ```

### トラブルシューティング

**問題: `make test`や`make lint`が`npm: command not found`エラーを出す**

- **原因**: `npm`がPATHに含まれていない
- **解決策**:
  - Node.jsが正しくインストールされているか確認: `node --version`、`npm --version`
  - nvmを使用している場合、シェルの設定ファイル（`.bashrc`、`.zshrc`など）でnvmが自動的にロードされるように設定してください
  - または、手動で`source ~/.nvm/nvm.sh`を実行してから`make`コマンドを実行してください

**問題: CI（GitHub Actions）でテストが失敗する**

- **原因**: CI環境でNode.jsが正しくセットアップされていない
- **解決策**: CIの設定（`.github/workflows/ci.yml`）でNode.jsのバージョンを指定してください

## 10\. ローカル2人対戦の操作例 (Usage Example)

1. **アプリを起動する**  
   `npm run dev` (または `vite`) を実行し、ブラウザでアプリを開きます。初期状態では「White's turn」が表示され、白番から開始します。
2. **駒を動かす**  
   - クリック: 動かしたい駒→移動先のマスの順にクリックします。合法手のみ受け付けられ、相手番の駒は選択できません。  
   - ドラッグ&ドロップ: 駒をドラッグして目的のマスにドロップすることも可能です。  
   - 選択中の駒にはハイライトが表示され、合法手のマスにはガイドが描画されます。
3. **ターン管理**  
   画面左上のターンインジケータが常に現在の手番を示します。手番でない駒は移動できず、常に交互に進行します。
4. **棋譜（Move List）の活用**  
   - `Move List` にはSAN表記の棋譜が蓄積されます。任意の手をクリックするとその時点の局面へジャンプし、kifuの先をプレビューできます。  
   - プレビュー中に新しい手を指すと、以降の手は破棄され、選択していた手番のプレイヤーから分岐を再開できます。
5. **Undo / Reset**  
   - `Undo`: 直前の手を一手だけ巻き戻します（ターンも自動で追従）。  
   - `New Game`: 盤面と棋譜をリセットし、再び白番から開始します。
6. **ローカル対戦フロー (Flow 1)**  
   1. アプリ起動後すぐに白番が指し、続いて黒番が同じデバイスで指します。  
   2. 詰み／やり直しを確認したいときは `Undo` や `Move List` を使って局面を巻き戻し、必要に応じて新しい変化を入力します。  
   3. いつでも `New Game` で初期局面から再開でき、棋譜は自動クリアされます。

この手順に従うことで、アカウントなし・ネットワークなしで2人が1台のデバイスを共有し、完全な対局を実行できます。
