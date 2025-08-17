/**
 * ベクトル検索エンジン
 * JSONファイルベースの軽量ベクトルデータベース
 */

import * as fs from 'fs';
import * as path from 'path';
import { EmbeddingVector, VectorSearchResult } from './rag-types.js';

export class VectorSearchEngine {
  private vectors: EmbeddingVector[] = [];
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.loadVectors();
  }

  /**
   * ベクトルデータベースをファイルから読み込み
   */
  private loadVectors(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        this.vectors = JSON.parse(data);
        console.log(`ベクトルデータベースを読み込みました: ${this.vectors.length}件`);
      } else {
        console.log('ベクトルデータベースファイルが見つかりません。空の状態で開始します。');
        this.vectors = [];
      }
    } catch (error) {
      console.error('ベクトルデータベースの読み込みエラー:', error);
      this.vectors = [];
    }
  }

  /**
   * ベクトルデータベースをファイルに保存
   */
  public saveVectors(): void {
    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.dbPath, JSON.stringify(this.vectors, null, 2), 'utf-8');
      console.log(`ベクトルデータベースを保存しました: ${this.vectors.length}件`);
    } catch (error) {
      console.error('ベクトルデータベースの保存エラー:', error);
    }
  }

  /**
   * ベクトルを追加または更新
   */
  public upsertVector(vector: EmbeddingVector): void {
    const existingIndex = this.vectors.findIndex(v => v.id === vector.id);
    
    if (existingIndex >= 0) {
      this.vectors[existingIndex] = vector;
      console.log(`ベクトルを更新しました: ${vector.id}`);
    } else {
      this.vectors.push(vector);
      console.log(`ベクトルを追加しました: ${vector.id}`);
    }
  }

  /**
   * 複数のベクトルをバッチで追加または更新
   */
  public upsertVectors(vectors: EmbeddingVector[]): void {
    for (const vector of vectors) {
      this.upsertVector(vector);
    }
    this.saveVectors();
  }

  /**
   * コサイン類似度を計算
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('ベクトルの次元が一致しません');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const valueA = vectorA[i] ?? 0;
      const valueB = vectorB[i] ?? 0;
      dotProduct += valueA * valueB;
      normA += valueA * valueA;
      normB += valueB * valueB;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  /**
   * ベクトル検索を実行
   */
  public search(
    queryVector: number[], 
    maxResults: number = 5, 
    similarityThreshold: number = 0.7,
    spaceKey?: string
  ): VectorSearchResult[] {
    const results: VectorSearchResult[] = [];

    for (const vector of this.vectors) {
      // スペース指定がある場合はフィルタリング
      if (spaceKey && vector.metadata?.spaceKey !== spaceKey) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryVector, vector.embedding);
      
      if (similarity >= similarityThreshold) {
        results.push({
          vector,
          similarity
        });
      }
    }

    // 類似度順でソート
    results.sort((a, b) => b.similarity - a.similarity);

    // 最大結果数まで絞り込み
    return results.slice(0, maxResults);
  }

  /**
   * 特定のページIDのベクトルを削除
   */
  public deleteByPageId(pageId: string): number {
    const originalLength = this.vectors.length;
    this.vectors = this.vectors.filter(v => v.pageId !== pageId);
    const deletedCount = originalLength - this.vectors.length;
    
    if (deletedCount > 0) {
      this.saveVectors();
      console.log(`ページ ${pageId} のベクトル ${deletedCount}件を削除しました`);
    }
    
    return deletedCount;
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    totalVectors: number;
    spaceDistribution: Record<string, number>;
    lastUpdated: string;
  } {
    const spaceDistribution: Record<string, number> = {};
    
    for (const vector of this.vectors) {
      const spaceKey = vector.metadata?.spaceKey || 'unknown';
      spaceDistribution[spaceKey] = (spaceDistribution[spaceKey] || 0) + 1;
    }

    return {
      totalVectors: this.vectors.length,
      spaceDistribution,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * データベースをクリア
   */
  public clear(): void {
    this.vectors = [];
    this.saveVectors();
    console.log('ベクトルデータベースをクリアしました');
  }
}