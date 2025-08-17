import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * ローカル埋め込みサービス（OpenAI API不要）
 * TF-IDF + コサイン類似度ベースの軽量実装
 */
export class LocalEmbeddingService {
  protected vocabulary: Map<string, number> = new Map();
  protected idfScores: Map<string, number> = new Map();
  protected documentCount: number = 0;

  constructor() {
    this.loadVocabulary();
  }

  /**
   * テキストから埋め込みベクトルを生成
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = this.textToEmbedding(text);
      embeddings.push(embedding);
    }

    // 語彙を更新
    await this.updateVocabulary(texts);

    return embeddings;
  }

  /**
   * 単一テキストから埋め込みベクトルを生成
   */
  textToEmbedding(text: string): number[] {
    const tokens = this.tokenize(text);
    const termFrequency = this.calculateTermFrequency(tokens);
    
    // TF-IDF計算
    const embedding: number[] = [];
    const vocabularyArray = Array.from(this.vocabulary.keys()).sort();

    for (const term of vocabularyArray) {
      const tf = termFrequency.get(term) || 0;
      const idf = this.idfScores.get(term) || 0;
      embedding.push(tf * idf);
    }

    // ベクトル正規化
    return this.normalizeVector(embedding);
  }

  /**
   * 日本語対応トークン化
   */
  protected tokenize(text: string): string[] {
    // 基本的な日本語トークン化
    // より高精度な実装には MeCab や Kuromoji の使用を推奨
    return text
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ') // 日本語文字を保持
      .split(/\s+/)
      .filter(token => token.length > 1); // 1文字は除外
  }

  /**
   * 語彙頻度計算
   */
  protected calculateTermFrequency(tokens: string[]): Map<string, number> {
    const frequency = new Map<string, number>();
    const totalTokens = tokens.length;

    for (const token of tokens) {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    }

    // TF正規化
    for (const [term, count] of frequency.entries()) {
      frequency.set(term, count / totalTokens);
    }

    return frequency;
  }

  /**
   * ベクトル正規化
   */
  protected normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  /**
   * 語彙とIDF値を更新
   */
  private async updateVocabulary(texts: string[]): Promise<void> {
    const newTerms = new Set<string>();
    const documentTerms: Set<string>[] = [];

    // 各文書の語彙を収集
    for (const text of texts) {
      const tokens = this.tokenize(text);
      const uniqueTerms = new Set(tokens);
      documentTerms.push(uniqueTerms);

      for (const term of uniqueTerms) {
        newTerms.add(term);
        if (!this.vocabulary.has(term)) {
          this.vocabulary.set(term, this.vocabulary.size);
        }
      }
    }

    this.documentCount += texts.length;

    // IDF値を更新
    for (const term of newTerms) {
      const documentFrequency = documentTerms.reduce((count, docTerms) => 
        docTerms.has(term) ? count + 1 : count, 0
      );
      
      const idf = Math.log(this.documentCount / (documentFrequency + 1));
      this.idfScores.set(term, idf);
    }

    // 語彙を永続化
    await this.saveVocabulary();
  }

  /**
   * 語彙をファイルから読み込み
   */
  private async loadVocabulary(): Promise<void> {
    try {
      const vocabPath = path.join(process.cwd(), 'vocabulary.json');
      const data = await fs.readFile(vocabPath, 'utf-8');
      const vocabData = JSON.parse(data);

      this.vocabulary = new Map(vocabData.vocabulary);
      this.idfScores = new Map(vocabData.idfScores);
      this.documentCount = vocabData.documentCount || 0;

      console.log(`語彙読み込み完了: ${this.vocabulary.size}語`);
    } catch (error) {
      console.log('語彙ファイルが見つかりません。新規作成します。');
    }
  }

  /**
   * 語彙をファイルに保存
   */
  private async saveVocabulary(): Promise<void> {
    try {
      const vocabPath = path.join(process.cwd(), 'vocabulary.json');
      const vocabData = {
        vocabulary: Array.from(this.vocabulary.entries()),
        idfScores: Array.from(this.idfScores.entries()),
        documentCount: this.documentCount,
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(vocabPath, JSON.stringify(vocabData, null, 2));
      console.log('語彙保存完了');
    } catch (error) {
      console.error('語彙保存エラー:', error);
    }
  }

  /**
   * 語彙統計情報を取得
   */
  getVocabularyStats(): {
    vocabularySize: number;
    documentCount: number;
    avgIdfScore: number;
  } {
    const idfValues = Array.from(this.idfScores.values());
    const avgIdf = idfValues.length > 0 
      ? idfValues.reduce((sum, val) => sum + val, 0) / idfValues.length 
      : 0;

    return {
      vocabularySize: this.vocabulary.size,
      documentCount: this.documentCount,
      avgIdfScore: avgIdf
    };
  }
}

/**
 * より高精度な埋め込みが必要な場合の代替案
 */
export class EnhancedLocalEmbeddingService extends LocalEmbeddingService {
  
  /**
   * N-gram特徴量を追加したベクトル生成
   */
  textToEmbedding(text: string): number[] {
    const tokens = this.tokenize(text);
    
    // ユニグラム（1-gram）
    const unigrams = tokens;
    
    // バイグラム（2-gram）
    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
    }
    
    // 全特徴量を結合
    const allFeatures = [...unigrams, ...bigrams];
    const termFrequency = this.calculateTermFrequency(allFeatures);
    
    // TF-IDF計算
    const embedding: number[] = [];
    const vocabularyArray = Array.from(this.vocabulary.keys()).sort();

    for (const term of vocabularyArray) {
      const tf = termFrequency.get(term) || 0;
      const idf = this.idfScores.get(term) || 0;
      embedding.push(tf * idf);
    }

    return this.normalizeVector(embedding);
  }

  /**
   * 改良されたトークン化（日本語形態素解析風）
   */
  protected tokenize(text: string): string[] {
    // ひらがな・カタカナ・漢字の処理を改善
    const processed = text
      .toLowerCase()
      .replace(/[。、！？]/g, ' ') // 日本語句読点を空白に
      .replace(/\s+/g, ' ') // 連続空白を1つに
      .trim();

    // 日本語文字とアルファベットを分離
    const tokens: string[] = [];
    let currentToken = '';
    let currentType: 'hiragana' | 'katakana' | 'kanji' | 'latin' | null = null;

    for (const char of processed) {
      let charType: 'hiragana' | 'katakana' | 'kanji' | 'latin' | null = null;
      
      if (/[\u3040-\u309F]/.test(char)) charType = 'hiragana';
      else if (/[\u30A0-\u30FF]/.test(char)) charType = 'katakana';
      else if (/[\u4E00-\u9FAF]/.test(char)) charType = 'kanji';
      else if (/[a-zA-Z0-9]/.test(char)) charType = 'latin';

      if (charType === currentType && charType !== null) {
        currentToken += char;
      } else {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
        }
        currentToken = char;
        currentType = charType;
      }
    }

    if (currentToken.length > 0) {
      tokens.push(currentToken);
    }

    return tokens.filter(token => token.length > 0 && !/^\s+$/.test(token));
  }
}