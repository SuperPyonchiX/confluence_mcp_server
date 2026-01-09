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
    // Confluenceのmarkdounマクロ処理（Mermaid等）
    // ※preprocess ConfluenceHtmlで既にMarkdownとして展開するため
    // ここでは何もしないダミールールにしておき、他のマクロルールに食われないようにする
    this.turndownService.addRule('confluenceMarkdownMacro', {
      filter: (node: any) => {
        const nodeName = node.nodeName?.toLowerCase() || '';
        const macroName = (node as Element).getAttribute?.('ac:name') || '';
        return nodeName === 'ac:structured-macro' && macroName === 'markdown';
      },
      replacement: () => {
        // preprocessConfluenceHtml側で処理済みなのでここでは空文字を返す
        return '';
      }
    });

    // Confluenceのタスクリスト処理（チェックボックス）
    this.turndownService.addRule('confluenceTaskList', {
      filter: (node: any) => {
        return node.nodeName?.toLowerCase() === 'ac:task-list';
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        const tasks = element.querySelectorAll('ac\\:task');
        const result: string[] = [];

        tasks.forEach((task: Element) => {
          const status = task.querySelector('ac\\:task-status')?.textContent || 'incomplete';
          const body = task.querySelector('ac\\:task-body')?.textContent || '';
          const checkbox = status === 'complete' ? '[x]' : '[]';
          result.push(`- ${checkbox} ${body}`);
        });

        return `\n${result.join('\n')}\n`;
      }
    });

    // ac:task-list 直後に続く、チェックボックスの補足説明用ネストULをMarkdownの子リストとして扱う
    this.turndownService.addRule('confluenceTaskListNestedUL', {
      filter: (node: any) => {
        const nodeName = node.nodeName?.toLowerCase() || '';
        if (nodeName !== 'ul') return false;

        const element = node as Element;
        const style = element.getAttribute('style') || '';
        // style="list-style-type: none;" の UL のみ対象
        if (/list-style-type:\s*none/i.test(style)) return false;

        const prev = element.previousSibling as Element | null;
        return !!prev && prev.nodeName?.toLowerCase() === 'ac:task-list';
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        const innerLis = element.querySelectorAll('ul > li');
        const lines: string[] = [];
    
        innerLis.forEach((li: Element) => {
          const text = li.textContent || '';
          const cleaned = text.replace(/\s+/g, ' ').trim();
          if (cleaned) {
            // タスクリスト直下の説明として4スペースインデントで出力
              lines.push(`    - ${cleaned}`);
          }
        });

        return lines.length ? '\n' + lines.join('\n') + '\n' : '';
      }
    });

    // Confluenceのコードマクロ処理 - より汎用的なアプローチ
    this.turndownService.addRule('confluenceCodeMacro', {
      filter: (node: any) => {
        // 大文字小文字を問わずにチェック
        const nodeName = node.nodeName?.toLowerCase() || '';
        const macroName = (node as Element).getAttribute?.('ac:name') || '';
        return nodeName === 'ac:structured-macro' && macroName === 'code';
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        
        // 言語パラメータを取得 - より広範囲に検索
        let language = '';
        
        // すべての子要素をチェックして言語パラメータを見つける
        const allChildren = element.querySelectorAll('*');
        for (const child of allChildren) {
          if (child.getAttribute('ac:name') === 'language') {
            language = child.textContent?.trim() || '';
            break;
          }
        }
        
        // コード内容を取得 - CDATAを含む可能性のある要素を探す
        let codeContent = '';
        const allTextNodes = element.querySelectorAll('*');
        for (const textNode of allTextNodes) {
          const nodeName = textNode.nodeName?.toLowerCase() || '';
          if (nodeName === 'ac:plain-text-body') {
            const rawHTML = textNode.innerHTML || '';
            const rawText = textNode.textContent || '';
            
            // CDATAセクションをチェック
            const cdataMatch = rawHTML.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
            if (cdataMatch && cdataMatch[1] !== undefined) {
              codeContent = cdataMatch[1].trim();
            } else {
              codeContent = rawText.trim();
            }
            break;
          }
        }
        
        const result = `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;
        return result;
      }
    });

    // 前処理されたコードブロック用のルール
    this.turndownService.addRule('preprocessedCodeBlocks', {
      filter: (node: any) => {
        return node.nodeName === 'PRE' && 
               node.querySelector('code[data-language]');
      },
      replacement: (_content: string, node: any) => {
        const codeElement = node.querySelector('code[data-language]');
        if (codeElement) {
          const language = codeElement.getAttribute('data-language') || '';
          const codeContent = codeElement.textContent || '';
          
          return `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;
        }
        return _content;
      }
    });
    this.turndownService.addRule('confluenceOtherMacros', {
      filter: (node: any) => {
        // markdownマクロはpreprocessで処理済みなのでここでは対象外にする
        if (node.nodeName !== 'AC:STRUCTURED-MACRO') {
          const name = (node as Element).getAttribute?.('ac:name') || '';
          return name !== 'code' && name !== 'markdown';
        }
        return false;
      },
      replacement: (content: string, node: any) => {
        const macroName = (node as Element).getAttribute?.('ac:name') || 'unknown';
        return `\n<!-- Confluence Macro: ${macroName} -->\n${content}\n`;
      }
    });

    // 通常のコードブロックの処理（data-language属性のないpre要素のみ）
    this.turndownService.addRule('codeBlock', {
      filter: (node: any) => {
        return node.nodeName === 'PRE' && 
               !node.querySelector('code[data-language]');
      },
      replacement: (content: string, _node: any) => {
        return `\n\`\`\`\n${content}\n\`\`\`\n`;
      }
    });

    // 表の処理 - ConfluenceのtableをGFMテーブルに変換
    this.turndownService.addRule('table', {
      filter: 'table',
      replacement: (_content: string, node: any) => {
        const table = node as HTMLTableElement;
        const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];

        if (rows.length === 0) {
          return '';
        }

        const firstRow = rows[0];
        const headerCells = firstRow
          ? (Array.from(firstRow.querySelectorAll('th,td')) as HTMLTableCellElement[])
          : [];
        const hasHeader = headerCells.some((cell) => cell.nodeName === 'TH');
        
        const bodyRows = hasHeader ? rows.slice(1) : rows;

        const escapeCell = (text: string): string => {
          // パイプや改行をエスケープ
          return text.replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ').trim();
        };

        const headerTexts = headerCells.map((cell) => escapeCell(cell.textContent || ''));
        const colCount = headerTexts.length || (bodyRows[0] ? bodyRows[0].children.length : 0);
        const separator = Array(colCount).fill('---');

        const lines: string[] = [];
        const makeRow = (cells: HTMLTableCellElement[]): string => {
          const texts = cells.map((cell) => escapeCell(cell.textContent || ''));
          while (texts.length < colCount){
            texts.push('');
          }
          return `| ${texts.join(' | ')} |`;
        };

        if (hasHeader) {
          lines.push(makeRow(headerCells));
        } else {
          // ヘッダがない場合は1行目をヘッダとして扱う
          lines.push(makeRow(headerCells));
        }
        lines.push(`| ${separator.join(' | ')} |`);

        bodyRows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('th,td')) as HTMLTableCellElement[];
          if (cells.length > 0) {
            lines.push(makeRow(cells));
          }
        });

        return `\n${lines.join('\n')}\n`;
      }
    });

    // Confluence画像をMarkdown画像形式に変換
    this.turndownService.addRule('confluenceImage', {
      filter: (node: any) => {
        return node.nodeName?.toLowerCase() === 'ac:image';
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        const alt = element.getAttribute('ac:alt') || '';

        // ri:url（外部画像）を優先的にチェック
        const urlElement = element.querySelector('ri\\:url');
        if (urlElement) {
          const url = urlElement.getAttribute('ri:value') || '';
          return `![${alt}](${url})`;
        }

        // ri:attachment（添付ファイル）をチェック
        const attachmentElement = element.querySelector('ri\\:attachment');
        if (attachmentElement) {
          const filename = attachmentElement.getAttribute('ri:filename') || '';
          return `![${alt}](${filename})`;
        }

        return '';
      }
    });

    // 打消し線（del/s）をMarkdown形式に変換
    this.turndownService.addRule('strikethrough', {
      filter: (node: any) => {
        const nodeName = node.nodeName?.toLowerCase() || '';
        return nodeName === 'del' || nodeName === 's';
      },
      replacement: (content: string) => {
        return `~~${content}~~`;
      }
    });

    // Confluence情報パネル（info/note/warning/tip）をGitHub Alerts形式に変換
    this.turndownService.addRule('confluenceInfoPanel', {
      filter: (node: any) => {
        const nodeName = node.nodeName?.toLowerCase() || '';
        if (nodeName !== 'ac:structured-macro') return false;
        const macroName = (node as Element).getAttribute?.('ac:name') || '';
        return ['info', 'note', 'warning', 'tip', 'caution'].includes(macroName.toLowerCase());
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        const macroName = element.getAttribute('ac:name') || 'note';
        const alertType = macroName.toUpperCase();

        // rich-text-bodyの内容を取得
        const bodyElement = element.querySelector('ac\\:rich-text-body');
        const bodyContent = bodyElement?.textContent?.trim() || '';

        // GitHub Alerts形式に変換
        const lines = bodyContent.split('\n').filter((line: string) => line.trim());
        const quotedLines = lines.map((line: string) => `> ${line}`).join('\n');

        return `\n> [!${alertType}]\n${quotedLines}\n`;
      }
    });

    // Confluenceユーザーメンションを@username形式に変換
    this.turndownService.addRule('confluenceUserMention', {
      filter: (node: any) => {
        const nodeName = node.nodeName?.toLowerCase() || '';
        if (nodeName !== 'ac:link') return false;
        const element = node as Element;
        return element.querySelector('ri\\:user') !== null;
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        const userElement = element.querySelector('ri\\:user');
        const username = userElement?.getAttribute('ri:username') ||
                        userElement?.getAttribute('ri:userkey') ||
                        userElement?.getAttribute('ri:account-id') || 'unknown';
        return `@${username}`;
      }
    });

    // Confluenceページリンクを[PageTitle]形式に変換
    this.turndownService.addRule('confluencePageLink', {
      filter: (node: any) => {
        const nodeName = node.nodeName?.toLowerCase() || '';
        if (nodeName !== 'ac:link') return false;
        const element = node as Element;
        return element.querySelector('ri\\:page') !== null;
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        const pageElement = element.querySelector('ri\\:page');
        const pageTitle = pageElement?.getAttribute('ri:content-title') || 'Page';
        const spaceKey = pageElement?.getAttribute('ri:space-key') || '';
        // Markdownリンク形式で出力（スペースキーがあればconfluence://形式）
        return spaceKey ? `[${pageTitle}](confluence://${spaceKey}/${encodeURIComponent(pageTitle)})`
                        : `[${pageTitle}]`;
      }
    });

    // Confluence展開マクロ（expand）を<details>形式に変換
    this.turndownService.addRule('confluenceExpand', {
      filter: (node: any) => {
        const nodeName = node.nodeName?.toLowerCase() || '';
        if (nodeName !== 'ac:structured-macro') return false;
        const macroName = (node as Element).getAttribute?.('ac:name') || '';
        return macroName === 'expand';
      },
      replacement: (_content: string, node: any) => {
        const element = node as Element;
        // タイトルパラメータを取得
        const titleParam = element.querySelector('ac\\:parameter[ac\\:name="title"]');
        const title = titleParam?.textContent?.trim() || 'Details';
        // rich-text-bodyの内容を取得
        const bodyElement = element.querySelector('ac\\:rich-text-body');
        const bodyContent = bodyElement?.textContent?.trim() || '';
        // HTML <details> 形式で出力
        return `\n<details>\n<summary>${title}</summary>\n\n${bodyContent}\n</details>\n`;
      }
    });
  }

  /**
   * ConfluenceのStorage形式のHTMLをMarkdownに変換
   */
  confluenceToMarkdown(storageContent: string, metadata?: any): string {
    // null/undefinedチェック
    if (!storageContent) return '';

    try {
      // Confluenceの特殊マクロを前処理
      const preprocessedContent = this.preprocessConfluenceHtml(storageContent);
      let markdown = this.turndownService.turndown(preprocessedContent);

      // メタデータをフロントマターとして追加
      if (metadata) {
        const frontMatter = this.createFrontMatter(metadata);
        markdown = `${frontMatter}\n\n${markdown}`;
      }

      return this.cleanupMarkdown(markdown);
    } catch (error) {
      // フォールバック: HTMLタグを除去して最小限の変換
      return storageContent
        .replace(/<[^>]+>/g, '')
        .trim();
    }
  }

  /**
   * Confluenceの特殊なHTMLを前処理する
   */
  private preprocessConfluenceHtml(html: string): string {
    let processedHtml = html;

    // markdownマクロ（Mermaidなど）をそのままMarkdownとして」展開
    processedHtml = processedHtml.replace(
      /<ac:structured-macro[^>]*ac:name="markdown"[\s\S]*?<ac:plain-text-body>([\s\S]*?)<\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/gi,
      (_match, bodyContent) => {
        const raw = String(bodyContent);
        const cdataMatch = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
        const inner = (cdataMatch && cdataMatch[1] ? cdataMatch[1] : raw).trim();

        // Mermaidの主要ダイアグラム種別を包括的に検出
        const isMermaid = this.isMermaidDiagram(inner);
        if (isMermaid) {
          // 既にmermaidフェンスを含む場合は、そのままMarkdownを返す（重複防止）
          if (/^```\s*mermaid/i.test(inner)) {
            return `\n${inner}\n`;
          }
        // Turndownのコード処理に委ねるため、HTMLにエスケープしてpre/codeに包む
        const escaped = this.escapeHtml(inner);
        return `\n<pre><code data-language="mermaid">${escaped}</code></pre>\n`;
        }

        //それ以外のMarkdounはそのまま返す
        return `\n${inner}\n`;
      }
    );

    // コードマクロを標準的なHTMLのpreタグに変換
    processedHtml = processedHtml.replace(
      /<ac:structured-macro ac:name="code"[^>]*?>(.*?)<\/ac:structured-macro>/gs,
      (match) => {
        // 言語パラメータを抽出
        const languageMatch = match.match(/<ac:parameter ac:name="language">([^<]*)<\/ac:parameter>/);
        const language = (languageMatch && languageMatch[1]) ? languageMatch[1].trim() : '';
        
        // コード内容を抽出 (CDATA内から)
        const cdataMatch = match.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
        const codeContent = (cdataMatch && cdataMatch[1]) ? cdataMatch[1].trim() : '';
        
        // 標準的なpreタグとして返す（言語情報はdata属性で保持）
        return `<pre><code data-language="${language}">${this.escapeHtml(codeContent)}</code></pre>`;
      }
    );

    // markdownマクロ（CDATA直指定）にも汎用mermaid検出を適用
    processedHtml = processedHtml.replace(
      /<ac:structured-macro ac:name="markdown"[\s\S]*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/gi,
      (_match, cdataContent) => {
        const inner = String(cdataContent).trim();
        if (this.isMermaidDiagram(inner)) {
          if (/^```\s*mermaid/i.test(inner)) {
            return `\n${inner}\n`;
          }
          const escaped = this.escapeHtml(inner);
          return `\n<pre><code data-language="mermaid">${escaped}</code></pre>\n`;
        }
        return `\n${inner}\n`;
      }
    );

    return processedHtml;
  }

  /**
   * Mermaidダイアグラムを汎用的に検出
   * 対応: flowchart/graph, sequence, class, state, er, gantt, journey, pie, timeline
   */
  private isMermaidDiagram (text: string): boolean {
    const t = text.trim();
    // 冒頭にフェンスがある場合も吸収（^^mermaid：..）
    if (/^```\s*mermaid/i.test(t)) return true;
    // 代表的なキーワードのいずれかを含む
    const patterns = [
      /\bflowchart\b/i,
      /\bgraph\b/i,
      /\bsequence(diagram)?\b/i,
      /\bclass(diagram)?\b/i,
      /\bstate (diagram)?\b/i,
      /\ber\b/i,
      /\bgantt\b/i,
      /\bjourney\b/i,
      /\bpie\b/i,
      /\btimeline\b/i
    ];
    return patterns.some((p) => p.test(t));
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Turndown後のMarkdownを、期待する手間の形式に近づけるために後処理する
   */
  private cleanupMarkdown (markdown: string): string {
    let result = markdown;
    
    // 見出しの番号付きタイトルでエスケーブされた！。を通常の・に戻す
    // 例："#1\. はじめに" -> "#1. はじめに
    result = result.replace(/^(#+\s+\d+)\\\./gm, '$1.');

    // 通常行の番号付きテキストでエスケープされた \\.(例: "1\\. 説明"）を解除
    // 見出しやコードブロック内は対象外だが、ここでは簡易に「行頭の数字+\\. +空白」を正規化する
    // 例："1\\. コードレビュー実施" -> "1. コードレビュー実施"
    result = result.replace(/^(\d+)\\\.\s+/gm, '$1. ');
    
    // --- 区切り線の前後に空行を1つだけ残す
    result = result.replace(/\n{3,}---/g, '\n\n---');
    result = result.replace(/---\n{3,}/g, '---\n\n');
    
    // 箇条書きの先頭に余分なスペースが入ったものを1スペースに正規化
    // 例："-   項目" -> "- 項目"
    result = result.replace(/^-\s{2,}/gm, '- ');

    // 壊れたネスト表現の修正: "- -  子項目" を子リストのインデントに
    // 例: "- -   GitHub Copilot拡張機能がインストール済み" -> "    - GitHub Copilot拡張機能がインストール済み"
    result = result.replace(/^-\s+-\s+/gm, '    - ');
    // 親行と子行の間の不要な空行を除去
    result = result.replace(/(^-\s+.*)\n\n(\s{4}-\s+)/gm, '$1\n$2');

    // 表のヘッダ行区切りの"｜---｜などはそのままにしつつ、
    // 先頭・未尾の不要な空行をトリム
    result = result.trim() + '\n';

    // バックスラッシュ付きの不要エスケープを一度に除去（\`, \```, \-, \#, \[, \]等）
    result = result.replace(/\\`{1,3}|\\-|\\#|\\\[|\\\]|/g, (m) => m.slice(1));
    
    // Mermaidブロックの整形：言語指定後に改行を入れる（種別非依存）
    result = result.replace(/```mermaid\s+/g, '```mermaid\n');
    // Mermaidブロック内部の改行を復元（インライン化された場合のフォーマット修正）
    result = result.replace(/```mermaid([\s\S]*?)```/g, (_m, inner) => {
      let s = inner;
      // flowchartの宣言
      s = s.replace(/\s*flowchart\s+([A-Z]{2})\s*/i, (_mm: string, dir: string) => `flowchart ${dir}\n`);
      // エッジ行（-->や-->|label|など）の前に改行を入れる
      s = s.replace(/\s+([A-Za-z0-9_\[\]{}:.]+\s*--?>\|?[^\n]*?\|?\s*[A-Za-z0-9_\[\]{}:.]+)/g, '\n$1');
      //..style指示は行頭に
      s = s.replace(/\s+style\s+/g, '\nstyle ');
      // 未の余分な空日を削除
      s = s.replace(/\s+$/, '\n');
      return '```mermaid\n' + s + '```';
    });

    return result;
  }

  /**
   * MarkdownをConfluenceのStorage形式に変換
   */
  async markdownToConfluence(markdown: string): Promise<string> {
    // null/undefinedチェック
    if (!markdown) return '';

    // フロントマターを除去
    let { content } = this.extractFrontMatter(markdown);

    // リンク参照形式を展開
    content = this.expandLinkReferences(content);

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
    // パス検証: 空文字または絶対パスでない場合はエラー
    if (!filePath || !path.isAbsolute(filePath)) {
      throw new Error('Absolute file path required');
    }

    // ディレクトリトラバーサル防止
    if (filePath.includes('..')) {
      throw new Error('Directory traversal not allowed');
    }

    // ファイル存在確認
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

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

  private simpleMarkdownToHtml(markdown: string): string {
    // 改行文字を統一
    let html = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 行ごとに処理
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inTable = false;
    let inCodeBlock: boolean | string = false; // false | 'code' | 'mermaid'
    let inList: boolean | string = false; // false | true (task-list) | 'ul' (通常リスト)
    let listDepth = 0;
    let blockquoteDepth = 0; // ネスト引用のレベル

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
        // 引用ブロック終了
        if (blockquoteDepth > 0) {
          for (let d = blockquoteDepth; d > 0; d--) {
            processedLines.push('</blockquote>');
          }
          blockquoteDepth = 0;
        }
        // リスト終了
        if (inList) {
          if (typeof inList === 'string' && inList === 'ul') {
            for (let d = listDepth; d > 0; d--) {
              processedLines.push('</ul>');
            }
          } else if (typeof inList === 'string' && inList === 'ol') {
            for (let d = listDepth; d > 0; d--) {
              processedLines.push('</ol>');
            }
          } else if (inList === true) {
            processedLines.push('</ac:task-list>');
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

          //Mermaidの場合はMarkdownマクロを使用
          if (language === 'mermaid') {
            const macroId = this.generateMacroId();
            processedLines.push(`<ac:structured-macro ac:name="markdown" ac:schema-version="1" ac:macro-id="${macroId}">`);
            processedLines.push('<ac:plain-text-body><![CDATA[```mermaid');
            inCodeBlock = 'mermaid';
          } else {
            // 通常のコードブロック: Confluenceのstructured-macroコードブロック形式を使用
            const macroId = this.generateMacroId();
            processedLines.push(`<ac:structured-macro ac:name="code" ac:schema-version="1" ac:macro-id="${macroId}">`);
            if (language) {
              processedLines.push(`<ac:parameter ac:name="language">${language}</ac:parameter>`);
            }
            processedLines.push('<ac:plain-text-body><![CDATA[');
            inCodeBlock = 'code';
          }
        } else {
          // コードブロック終了
          if (inCodeBlock === 'mermaid') {
            processedLines.push('```]]></ac:plain-text-body>');
            processedLines.push('</ac:structured-macro>');
          } else {
            processedLines.push(']]></ac:plain-text-body>');
            processedLines.push('</ac:structured-macro>');
          }
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
          if (typeof inList === 'string' && inList === 'ul') {
            for (let d = listDepth; d > 0; d--) {
              processedLines.push('</ul>');
            }
          } else if (inList === true) {
            processedLines.push('</ac:task-list>');
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
      // インデントを考慮してネストリストに対応
      const listMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
      if (listMatch && !inTable && !inCodeBlock) {
        const indent = listMatch[1]?.length || 0;
        const restOfLine = listMatch[3] || '';
        // インデントレベル計算（2スペース単位）
        const newListLevel = Math.floor(indent / 2) + 1;

        // チェックボックスの判定: - [ ] または - [x]
        const checkboxMatch = restOfLine.match(/^\[([ xX])\]\s*(.*)$/);

        if (checkboxMatch) {
          // チェックボックスリスト
          const isChecked = checkboxMatch[1] && checkboxMatch[1].toLowerCase() === 'x';
          const taskBody = checkboxMatch[2] || '';

          if (!inList) {
            // タスクリストの開始
            processedLines.push('<ac:task-list>');
            inList = true;
            listDepth = 1;
          } else if (inList === 'ul') {
            // 通常リストからタスクリストに切り替え
            for (let d = listDepth; d > 0; d--) {
              processedLines.push('</ul>');
            }
            processedLines.push('<ac:task-list>');
            inList = true;
            listDepth = 1;
          }

          // タスクアイテムの生成
          const taskId = this.generateTaskId();
          const taskUuid = this.generateMacroId();
          const taskStatus = isChecked ? 'complete' : 'incomplete';

          processedLines.push('<ac:task>');
          processedLines.push(`<ac:task-id>${taskId}</ac:task-id>`);
          processedLines.push(`<ac:task-uuid>${taskUuid}</ac:task-uuid>`);
          processedLines.push(`<ac:task-status>${taskStatus}</ac:task-status>`);
          processedLines.push(`<ac:task-body>${this.processInlineMarkdown(taskBody)}</ac:task-body>`);
          processedLines.push('</ac:task>');
        } else {
          // 通常のリストアイテム
          const content = this.processInlineMarkdown(restOfLine);

          if (!inList) {
            // リスト開始
            processedLines.push('<ul>');
            inList = 'ul';
            listDepth = 1;
          } else if (inList === true) {
            // タスクリストから通常リストに切り替え
            processedLines.push('</ac:task-list>');
            processedLines.push('<ul>');
            inList = 'ul';
            listDepth = 1;
          } else if (inList === 'ul') {
            // ネストレベルの変化を処理
            if (newListLevel > listDepth) {
              // ネストが深くなる
              for (let d = listDepth; d < newListLevel; d++) {
                processedLines.push('<ul>');
              }
              listDepth = newListLevel;
            } else if (newListLevel < listDepth) {
              // ネストが浅くなる
              for (let d = listDepth; d > newListLevel; d--) {
                processedLines.push('</li>');
                processedLines.push('</ul>');
              }
              listDepth = newListLevel;
            }
          }

          processedLines.push(`<li>${content}</li>`);
        }
        continue;
      }

      // 番号付きリストの処理: 1. 2. 3. または 1) 2) 3)
      const orderedListMatch = line.match(/^(\s*)(\d+)[\.\)]\s+(.*)$/);
      if (orderedListMatch && !inTable && !inCodeBlock) {
        const indent = orderedListMatch[1]?.length || 0;
        const restOfLine = orderedListMatch[3] || '';
        const content = this.processInlineMarkdown(restOfLine);
        const newListLevel = Math.floor(indent / 2) + 1;

        if (!inList) {
          // 番号付きリスト開始
          processedLines.push('<ol>');
          inList = 'ol';
          listDepth = 1;
        } else if (inList === 'ul') {
          // 通常リストから番号付きリストに切り替え
          for (let d = listDepth; d > 0; d--) {
            processedLines.push('</ul>');
          }
          processedLines.push('<ol>');
          inList = 'ol';
          listDepth = 1;
        } else if (inList === true) {
          // タスクリストから番号付きリストに切り替え
          processedLines.push('</ac:task-list>');
          processedLines.push('<ol>');
          inList = 'ol';
          listDepth = 1;
        } else if (inList === 'ol') {
          // ネストレベルの変化を処理
          if (newListLevel > listDepth) {
            for (let d = listDepth; d < newListLevel; d++) {
              processedLines.push('<ol>');
            }
            listDepth = newListLevel;
          } else if (newListLevel < listDepth) {
            for (let d = listDepth; d > newListLevel; d--) {
              processedLines.push('</li>');
              processedLines.push('</ol>');
            }
            listDepth = newListLevel;
          }
        }

        processedLines.push(`<li>${content}</li>`);
        continue;
      }

      // <details>タグの処理（HTML形式の折りたたみ）→ Confluence展開マクロ
      if (trimmed === '<details>' || trimmed.startsWith('<details>')) {
        // 次の行からsummaryとコンテンツを収集
        let summaryTitle = 'Details';
        const detailsContent: string[] = [];
        let j = i + 1;
        let foundSummary = false;
        let foundEnd = false;

        while (j < lines.length) {
          const nextLine = lines[j];
          if (!nextLine) { j++; continue; }
          const nextTrimmed = nextLine.trim();

          if (nextTrimmed.startsWith('<summary>')) {
            // <summary>タイトル</summary> 形式
            const summaryMatch = nextTrimmed.match(/<summary>([^<]*)<\/summary>/);
            if (summaryMatch && summaryMatch[1]) {
              summaryTitle = summaryMatch[1];
            }
            foundSummary = true;
            j++;
            continue;
          }

          if (nextTrimmed === '</details>') {
            foundEnd = true;
            break;
          }

          if (foundSummary && nextTrimmed) {
            detailsContent.push(nextTrimmed);
          }
          j++;
        }

        if (foundEnd) {
          // Confluence展開マクロを生成
          const macroId = this.generateMacroId();
          processedLines.push(`<ac:structured-macro ac:name="expand" ac:schema-version="1" ac:macro-id="${macroId}">`);
          processedLines.push(`<ac:parameter ac:name="title">${this.escapeXml(summaryTitle)}</ac:parameter>`);
          processedLines.push('<ac:rich-text-body>');
          detailsContent.forEach(line => {
            processedLines.push(`<p>${this.processInlineMarkdown(line)}</p>`);
          });
          processedLines.push('</ac:rich-text-body>');
          processedLines.push('</ac:structured-macro>');
          i = j; // ループカウンタを更新
          continue;
        }
      }

      // 画像の処理: ![alt](url)
      const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch && !inTable && !inList && !inCodeBlock) {
        const alt = imageMatch[1] || '';
        const url = imageMatch[2] || '';

        if (url.startsWith('http://') || url.startsWith('https://')) {
          // 外部画像URL
          processedLines.push(`<ac:image ac:alt="${this.escapeXml(alt)}"><ri:url ri:value="${this.escapeXml(url)}" /></ac:image>`);
        } else {
          // 添付ファイル（ローカルパス）
          const filename = url.split('/').pop() || url;
          processedLines.push(`<ac:image ac:alt="${this.escapeXml(alt)}"><ri:attachment ri:filename="${this.escapeXml(filename)}" /></ac:image>`);
        }
        continue;
      }

      // 水平線の処理: ---, ***, ___
      if (/^[-*_]{3,}$/.test(trimmed) && !inTable && !inList && !inCodeBlock) {
        processedLines.push('<hr />');
        continue;
      }

      // 引用ブロックの処理: >
      if (trimmed.startsWith('>') && !inTable && !inList && !inCodeBlock) {
        // GitHub Alerts形式のチェック: > [!NOTE], > [!WARNING], etc.
        const alertMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|INFO|WARNING|CAUTION)\]\s*$/i);
        if (alertMatch && alertMatch[1]) {
          // アラートタイプを検出、次の行からコンテンツを収集
          const alertType = alertMatch[1].toLowerCase();
          const alertLines: string[] = [];

          // 次の引用行を収集
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j];
            if (!nextLine) break;
            const nextTrimmed = nextLine.trim();
            if (nextTrimmed.startsWith('>')) {
              alertLines.push(nextTrimmed.replace(/^>\s*/, ''));
              j++;
            } else {
              break;
            }
          }

          // 情報パネルマクロを生成
          const macroId = this.generateMacroId();
          processedLines.push(`<ac:structured-macro ac:name="${alertType}" ac:schema-version="1" ac:macro-id="${macroId}">`);
          processedLines.push('<ac:rich-text-body>');
          alertLines.forEach(line => {
            processedLines.push(`<p>${this.processInlineMarkdown(line)}</p>`);
          });
          processedLines.push('</ac:rich-text-body>');
          processedLines.push('</ac:structured-macro>');

          i = j - 1; // ループカウンタを更新
          continue;
        }

        // 通常の引用ブロック（ネスト対応）
        // 引用レベルを計算: > = 1, > > = 2, etc.
        const quoteMatch = trimmed.match(/^(>+)\s*(.*)/);
        if (quoteMatch && quoteMatch[1]) {
          const newDepth = quoteMatch[1].replace(/\s/g, '').length;
          const quoteContent = quoteMatch[2] || '';

          // ネストレベルの調整
          if (newDepth > blockquoteDepth) {
            // ネストが深くなる
            for (let d = blockquoteDepth; d < newDepth; d++) {
              processedLines.push('<blockquote>');
            }
          } else if (newDepth < blockquoteDepth) {
            // ネストが浅くなる
            for (let d = blockquoteDepth; d > newDepth; d--) {
              processedLines.push('</blockquote>');
            }
          }
          blockquoteDepth = newDepth;
          processedLines.push(`<p>${this.processInlineMarkdown(quoteContent)}</p>`);
        }
        continue;
      } else if (blockquoteDepth > 0) {
        // 引用ブロック終了
        for (let d = blockquoteDepth; d > 0; d--) {
          processedLines.push('</blockquote>');
        }
        blockquoteDepth = 0;
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
    if (blockquoteDepth > 0) {
      for (let d = blockquoteDepth; d > 0; d--) {
        processedLines.push('</blockquote>');
      }
    }

    if (inList) {
      if (typeof inList === 'string' && inList === 'ul') {
        for (let d = listDepth; d > 0; d--) {
          processedLines.push('</ul>');
        }
      } else if (typeof inList === 'string' && inList === 'ol') {
        for (let d = listDepth; d > 0; d--) {
          processedLines.push('</ol>');
        }
      } else if (inList === true) {
        processedLines.push('</ac:task-list>');
      }
    }

    if (inTable) {
      processedLines.push('</tbody>');
      processedLines.push('</table>');
    }

    const result = processedLines.join('\n');
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

    // オートリンク: <https://url> → <a>タグ（HTMLエスケープ前に処理）
    text = text.replace(/<(https?:\/\/[^\s>]+)>/g, '{{AUTOLINK:$1}}');
    // メールリンク: <email@example.com> → <a>タグ
    text = text.replace(/<([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>/g, '{{MAILTO:$1}}');

    // HTML特殊文字のエスケープを先に実行（タグ生成前）
    text = text.replace(/&(?!#\d+;)/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');

    // オートリンクプレースホルダーを実際のタグに変換
    text = text.replace(/\{\{AUTOLINK:([^}]+)\}\}/g, '<a href="$1">$1</a>');
    text = text.replace(/\{\{MAILTO:([^}]+)\}\}/g, '<a href="mailto:$1">$1</a>');

    // インラインコード → <code>タグ生成
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 打消し線 → <del>タグ生成
    text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    // 太字斜体（3つの*または_）→ <strong><em>タグ生成（最初に処理）
    text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/___([^_\n]+)___/g, '<strong><em>$1</em></strong>');

    // 太字 → <strong>タグ生成（アスタリスク形式）
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    // 太字 → <strong>タグ生成（アンダースコア形式）
    text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');

    // 斜体 → <em>タグ生成（アスタリスク形式、太字の後に処理）
    text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    // 斜体 → <em>タグ生成（アンダースコア形式）
    text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>');

    // リンク → <a>タグ生成
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

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
    
    return html.trim();
  }

  private escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateMacroId(): string {
    // UUIDライクなIDを生成（Confluenceマクロ用）
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateTaskId(): number {
    // タスクIDを生成（連番）
    return Math.floor(Math.random() * 1000000);
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-') // 無効な文字を-に置換
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .replace(/-+/g, '-') // 連続するハイフンを単一に
      .substring(0, 200); // 長すぎるファイル名を制限
  }

  /**
   * リンク参照形式を展開する
   * [text][ref] と [ref]: url を [text](url) に変換
   */
  private expandLinkReferences(content: string): string {
    // リンク参照定義を収集: [ref]: url
    const linkRefs: Record<string, string> = {};
    const refRegex = /^\[([^\]]+)\]:\s*(.+)$/gm;
    let match;
    while ((match = refRegex.exec(content)) !== null) {
      if (match[1] && match[2]) {
        linkRefs[match[1].toLowerCase()] = match[2].trim();
      }
    }

    // リンク参照が存在しない場合はそのまま返す
    if (Object.keys(linkRefs).length === 0) {
      return content;
    }

    // リンク参照形式を展開: [text][ref] → [text](url)
    let result = content.replace(/\[([^\]]+)\]\[([^\]]*)\]/g, (_, text, ref) => {
      const key = (ref || text).toLowerCase();
      const url = linkRefs[key];
      return url ? `[${text}](${url})` : `[${text}]`;
    });

    // ショートカット形式を展開: [text] → [text](url)（定義がある場合のみ）
    result = result.replace(/\[([^\]]+)\](?!\()/g, (match, text) => {
      const key = text.toLowerCase();
      const url = linkRefs[key];
      return url ? `[${text}](${url})` : match;
    });

    // 参照定義行を除去
    result = result.replace(/^\[([^\]]+)\]:\s*.+\n?/gm, '');

    return result;
  }
}
