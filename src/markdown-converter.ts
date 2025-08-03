import TurndownService from 'turndown';
import * as fs from 'fs';
import * as path from 'path';

export interface MarkdownConversionOptions {
  /** ファイルパス（拡張子.mdは自動付加） */
  filePath?: string;
  /** ディレクトリパス（複数ファイルの場合） */
  outputDir?: string;
  /** 画像のダウンロード設定 */
  downloadImages?: boolean;
  /** 画像の保存ディレクトリ */
  imageDir?: string;
  /** メタデータを含めるか */
  includeMetadata?: boolean;
}

export interface PageMarkdownResult {
  /** 変換されたMarkdownコンテンツ */
  markdown: string;
  /** 保存されたファイルパス */
  filePath?: string;
  /** メタデータ情報 */
  metadata?: {
    title: string;
    id: number;
    spaceKey?: string;
    createdAt?: string;
    updatedAt?: string;
    author?: string;
  };
}

export class MarkdownConverter {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-'
    });

    // Confluenceの特殊な要素の処理をカスタマイズ
    this.setupConfluenceRules();
  }

  private setupConfluenceRules(): void {
    // Confluenceのマクロ処理
    this.turndownService.addRule('confluenceMacros', {
      filter: (node: any) => {
        return node.nodeName === 'AC:STRUCTURED-MACRO' || 
               (node as Element).hasAttribute?.('ac:name');
      },
      replacement: (content: string, node: any) => {
        const macroName = (node as Element).getAttribute?.('ac:name') || 'unknown';
        return `\n<!-- Confluence Macro: ${macroName} -->\n${content}\n`;
      }
    });

    // コードブロックの改善
    this.turndownService.addRule('codeBlock', {
      filter: ['pre'],
      replacement: (content: string, node: any) => {
        const language = (node as Element).getAttribute?.('data-language') || '';
        return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
      }
    });

    // 表の処理
    this.turndownService.addRule('table', {
      filter: 'table',
      replacement: (content: string) => {
        return `\n${content}\n`;
      }
    });
  }

  /**
   * ConfluenceのStorage形式のHTMLをMarkdownに変換
   */
  confluenceToMarkdown(storageContent: string, metadata?: any): string {
    let markdown = this.turndownService.turndown(storageContent);

    // メタデータをフロントマターとして追加
    if (metadata) {
      const frontMatter = this.createFrontMatter(metadata);
      markdown = `${frontMatter}\n\n${markdown}`;
    }

    return this.cleanupMarkdown(markdown);
  }

  /**
   * MarkdownをConfluenceのStorage形式に変換
   */
  async markdownToConfluence(markdown: string): Promise<string> {
    // フロントマターを除去
    const { content } = this.extractFrontMatter(markdown);

    // 簡易的なMarkdown→HTML変換
    let html = this.simpleMarkdownToHtml(content);

    // ConfluenceのStorage形式に適合するよう調整
    html = this.adaptToConfluenceStorage(html);

    return html;
  }

  /**
   * ページデータをMarkdownファイルとして保存
   */
  async savePageAsMarkdown(
    pageData: any, 
    options: MarkdownConversionOptions = {}
  ): Promise<PageMarkdownResult> {
    const markdown = this.confluenceToMarkdown(
      pageData.body?.storage?.value || '',
      options.includeMetadata ? pageData : undefined
    );

    let filePath: string | undefined;
    
    if (options.filePath) {
      filePath = options.filePath.endsWith('.md') 
        ? options.filePath 
        : `${options.filePath}.md`;
    } else {
      const sanitizedTitle = this.sanitizeFilename(pageData.title || 'untitled');
      filePath = path.join(
        options.outputDir || './exports',
        `${sanitizedTitle}.md`
      );
    }

    // ディレクトリを作成
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // ファイルに保存
    fs.writeFileSync(filePath, markdown, 'utf8');

    return {
      markdown,
      filePath,
      metadata: options.includeMetadata ? {
        title: pageData.title,
        id: pageData.id,
        spaceKey: pageData.spaceId,
        createdAt: pageData.createdAt,
        updatedAt: pageData.version?.createdAt,
        author: pageData.version?.createdBy?.displayName
      } : undefined
    };
  }

  /**
   * Markdownファイルを読み込んでConfluence用のデータに変換
   */
  async loadMarkdownForConfluence(filePath: string): Promise<{
    title: string;
    content: string;
    metadata?: any;
  }> {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const { frontMatter, content } = this.extractFrontMatter(markdown);

    // タイトルの抽出（フロントマターまたは最初のh1から）
    let title = frontMatter?.title || this.extractTitleFromMarkdown(content) || path.basename(filePath, '.md');

    const confluenceContent = await this.markdownToConfluence(content);

    return {
      title,
      content: confluenceContent,
      metadata: frontMatter
    };
  }

  private createFrontMatter(metadata: any): string {
    const frontMatter = [
      '---',
      `title: "${metadata.title || ''}"`,
      `id: ${metadata.id || ''}`,
      `spaceKey: "${metadata.spaceId || ''}"`,
      `createdAt: "${metadata.createdAt || ''}"`,
      `updatedAt: "${metadata.version?.createdAt || ''}"`,
      `author: "${metadata.version?.createdBy?.displayName || ''}"`,
      '---'
    ];
    return frontMatter.join('\n');
  }

  private extractFrontMatter(markdown: string): { frontMatter: any; content: string } {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = markdown.match(frontMatterRegex);

    if (!match) {
      return { frontMatter: null, content: markdown };
    }

    const frontMatterText = match[1];
    const content = markdown.replace(frontMatterRegex, '');

    // 簡易的なYAMLパース
    const frontMatter: any = {};
    if (frontMatterText) {
      frontMatterText.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim().replace(/^"(.*)"$/, '$1');
          frontMatter[key.trim()] = value;
        }
      });
    }

    return { frontMatter, content };
  }

  private extractTitleFromMarkdown(markdown: string): string | null {
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    return titleMatch && titleMatch[1] ? titleMatch[1].trim() : null;
  }

  private cleanupMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, '\n\n') // 3つ以上の連続改行を2つに
      .replace(/\\\n/g, '\n') // 不要なエスケープを削除
      .trim();
  }

  private simpleMarkdownToHtml(markdown: string): string {
    // 簡易的なMarkdown→HTML変換
    // 実際のプロダクションでは、より堅牢なライブラリを使用することを推奨
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/```([^```]+)```/gims, '<pre><code>$1</code></pre>')
      .replace(/\n/gim, '<br>');
  }

  private adaptToConfluenceStorage(html: string): string {
    // ConfluenceのStorage形式に適合するよう調整
    // 必要に応じて、特定のHTML構造をConfluenceマクロに変換
    return html;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-') // 無効な文字を-に置換
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .replace(/-+/g, '-') // 連続するハイフンを単一に
      .substring(0, 200); // 長すぎるファイル名を制限
  }
}
