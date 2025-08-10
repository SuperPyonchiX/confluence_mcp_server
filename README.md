# Confluence MCP Server (DataCenter Edition)

A comprehensive Model Context Protocol (MCP) server that provides access to Confluence DataCenter/Server REST API. Enables AI agents to interact with Confluence spaces, pages, users, and advanced search capabilities.

## Supported Versions

- ✅ **Confluence DataCenter/Server** - REST API v1 with Basic Authentication (username/password)

## DataCenter Edition Features

- **Enhanced Search**: CQL-powered content search capabilities
- **Label Management**: Content organization through labels
- **User Discovery**: Advanced user search and management
- **Complete CRUD Operations**: Full content lifecycle management
- **Markdown Integration**: Bi-directional Markdown conversion
- **VS Code MCP Integration**: Optimized for VS Code environments

## 🚀 Core Features

### Content Management
- **Pages**: Complete CRUD operations (Create, Read, Update, Delete)
- **Spaces**: Space information retrieval and management
- **Search**: Advanced CQL-based content search

### Advanced Capabilities ⭐
- **CQL Search**: Powerful Confluence Query Language for content discovery
- **Label System**: Content categorization and organization
- **User Management**: User search and information retrieval

### Markdown Conversion Suite ⭐ 
- **Page→Markdown**: Export Confluence pages as local Markdown files
- **Markdown→Page**: Create Confluence pages from Markdown files
- **Page Updates**: Update Confluence pages using Markdown files
- **Bulk Export**: Export entire spaces as Markdown file collections

## Available Tools (16 APIs)

### 📄 Content APIs

### 📄 Content APIs

#### Page Operations (5 APIs)
- `confluence_get_pages` - Retrieve page listings with filtering
- `confluence_get_page_by_id` - Get specific page details
- `confluence_create_page` - Create new pages
- `confluence_update_page` - Update existing pages ⭐ DataCenter optimized
- `confluence_delete_page` - Delete pages ⭐ DataCenter optimized

#### Advanced Search & Labels (3 APIs) ⭐ **NEW**
- `confluence_search_content` - CQL-powered content search
- `confluence_get_content_labels` - Retrieve content labels
- `confluence_add_content_label` - Add labels to content

### 🏢 Space APIs (2 APIs)
- `confluence_get_spaces` - List available spaces
- `confluence_get_space_by_id` - Get detailed space information

### 👥 User APIs (3 APIs)
- `confluence_get_current_user` - Get current user information  
- `confluence_get_user_by_id` - Get specific user details
- `confluence_get_users` - Search and list users ⭐ **NEW**

### 📝 Markdown Conversion APIs (3 APIs) ⭐
- `confluence_page_to_markdown` - Export pages as Markdown files
- `confluence_markdown_to_page` - Create pages from Markdown files
- `confluence_export_space_to_markdown` - Export entire spaces to Markdown

### 🚫 Removed Cloud-Only Features
The following features are not available in DataCenter and have been removed from this version:
- Blog Post APIs (5 APIs) - Cloud-exclusive functionality
- Advanced Management APIs (11 APIs) - Cloud-exclusive administrative features

## Installation & Setup

### Prerequisites

- Node.js 18 or higher
- Access to a Confluence DataCenter/Server instance  
- Valid username and password for authentication

### Setup Instructions

1. **Clone the repository**
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

### Confluence DataCenter/Server（Basic認証）

DataCenter/Server版では、ユーザー名とパスワードを使用します：

```bash
# .env ファイルを作成
cp .env.example .env

# .env ファイルを編集（DataCenter/Server版）
CONFLUENCE_DOMAIN=localhost:8090
CONFLUENCE_AUTH_TYPE=basic
CONFLUENCE_USERNAME=your-username
CONFLUENCE_PASSWORD=your-password
CONFLUENCE_BASE_URL=http://localhost:8090/rest/api
```

**重要な注意点:**
- DataCenter版では REST API v1 (`/rest/api`) を使用
- Basic認証（ユーザー名・パスワード）を使用
- HTTPSでない場合もありますが、本番環境では推奨されません

## VS Code での設定

### 1. MCP Extension のインストール

VS Code で MCP サーバーを使用するには、対応する拡張機能をインストールする必要があります。

### 2. 設定ファイルの作成

**Confluence DataCenter/Server版の場合:**
```json
{
  "mcp": {
    "confluence-mcp-server": {
      "command": "node",
      "args": ["path/to/confluence_mcp_server/build/index.js"],
      "env": {
        "CONFLUENCE_DOMAIN": "localhost:8090",
        "CONFLUENCE_AUTH_TYPE": "basic",
        "CONFLUENCE_USERNAME": "your-username",
        "CONFLUENCE_PASSWORD": "your-password",
        "CONFLUENCE_BASE_URL": "http://localhost:8090/rest/api"
      }
    }
  }
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
TESTスペースに「API仕様書」というタイトルでページを作成してください。内容は以下の通りです：

# API仕様書

## 概要
この文書ではAPIの仕様について説明します。

## エンドポイント
- GET /api/users
- POST /api/users
```

### ページの更新

```
ページID 163841 のタイトルを「更新されたAPI仕様書」に変更し、内容も更新してください
```

### ページの削除

```
テストページ（ID: 163945）を削除してください
```

### Markdown変換機能の使用 ⭐

#### ConfluenceページをMarkdownに変換

```
ページID 163841 をMarkdownファイルに変換して、./docs/api-spec.md として保存してください
```

#### MarkdownファイルからConfluenceページを作成

```
./docs/user-guide.md ファイルからTESTスペースにConfluenceページを作成してください
```

#### 既存ページをMarkdownで更新

```
./README.md ファイルの内容でページID 163841 を更新してください。バージョンメッセージは「ドキュメント更新」としてください
```

#### スペース全体をMarkdownにエクスポート

```
TESTスペース（ID: 131083）のすべてのページを ./export/TEST_space/ ディレクトリにMarkdownファイルとしてエクスポートしてください
```

## トラブルシューティング

### 認証エラー
- ユーザー名とパスワードが正しいか確認
- Confluenceドメインが正しいか確認
- ユーザーアカウントがアクティブか確認

### 権限エラー
- 操作対象のスペース/ページへのアクセス権限があるか確認
- ページの編集権限があるか確認

### 接続エラー
- Confluenceサーバーが起動しているか確認
- ネットワーク接続を確認
- ポート番号（通常8090）が正しいか確認

### DataCenter版でよくある問題

1. **SSL証明書エラー**
   - 自己署名証明書を使用している場合: `NODE_TLS_REJECT_UNAUTHORIZED=0`（開発環境のみ）

2. **ポート設定**
   - デフォルトは8090ポートですが、環境に応じて調整が必要

3. **権限設定**
   - Confluence管理画面でユーザーの権限設定を確認

## 開発とテスト

### テストの実行

DataCenter版API対応テスト：

```bash
# 全16APIのテスト実行
cd test
./confluence_datacenter_16_apis.bat
```

### 開発モードでの実行

```bash
npm run dev
```

## API カバレッジ（DataCenter版）

このサーバーは以下のConfluence DataCenter API エンドポイントをサポートしています：

✅ **サポート済み（16 APIs）:**
- `/content` - ページ管理（CRUD操作）
- `/content/search` - CQL検索（高度な検索機能） ⭐ **NEW**
- `/content/{id}/label` - ラベル管理 ⭐ **NEW**
- `/space` - スペース情報
- `/user` - ユーザー情報と検索 ⭐ **Enhanced**

❌ **未サポート（DataCenter制限）:**
- Blog Post関連エンドポイント
- 添付ファイル管理
- 高度な管理機能

## 認証

- **Basic認証**: Confluence DataCenter/Server用（ユーザー名 + パスワード）

## エラーハンドリング

サーバーは以下について包括的なエラーハンドリングを提供します：
- Basic認証失敗
- 権限拒否シナリオ
- 無効なリクエストとパラメータ
- ネットワークとAPI接続の問題
- DataCenter特有のエラー処理

## パフォーマンス

### 最適化された機能
- DataCenter REST API v1に特化
- 不要なAPI呼び出しを削減
- 効率的なMarkdown変換
- VS Code MCP統合に最適化

## 貢献

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更を加える
4. DataCenter環境でテストを実行
5. プルリクエストを提出

## ライセンス

MIT License - 詳細はLICENSEファイルを参照してください
