# CLAUDE.md - Confluence MCP Server 開発ガイド

このファイルは、AIアシスタント（Claude）がこのコードベースで作業する際のコンテキストを提供します。

## プロジェクト概要

Confluence DataCenter/Server環境向けのModel Context Protocol（MCP）サーバーです。AIエージェントがConfluenceのスペース、ページ、ユーザー、検索機能と効率的にやり取りできるよう設計されています。

- **バージョン**: 3.0.1
- **対応バージョン**: Confluence DataCenter/Server（REST API v1）
- **認証方式**: Basic認証（ユーザー名・パスワード）/ Token認証
- **提供ツール数**: 18個（ページ管理、検索、ユーザー管理、スペース管理、Markdown変換）

## ディレクトリ構造

```
confluence_mcp_server/
├── src/                           # TypeScriptソースコード
│   ├── index.ts                  # MCPサーバーエントリポイント（1,047行）
│   ├── confluence-client.ts       # Confluence APIクライアント（1,038行）
│   ├── markdown-converter.ts      # Markdown双方向変換（912行）
│   ├── types.ts                  # TypeScript型定義（261行）
│   └── __tests__/                # Jestテストファイル
│       ├── confluence-client.test.ts
│       └── markdown-converter.test.ts
├── build/                         # コンパイル済みJavaScript出力
├── tools/                         # ベクトルデータベースビルダー
│   ├── vector-builder.ts         # TF-IDF埋め込み生成
│   ├── vocabulary.json           # 312KB語彙データベース
│   └── README.md                 # ツールドキュメント
├── test/                          # 統合テストリソース
│   ├── examples/                 # テスト用Markdownファイル
│   ├── requests/                 # APIリクエストサンプル
│   └── *.bat                     # Windows統合テストスクリプト
├── package.json                   # npm設定
├── tsconfig.json                  # TypeScript設定
├── .env.example                   # 環境変数テンプレート
├── README.md                      # メインドキュメント（日本語）
└── LOCAL_RAG_GUIDE.md             # ローカルRAG機能ガイド
```

## 開発コマンド

```bash
# ビルド
npm run build          # TypeScriptをbuild/にコンパイル

# 実行
npm run start          # コンパイル済みJavaScriptを実行
npm run dev            # tsxで直接TypeScriptを実行（開発用）

# テスト
npm test               # Jestテストスイート実行
npm run test:datacenter # DataCenter統合テスト（Windows）
```

## コードベースのアーキテクチャ

### 主要ファイル

| ファイル | 役割 |
|---------|------|
| `src/index.ts` | MCPサーバー実装、18個のツール登録 |
| `src/confluence-client.ts` | Confluence REST API呼び出しクライアント |
| `src/markdown-converter.ts` | Confluence Storage Format ↔ Markdown変換 |
| `src/types.ts` | 共有TypeScriptインターフェース・型定義 |

### 提供ツール一覧（18個）

**ページ管理（5個）**:
- `confluence_get_pages` - ページ一覧取得
- `confluence_get_page_by_id` - ページID指定取得
- `confluence_create_page` - ページ新規作成
- `confluence_update_page` - ページ更新
- `confluence_delete_page` - ページ削除

**検索・ラベル（3個）**:
- `confluence_search_content` - CQL検索
- `confluence_get_content_labels` - ラベル取得
- `confluence_add_content_label` - ラベル追加

**スペース管理（2個）**:
- `confluence_get_spaces` - スペース一覧
- `confluence_get_space_by_id` - スペース詳細

**ユーザー管理（3個）**:
- `confluence_get_current_user` - 現在のユーザー情報
- `confluence_get_user_by_id` - ユーザーID指定取得
- `confluence_get_users` - ユーザー検索

**Markdown変換（4個）**:
- `confluence_page_to_markdown` - ページ→Markdownエクスポート
- `confluence_markdown_to_page` - Markdown→ページ作成
- `confluence_update_page_from_markdown` - Markdownでページ更新
- `confluence_export_space_to_markdown` - スペース一括エクスポート

**その他（1個）**:
- `confluence_get_children` - 子ページ/添付ファイル取得

## コーディング規約

### TypeScript設定

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noUncheckedIndexedAccess": true
}
```

### 命名規則

- **ツール名**: `confluence_<operation>` プリフィックス必須
  - 例: `confluence_get_pages`, `confluence_create_page`
- **インターフェース**: PascalCase（例: `ConfluencePage`, `PageCreateRequest`）
- **変数/関数**: camelCase
- **定数**: UPPER_SNAKE_CASE（環境変数のみ）

### エラーハンドリングパターン

```typescript
try {
    const result = await performOperation();
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result
    };
} catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
        content: [{ type: 'text', text: `Error: ${errorMsg}` }],
        isError: true
    };
}
```

### ツール登録パターン

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
        case 'confluence_<operation>':
            // zodスキーマでパラメータ検証
            // 実装
            return { content: [{ type: 'text', text: result }] };
    }
});
```

## 重要な実装詳細

### 認証設定

```typescript
// 環境変数から設定
const config: ConfluenceConfig = {
    domain: process.env.CONFLUENCE_DOMAIN!,
    authType: process.env.CONFLUENCE_AUTH_TYPE as 'basic' | 'token',
    username: process.env.CONFLUENCE_USERNAME,
    password: process.env.CONFLUENCE_PASSWORD,
    token: process.env.CONFLUENCE_TOKEN,
    baseUrl: process.env.CONFLUENCE_BASE_URL
};
```

### Markdown変換の注意点

1. **ファイルパス**: 必ず**絶対パス**を使用（相対パス不可）
   - 正: `C:\Users\username\Documents\guide.md`
   - 誤: `./docs/guide.md`

2. **メタデータ保持**: YAML frontmatterとして保存
```yaml
---
title: ページタイトル
pageId: "12345"
spaceKey: DOC
created: 2024-01-01T12:00:00Z
author: username
labels:
  - tag1
  - tag2
---
```

3. **対応フォーマット**:
   - Mermaid図（保持）
   - タスクリスト/チェックボックス
   - GFMテーブル
   - コードブロック（言語指定）

### DataCenter vs Cloud

| 項目 | DataCenter | Cloud |
|-----|-----------|-------|
| API | REST API v1 (`/rest/api`) | REST API v2 (`/wiki/api/v2`) |
| 認証 | Basic（ユーザー名/パスワード） | Token（APIトークン） |
| ベースURL | `http://{domain}/rest/api` | `https://{domain}/wiki/api/v2` |

## テスト

### 単体テスト

```bash
npm test                    # 全テスト実行
npm test -- --watch         # ウォッチモード
npm test -- --coverage      # カバレッジレポート
```

テストファイル:
- `src/__tests__/confluence-client.test.ts` - APIクライアントテスト
- `src/__tests__/markdown-converter.test.ts` - Markdown変換テスト

### 統合テスト

```bash
cd test
./confluence_datacenter_17_apis.bat    # 全17API動作確認
./confluence_get_page_by_id_test.bat   # ページ取得テスト
./codeblock_test.bat                   # コードブロック変換テスト
```

## 環境変数

```bash
# 必須（DataCenter）
CONFLUENCE_DOMAIN=localhost:8090
CONFLUENCE_AUTH_TYPE=basic
CONFLUENCE_USERNAME=your-username
CONFLUENCE_PASSWORD=your-password

# 必須（Cloud）
CONFLUENCE_DOMAIN=your-domain.atlassian.net
CONFLUENCE_AUTH_TYPE=token
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-api-token

# オプション
CONFLUENCE_BASE_URL=http://custom-url/rest/api  # カスタムベースURL
CONFLUENCE_TIMEOUT=30000                         # タイムアウト（ms）
NODE_TLS_REJECT_UNAUTHORIZED=0                   # SSL検証無効（開発のみ）
```

## 依存関係

### 本番依存

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `@modelcontextprotocol/sdk` | ^0.4.0 | MCPプロトコル実装 |
| `axios` | ^1.7.7 | HTTP通信 |
| `turndown` | ^7.2.0 | HTML→Markdown変換 |
| `remark` | ^15.0.1 | Markdown処理 |
| `remark-gfm` | ^4.0.1 | GFMサポート |
| `unified` | ^11.0.5 | テキスト処理 |

### 開発依存

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `typescript` | ^5.5.4 | TypeScriptコンパイラ |
| `jest` | ^29.7.0 | テストフレームワーク |
| `ts-jest` | ^29.2.4 | JestのTS対応 |
| `tsx` | ^4.19.0 | TS直接実行 |

## 新機能追加時のチェックリスト

1. [ ] `src/types.ts` に必要な型定義を追加
2. [ ] `src/confluence-client.ts` にAPIメソッドを実装
3. [ ] `src/index.ts` にMCPツールを登録
4. [ ] `src/__tests__/` に単体テストを追加
5. [ ] `npm run build` でビルドエラーがないことを確認
6. [ ] `npm test` でテストがパスすることを確認
7. [ ] README.mdのAPI一覧を更新

## セキュリティ考慮事項

- **認証情報**: 環境変数のみ使用、コードにハードコード禁止
- **ファイルパス**: 絶対パス検証必須、`../` パターン拒否
- **SSL/TLS**: 本番環境では検証有効化
- **エラーメッセージ**: 認証情報を含めない

## トラブルシューティング

| 問題 | 原因 | 解決策 |
|------|------|--------|
| Authentication failed | 認証情報エラー | username/password/token確認 |
| Permission denied | 権限不足 | スペース・ページ権限確認 |
| Connection refused | サーバー未起動 | Confluence起動、ポート確認（8090） |
| File not found | 相対パス使用 | 絶対パスで指定 |
| SSL certificate error | 自己署名証明書 | `NODE_TLS_REJECT_UNAUTHORIZED=0`（開発のみ） |

## 関連リソース

- [Confluence REST API ドキュメント](https://developer.atlassian.com/server/confluence/rest-apis/)
- [MCP プロトコル仕様](https://modelcontextprotocol.io/)
- [README.md](./README.md) - 詳細な使用方法
- [LOCAL_RAG_GUIDE.md](./LOCAL_RAG_GUIDE.md) - ローカルRAG機能ガイド
