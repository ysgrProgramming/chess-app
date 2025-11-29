<!-- fff18adc-cae7-4c01-839f-5c3858a531d9 9f22886b-8d45-4241-bf8f-8d7e9be0fd60 -->
# 棋譜コメント機能追加（TDDベース）プラン

### 1. 現状調査（読み取りのみ）

- **ドメインモデルの確認**: 棋譜や手の履歴がどの型・構造で管理されているかを [`src/lib/types.ts`](src/lib/types.ts) と [`src/lib/gameState.ts`](src/lib/gameState.ts) で確認する。
- **棋譜入出力の確認**: 棋譜エクスポート・インポートの流れを [`src/lib/kifuExport.ts`](src/lib/kifuExport.ts) と [`src/lib/notation.ts`](src/lib/notation.ts)、対応するテストを [`tests/lib/kifuExport.test.ts`](tests/lib/kifuExport.test.ts) と [`tests/lib/notation.test.ts`](tests/lib/notation.test.ts) で把握する。
- **UI構造の確認**: 棋譜一覧・ゲーム状態管理を [`src/components/MoveList.tsx`](src/components/MoveList.tsx) と [`src/contexts/GameStateContext.tsx`](src/contexts/GameStateContext.tsx) で確認し、「1手 = 1行」のどこにコメントを結びつけるかを把握する。

### 2. テスト作成フェーズ（先にテストを書く）

- **ドメイン／状態管理テスト追加**
- **コメント保持**: 1手ごとのデータ構造に `comment`（例: `comment?: string`）を追加する前提で、`GameState` 相当のAPIに対して「コメント付き手の追加」「コメントの更新」「コメントなしの場合のデフォルト挙動」を検証するテストを [`tests/lib/gameState.test.ts`](tests/lib/gameState.test.ts) に追加する。
- **巻き戻し・再生との連動**: 取り消し・やり直し等の機能がある場合、コメントが対応する手に追随することを確認するテストを追加する。
- **棋譜エクスポート／インポートテスト追加**
- **エクスポート**: コメント付きの複数手から棋譜文字列を生成した際、事前に決めたフォーマット（例: PGN風に手の後ろに `{comment}` を付与など）でコメントが含まれることを [`tests/lib/kifuExport.test.ts`](tests/lib/kifuExport.test.ts) にテスト追加する。
- **インポート**: 上記フォーマットのコメント付き棋譜文字列をパースした際に、各手の `comment` フィールドに正しく値が入ることを [`tests/lib/notation.test.ts`](tests/lib/notation.test.ts) にテスト追加する。
- **後方互換性**: コメントなし棋譜でもこれまで通り正しくパースできることを確認するテストケースを追加する。
- **UIコンポーネントテスト追加**
- **表示テスト**: `MoveList` がコメント付きの手リストを受け取ったときに、各手のコメントが所定の位置に表示されることを [`tests/components/MoveList.test.tsx`](tests/components/MoveList.test.tsx) に追加する。
- **編集テスト**: コメント入力UI（テキストエリアやインライン編集）を操作したときに、`GameStateContext` 経由でコメント更新アクションが呼ばれ、状態が更新されることをテストする。
- **アクセシビリティ／フォーカス**: フォーカス移動やEnterキー確定など、基本的な操作フローを1〜2ケース追加する。
- **使用例テスト（簡易E2E的ユースケース）**
- `App` レベル、もしくは `GameState` + `kifuExport` を組み合わせたテストで、「いくつか指し手を進める → コメントを付ける → 棋譜エクスポート → 棋譜インポート → コメントが復元される」一連の流れを1ケースとして追加し、仕様のサンプル兼使用例とする。

### 3. 実装フェーズ

- **ドメインモデル拡張**
- [`src/lib/types.ts`](src/lib/types.ts) で「1手」を表す型に `comment?: string` を追加し、`GameState` の履歴配列等に新フィールドを伝播させる。
- [`src/lib/gameState.ts`](src/lib/gameState.ts) でコメントの追加・更新のためのメソッド（例: `updateMoveComment`）やアクションを定義し、null安全・境界チェック（存在しないインデックス指定など）を明示的に扱う。
- **棋譜入出力の対応**
- [`src/lib/kifuExport.ts`](src/lib/kifuExport.ts) で、決めたコメントフォーマットに従って `comment` を文字列化する処理を追加する。パフォーマンス上、文字列結合の回数を抑えつつ、O(n) 時間で処理できるようにする。
- [`src/lib/notation.ts`](src/lib/notation.ts) で、コメント付き棋譜文字列から `comment` をパースし、既存の手情報と一緒に返すようにパーサーを拡張する。コメント部分のエスケープや改行などのエッジケースを考慮する。
- **UI実装**
- [`src/components/MoveList.tsx`](src/components/MoveList.tsx) に、各手に紐づくコメントの表示領域と編集UIを追加する。例: 手をクリックしたら下部にテキストエリアを表示、もしくは行内インライン編集など、既存レイアウトに合わせて選択する。
- [`src/contexts/GameStateContext.tsx`](src/contexts/GameStateContext.tsx) に、コメント更新用のコンテキストAPI（例: `setMoveComment(moveIndex, comment)`）を追加し、`MoveList` から呼び出せるようにする。
- XSS対策として、コメント表示時は React の通常レンダリング（`dangerouslySetInnerHTML` を使わない）でサニタイズを担保し、改行などの表現はCSS側（`white-space`）で制御する。

### 4. テスト実行 & リファクタリング

- **テスト実行**
- `npm test` または `npx vitest` で全テストを実行し、新規テストが意図通り失敗→実装→成功することを確認する。
- 既存テストがすべて通ることを確認し、コメント機能追加により既存仕様を破壊していないかを検証する。
- **リファクタリング**
- 重複したコメント処理ロジックがあれば、小さな純粋関数として [`src/lib/notation.ts`](src/lib/notation.ts) などに抽出し、可読性・テスト容易性を高める。
- 型定義や関数名が仕様を正しく表現しているか再確認し、必要であればリネームやJSDoc追加で明示的にする。

### 5. 使用例とドキュメント整備

- **使用例の追加**
- README もしくは専用のドキュメントに、「コメント付き棋譜の作り方・エクスポート／インポートの例」を短いコードスニペットで記載する（英語コード＋日本語説明）。
- コメントフォーマット（例: `{This is a comment}`）の仕様を簡潔に明記する。

### 6. PR作成

- **変更内容の整理**
- 変更ファイル一覧と主な変更点（ドメインモデル拡張／棋譜入出力対応／UI変更／テスト追加）を箇条書きでまとめる。
- 仕様面でのポイント（コメントフォーマット、後方互換性の扱い、制約事項など）をPR本文に記載する。
- **PRチェックリスト**
- すべてのテストがGreenであることのスクリーンショットやログを添付する。
- セキュリティ・パフォーマンス・可読性の観点から、レビューしてほしいポイント（例: コメントフォーマットの妥当性、パーサーの堅牢性）を明示する。

### To-dos

- [ ] `types.ts`・`gameState.ts`・`kifuExport.ts`・`notation.ts`・`MoveList.tsx` を読み、棋譜と手のモデルおよび入出力の現状仕様を把握する
- [ ] gameState・kifuExport・notation に対してコメント機能（保持／エクスポート／インポート／後方互換）のユニットテストとラウンドトリップ使用例テストを追加する
- [ ] MoveList と GameStateContext に対してコメント表示・編集・アクセシビリティのコンポーネントテストを追加する
- [ ] types・gameState・kifuExport・notation を拡張し、コメント付き棋譜のフルラウンドトリップを実装する
- [ ] MoveList と GameStateContext にコメント入力・更新UIとAPIを実装する
- [ ] 全テストを実行して修正し、重複ロジックや命名をリファクタリングしてコード品質を整える
- [ ] README等に使用例を追加し、変更点と仕様を整理したPRを作成する