# サンプルドキュメント

これはConfluence MCPサーバーのMarkdown変換機能をテストするためのサンプルドキュメントです。

## 機能一覧

以下の機能が実装されています：

- **ページ→Markdown変換**: ConfluenceページをMarkdownファイルとして保存
- **Markdown→ページ作成**: MarkdownファイルからConfluenceページを作成
- **ページ更新**: Markdownファイルの内容でConfluenceページを更新
- **スペースエクスポート**: スペース全体をMarkdownファイル群としてエクスポート

## コードサンプル

```javascript
// サンプルコード
function hello() {
    console.log("Hello, Confluence MCP!");
}
```

## 表の例

| 機能 | 説明 | 状態 |
|------|------|------|
| ページ変換 | ConfluenceページをMarkdownに変換 | ✅ 完了 |
| ページ作成 | MarkdownからConfluenceページを作成 | ✅ 完了 |
| ページ更新 | MarkdownでConfluenceページを更新 | ✅ 完了 |
| 一括エクスポート | スペース全体をエクスポート | ✅ 完了 |

## 注意事項

- Confluenceの特殊なマクロは完全には変換されない場合があります
- 画像などの添付ファイルは別途処理が必要です
- より高度な変換が必要な場合は、[remark-rehype](https://github.com/remarkjs/remark-rehype)の使用を検討してください

---

*このドキュメントは2025年8月3日に作成されました。*
