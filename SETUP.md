# Development Environment Setup Guide

このドキュメントは、後のAIエージェントが`make lint`や`make test`を実行可能にするためのセットアップ方法を記録しています。

## 前提条件

このプロジェクトの`Makefile`は、`npm`がPATHに含まれていることを前提としています。

- **Node.js**: バージョン 20.0.0 以上が必要
- **npm**: Node.jsに付属し、PATHに含まれていること

## 使用方法

```bash
make test    # テストを実行
make lint    # Lintを実行
make format  # コードフォーマットを実行
make setup   # 依存関係をインストール
```

## トラブルシューティング

### `npm: command not found`エラーが発生する場合

1. **Node.jsとnpmがインストールされているか確認**

   ```bash
   node --version
   npm --version
   ```

2. **npmがPATHに含まれているか確認**

   ```bash
   which npm
   ```

3. **nvmを使用している場合**

   nvmを使用している環境では、シェルの設定ファイル（`.bashrc`、`.zshrc`など）でnvmが自動的にロードされるように設定してください。

   通常、nvmのインストール時に以下の行が追加されます：

   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   ```

   設定ファイルを再読み込みするか、新しいターミナルを開いてから`make`コマンドを実行してください。

### CI環境での動作

CI環境（GitHub Actionsなど）では、通常`node`と`npm`が直接利用可能です。
CIの設定（`.github/workflows/ci.yml`）でNode.jsのバージョンを指定してください。

## 参考情報

- [Node.js公式ドキュメント](https://nodejs.org/)
- [npm公式ドキュメント](https://docs.npmjs.com/)
- このプロジェクトの`Makefile`を参照してください
