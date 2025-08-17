# Confluence Vector Database Builder

Confluenceスペースの全ページをベクトル化してJSONデータベースに変換するツールです。

## 機能

- Confluenceスペース内の全ページを自動取得
- HTMLコンテンツをセクションごとに分割
- ローカルTF-IDFベースの埋め込みベクトル生成
- JSON形式でのベクトルデータベース出力
- Cloud版・DataCenter版両対応
- クロスプラットフォーム .env ファイル対応

## セットアップ

1. 環境変数を設定
2. 依存関係をインストール
3. ツールを実行

### 環境変数設定

#### .envファイルを使用（推奨）

プロジェクトルートまたは tools/ ディレクトリに `.env` ファイルを作成：

```bash
# DataCenter/Server版用の設定例
CONFLUENCE_DOMAIN=your-confluence-server.com:8090
CONFLUENCE_USERNAME=your-username
CONFLUENCE_PASSWORD=your-password
CONFLUENCE_AUTH_TYPE=basic

# または Cloud版用の設定例
CONFLUENCE_DOMAIN=your-domain.atlassian.net
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your-api-token
CONFLUENCE_AUTH_TYPE=token
```

**注意**: `.env` ファイルには機密情報が含まれるため、`.gitignore` に追加してリポジトリにコミットしないでください。

#### 従来の環境変数設定

#### Confluence DataCenter/Server版の場合（推奨）
```bash
set CONFLUENCE_DOMAIN=your-confluence-server.com:8090
set CONFLUENCE_USERNAME=your-username
set CONFLUENCE_PASSWORD=your-password
set CONFLUENCE_AUTH_TYPE=basic
```

#### Confluence Cloud版の場合
```bash
set CONFLUENCE_DOMAIN=your-domain.atlassian.net
set CONFLUENCE_EMAIL=your-email@company.com
set CONFLUENCE_API_TOKEN=your-api-token
set CONFLUENCE_AUTH_TYPE=token
```

### 認証方法

#### DataCenter/Server版（Basic認証）
- ユーザー名とパスワードを使用
- 通常のConfluenceログイン認証情報を利用
- 企業内サーバーでの利用に適している

#### Cloud版（API トークン認証）
Atlassian APIトークンが必要です。取得方法：

1. Atlassianアカウントにログイン
2. https://id.atlassian.com/manage-profile/security/api-tokens にアクセス
3. 「Create API token」をクリック
4. トークン名を入力して作成
5. 生成されたトークンをコピー

## 使用方法

### バッチファイルを使用（推奨）

```bash
# PROJスペースのベクトルDBを作成
build-vectors.bat PROJ

# カスタム出力パスを指定
build-vectors.bat PROJ ../vectors/my-project-vectors.json
```

### 直接実行

```bash
# TypeScript コンパイル
npx tsc

# ベクトルDB作成
node dist/vector-builder.js PROJ ../vectors/proj-vectors.json
```

## 出力形式

生成されるJSONファイルの構造：

```json
{
  "metadata": {
    "spaceKey": "PROJ",
    "spaceName": "プロジェクト",
    "totalPages": 50,
    "totalSections": 250,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "embeddingModel": "local-tfidf",
    "version": "1.0.0"
  },
  "vectors": [
    {
      "pageId": "123456",
      "pageTitle": "プロジェクト概要",
      "sectionId": "section_0",
      "sectionTitle": "概要",
      "embedding": [0.1, 0.2, 0.3, ...],
      "spaceKey": "PROJ",
      "lastUpdated": "2024-01-01T00:00:00.000Z",
      "url": "https://your-domain.atlassian.net/wiki/pages/viewpage.action?pageId=123456"
    }
  ]
}
```

## トラブルシューティング

### よくあるエラー

1. **認証エラー**
   - 環境変数が正しく設定されているか確認
   - APIトークン・パスワードの有効性を確認

2. **ページが取得できない**
   - スペースキーが正しいか確認
   - 該当スペースへのアクセス権限があるか確認

3. **コンパイルエラー**
   - `npm install` で依存関係をインストール
   - TypeScript バージョンを確認

### ログの確認

実行時の詳細ログは標準エラー出力に表示されます：

```bash
node dist/vector-builder.js PROJ output.json 2> debug.log
```

## パフォーマンス

- **処理時間**: 1ページあたり約1-2秒
- **メモリ使用量**: 大規模スペース（1000ページ）で約500MB
- **出力ファイル**: 100ページ程度で約10-20MB

## MCP サーバーでの使用

生成したベクトルDBは以下のツールで検索可能：

```json
{
  "name": "confluence_vector_search",
  "arguments": {
    "query": "プロジェクトの概要について教えて",
    "vectorDbPath": "./vectors/proj-vectors.json",
    "maxResults": 5,
    "similarityThreshold": 0.3
  }
}
```