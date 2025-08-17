/**
 * RAG (Retrieval Augmented Generation) システムの型定義
 */

export interface EmbeddingVector {
  /** ユニークID（pageId_sectionId形式） */
  id: string;
  /** ConfluenceページID */
  pageId: string;
  /** セクションID（ヘッダーIDなど） */
  sectionId: string;
  /** テキストの埋め込みベクトル */
  embedding: number[];
  /** メタデータ（タイトル、セクション名など） */
  metadata?: {
    pageTitle?: string;
    sectionTitle?: string;
    lastUpdated?: string;
    spaceKey?: string;
  };
}

export interface VectorSearchResult {
  /** ヒットしたベクトルデータ */
  vector: EmbeddingVector;
  /** コサイン類似度スコア（0-1） */
  similarity: number;
}

export interface RAGRequest {
  /** ユーザーの質問 */
  query: string;
  /** 検索結果の最大件数（デフォルト: 5） */
  maxResults?: number;
  /** 類似度の閾値（デフォルト: 0.7） */
  similarityThreshold?: number;
  /** 特定のスペースに限定する場合 */
  spaceKey?: string;
}

export interface RAGResponse {
  /** 生成された回答 */
  answer: string;
  /** 使用されたソース情報 */
  sources: Array<{
    pageId: string;
    pageTitle: string;
    sectionId: string;
    sectionTitle: string;
    similarity: number;
    url?: string;
  }>;
  /** 処理に関するメタ情報 */
  metadata: {
    /** 検索にヒットした件数 */
    searchResults: number;
    /** 実際に使用されたソース件数 */
    sourcesUsed: number;
    /** 処理時間（ミリ秒） */
    processingTime: number;
  };
}

export interface RAGConfig {
  /** ベクトルデータベースファイルパス */
  vectorDbPath: string;
  /** 埋め込みモデル名 */
  embeddingModel: string;
  /** 応答生成モデル名 */
  responseModel: string;
  /** 最大トークン数 */
  maxTokens: number;
}