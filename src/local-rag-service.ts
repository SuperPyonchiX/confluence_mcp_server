import { VectorSearchEngine } from './vector-search.js';
import { LocalEmbeddingService } from './local-embedding-service.js';
import { RAGRequest, RAGResponse, EmbeddingVector, RAGConfig } from './rag-types.js';
import { ConfluenceApiClient } from './confluence-client.js';

/**
 * ローカル埋め込みベースのRAGサービス
 * OpenAI API不要、完全にオフラインで動作
 */
export class LocalRAGService {
  private vectorSearch: VectorSearchEngine;
  private embeddingService: LocalEmbeddingService;
  private confluenceClient: ConfluenceApiClient;

  constructor(confluenceClient: ConfluenceApiClient, config: RAGConfig) {
    this.confluenceClient = confluenceClient;
    this.vectorSearch = new VectorSearchEngine(config.vectorDbPath);
    this.embeddingService = new LocalEmbeddingService();
  }

  /**
   * ユーザーの質問に対してRAGで回答を生成（ローカル版）
   */
  async query(request: RAGRequest): Promise<RAGResponse> {
    try {
      console.log(`RAG検索開始: ${request.query}`);

      // 1. 質問の埋め込みベクトルを生成
      const queryEmbeddings = await this.embeddingService.generateEmbeddings([request.query]);
      const queryVector = queryEmbeddings[0];

      if (!queryVector) {
        throw new Error('クエリの埋め込みベクトル生成に失敗しました');
      }

      // 2. ベクトル検索を実行
      const searchResults = this.vectorSearch.search(
        queryVector,
        request.maxResults || 5,
        request.similarityThreshold || 0.7,
        request.spaceKey
      );

      console.log(`ベクトル検索完了: ${searchResults.length}件の結果`);

      // 3. 関連コンテンツを取得
      const contexts = await this.retrieveContexts(searchResults);
      console.log(`コンテキスト取得完了: ${contexts.length}件`);

      // 4. ローカルで回答を生成（キーワードベースの要約）
      const answer = this.generateLocalAnswer(request.query, contexts);
      console.log('回答生成完了');

      // 5. ソース情報を構築
      const sources = searchResults.map(result => ({
        pageId: result.vector.pageId,
        pageTitle: result.vector.metadata?.pageTitle || 'Unknown Page',
        sectionId: result.vector.sectionId,
        sectionTitle: result.vector.metadata?.sectionTitle || 'Unknown Section',
        similarity: result.similarity,
        url: this.buildPageUrl(result.vector.pageId)
      }));

      return {
        answer,
        sources,
        metadata: {
          searchResults: searchResults.length,
          sourcesUsed: contexts.length,
          processingTime: Date.now()
        }
      };

    } catch (error: any) {
      console.error('RAG検索エラー:', error);
      throw new Error(`RAG検索に失敗しました: ${error.message}`);
    }
  }

  /**
   * ページをインデックス化
   */
  async indexPage(pageId: string): Promise<void> {
    try {
      console.log(`ページインデックス開始: ${pageId}`);

      // ページの内容を取得
      const page = await this.confluenceClient.getPageById(pageId, {
        bodyFormat: 'storage'
      });

      // ページをセクション単位に分割
      if (!page.body?.storage?.value) {
        throw new Error('ページ本文が取得できませんでした');
      }
      
      const sections = this.extractSections(page.body.storage.value);
      console.log(`セクション分割完了: ${sections.length}件`);

      // 各セクションの埋め込みを生成
      const vectors: EmbeddingVector[] = [];
      const sectionTexts = sections.map(section => 
        `${section.title}\n${section.content}`.trim()
      );

      const embeddings = await this.embeddingService.generateEmbeddings(sectionTexts);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const embedding = embeddings[i];

        if (embedding && section) {
          vectors.push({
            id: `${pageId}_${section.id}`,
            pageId: pageId,
            sectionId: section.id,
            embedding: embedding,
            metadata: {
              pageTitle: page.title,
              sectionTitle: section.title,
              lastUpdated: new Date().toISOString(),
              spaceKey: page.space?.key
            }
          });
        }
      }

      // ベクトルデータベースに追加
      this.vectorSearch.upsertVectors(vectors);
      console.log(`ページインデックス完了: ${pageId} (${vectors.length}セクション)`);

    } catch (error) {
      console.error(`ページインデックスエラー (${pageId}):`, error);
      throw error;
    }
  }

  /**
   * スペース全体をインデックス化
   */
  async indexSpace(spaceKey: string): Promise<void> {
    try {
      console.log(`スペースインデックス開始: ${spaceKey}`);

      // スペース内のページ一覧を取得
      const spaceResponse = await this.confluenceClient.getSpaceById(spaceKey);
      const pagesResponse = await this.confluenceClient.getPages({
        spaceId: [spaceResponse.id],
        status: ['current'],
        limit: 250 // 一度に処理する最大ページ数
      });

      console.log(`スペース内ページ数: ${pagesResponse.results.length}`);

      // 各ページを順次インデックス化
      for (const page of pagesResponse.results) {
        try {
          await this.indexPage(String(page.id));
          // API制限を避けるため少し待機
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`ページインデックスをスキップ: ${page.id}`, error);
        }
      }

      console.log(`スペースインデックス完了: ${spaceKey}`);

    } catch (error) {
      console.error(`スペースインデックスエラー (${spaceKey}):`, error);
      throw error;
    }
  }

  /**
   * ローカル回答生成（キーワード抽出＋テンプレート）
   */
  private generateLocalAnswer(query: string, contexts: Array<{
    pageTitle: string;
    sectionTitle: string;
    content: string;
  }>): string {
    if (contexts.length === 0) {
      return 'お探しの情報に関連するコンテンツが見つかりませんでした。検索キーワードを変えて再度お試しください。';
    }

    // クエリからキーワードを抽出
    const queryKeywords = this.extractKeywords(query);
    
    // 関連情報を要約
    const summaryPoints: string[] = [];
    const sourcePages = new Set<string>();

    for (const context of contexts.slice(0, 3)) { // 上位3件のコンテキストを使用
      sourcePages.add(context.pageTitle);
      
      // キーワードに関連する文を抽出
      const relevantSentences = this.extractRelevantSentences(
        context.content, 
        queryKeywords
      );
      
      if (relevantSentences.length > 0) {
        summaryPoints.push(
          `**${context.pageTitle}** > ${context.sectionTitle}:\n${relevantSentences.join(' ')}`
        );
      }
    }

    // 回答を構築
    let answer = `以下の情報が見つかりました：\n\n`;
    
    if (summaryPoints.length > 0) {
      answer += summaryPoints.join('\n\n');
      answer += `\n\n**参考ページ**: ${Array.from(sourcePages).join(', ')}`;
    } else {
      answer += `関連するページは見つかりましたが、具体的な詳細についてはページを直接確認してください。\n\n`;
      answer += `**参考ページ**: ${Array.from(sourcePages).join(', ')}`;
    }

    return answer;
  }

  /**
   * キーワード抽出
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .slice(0, 10); // 上位10キーワード
  }

  /**
   * 関連文を抽出
   */
  private extractRelevantSentences(content: string, keywords: string[]): string[] {
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    const relevantSentences: { sentence: string; score: number }[] = [];

    for (const sentence of sentences) {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      for (const keyword of keywords) {
        if (lowerSentence.includes(keyword)) {
          score += 1;
        }
      }

      if (score > 0) {
        relevantSentences.push({ sentence: sentence.trim(), score });
      }
    }

    return relevantSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.sentence);
  }

  /**
   * 検索結果からコンテキストを取得
   */
  private async retrieveContexts(searchResults: Array<{
    vector: EmbeddingVector;
    similarity: number;
  }>): Promise<Array<{
    pageTitle: string;
    sectionTitle: string;
    content: string;
  }>> {
    const contexts = [];

    for (const result of searchResults) {
      try {
        const page = await this.confluenceClient.getPageById(result.vector.pageId, {
          bodyFormat: 'storage'
        });

        // 該当セクションを抽出
        if (page.body?.storage?.value) {
          const sections = this.extractSections(page.body.storage.value);
          const targetSection = sections.find(s => s.id === result.vector.sectionId);

          if (targetSection) {
            contexts.push({
              pageTitle: page.title,
              sectionTitle: targetSection.title,
              content: targetSection.content
            });
          }
        }
      } catch (error) {
        console.error(`コンテキスト取得エラー: ${result.vector.pageId}`, error);
      }
    }

    return contexts;
  }

  /**
   * HTMLコンテンツをセクションに分割
   */
  private extractSections(htmlContent: string): Array<{
    id: string;
    title: string;
    content: string;
  }> {
    // HTMLをプレーンテキストに変換
    const textContent = this.htmlToMarkdown(htmlContent);
    
    // セクション見出しで分割
    const lines = textContent.split('\n');
    const sections: Array<{ id: string; title: string; content: string }> = [];
    
    let currentSection: { title: string; content: string[] } | null = null;
    let sectionIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Markdown見出しを検出（# ## ### など）
      if (/^#{1,6}\s+/.test(trimmedLine)) {
        // 前のセクションを保存
        if (currentSection) {
          sections.push({
            id: `section_${sectionIndex}`,
            title: currentSection.title,
            content: currentSection.content.join('\n').trim()
          });
          sectionIndex++;
        }

        // 新しいセクションを開始
        const title = trimmedLine.replace(/^#{1,6}\s+/, '');
        currentSection = {
          title: title || `Section ${sectionIndex + 1}`,
          content: []
        };
      } else if (currentSection) {
        currentSection.content.push(line);
      } else {
        // 見出しがない場合は最初のセクションとして扱う
        if (!currentSection) {
          currentSection = {
            title: 'Introduction',
            content: [line]
          };
        }
      }
    }

    // 最後のセクションを保存
    if (currentSection) {
      sections.push({
        id: `section_${sectionIndex}`,
        title: currentSection.title,
        content: currentSection.content.join('\n').trim()
      });
    }

    // 空のセクションを除外
    return sections.filter(section => section.content.length > 20);
  }

  /**
   * HTMLをMarkdownに変換
   */
  private htmlToMarkdown(html: string): string {
    // 基本的なHTMLタグをMarkdownに変換
    return html
      .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, text) => {
        const headerLevel = '#'.repeat(parseInt(level));
        return `${headerLevel} ${text.trim()}\n`;
      })
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<[^>]+>/g, '') // その他のHTMLタグを除去
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 連続する空行を統合
      .trim();
  }

  /**
   * ページURLを構築
   */
  private buildPageUrl(pageId: string): string {
    // 基本的なURL構築（実際の環境に合わせて調整）
    const domain = process.env.CONFLUENCE_DOMAIN;
    if (domain) {
      return `https://${domain}/wiki/pages/viewpage.action?pageId=${pageId}`;
    }
    return `page:${pageId}`;
  }

  /**
   * インデックス統計情報を取得
   */
  getIndexStats(): {
    totalVectors: number;
    vocabularyStats: any;
    
  } {
    return {
      totalVectors: this.vectorSearch['vectors']?.length || 0,
      vocabularyStats: this.embeddingService.getVocabularyStats()
    };
  }
}