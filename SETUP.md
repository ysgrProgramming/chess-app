# Development Environment Setup Guide

このドキュメントは、後のAIエージェントが`make lint`や`make test`を実行可能にするためのセットアップ方法を記録しています。

## 問題の背景

このプロジェクトでは、`make test`と`make lint`コマンドを使用してテストとLintを実行します。
しかし、nvm（Node Version Manager）を使用している環境では、`node`と`npm`がPATHに含まれていない場合があります。

## 解決策

`Makefile`が自動的にnvmを検出してロードするように修正されています。

### Makefileの動作

1. **nvmの検出**: `~/.nvm/nvm.sh`が存在するかチェック
2. **自動ロード**: nvmが存在する場合、各コマンド実行前に自動的に`source ~/.nvm/nvm.sh`を実行
3. **フォールバック**: nvmが存在しない場合、PATH内の`npm`を直接使用

### 使用方法

通常の使用方法は変わりません：

```bash
make test    # テストを実行
make lint    # Lintを実行
make format  # コードフォーマットを実行
make setup   # 依存関係をインストール
```

Makefileが自動的にnvmをロードするため、手動で`source ~/.nvm/nvm.sh`を実行する必要はありません。

### 実装の詳細

各ターゲット（`test`, `lint`, `format`, `setup`）は以下のロジックを使用しています：

```makefile
@if [ -f ~/.nvm/nvm.sh ]; then \
    bash -c 'source ~/.nvm/nvm.sh && npm <command>'; \
else \
    npm <command>; \
fi
```

これにより、nvmを使用している環境でも、使用していない環境でも同じように動作します。

## トラブルシューティング

### `npm: command not found`エラーが発生する場合

1. **nvmがインストールされているか確認**
   ```bash
   [ -f ~/.nvm/nvm.sh ] && echo "nvm found" || echo "nvm not found"
   ```

2. **Node.jsがインストールされているか確認**
   ```bash
   source ~/.nvm/nvm.sh
   node --version
   npm --version
   ```

3. **Makefileが正しく動作しているか確認**
   ```bash
   make test
   ```

### CI環境での動作

CI環境（GitHub Actionsなど）では、通常nvmは使用されず、直接`node`と`npm`が利用可能です。
Makefileは自動的にこれを検出し、適切な方法でコマンドを実行します。

## 参考情報

- [nvm公式ドキュメント](https://github.com/nvm-sh/nvm)
- [Node.js公式ドキュメント](https://nodejs.org/)
- このプロジェクトの`Makefile`を参照してください

