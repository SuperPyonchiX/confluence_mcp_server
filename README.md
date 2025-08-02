# Confluence MCP Server

Confluence Cloud REST API v2 および Confluence DataCenter/Server REST API への包括的なアクセスを提供するModel Context Protocol (MCP) サーバーです。AIエージェントがConfluenceのスペース、ページ、ブログ投稿、添付ファイル、コメントなどを操作できるようにします。

## 対応バージョン

- ✅ **Confluence Cloud** - REST API v2、APIトークン認証
- ✅ **Confluence DataCenter/Server** - REST API v1、パスワード認証

## 機能

### コンテンツ管理
- **ページ**: 完全なコンテンツサポートでページの作成、読み取り、更新、削除
- **ブログ投稿**: リッチコンテンツとメタデータを含むブログ投稿の管理
- **添付ファイル**: ファイル添付のアップロード、ダウンロード、管理
- **コメント**: ページやブログ投稿へのコメント追加と管理
- **カスタムコンテンツ**: カスタムコンテンツタイプと拡張機能の処理

### スペース管理
- **スペース**: Confluenceスペースの作成、設定、管理
- **権限**: スペース権限とユーザーアクセスの処理
- **プロパティ**: スペースレベルのプロパティと設定の管理

### 検索と発見
- **コンテンツ検索**: ページ、ブログ投稿、添付ファイル全体の検索
- **ラベル**: ラベルの追加、削除、検索
- **メタデータ**: コンテンツプロパティとメタデータのアクセスと変更

### ユーザーと管理機能
- **ユーザー管理**: ユーザー情報とプロファイルへのアクセス
- **いいね**: コンテンツのいいねとエンゲージメントの追跡と管理
- **バージョン**: コンテンツのバージョン履歴へのアクセスと以前のバージョンの復元
- **管理者キー**: 管理アクセスと昇格権限の処理

## 提供ツール（全45個）

### ページ操作 (5個)
- `confluence_get_pages` - ページ一覧取得
- `confluence_get_page_by_id` - 特定ページ取得
- `confluence_create_page` - ページ作成
- `confluence_update_page` - ページ更新
- `confluence_delete_page` - ページ削除

### ブログ投稿操作 (5個)  
- `confluence_get_blog_posts` - ブログ投稿一覧取得
- `confluence_get_blog_post_by_id` - 特定ブログ投稿取得
- `confluence_create_blog_post` - ブログ投稿作成
- `confluence_update_blog_post` - ブログ投稿更新
- `confluence_delete_blog_post` - ブログ投稿削除

### スペース操作 (5個)
- `confluence_get_spaces` - スペース一覧取得
- `confluence_get_space_by_id` - 特定スペース取得
- `confluence_create_space` - スペース作成
- `confluence_update_space` - スペース更新
- `confluence_delete_space` - スペース削除

### 添付ファイル操作 (3個)
- `confluence_get_attachments` - 添付ファイル一覧取得
- `confluence_get_attachment_by_id` - 特定添付ファイル取得
- `confluence_delete_attachment` - 添付ファイル削除

### ユーザー操作 (3個)
- `confluence_get_current_user` - 現在ユーザー取得
- `confluence_get_user_by_id` - 特定ユーザー取得
- `confluence_get_users` - ユーザー一覧取得

### ラベル操作 (2個)
- `confluence_get_labels` - ラベル一覧取得
- `confluence_get_label_by_id` - 特定ラベル取得

### コンテンツプロパティ操作 (2個)
- `confluence_get_content_properties` - プロパティ取得
- `confluence_create_content_property` - プロパティ作成

### 管理者キー操作 (3個)
- `confluence_get_admin_key` - 管理者キー取得
- `confluence_enable_admin_key` - 管理者キー有効化
- `confluence_disable_admin_key` - 管理者キー無効化

## インストール

### 前提条件

- Node.js 18以上
- Confluence Cloud アカウントまたはDataCenter/Serverインスタンスへのアクセス
- 認証情報（APIトークンまたはパスワード）

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd confluence_mcp_server
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **ビルド**
   ```bash
   npm run build
   ```

## 設定

### Confluence Cloud（APIトークン認証）

1. **APIトークンの作成**
   - https://id.atlassian.com/manage-profile/security/api-tokens にアクセス
   - 「APIトークンを作成」をクリック
   - トークンをコピーして保存

2. **環境変数の設定**
   ```bash
   # .env ファイルを作成
   cp .env.example .env
   
   # .env ファイルを編集（Cloud版）
   CONFLUENCE_DOMAIN=your-domain.atlassian.net
   CONFLUENCE_AUTH_TYPE=token
   CONFLUENCE_EMAIL=your-email@example.com
   CONFLUENCE_API_TOKEN=your-api-token-here
   ```

### Confluence DataCenter/Server（パスワード認証）

DataCenter/Server版では、ユーザー名とパスワードを使用します：

```bash
# .env ファイルを作成
cp .env.example .env

# .env ファイルを編集（DataCenter/Server版）
CONFLUENCE_DOMAIN=your-confluence-server.com
CONFLUENCE_AUTH_TYPE=basic
CONFLUENCE_USERNAME=your-username
CONFLUENCE_PASSWORD=your-password
# カスタムベースURLが必要な場合
CONFLUENCE_BASE_URL=https://your-confluence-server.com/rest/api/2
```

**重要な注意点:**
- DataCenter/Server版では REST API v1 を使用します（`/rest/api`）
- Cloud版では REST API v2 を使用します（`/wiki/api/v2`）
- 認証タイプは自動で検出されますが、`CONFLUENCE_AUTH_TYPE`で明示的に指定することをお勧めします

## VS Code での設定

### 1. MCP Extension のインストール

VS Code で MCP サーバーを使用するには、対応する拡張機能をインストールする必要があります。

### 2. 設定ファイルの作成

VS Code のワークスペース設定またはユーザー設定に以下を追加します：

#### settings.json の設定

**Confluence Cloud版の場合:**
```json
{
  "mcp": {
    "confluence-mcp-server": {
      "command": "node",
      "args": ["path/to/confluence_mcp_server/build/index.js"],
      "env": {
        "CONFLUENCE_DOMAIN": "your-domain.atlassian.net",
        "CONFLUENCE_AUTH_TYPE": "token",
        "CONFLUENCE_EMAIL": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**Confluence DataCenter/Server版の場合:**
```json
{
  "mcp": {
    "confluence-mcp-server": {
      "command": "node",
      "args": ["path/to/confluence_mcp_server/build/index.js"],
      "env": {
        "CONFLUENCE_DOMAIN": "your-confluence-server.com",
        "CONFLUENCE_AUTH_TYPE": "basic",
        "CONFLUENCE_USERNAME": "your-username",
        "CONFLUENCE_PASSWORD": "your-password",
        "CONFLUENCE_BASE_URL": "https://your-confluence-server.com/rest/api"
      }
    }
  }
}
```

### 3. タスクランナーとしての使用

VS Code のタスク機能を使用してMCPサーバーを起動することもできます：

**.vscode/tasks.json:**
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Confluence MCP Server",
      "type": "shell",
      "command": "node",
      "args": ["build/index.js"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "options": {
        "env": {
          "CONFLUENCE_DOMAIN": "your-domain.atlassian.net",
          "CONFLUENCE_AUTH_TYPE": "token",
          "CONFLUENCE_EMAIL": "your-email@example.com",
          "CONFLUENCE_API_TOKEN": "your-api-token"
        }
      }
    }
  ]
}
```

## 使用例

### 動作確認

VS Code で以下のコマンドを実行してテストします：

```
Confluenceのスペース一覧を表示してください
```

### ページの作成

```
DEVスペースに「API仕様書」というタイトルでページを作成してください。内容は以下の通りです：

# API仕様書

## 概要
この文書ではAPIの仕様について説明します。

## エンドポイント
- GET /api/users
- POST /api/users
```

### ページの検索

```
スペースID 123 で「Docker」というタイトルを含むページを検索してください
```

### ブログ投稿の作成

```
TEAMスペースに「今週のアップデート」というタイトルでブログ投稿を作成してください
```

### 添付ファイルの確認

```
今月アップロードされたPDFファイルをすべて表示してください
```

## トラブルシューティング

### 認証エラー
- **Cloud版**: APIトークンとメールアドレスが正しいか確認
- **DataCenter版**: ユーザー名とパスワードが正しいか確認
- Confluenceドメインが正しいか確認

### 権限エラー
- 操作対象のスペース/ページへのアクセス権限があるか確認
- 管理者権限が必要な操作の場合、適切な権限があるか確認

### 接続エラー
- インターネット接続を確認
- Confluenceサーバーのステータスを確認
- DataCenter版では社内ネットワークからのアクセスが必要な場合があります

### DataCenter版でよくある問題

1. **SSL証明書エラー**
   - 自己署名証明書を使用している場合は、Node.jsの証明書検証を無効化する必要がある場合があります
   - 環境変数: `NODE_TLS_REJECT_UNAUTHORIZED=0`（開発環境のみ）

2. **CORS エラー**
   - DataCenter版では追加のCORS設定が必要な場合があります

3. **権限エラー**
   - DataCenter版では、管理者権限やグループ権限の設定を確認してください

## 開発

### テストの実行

```bash
npm test
```

### 開発モードでの実行

```bash
npm run dev
```

## API カバレッジ

このサーバーは以下のConfluence API エンドポイントをサポートしています：

- `/pages` - ページ管理
- `/blogposts` - ブログ投稿管理  
- `/spaces` - スペース管理
- `/attachments` - 添付ファイル管理
- `/users` - ユーザー情報
- `/labels` - ラベル管理
- `/admin-key` - 管理者キー管理（Cloud版のみ）

## 認証

サーバーは複数の認証方法をサポートしています：
- **APIトークン認証**: Confluence Cloud用（メール + APIトークン）
- **パスワード認証**: Confluence DataCenter/Server用（ユーザー名 + パスワード）
- OAuth 2.0サポート（将来のリリースで予定）

## エラーハンドリング

サーバーは以下について包括的なエラーハンドリングと情報的なエラーメッセージを提供します：
- 認証失敗
- 権限拒否シナリオ
- 無効なリクエストとパラメータ
- ネットワークとAPI接続の問題

## 貢献

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更を加える
4. 該当する場合はテストを追加
5. プルリクエストを提出

## ライセンス

MIT License - 詳細はLICENSEファイルを参照してください
