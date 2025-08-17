#!/usr/bin/env node

/**
 * Confluence Vector DB Builder
 * 特定のスペースの全ページをベクトル化してJSONファイルに保存するツール
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfluenceApiClient } from '../src/confluence-client.js';
import { LocalEmbeddingService } from '../src/local-embedding-service.js';
import { ConfluenceConfig } from '../src/types.js';

/**
 * .envファイルを読み込んで環境変数に設定
 */
async function loadEnvFile(): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    console.log('📁 .envファイルを読み込み中...');
    
    const lines = envContent.split('\n');
    let loadedCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // コメント行と空行をスキップ
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // キー=値の形式を解析
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        
        // 既存の環境変数を優先（process.envが既に設定されている場合は上書きしない）
        if (!process.env[key]) {
          process.env[key] = value;
          loadedCount++;
          console.log(`   ${key}=${value}`);
        }
      }
    }
    
    console.log(`✅ ${loadedCount}個の環境変数を読み込みました`);
    console.log('');
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('📋 .envファイルが見つかりません（環境変数で設定済みの場合は問題ありません）');
      console.log('   .env.datacenter-sampleを参考に.envファイルを作成できます');
    } else {
      console.warn(`⚠️  .envファイル読み込みエラー: ${error.message}`);
    }
    console.log('');
  }
}

interface VectorEntry {
  pageId: string;
  pageTitle: string;
  sectionId: string;
  sectionTitle: string;
  embedding: number[];
  spaceKey: string;
  lastUpdated: string;
  url?: string;
}

interface VectorDatabase {
  metadata: {
    spaceKey: string;
    spaceName: string;
    totalPages: number;
    totalSections: number;
    createdAt: string;
    embeddingModel: string;
    version: string;
  };
  vectors: VectorEntry[];
}

class ConfluenceVectorBuilder {
  private confluenceClient: ConfluenceApiClient;
  private embeddingService: LocalEmbeddingService;

  constructor(config: ConfluenceConfig) {
    this.confluenceClient = new ConfluenceApiClient(config);
    this.embeddingService = new LocalEmbeddingService();
  }

  /**
   * スペース全体のベクトルDBを構築
   */
  async buildVectorDB(spaceKey: string, outputPath: string): Promise<void> {
    console.log(`🚀 ベクトルDB構築開始: ${spaceKey}`);

    try {
      // スペース情報を取得
      const space = await this.confluenceClient.getSpaceById(spaceKey);
      console.log(`📂 スペース: ${space.name} (${space.key})`);

      // スペース内のページ一覧を取得
      const pagesResponse = await this.confluenceClient.getPages({
        spaceId: [space.id],
        status: ['current'],
        bodyFormat: 'storage',
        limit: 250
      });

      console.log(`📄 対象ページ数: ${pagesResponse.results.length}`);

      const allVectors: VectorEntry[] = [];
      let processedPages = 0;

      // 各ページを処理
      for (const page of pagesResponse.results) {
        try {
          console.log(`📝 処理中: ${page.title} (${page.id})`);
          
          const vectors = await this.processPage(page, spaceKey);
          allVectors.push(...vectors);
          
          processedPages++;
          console.log(`✅ 完了 (${processedPages}/${pagesResponse.results.length}): ${vectors.length}セクション`);
          
          // API制限対策で少し待機
          await this.sleep(100);
          
        } catch (error: any) {
          console.error(`❌ ページ処理エラー (${page.id}): ${error.message}`);
        }
      }

      // ベクトルDBを保存
      const vectorDB: VectorDatabase = {
        metadata: {
          spaceKey: space.key,
          spaceName: space.name,
          totalPages: processedPages,
          totalSections: allVectors.length,
          createdAt: new Date().toISOString(),
          embeddingModel: 'local-tfidf',
          version: '1.0.0'
        },
        vectors: allVectors
      };

      await fs.writeFile(outputPath, JSON.stringify(vectorDB, null, 2), 'utf-8');
      
      console.log(`🎉 ベクトルDB構築完了!`);
      console.log(`📊 統計:`);
      console.log(`   - スペース: ${space.name}`);
      console.log(`   - ページ数: ${processedPages}`);
      console.log(`   - セクション数: ${allVectors.length}`);
      console.log(`   - 出力ファイル: ${outputPath}`);
      console.log(`   - ファイルサイズ: ${((await fs.stat(outputPath)).size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error: any) {
      console.error(`❌ ベクトルDB構築エラー:`, error);
      throw error;
    }
  }

  /**
   * 個別ページを処理してベクトル化
   */
  private async processPage(page: any, spaceKey: string): Promise<VectorEntry[]> {
    if (!page.body?.storage?.value) {
      console.warn(`⚠️  ページ本文が空: ${page.title}`);
      return [];
    }

    // ページをセクションに分割
    const sections = this.extractSections(page.body.storage.value, page.title);
    
    if (sections.length === 0) {
      console.warn(`⚠️  セクションが見つかりません: ${page.title}`);
      return [];
    }

    // セクションテキストの配列を作成
    const sectionTexts = sections.map(section => 
      `${section.title}\n${section.content}`.trim()
    );

    // 埋め込みベクトルを生成
    const embeddings = await this.embeddingService.generateEmbeddings(sectionTexts);

    // ベクトルエントリを作成
    const vectors: VectorEntry[] = [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const embedding = embeddings[i];

      if (embedding) {
        vectors.push({
          pageId: String(page.id),
          pageTitle: page.title,
          sectionId: section.id,
          sectionTitle: section.title,
          embedding: embedding,
          spaceKey: spaceKey,
          lastUpdated: page.version?.when || new Date().toISOString(),
          url: this.buildPageUrl(page.id)
        });
      }
    }

    return vectors;
  }

  /**
   * HTMLコンテンツをセクションに分割
   */
  private extractSections(htmlContent: string, pageTitle: string): Array<{
    id: string;
    title: string;
    content: string;
  }> {
    // HTMLをプレーンテキストに変換
    const textContent = this.htmlToText(htmlContent);
    
    const lines = textContent.split('\n');
    const sections: Array<{ id: string; title: string; content: string }> = [];
    
    let currentSection: { title: string; content: string[] } | null = null;
    let sectionIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 見出しを検出（#、##、### または大文字のみの行）
      if (this.isHeading(trimmedLine)) {
        // 前のセクションを保存
        if (currentSection && currentSection.content.length > 0) {
          sections.push({
            id: `section_${sectionIndex}`,
            title: currentSection.title,
            content: currentSection.content.join('\n').trim()
          });
          sectionIndex++;
        }

        // 新しいセクションを開始
        const title = this.cleanHeading(trimmedLine);
        currentSection = {
          title: title || `Section ${sectionIndex + 1}`,
          content: []
        };
      } else if (currentSection && trimmedLine.length > 0) {
        currentSection.content.push(line);
      } else if (!currentSection && trimmedLine.length > 0) {
        // 最初のコンテンツ（見出しなし）
        currentSection = {
          title: pageTitle,
          content: [line]
        };
      }
    }

    // 最後のセクションを保存
    if (currentSection && currentSection.content.length > 0) {
      sections.push({
        id: `section_${sectionIndex}`,
        title: currentSection.title,
        content: currentSection.content.join('\n').trim()
      });
    }

    // 短すぎるセクションを除外
    return sections.filter(section => section.content.length > 30);
  }

  /**
   * 見出しかどうかを判定
   */
  private isHeading(text: string): boolean {
    // Markdown見出し
    if (/^#{1,6}\s+/.test(text)) return true;
    
    // 大文字のみの短い行（見出しっぽい）
    if (text.length > 2 && text.length < 50 && text === text.toUpperCase() && /^[A-Z\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(text)) {
      return true;
    }
    
    // 数字で始まる行（1. 2. など）
    if (/^\d+[\.\)]\s+/.test(text)) return true;
    
    return false;
  }

  /**
   * 見出しテキストをクリーンアップ
   */
  private cleanHeading(text: string): string {
    return text
      .replace(/^#{1,6}\s+/, '')  // Markdown見出し記号を除去
      .replace(/^\d+[\.\)]\s+/, '')  // 数字リストを除去
      .trim();
  }

  /**
   * HTMLをプレーンテキストに変換
   */
  private htmlToText(html: string): string {
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
      .replace(/<[^>]+>/g, '') // HTMLタグを除去
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 連続改行を統合
      .trim();
  }

  /**
   * ページURLを構築
   */
  private buildPageUrl(pageId: string): string {
    const domain = process.env.CONFLUENCE_DOMAIN;
    if (domain) {
      return `https://${domain}/wiki/pages/viewpage.action?pageId=${pageId}`;
    }
    return `page:${pageId}`;
  }

  /**
   * 待機関数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 Confluence Vector DB Builder');
  console.log('================================');
  console.log('');

  // .envファイルを読み込み
  await loadEnvFile();

  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
使用方法: 
  node vector-builder.js <SPACE_KEY> <OUTPUT_FILE>

例:
  node vector-builder.js PROJ ./vectors/proj-vectors.json

環境変数（DataCenter版 - Basic認証）:
  CONFLUENCE_DOMAIN     - Confluenceドメイン（例: confluence.company.com:8090）
  CONFLUENCE_USERNAME   - ユーザー名
  CONFLUENCE_PASSWORD   - パスワード
  CONFLUENCE_AUTH_TYPE  - 'basic'（DataCenter版のデフォルト）
  CONFLUENCE_BASE_URL   - ベースURL（任意、未指定時は自動生成）

環境変数（Cloud版 - Token認証）:
  CONFLUENCE_DOMAIN     - Confluenceドメイン（例: company.atlassian.net）
  CONFLUENCE_EMAIL      - ユーザーメール
  CONFLUENCE_API_TOKEN  - APIトークン  
  CONFLUENCE_AUTH_TYPE  - 'token'（Cloud版で使用）
  CONFLUENCE_BASE_URL   - ベースURL（任意、未指定時は自動生成）

現在の環境変数:
  CONFLUENCE_DOMAIN=${process.env.CONFLUENCE_DOMAIN || '(未設定)'}
  CONFLUENCE_USERNAME=${process.env.CONFLUENCE_USERNAME || '(未設定)'}
  CONFLUENCE_AUTH_TYPE=${process.env.CONFLUENCE_AUTH_TYPE || 'basic(デフォルト)'}
`);
    process.exit(1);
  }

  const [spaceKey, outputPath] = args;

  // 環境変数から設定を読み込み
  const domain = process.env.CONFLUENCE_DOMAIN?.trim();
  const baseUrl = process.env.CONFLUENCE_BASE_URL?.trim();
  const authType = (process.env.CONFLUENCE_AUTH_TYPE?.trim() as 'basic' | 'token') || 'basic';

  if (!domain) {
    console.error('❌ CONFLUENCE_DOMAIN環境変数が設定されていません');
    process.exit(1);
  }

  let config: ConfluenceConfig;

  if (authType === 'basic') {
    // DataCenter版の場合：ユーザー名とパスワード
    const username = process.env.CONFLUENCE_USERNAME?.trim();
    const password = process.env.CONFLUENCE_PASSWORD?.trim();

    if (!username || !password) {
      console.error('❌ Basic認証にはCONFLUENCE_USERNAMEとCONFLUENCE_PASSWORDが必要です');
      console.error('   DataCenter版ではパスワード認証を使用してください');
      process.exit(1);
    }

    config = {
      domain,
      username,
      password,
      baseUrl: baseUrl || `http://${domain}/rest/api`,
      authType: 'basic'
    };
  } else {
    // Cloud版の場合：メールとAPIトークン
    const email = process.env.CONFLUENCE_EMAIL?.trim();
    const apiToken = process.env.CONFLUENCE_API_TOKEN?.trim();

    if (!email || !apiToken) {
      console.error('❌ Token認証にはCONFLUENCE_EMAILとCONFLUENCE_API_TOKENが必要です');
      console.error('   Cloud版ではトークン認証を使用してください');
      process.exit(1);
    }

    config = {
      domain,
      email,
      apiToken,
      baseUrl: baseUrl || `https://${domain}/wiki/api/v2`,
      authType: 'token'
    };
  }

  try {
    // 出力ディレクトリを作成
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    const builder = new ConfluenceVectorBuilder(config);
    await builder.buildVectorDB(spaceKey, outputPath);

  } catch (error: any) {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合にメイン関数を実行
main().catch(error => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});