# Confluence API 版本差異

このドキュメントでは、Confluence Cloud版とDataCenter/Server版のAPI差異について説明します。

## API バージョン

- **Cloud版**: REST API v2 (`/wiki/api/v2`)
- **DataCenter/Server版**: REST API v1 (`/rest/api`)

## 主な違い

### 1. ベースURL

- **Cloud**: `https://your-domain.atlassian.net/wiki/api/v2`
- **DataCenter**: `https://your-server.com/rest/api`

### 2. 認証方法

- **Cloud**: Basic認証（Email + API Token）
- **DataCenter**: Basic認証（Username + Password）

### 3. エンドポイントの違い

一部のAPIエンドポイントは、DataCenter版では利用できないか、異なるパスを使用します：

#### 利用可能な機能（両方で対応）
- ページの取得・作成・更新・削除
- スペースの管理
- 添付ファイルの操作
- ユーザー情報の取得
- コンテンツの検索

#### Cloud版のみの機能
- Admin Key機能
- 一部の高度な検索機能
- 特定のメタデータ操作

#### DataCenter版での制限
- 一部の新しいAPI機能は利用できない場合があります
- レスポンス形式が若干異なる場合があります

## 自動検出

このMCPサーバーは、設定された認証タイプと基づいて適切なAPIバージョンを自動選択します：

- `CONFLUENCE_AUTH_TYPE=token` → Cloud版 API v2
- `CONFLUENCE_AUTH_TYPE=basic` → DataCenter版 API v1

## トラブルシューティング

### DataCenter版でよくある問題

1. **SSL証明書エラー**
   - 自己署名証明書を使用している場合は、Node.jsの証明書検証を無効化する必要がある場合があります
   - 環境変数: `NODE_TLS_REJECT_UNAUTHORIZED=0`（開発環境のみ）

2. **CORS エラー**
   - DataCenter版では追加のCORS設定が必要な場合があります

3. **権限エラー**
   - DataCenter版では、管理者権限やグループ権限の設定を確認してください

### 設定例（DataCenter版）

```bash
# DataCenter版の設定例
CONFLUENCE_DOMAIN=confluence.company.com
CONFLUENCE_AUTH_TYPE=basic
CONFLUENCE_USERNAME=john.doe
CONFLUENCE_PASSWORD=your-password
CONFLUENCE_BASE_URL=https://confluence.company.com/rest/api
```
