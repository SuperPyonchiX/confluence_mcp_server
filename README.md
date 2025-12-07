# Confluence MCP Server（DataCenter版）

Confluence DataCenter/Server環境向けのModel Context Protocol（MCP）サーバーです。AIエージェントがConfluenceのスペース、ページ、ユーザー、検索機能と効率的にやり取りできるよう設計されています。

## 📋 概要

MCPサーバーは、Confluence DataCenter/Serverの**17個の主要API**を提供し、以下の機能を実現します：

- 📄 **ページ管理**: 作成・読取・更新・削除の完全なCRUD操作
- 🔍 **高度な検索**: CQL（Confluence Query Language）による強力な検索機能
- 🏷️ **ラベル管理**: コンテンツの分類・整理機能
- 👥 **ユーザー管理**: ユーザー検索・情報取得機能
- 🏢 **スペース管理**: スペース情報の取得・管理
- 📝 **Markdown変換**: ConfluenceページとMarkdownの相互変換

## 🎯 対応バージョン

- ✅ **Confluence DataCenter/Server** - REST API v1 + Basic認証（ユーザー名・パスワード）
- ❌ **Confluence Cloud** - このバージョンでは未対応

## 📚 API一覧（全17個）

### 📄 ページ管理API（5個）

| API名 | パラメータ | 戻り値 | 使用場面 |
|-------|----------|--------|----------|
| `confluence_get_pages` | spaceKey, limit, expand | ページオブジェクト配列 | スペース内のページを検索・一覧表示 |
| `confluence_get_page_by_id` | pageId, expand | ページオブジェクト | ページIDによる個別ページの詳細情報取得 |
| `confluence_create_page` | spaceKey, title, content, type | 作成済みページ情報 | 新規ドキュメント・記事の作成 |
| `confluence_update_page` | pageId, title, content, version | 更新済みページ情報 | ページ内容・タイトルの変更 |
| `confluence_delete_page` | pageId | 削除成功メッセージ | 不要なページの削除 |

### 🔍 検索・ラベル管理API（3個）

| API名 | パラメータ | 戻り値 | 使用場面 |
|-------|----------|--------|----------|
| `confluence_search_content` | cql, limit, expand | 検索結果リスト | CQL（Confluence Query Language）による高度な検索 |
| `confluence_get_content_labels` | contentId | ラベル情報配列 | ページに付与されたラベルの確認 |
| `confluence_add_content_label` | contentId, labels | 追加結果 | ページの分類・タグ付け |

### 🏢 スペース管理API（2個）

| API名 | パラメータ | 戻り値 | 使用場面 |
|-------|----------|--------|----------|
| `confluence_get_spaces` | limit, expand | スペースオブジェクト配列 | 利用可能なスペース一覧の確認 |
| `confluence_get_space_by_id` | spaceKey, expand | スペース詳細情報 | スペースIDによる個別情報取得 |

### 👥 ユーザー管理API（3個）

| API名 | パラメータ | 戻り値 | 使用場面 |
|-------|----------|--------|----------|
| `confluence_get_current_user` | なし | 現在のユーザー情報 | 認証ユーザーの情報確認 |
| `confluence_get_user_by_id` | userId | ユーザー詳細情報 | ユーザーIDによる個別情報取得 |
| `confluence_get_users` | username, limit | ユーザー検索結果 | ユーザー名での検索・一覧表示 |

### 📝 Markdown変換API（4個）⭐**特徴機能**

| API名 | パラメータ | 戻り値 | 使用場面 |
|-------|----------|--------|----------|
| `confluence_page_to_markdown` | pageId, filePath | ファイルパス | ページをMarkdownファイルに変換・保存 |
| `confluence_markdown_to_page` | filePath, spaceKey, parentPageId | 作成ページID | Markdownファイルからページ新規作成 |
| `confluence_update_page_from_markdown` | pageId, filePath | 更新結果 | Markdownファイルで既存ページを更新 |
| `confluence_export_space_to_markdown` | spaceKey, outputDir | エクスポート結果 | スペース全体をMarkdown形式でエクスポート |

## � 主な特徴

### DataCenter版専用最適化
- **REST API v1対応**: DataCenter/Server環境に特化
- **Basic認証**: ユーザー名・パスワードによる認証
- **高性能**: 不要なAPI呼び出しを削減した効率的な実装

### 高度な検索機能
- **CQL（Confluence Query Language）**: 強力な検索クエリをサポート
- **柔軟なフィルタリング**: 作成者、日付、スペース等での詳細検索

### Markdown統合機能
- **双方向変換**: Confluence ⇔ Markdown の相互変換
- **一括エクスポート**: スペース全体を一括でMarkdown化
- **メタデータ保持**: ページ情報を適切に保持

## 📦 インストール・セットアップ

### 前提条件
- Node.js 18以上
- Confluence DataCenter/Server へのアクセス権
- 有効なユーザー名・パスワード

### 1. プロジェクトの準備
```bash
# リポジトリのクローン
git clone <repository-url>
cd confluence_mcp_server

# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build
```

### 2. 環境設定
```bash
# 環境設定ファイルの作成
cp .env.example .env
```

`.env`ファイルを編集：
```bash
# Confluence DataCenter/Server の設定
CONFLUENCE_DOMAIN=localhost:8090
CONFLUENCE_AUTH_TYPE=basic
CONFLUENCE_USERNAME=your-username
CONFLUENCE_PASSWORD=your-password
CONFLUENCE_BASE_URL=http://localhost:8090/rest/api
```

### 3. VS Code MCP設定

VS Code設定ファイルに以下を追加：

#### Basic認証の場合
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
        "CONFLUENCE_PASSWORD": "your-password"
      }
    }
  }
}
```

#### Token認証の場合
```json
{
  "mcp": {
    "confluence-mcp-server": {
      "command": "node",
      "args": ["path/to/confluence_mcp_server/build/index.js"],
      "env": {
        "CONFLUENCE_DOMAIN": "localhost:8090",
        "CONFLUENCE_AUTH_TYPE": "token",
        "CONFLUENCE_TOKEN": "your-personal-access-token"
      }
    }
  }
}
```

**注意**: `CONFLUENCE_BASE_URL`は通常不要です。指定しない場合、以下のデフォルト値が自動的に使用されます：
- Basic認証: `http://{CONFLUENCE_DOMAIN}/rest/api`
- Token認証: `https://{CONFLUENCE_DOMAIN}/wiki/api/v2`

`CONFLUENCE_BASE_URL`が必要な場合：
- カスタムパス（プロキシ経由など）を使用している場合
- デフォルトとは異なるエンドポイントを指定したい場合

## 💡 使用例

### 基本的な操作

#### スペースの確認
```
「利用可能なConfluenceスペース一覧を表示してください」
```

#### ページの検索
```
「タイトルに'API'を含むページをCQL検索で探してください」
```

#### ページの作成
```
「DOCスペースに『開発ガイドライン』というタイトルで新しいページを作成してください」
```

### 高度な機能

#### CQL検索の活用
```
「スペースがTESTで、最終更新が2024年以降のページを検索してください」
```

#### ラベル管理
```
「ページID 12345 に『重要』と『開発』のラベルを追加してください」
```

#### Markdown変換
```
「ページID 67890 をMarkdownファイルに変換して、./docs/guide.md として保存してください」
```

**注意**: `confluence_page_to_markdown` と `confluence_markdown_to_page` では、ファイルパスは**絶対パス**で指定してください。
- ✅ 正しい例: `C:\Users\username\Documents\guide.md`
- ❌ 間違った例: `./docs/guide.md` (相対パス)

#### 一括エクスポート
```
「DOCスペース全体を C:\Users\username\backup\DOC_space にMarkdown形式でエクスポートしてください」
```

## 🔧 開発・テスト

### テストの実行
```bash
# 全17APIの動作テスト
cd test
./confluence_datacenter_17_apis.bat
```

### 開発モードでの実行
```bash
npm run dev
```

## ⚠️ トラブルシューティング

### よくある問題と解決策

#### 認証エラー
- ✅ ユーザー名・パスワードの確認
- ✅ アカウントの有効性確認
- ✅ ドメイン設定の確認

#### 権限エラー
- ✅ スペース・ページへのアクセス権限確認
- ✅ 編集権限の確認
- ✅ 管理者権限の必要性確認

#### 接続エラー
- ✅ Confluenceサーバーの起動状態確認
- ✅ ネットワーク接続の確認
- ✅ ポート番号（通常8090）の確認
- ✅ SSL証明書の問題（開発環境では`NODE_TLS_REJECT_UNAUTHORIZED=0`）

## 📊 技術仕様

### サポート対象
- **REST API**: `/rest/api` v1エンドポイント
- **認証方式**: Basic認証（ユーザー名・パスワード）
- **コンテンツ形式**: Storage format、Markdown
- **検索言語**: CQL（Confluence Query Language）

### パフォーマンス最適化
- DataCenter専用の効率的なAPI呼び出し
- 最小限のネットワーク通信
- 適切なエラーハンドリング
- メモリ使用量の最適化

## 🤝 貢献・開発参加

1. リポジトリのフォーク
2. フィーチャーブランチの作成
3. 変更の実装
4. テストの実行
5. プルリクエストの提出

## 📄 ライセンス

MIT License - 詳細は`LICENSE`ファイルを参照

---

## 📈 バージョン履歴

- **v3.0.1**: 安定版リリース（17API対応）
- **v2.1.0**: CQL検索、ラベル管理、ユーザー検索機能を追加（17API対応）
- **v2.0.0**: DataCenter版初回リリース（13API対応）
