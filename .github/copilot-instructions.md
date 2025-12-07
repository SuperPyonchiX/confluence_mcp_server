# Confluence MCP Server開発ガイドライン

## プロジェクト概要

Confluence DataCenter/Server環境向けのModel Context Protocol（MCP）サーバーです。AIエージェントがConfluenceのスペース、ページ、ユーザー、検索機能と効率的にやり取りできるよう設計されています。

- **対応バージョン**: Confluence DataCenter/Server（REST API v1）
- **認証方式**: Basic認証（ユーザー名・パスワード）
- **提供API**: 17個（ページ管理、検索、ユーザー管理、スペース管理、Markdown変換）

## 一般的な指示事項

### プロジェクト構成

```
confluence_mcp_server/
├── src/                           # TypeScriptソース
│   ├── index.ts                  # MCPサーバー入口
│   ├── confluence-client.ts       # Confluence APIクライアント
│   ├── markdown-converter.ts      # Markdown変換ロジック
│   ├── types.ts                  # 共有型定義
│   └── __tests__/                # テストファイル
├── build/                         # コンパイル済みJavaScript
├── test/                          # テストスクリプト・リクエスト
└── package.json                   # プロジェクト設定
```

### 依存関係

必須パッケージ：
- `@modelcontextprotocol/sdk`: MCPプロトコル実装
- `axios`: HTTP通信（Confluence REST API呼び出し）
- `turndown`: HTML → Markdown変換
- `remark`: Markdown処理

## ベストプラクティス

### API実装パターン

#### 1. ツール登録の原則

```typescript
// すべてのAPI実装に以下の構造を使用
server.registerTool(
    'confluence_<operation>',  // ツール名は confluence_ プリフィックス必須
    {
        title: 'Clear descriptive title',
        description: 'Detailed description of functionality',
        inputSchema: {
            // zodスキーマでパラメータを定義
            param1: z.string().describe('パラメータ説明'),
            param2: z.number().optional()
        },
        outputSchema: {
            // 戻り値の構造を定義
            success: z.boolean(),
            data: z.any()
        }
    },
    async (params) => {
        // 実装
    }
);
```

#### 2. Confluence クライアント使用パターン

```typescript
// Confluence APIクライアントは singleton として使用
import { ConfluenceClient } from './confluence-client.js';

const client = ConfluenceClient.getInstance({
    domain: process.env.CONFLUENCE_DOMAIN!,
    authType: process.env.CONFLUENCE_AUTH_TYPE as 'basic' | 'token',
    username: process.env.CONFLUENCE_USERNAME,
    password: process.env.CONFLUENCE_PASSWORD,
    token: process.env.CONFLUENCE_TOKEN,
    baseUrl: process.env.CONFLUENCE_BASE_URL
});

// API呼び出し
const result = await client.getPages(spaceKey);
```

#### 3. エラーハンドリング

```typescript
try {
    const result = await performOperation();
    return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
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

### Markdown変換

#### 変換時の重要なポイント

- **ページ → Markdown**: `confluence_page_to_markdown`
  - メタデータ（作成者、作成日時、ラベル）を保持
  - frontmatterに埋め込む
  - 絶対パスを使用してファイル保存

- **Markdown → ページ**: `confluence_markdown_to_page`
  - frontmatterからメタデータを抽出
  - Storage Formatに正確に変換
  - 相対パスは不可（絶対パスのみ対応）

#### 実装パターン

```typescript
// マークダウンのfrontmatterサンプル
---
title: Page Title
created: 2024-01-01T12:00:00Z
author: username
labels:
  - tag1
  - tag2
---

# Page Content
```

## コード標準

### ファイル組織

- **型定義**: `types.ts` に集約
- **クライアント実装**: `confluence-client.ts`
- **変換ロジック**: `markdown-converter.ts`
- **MCPサーバー**: `index.ts`（ツール登録のみ）

### 命名規則

#### API/ツール命名

- プリフィックス: `confluence_`
- パターン: `confluence_<category>_<operation>`
  - 例: `confluence_get_pages`, `confluence_create_page`

#### 内部関数命名

- プライベートメソッド: `private` キーワード使用
- 非同期関数: `async` キーワード明示
- 補助関数: `_` プリフィックスはなし

#### インターフェース/型命名

```typescript
// 大文字で開始
interface ConfluencePage { }
type PageContent = string | Buffer;
enum AuthType { BASIC, TOKEN }
```

### 入力検証

```typescript
// すべてのツールで zodスキーマによる検証を実施
inputSchema: {
    pageId: z.string().describe('ページID'),
    title: z.string().min(1).max(255).describe('ページタイトル'),
    filePath: z.string().refine(
        (path) => path.startsWith('/') || /^[A-Z]:/.test(path),
        'Absolute path required (e.g., C:\\path\\to\\file.md)'
    )
}
```

### エラーメッセージ

```typescript
// ユーザーフレンドリーかつ実行可能な情報を含める
{
    content: [{
        type: 'text',
        text: 'Authentication failed. Verify username/password and domain.'
    }],
    isError: true
}
```

## 一般的なパターン

### API カテゴリ別実装

#### ページ管理 API

```typescript
// 5個のAPI: get_pages, get_page_by_id, create_page, update_page, delete_page
// すべてconfluence_get_pages等のツール名
// 共通の入力: spaceKey, pageId, title, content
// 共通の出力: success, data, message
```

#### 検索・ラベル管理 API

```typescript
// CQL検索、ラベル取得・追加
// 重要: CQL（Confluence Query Language）の構文はドキュメント参照
// 例: space = 'PROJ' AND created >= -7d
```

#### ユーザー管理・スペース管理 API

```typescript
// ユーザー検索、スペース情報取得
// 認証ユーザーのみがアクセス可能な情報も存在
// エラーハンドリング: 権限不足時は明確なメッセージ
```

#### Markdown変換 API

```typescript
// 4個のAPI: page_to_markdown, markdown_to_page, 
//           update_page_from_markdown, export_space_to_markdown
// 重要: すべてのファイルパスは絶対パス（相対パス不可）
// 例: C:\Users\username\Documents\export
```

### 環境変数設定

```typescript
// 必須
CONFLUENCE_DOMAIN           # ドメイン（例: localhost:8090）
CONFLUENCE_AUTH_TYPE        # 認証タイプ（basic または token）
CONFLUENCE_USERNAME         # ユーザー名（Basic認証時）
CONFLUENCE_PASSWORD         # パスワード（Basic認証時）
CONFLUENCE_TOKEN           # トークン（Token認証時）

// オプション
CONFLUENCE_BASE_URL        # カスタムベースURL（デフォルト自動設定）
NODE_TLS_REJECT_UNAUTHORIZED # 開発環境: 0 でSSL検証無視
```

### テストとビルド

```bash
# ビルド
npm run build

# 開発モード（tsx使用）
npm run dev

# テスト実行
npm test

# DataCenter環境でのテスト
npm run test:datacenter
```

## セキュリティ考慮事項

### 認証・認可

- **認証情報の管理**: 環境変数のみ使用、コード内にハードコード禁止
- **トークン**: Personal Access Tokenはより安全（パスワード不要）
- **権限検証**: APIレスポンスで権限エラー時は `isError: true` を返す

### ファイルシステム操作

- **パス検証**: ユーザーが指定したパスは必ず絶対パスで検証
- **相対パス**: 完全に禁止（セキュリティリスク）
- **ディレクトリトラバーサル**: `../` パターンは拒否

### ネットワーク通信

- **SSL/TLS**: 本番環境では必須、自己署名証明書は検証
- **タイムアウト**: 長時間のリクエストには適切なタイムアウト設定
- **レート制限**: APIレート制限への対応

## パフォーマンス最適化

### API呼び出し削減

- **ページ情報**: `get_pages` の `expand` パラメータで必要な情報のみ取得
- **キャッシング**: 同じ情報の重複呼び出しは避ける
- **バッチ処理**: `export_space_to_markdown` は大量ページ向け最適化済み

## トラブルシューティング

### よくある問題

| 問題 | 原因 | 解決策 |
|------|------|--------|
| Authentication failed | 認証情報が正しくない | username/password/token確認、ドメイン設定確認 |
| Permission denied | アクセス権限不足 | ユーザーのスペース・ページ権限確認 |
| Connection refused | サーバー未起動 | Confluenceサーバー起動、ポート確認（通常8090） |
| File not found | 相対パス指定 | 絶対パスで指定 |

### デバッグ方法

```typescript
// ログ出力（stdout/stderr汚さないため構造化ログ推奨）
console.error(JSON.stringify({ 
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'API call failed',
    details: error 
}));
```

## 検証と確認

### ビルド検証
```bash
npm run build
# TypeScriptコンパイルエラーがないことを確認
```

### テスト検証
```bash
npm test
# すべてのテストがパスすることを確認
```

### DataCenter環境テスト
```bash
npm run test:datacenter
# 実際のConfluence環境で全17APIが動作することを確認
```

### コード品質
- **型安全性**: TypeScriptの strict mode で型チェック
- **エラーハンドリング**: try-catch で全非同期操作をカバー
- **パラメータ検証**: zod スキーマで入力値検証

## メンテナンス

### 更新時のチェックリスト

- [ ] Confluence APIドキュメントの最新仕様を確認
- [ ] `@modelcontextprotocol/sdk` の新バージョン確認
- [ ] 非推奨APIの確認と置き換え
- [ ] Markdown変換ロジックの互換性確認
- [ ] エッジケースのテスト実行

### バージョン管理

- **パッチ版**: バグ修正（3.0.1）
- **マイナー版**: 新機能追加（3.1.0）
- **メジャー版**: 互換性破壊的な変更（4.0.0）

## 追加リソース

- [Confluence REST API Documentation](https://developer.atlassian.com/server/confluence/rest-apis/)
- [MCPプロトコル仕様](https://modelcontextprotocol.io/)
- [TypeScript MCPサーバー開発ガイド](./instructions/typescript-mcp-server.instructions.md)
