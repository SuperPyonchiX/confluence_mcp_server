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
    console.log('Converting markdown to HTML - input length:', markdown.length);
    
    // 改行文字を統一
    let html = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 行ごとに処理
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inTable = false;
    let inCodeBlock = false;
    let inList = false;
    let listDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue; // undefined チェック
      
      const trimmed = line.trim();

      // 空行の処理
      if (trimmed === '') {
        // テーブル終了
        if (inTable) {
          processedLines.push('</tbody>');
          processedLines.push('</table>');
          inTable = false;
        }
        // リスト終了
        if (inList) {
          for (let d = listDepth; d > 0; d--) {
            processedLines.push('</ul>');
          }
          inList = false;
          listDepth = 0;
        }
        continue;
      }

      // コードブロックの処理
      if (trimmed.startsWith('```')) {
        // テーブルやリストが開いている場合は先に閉じる
        if (inTable) {
          processedLines.push('</tbody>');
          processedLines.push('</table>');
          inTable = false;
        }
        if (inList) {
          for (let d = listDepth; d > 0; d--) {
            processedLines.push('</ul>');
          }
          inList = false;
          listDepth = 0;
        }

        if (!inCodeBlock) {
          const language = trimmed.substring(3).trim();
          // Confluenceのstructured-macroコードブロック形式を使用
          const macroId = this.generateMacroId();
          processedLines.push(`<ac:structured-macro ac:name="code" ac:schema-version="1" ac:macro-id="${macroId}">`);
          if (language) {
            processedLines.push(`<ac:parameter ac:name="language">${language}</ac:parameter>`);
          }
          processedLines.push('<ac:plain-text-body><![CDATA[');
          inCodeBlock = true;
        } else {
          processedLines.push(']]></ac:plain-text-body>');
          processedLines.push('</ac:structured-macro>');
          inCodeBlock = false;
        }
        continue;
      }

      if (inCodeBlock) {
        // CDATA内ではエスケープ不要、改行文字を\\nに変換
        processedLines.push(line ? line.replace(/\n/g, '\\n') : '');
        continue;
      }

      // 見出しの処理
      if (trimmed.startsWith('#')) {
        // テーブルやリストが開いている場合は先に閉じる
        if (inTable) {
          processedLines.push('</tbody>');
          processedLines.push('</table>');
          inTable = false;
        }
        if (inList) {
          for (let d = listDepth; d > 0; d--) {
            processedLines.push('</ul>');
          }
          inList = false;
          listDepth = 0;
        }

        if (trimmed.startsWith('####')) {
          const title = this.processInlineMarkdown(trimmed.substring(4).trim());
          processedLines.push(`<h4>${title}</h4>`);
        } else if (trimmed.startsWith('###')) {
          const title = this.processInlineMarkdown(trimmed.substring(3).trim());
          processedLines.push(`<h3>${title}</h3>`);
        } else if (trimmed.startsWith('##')) {
          const title = this.processInlineMarkdown(trimmed.substring(2).trim());
          processedLines.push(`<h2>${title}</h2>`);
        } else if (trimmed.startsWith('#')) {
          const title = this.processInlineMarkdown(trimmed.substring(1).trim());
          processedLines.push(`<h1>${title}</h1>`);
        }
        continue;
      }

      // リストの処理（テーブル内ではない場合のみ）
      if ((trimmed.startsWith('- ') || trimmed.startsWith('* ')) && !inTable) {
        const content = this.processInlineMarkdown(trimmed.substring(2));
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
          listDepth = 1;
        }
        processedLines.push(`<li>${content}</li>`);
        continue;
      }

      // テーブルの処理
      if (trimmed.includes('|') && !inTable && !inList && !inCodeBlock) {
        const nextLine = i + 1 < lines.length ? lines[i + 1] : undefined;
        if (nextLine && nextLine.includes('|---')) {
          // テーブルの開始
          inTable = true;
          const headers = trimmed.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
          processedLines.push('<table>');
          processedLines.push('<thead>');
          processedLines.push('<tr>');
          headers.forEach(header => {
            processedLines.push(`<th>${this.processInlineMarkdown(header)}</th>`);
          });
          processedLines.push('</tr>');
          processedLines.push('</thead>');
          processedLines.push('<tbody>');
          i++; // セパレーター行をスキップ
          continue;
        }
      } else if (inTable && trimmed.includes('|')) {
        const cells = trimmed.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        processedLines.push('<tr>');
        cells.forEach(cell => {
          processedLines.push(`<td>${this.processInlineMarkdown(cell)}</td>`);
        });
        processedLines.push('</tr>');
        continue;
      }

      // 通常の段落（テーブル内、リスト内、コードブロック内ではない場合）
      if (trimmed && !inTable && !inList) {
        const content = this.processInlineMarkdown(trimmed);
        processedLines.push(`<p>${content}</p>`);
      }
    }

    // 未終了の要素を閉じる
    if (inList) {
      for (let d = listDepth; d > 0; d--) {
        processedLines.push('</ul>');
      }
    }

    if (inTable) {
      processedLines.push('</tbody>');
      processedLines.push('</table>');
    }

    const result = processedLines.join('\n');
    console.log('HTML conversion complete - output length:', result.length);
    return result;
  }

  private processInlineMarkdown(text: string): string {
    if (!text) return '';
    
    // 先に絵文字を HTML実体参照に変換
    text = text.replace(/📋/g, '&#128203;');
    text = text.replace(/📄/g, '&#128196;');
    text = text.replace(/🔍/g, '&#128269;');
    text = text.replace(/🏷️/g, '&#127991;');
    text = text.replace(/👥/g, '&#128101;');
    text = text.replace(/🏢/g, '&#127970;');
    text = text.replace(/📝/g, '&#128221;');
    text = text.replace(/⭐/g, '&#11088;');
    text = text.replace(/✅/g, '&#9989;');
    text = text.replace(/❌/g, '&#10060;');
    text = text.replace(/�/g, '&#128640;');
    text = text.replace(/�/g, '&#128230;');
    text = text.replace(/💡/g, '&#128161;');
    text = text.replace(/�/g, '&#128295;');
    text = text.replace(/⚠️/g, '&#9888;');
    text = text.replace(/�/g, '&#128202;');
    text = text.replace(/🤝/g, '&#129309;');
    text = text.replace(/📈/g, '&#128200;');
    text = text.replace(/🎯/g, '&#127919;');
    
    // インラインコードの処理（HTMLタグ生成はしない）
    text = text.replace(/`([^`]+)`/g, '$1');
    
    // 太字の処理（** を除去）
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
    
    // 斜体の処理（* を除去）
    text = text.replace(/\*([^*\n]+)\*/g, '$1');
    
    // リンクの処理（[text](url) を text に）
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    
    // HTML特殊文字のエスケープは絵文字処理の後に実行
    text = text.replace(/&(?!#\d+;)/g, '&amp;'); // 実体参照以外の&をエスケープ
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    text = text.replace(/"/g, '&quot;');
    text = text.replace(/'/g, '&#39;');
    
    return text;
    text = text.replace(/>/g, '&gt;');
    text = text.replace(/"/g, '&quot;');
    text = text.replace(/'/g, '&#39;');
    
    return text;
  }

  private adaptToConfluenceStorage(html: string): string {
    if (!html) return '';
    
    // ConfluenceのStorage形式に適合するよう調整
    
    // 不要な文字を除去
    html = html.replace(/\r/g, '');
    
    // 空の段落を除去
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    // 空の表セルをスペースで埋める
    html = html.replace(/<td>\s*<\/td>/g, '<td> </td>');
    
    // 連続する段落の間に適切な改行を追加
    html = html.replace(/<\/p>\n<p>/g, '</p>\n<p>');
    
    // HTMLの整形
    html = html.replace(/>\s+</g, '><');
    
    console.log('Final HTML output (first 500 chars):', html.substring(0, 500));
    return html.trim();
  }

  private generateMacroId(): string {
    // UUIDライクなIDを生成（Confluenceマクロ用）
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-') // 無効な文字を-に置換
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .replace(/-+/g, '-') // 連続するハイフンを単一に
      .substring(0, 200); // 長すぎるファイル名を制限
  }
}
