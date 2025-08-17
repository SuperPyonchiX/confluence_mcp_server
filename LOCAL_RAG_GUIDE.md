# Confluence MCP Server - OpenAI API代替ソリューション

## 🚀 ローカルRAG機能について

企業環境でOpenAI APIが利用できない場合の代替ソリューションとして、**ローカル埋め込みベースのRAG機能**を実装しました。

## 🎯 特徴

### ✅ OpenAI API不要
- **完全オフライン動作**: 外部APIに依存しない自律的なRAG機能
- **TF-IDF + コサイン類似度**: 軽量で高速なベクトル検索
- **日本語対応**: ひらがな・カタカナ・漢字に最適化されたトークン化

### ✅ 自動切り替え機能
- **OpenAI優先**: `OPENAI_API_KEY`が設定されている場合は高精度なOpenAI RAG
- **ローカルフォールバック**: APIキーがない場合は自動的にローカルRAGに切り替え
- **透明な操作**: ユーザーは意識せずに利用可能

### ✅ 企業利用対応
- **セキュア**: データは完全に社内に留まる
- **軽量**: 追加のサーバーやGPUは不要
- **実用的**: 基本的な質問応答には十分な精度

## 📊 性能比較

| 機能 | OpenAI RAG | ローカル RAG |
|------|------------|--------------|
| **精度** | ★★★★★ | ★★★☆☆ |
| **速度** | ★★★☆☆ | ★★★★★ |
| **セキュリティ** | ★★★☆☆ | ★★★★★ |
| **コスト** | 有料 | 完全無料 |
| **日本語対応** | ★★★★★ | ★★★★☆ |

## 🛠 使用方法

### 基本設定

```bash
# OpenAI APIを使用する場合
export OPENAI_API_KEY="your_openai_api_key"

# ローカルRAGのみ使用する場合（APIキーは不要）
# 環境変数なしで自動的にローカルモードで動作
```

### コマンド例

```bash
# スペースをインデックス化
confluence_index_space {"spaceKey": "PROJ"}

# 質問応答（自動でOpenAI/ローカルを判別）
confluence_rag_search {
  "query": "プロジェクトの進捗状況について教えて",
  "maxResults": 5,
  "similarityThreshold": 0.6
}
```

## 🔧 技術仕様

### ローカル埋め込みエンジン
```typescript
// TF-IDF ベースのベクトル化
const embedding = tfidf.vectorize(text);

// コサイン類似度での検索
const similarity = cosineSimilarity(queryVector, docVector);
```

### 日本語対応トークン化
- **文字種別分離**: ひらがな・カタカナ・漢字・英数字を適切に分離
- **N-gram対応**: ユニグラム・バイグラムの組み合わせ
- **語彙管理**: 動的な語彙拡張とIDF値の自動計算

### データ永続化
```json
{
  "vocabulary": [["単語", 0], ["プロジェクト", 1]],
  "idfScores": [["単語", 1.5], ["プロジェクト", 2.1]],
  "documentCount": 150,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## 📈 精度向上のヒント

### 1. **適切な前処理**
```bash
# 十分なコンテンツをインデックス化
confluence_index_space {"spaceKey": "MAIN_DOCS"}
confluence_index_space {"spaceKey": "TECH_SPECS"}
```

### 2. **閾値調整**
```javascript
// より多くの結果を取得
"similarityThreshold": 0.5,  // デフォルト: 0.7
"maxResults": 10            // デフォルト: 5
```

### 3. **キーワード最適化**
- **具体的なキーワード**を含む質問が効果的
- **専門用語**は事前にインデックス化が重要

## 🔄 アップグレードパス

### OpenAI導入時の移行
```bash
# 1. OpenAI APIキーを設定
export OPENAI_API_KEY="sk-..."

# 2. サービス再起動（自動でOpenAI RAGに切り替わる）
# 3. 既存のローカルインデックスはそのまま保持される
```

## 🤖 カスタマイズオプション

### 高精度化（将来拡張）
```javascript
// Sentence Transformers統合例（参考）
import { SentenceTransformers } from '@xenova/transformers';

// より高精度な埋め込み生成
const model = await SentenceTransformers.from_pretrained(
  'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
);
```

### 形態素解析統合（参考）
```bash
# MeCab/Kuromoji統合で更なる精度向上
npm install kuromoji
```

## 📋 トラブルシューティング

### よくある問題

**Q: ローカルRAGの精度が低い**
- A: より多くのコンテンツをインデックス化してください
- A: 類似度の閾値を下げてみてください（0.5-0.6）

**Q: 検索結果が0件**
- A: `vocabulary.json`ファイルの存在を確認
- A: インデックス化が完了しているか確認

**Q: 日本語の検索が不正確**
- A: 専門用語を含むドキュメントを事前にインデックス化
- A: 質問にキーワードを明確に含める

## 🎯 実用例

### プロジェクト管理
```bash
# 質問例
"今週のタスクの進捗はどうなっていますか？"
"ブロッカーとなっている課題を教えて"
"リリース予定日はいつですか？"
```

### 技術文書検索
```bash
# 質問例
"APIの認証方法について教えて"
"データベースの設定手順は？"
"エラーハンドリングのベストプラクティスは？"
```

これで企業環境でも安全にRAG機能を活用できます！🎉