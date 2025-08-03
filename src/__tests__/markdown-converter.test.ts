import { MarkdownConverter } from '../markdown-converter';
import * as fs from 'fs';
import * as path from 'path';

describe('MarkdownConverter', () => {
  let converter: MarkdownConverter;
  const testOutputDir = './test-outputs';

  beforeEach(() => {
    converter = new MarkdownConverter();
    // テスト用ディレクトリを作成
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('confluenceToMarkdown', () => {
    it('should convert basic HTML to Markdown', () => {
      const html = '<h1>テストタイトル</h1><p>これは<strong>テスト</strong>です。</p>';
      const markdown = converter.confluenceToMarkdown(html);
      
      expect(markdown).toContain('# テストタイトル');
      expect(markdown).toContain('これは**テスト**です。');
    });

    it('should include metadata as front matter', () => {
      const html = '<p>テストコンテンツ</p>';
      const metadata = {
        title: 'テストページ',
        id: 12345,
        spaceId: 'TEST'
      };
      
      const markdown = converter.confluenceToMarkdown(html, metadata);
      
      expect(markdown).toContain('---');
      expect(markdown).toContain('title: "テストページ"');
      expect(markdown).toContain('id: 12345');
      expect(markdown).toContain('spaceKey: "TEST"');
    });
  });

  describe('markdownToConfluence', () => {
    it('should convert basic Markdown to HTML', async () => {
      const markdown = '# テストタイトル\n\nこれは**テスト**です。';
      const html = await converter.markdownToConfluence(markdown);
      
      expect(html).toContain('<h1>テストタイトル</h1>');
      expect(html).toContain('<strong>テスト</strong>');
    });

    it('should handle front matter correctly', async () => {
      const markdown = `---
title: "テストページ"
id: 12345
---

# コンテンツタイトル

テストコンテンツです。`;
      
      const html = await converter.markdownToConfluence(markdown);
      
      // フロントマターは除去され、本文のみが変換される
      expect(html).toContain('<h1>コンテンツタイトル</h1>');
      expect(html).not.toContain('title: "テストページ"');
    });
  });

  describe('savePageAsMarkdown', () => {
    it('should save page data as Markdown file', async () => {
      const pageData = {
        id: 12345,
        title: 'テストページ',
        body: { 
          storage: { 
            value: '<h1>テストタイトル</h1><p>テストコンテンツ</p>' 
          } 
        },
        version: {
          createdAt: '2023-01-01T00:00:00.000Z',
          createdBy: { displayName: 'テストユーザー' }
        }
      };
      
      const result = await converter.savePageAsMarkdown(pageData, {
        outputDir: testOutputDir,
        includeMetadata: true
      });
      
      expect(result.filePath).toBeDefined();
      expect(fs.existsSync(result.filePath!)).toBe(true);
      
      const content = fs.readFileSync(result.filePath!, 'utf8');
      expect(content).toContain('title: "テストページ"');
      expect(content).toContain('# テストタイトル');
    });
  });

  describe('loadMarkdownForConfluence', () => {
    it('should load Markdown file and convert for Confluence', async () => {
      const testMarkdown = `---
title: "テストページ"
spaceKey: "TEST"
---

# メインタイトル

これは**テストコンテンツ**です。

## セクション

- リスト項目1
- リスト項目2
`;
      
      const testFile = path.join(testOutputDir, 'test.md');
      fs.writeFileSync(testFile, testMarkdown, 'utf8');
      
      const result = await converter.loadMarkdownForConfluence(testFile);
      
      expect(result.title).toBe('テストページ');
      expect(result.content).toContain('<h1>メインタイトル</h1>');
      expect(result.content).toContain('<strong>テストコンテンツ</strong>');
      expect(result.metadata?.spaceKey).toBe('TEST');
    });

    it('should extract title from H1 when no front matter title', async () => {
      const testMarkdown = `# 抽出されるタイトル

本文コンテンツです。`;
      
      const testFile = path.join(testOutputDir, 'no-frontmatter.md');
      fs.writeFileSync(testFile, testMarkdown, 'utf8');
      
      const result = await converter.loadMarkdownForConfluence(testFile);
      
      expect(result.title).toBe('抽出されるタイトル');
    });

    it('should use filename as title when no H1 or front matter', async () => {
      const testMarkdown = `普通のテキストコンテンツです。`;
      
      const testFile = path.join(testOutputDir, 'filename-title.md');
      fs.writeFileSync(testFile, testMarkdown, 'utf8');
      
      const result = await converter.loadMarkdownForConfluence(testFile);
      
      expect(result.title).toBe('filename-title');
    });
  });
});
