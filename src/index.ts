#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolRequest,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { ConfluenceApiClient } from './confluence-client.js';
import { ConfluenceConfig } from './types.js';
import { MarkdownConverter, MarkdownConversionOptions } from './markdown-converter.js';

// Confluence tools implementation
class ConfluenceMCPServer {
  private server: Server;
  private confluenceClient: ConfluenceApiClient | null = null;
  private markdownConverter: MarkdownConverter;

  constructor() {
    this.server = new Server({
      name: 'confluence-mcp-server',
      version: '1.0.0',
    });

    this.markdownConverter = new MarkdownConverter();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private getClient(): ConfluenceApiClient {
    if (!this.confluenceClient) {
      const domain = process.env.CONFLUENCE_DOMAIN?.trim();
      const baseUrl = process.env.CONFLUENCE_BASE_URL?.trim();
      const authType = (process.env.CONFLUENCE_AUTH_TYPE?.trim() as 'basic' | 'token') || 'token';

      if (!domain) {
        throw new Error('Missing required environment variable: CONFLUENCE_DOMAIN');
      }

      let config: ConfluenceConfig;

      if (authType === 'basic') {
        // DataCenter版の場合：ユーザー名とパスワード
        const username = process.env.CONFLUENCE_USERNAME?.trim();
        const password = process.env.CONFLUENCE_PASSWORD?.trim();

        if (!username || !password) {
          throw new Error(
            'Password authentication requires CONFLUENCE_USERNAME and CONFLUENCE_PASSWORD environment variables'
          );
        }

        config = {
          domain,
          username,
          password,
          baseUrl: baseUrl || `https://${domain}/rest/api`,
          authType: 'basic'
        };
      } else {
        // Cloud版の場合：メールとAPIトークン
        const email = process.env.CONFLUENCE_EMAIL?.trim();
        const apiToken = process.env.CONFLUENCE_API_TOKEN?.trim();

        if (!email || !apiToken) {
          throw new Error(
            'Token authentication requires CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN environment variables'
          );
        }

        config = {
          domain,
          email,
          apiToken,
          baseUrl: baseUrl || `https://${domain}/wiki/api/v2`,
          authType: 'token'
        };
      }

      this.confluenceClient = new ConfluenceApiClient(config);
    }

    return this.confluenceClient;
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleToolCall(request);
    });
  }

  private getTools(): Tool[] {
    return [
      // Page tools
      {
        name: 'confluence_get_pages',
        description: 'ページ一覧を取得します。スペース、ステータス、タイトルなどでフィルタリング可能',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'ページIDでフィルタリング'
            },
            spaceId: {
              type: 'array',
              items: { type: 'number' },
              description: 'スペースIDでフィルタリング'
            },
            status: {
              type: 'array',
              items: { type: 'string', enum: ['current', 'archived', 'deleted', 'trashed', 'draft'] },
              description: 'ページステータスでフィルタリング'
            },
            title: {
              type: 'string',
              description: 'ページタイトルでフィルタリング'
            },
            bodyFormat: {
              type: 'string',
              enum: ['storage', 'atlas_doc_format', 'view'],
              description: 'コンテンツ形式（bodyフィールドの返却形式）'
            },
            sort: {
              type: 'string',
              description: 'ソート順（例: created-date, -created-date, title, -title）'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 250,
              default: 25,
              description: '返却する最大結果数'
            }
          }
        }
      },
      {
        name: 'confluence_get_page_by_id',
        description: 'IDを指定してページの詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['string', 'number'],
              description: '取得するページのID'
            },
            bodyFormat: {
              type: 'string',
              enum: ['storage', 'atlas_doc_format', 'view'],
              description: 'コンテンツ形式（bodyフィールドの返却形式）'
            },
            getDraft: {
              type: 'boolean',
              description: 'ドラフト版のページを取得'
            },
            version: {
              type: 'number',
              description: '特定のバージョン番号を取得'
            },
            includeLabels: {
              type: 'boolean',
              description: 'ページに関連するラベルを含める'
            },
            includeProperties: {
              type: 'boolean',
              description: 'コンテンツプロパティを含める'
            },
            includeOperations: {
              type: 'boolean',
              description: '許可された操作を含める'
            },
            includeLikes: {
              type: 'boolean',
              description: 'いいね情報を含める'
            },
            includeVersions: {
              type: 'boolean',
              description: 'バージョン履歴を含める'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'confluence_create_page',
        description: 'スペース内に新しいページを作成します',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: ['number', 'string'],
              description: 'ページを作成するスペースのID（数値）またはキー（文字列）'
            },
            title: {
              type: 'string',
              description: 'ページのタイトル'
            },
            body: {
              type: 'object',
              properties: {
                storage: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' },
                    representation: { type: 'string', enum: ['storage'] }
                  },
                  required: ['value', 'representation'],
                  additionalProperties: false
                }
              },
              required: ['storage'],
              additionalProperties: false,
              description: 'ページの本文コンテンツ'
            },
            parentId: {
              type: 'number',
              description: '親ページのID（任意）'
            },
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              default: 'current',
              description: 'ページのステータス'
            },
            private: {
              type: 'boolean',
              description: 'ページを非公開にするか'
            }
          },
          required: ['spaceId', 'title', 'body']
        }
      },
      {
        name: 'confluence_update_page',
        description: '既存のページを更新します',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: '更新するページのID'
            },
            title: {
              type: 'string',
              description: 'ページの新しいタイトル'
            },
            body: {
              type: 'object',
              properties: {
                storage: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' },
                    representation: { type: 'string', enum: ['storage'] }
                  },
                  required: ['value', 'representation']
                }
              },
              description: 'ページの新しい本文コンテンツ'
            },
            version: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              },
              description: '更新のバージョン情報（番号は自動インクリメント）'
            },
            parentId: {
              type: 'number',
              description: '親ページのID'
            },
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              description: 'ページのステータス'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'confluence_delete_page',
        description: 'ページを削除します（完全削除しない限りゴミ箱に移動）',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: '削除するページのID'
            },
            purge: {
              type: 'boolean',
              description: 'ページを完全削除する（先にゴミ箱に入れる必要あり）'
            },
            draft: {
              type: 'boolean',
              description: 'ドラフトページを削除'
            }
          },
          required: ['id']
        }
      },


      // Space tools
      {
        name: 'confluence_get_spaces',
        description: 'スペース一覧を取得します。各種フィルタリング機能付き',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'スペースIDでフィルタリング'
            },
            key: {
              type: 'array',
              items: { type: 'string' },
              description: 'スペースキーでフィルタリング'
            },
            type: {
              type: 'array',
              items: { type: 'string', enum: ['global', 'personal'] },
              description: 'スペースタイプでフィルタリング'
            },
            status: {
              type: 'array',
              items: { type: 'string', enum: ['current', 'archived'] },
              description: 'スペースステータスでフィルタリング'
            },
            favorite: {
              type: 'boolean',
              description: 'お気に入りスペースのみに絞り込み'
            },
            sort: {
              type: 'string',
              description: 'ソート順'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 250,
              default: 25,
              description: '返却する最大結果数'
            }
          }
        }
      },
      {
        name: 'confluence_get_space_by_id',
        description: 'IDを指定してスペースの詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['number', 'string'],
              description: '取得するスペースのIDまたはキー'
            },
            includeIcon: {
              type: 'boolean',
              description: 'スペースアイコンを含める'
            },
            includeDescription: {
              type: 'boolean',
              description: 'スペースの説明を含める'
            },
            includeHomepage: {
              type: 'boolean',
              description: 'ホームページ情報を含める'
            },
            includeOperations: {
              type: 'boolean',
              description: '許可された操作を含める'
            },
            includePermissions: {
              type: 'boolean',
              description: 'スペース権限を含める'
            },
            includeProperties: {
              type: 'boolean',
              description: 'スペースプロパティを含める'
            },
            includeLabels: {
              type: 'boolean',
              description: 'スペースラベルを含める'
            }
          },
          required: ['id']
        }
      },
      
      // Content Search API (CQL)
      {
        name: 'confluence_search_content',
        description: 'CQL（Confluence Query Language）を使用してコンテンツを検索します',
        inputSchema: {
          type: 'object',
          properties: {
            cql: {
              type: 'string',
              description: 'CQLクエリ文字列（例: "space=TEST AND type=page", "title~cheese"）'
            },
            expand: {
              type: 'string',
              description: '展開するプロパティ（例: "space,body.view,version"）',
              default: 'space,version'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 25,
              description: '返却する最大結果数'
            },
            start: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'ページングの開始インデックス'
            }
          },
          required: ['cql']
        }
      },

      // Content Labels API
      {
        name: 'confluence_get_content_labels',
        description: 'コンテンツに付与されたラベル一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['string', 'number'],
              description: 'コンテンツのID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'confluence_add_content_label',
        description: 'コンテンツにラベルを追加します',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['string', 'number'],
              description: 'コンテンツのID'
            },
            name: {
              type: 'string',
              description: '追加するラベルの名前'
            }
          },
          required: ['id', 'name']
        }
      },

      // User tools
      {
        name: 'confluence_get_current_user',
        description: '現在認証されているユーザーの情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'confluence_get_user_by_id',
        description: 'アカウントIDを指定してユーザー情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: '取得するユーザーのアカウントID'
            }
          },
          required: ['accountId']
        }
      },
      {
        name: 'confluence_get_users',
        description: 'ユーザーを検索・一覧取得します。フィルタリング機能付き',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'ユーザー名または表示名でフィルタリングするクエリ文字列'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 200,
              default: 50,
              description: '返却する最大ユーザー数'
            },
            start: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'ページングの開始インデックス'
            }
          }
        }
      },


      // Markdown conversion tools
      {
        name: 'confluence_page_to_markdown',
        description: 'ConfluenceページをMarkdown形式に変換してファイルに保存します',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'number',
              description: '変換するページのID'
            },
            filePath: {
              type: 'string',
              description: '出力ファイルパス（絶対パスで指定、.md拡張子が自動付与）。例: "C:/Users/ユーザ名/Documents/export.md"'
            },
            outputDir: {
              type: 'string',
              description: '出力ディレクトリ（絶対パスで指定、未指定時はC:/Users/<ユーザ名>/に保存）。例: "C:/Users/ユーザ名/Documents/exports"'
            },
            includeMetadata: {
              type: 'boolean',
              description: 'ページメタデータをフロントマターとして含める（デフォルト: true）'
            }
          },
          required: ['pageId']
        }
      },
      {
        name: 'confluence_markdown_to_page',
        description: 'Markdownファイルからconfluenceページを作成します',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'アップロードするMarkdownファイルのパス（絶対パスで指定）。例: "C:/Users/ユーザ名/Documents/page.md"'
            },
            spaceId: {
              type: ['number', 'string'],
              description: 'ページを作成するスペースのID（数値）またはキー（文字列）'
            },
            parentId: {
              type: 'number',
              description: '親ページのID（任意）'
            },
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              default: 'current',
              description: 'ページのステータス'
            }
          },
          required: ['filePath', 'spaceId']
        }
      },
      {
        name: 'confluence_update_page_from_markdown',
        description: 'Markdownファイルの内容で既存のConfluenceページを更新します',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'number',
              description: '更新するページのID'
            },
            filePath: {
              type: 'string',
              description: 'Markdownファイルのパス（絶対パスで指定）。例: "C:/Users/ユーザ名/Documents/updated_page.md"'
            },
            versionMessage: {
              type: 'string',
              description: 'バージョン更新メッセージ（任意）'
            }
          },
          required: ['pageId', 'filePath']
        }
      },

      {
        name: 'confluence_export_space_to_markdown',
        description: 'スペース内の全ページをMarkdownファイルとしてエクスポートします',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'number',
              description: 'エクスポートするスペースのID'
            },
            outputDir: {
              type: 'string',
              description: 'エクスポートファイルの出力ディレクトリ（絶対パスで指定）。例: "C:/Users/ユーザ名/Documents/confluence_export"'
            },
            includeMetadata: {
              type: 'boolean',
              description: 'ページメタデータをフロントマターとして含める（デフォルト: true）'
            }
          },
          required: ['spaceId', 'outputDir']
        }
      },

      // Children operations
      {
        name: 'confluence_get_children',
        description: '指定した親ページの子ページ一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            parentId: {
              type: ['number', 'string'],
              description: '親ページのID（数値）またはキー（文字列）'
            },
            type: {
              type: 'string',
              enum: ['page', 'attachment'],
              description: '取得する子コンテンツのタイプ',
              default: 'page'
            },
            expand: {
              type: 'string',
              description: '展開するプロパティ（例: "body.storage,version"）',
            },
            cursor: {
              type: 'string',
              description: 'ページングのカーソル（Cloud版のみ）'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 250,
              default: 25,
              description: '返却する最大結果数'
            }
          },
          required: ['parentId']
        }
      }
    ];
  }

  private async handleToolCall(request: CallToolRequest): Promise<any> {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('Arguments are required for tool calls');
    }

    try {
      const client = this.getClient();

      switch (name) {
        // Page operations
        case 'confluence_get_pages':
          const pagesResult = await client.getPages(args as any);
          return { content: [{ type: "text", text: JSON.stringify(pagesResult, null, 2) }] };

        case 'confluence_get_page_by_id':
          const pageResult = await client.getPageById(args.id as string | number, args as any);
          return { content: [{ type: "text", text: JSON.stringify(pageResult, null, 2) }] };

        case 'confluence_create_page':
          try {
            console.error('[DEBUG] confluence_create_page called with args:', JSON.stringify(args, null, 2));
            const createdPage = await client.createPage(args as any, { private: args.private as boolean });
            console.error('[DEBUG] confluence_create_page success:', JSON.stringify(createdPage, null, 2));
            return { content: [{ type: "text", text: JSON.stringify(createdPage, null, 2) }] };
          } catch (error) {
            console.error('[DEBUG] confluence_create_page error:', error);
            throw error;
          }

        case 'confluence_update_page':
          // 現在のページ情報を取得してバージョン番号を自動インクリメント
          const currentPage = await client.getPageById(args.id as string | number);
          const updateArgs = {
            ...args,
            version: {
              number: currentPage.version.number + 1,
              message: (args.version as any)?.message || 'Updated via MCP API'
            }
          };
          const updatedPage = await client.updatePage(updateArgs as any);
          return { content: [{ type: "text", text: JSON.stringify(updatedPage, null, 2) }] };

        case 'confluence_delete_page':
          await client.deletePage(args.id as number, { 
            purge: args.purge as boolean, 
            draft: args.draft as boolean 
          });
          return { content: [{ type: "text", text: "Page deleted successfully" }] };

        // Content search
        case 'confluence_search_content':
          const searchResult = await this.handleSearchContent(client, args);
          return { content: [{ type: "text", text: JSON.stringify(searchResult, null, 2) }] };

        // Content labels
        case 'confluence_get_content_labels':
          const labelsResult = await this.handleGetContentLabels(client, args);
          return { content: [{ type: "text", text: JSON.stringify(labelsResult, null, 2) }] };

        case 'confluence_add_content_label':
          const addLabelResult = await this.handleAddContentLabel(client, args);
          return { content: [{ type: "text", text: JSON.stringify(addLabelResult, null, 2) }] };



        // Space operations
        case 'confluence_get_spaces':
          const spacesResult = await client.getSpaces(args as any);
          return { content: [{ type: "text", text: JSON.stringify(spacesResult, null, 2) }] };

        case 'confluence_get_space_by_id':
          const spaceResult = await client.getSpaceById(args.id as number, args as any);
          return { content: [{ type: "text", text: JSON.stringify(spaceResult, null, 2) }] };



        // User operations
        case 'confluence_get_current_user':
          const userResult = await client.getCurrentUser();
          return { content: [{ type: "text", text: JSON.stringify(userResult, null, 2) }] };

        case 'confluence_get_user_by_id':
          const userByIdResult = await client.getUserById(args.accountId as string);
          return { content: [{ type: "text", text: JSON.stringify(userByIdResult, null, 2) }] };

        case 'confluence_get_users':
          const usersResult = await this.handleGetUsers(client, args);
          return { content: [{ type: "text", text: JSON.stringify(usersResult, null, 2) }] };



        // Markdown conversion operations
        case 'confluence_page_to_markdown':
          const pageToMdResult = await this.handlePageToMarkdown(client, args);
          return { content: [{ type: "text", text: JSON.stringify(pageToMdResult, null, 2) }] };

        case 'confluence_markdown_to_page':
          try {
            console.error('[DEBUG] confluence_markdown_to_page called with args:', JSON.stringify(args, null, 2));
            const mdToPageResult = await this.handleMarkdownToPage(client, args);
            console.error('[DEBUG] confluence_markdown_to_page success:', JSON.stringify(mdToPageResult, null, 2));
            return { content: [{ type: "text", text: JSON.stringify(mdToPageResult, null, 2) }] };
          } catch (error) {
            console.error('[DEBUG] confluence_markdown_to_page error:', error);
            throw error;
          }

        case 'confluence_update_page_from_markdown':
          const updateFromMdResult = await this.handleUpdatePageFromMarkdown(client, args);
          return { content: [{ type: "text", text: JSON.stringify(updateFromMdResult, null, 2) }] };



        case 'confluence_export_space_to_markdown':
          const exportResult = await this.handleExportSpaceToMarkdown(client, args);
          return { content: [{ type: "text", text: JSON.stringify(exportResult, null, 2) }] };

        // Children operations
        case 'confluence_get_children':
          const childrenResult = await client.getChildren(args.parentId as string | number, args as any);
          return { content: [{ type: "text", text: JSON.stringify(childrenResult, null, 2) }] };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      console.error(`Error executing tool ${name}:`, error);

      // MCP プロトコルに従ったエラーレスポンス形式で返す
      const errorMessage = error.message || 'An unexpected error occurred';
      const errorDetails = error.status ? `HTTP ${error.status}` : '';
      const fullerrorMessage = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage;
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: true,
              message: fullerrorMessage,
              details: {
                originalMessage: error.message,
                status: error.status,
                stack: error.stack
              }
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Confluence MCP server running on stdio');
  }

  // Markdown conversion handler methods
  private async handlePageToMarkdown(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      const pageData = await client.getPageById(args.pageId, { 
        bodyFormat: 'storage',
        includeLabels: true,
        includeProperties: true 
      });

      const options: MarkdownConversionOptions = {
        filePath: args.filePath,
        outputDir: args.outputDir || './exports',
        includeMetadata: args.includeMetadata !== false
      };

      const result = await this.markdownConverter.savePageAsMarkdown(pageData, options);
      
      return {
        success: true,
        message: 'Page converted to Markdown successfully',
        filePath: result.filePath,
        title: pageData.title,
        metadata: result.metadata
      };
    } catch (error: any) {
      throw new Error(`Failed to convert page to Markdown: ${error.message}`);
    }
  }

  private async handleMarkdownToPage(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      console.error('[DEBUG] handleMarkdownToPage - Starting with args:', JSON.stringify(args, null, 2));
      
      const { title, content } = await this.markdownConverter.loadMarkdownForConfluence(args.filePath);
      console.error('[DEBUG] handleMarkdownToPage - Loaded title:', title);
      console.error('[DEBUG] handleMarkdownToPage - Loaded content length:', content.length);

      const pageData = {
        spaceId: args.spaceId,
        title,
        body: {
          storage: {
            value: content,
            representation: 'storage' as const
          }
        },
        parentId: args.parentId,
        status: args.status || 'current'
      };

      console.error('[DEBUG] handleMarkdownToPage - pageData:', JSON.stringify(pageData, null, 2));

      const createdPage = await client.createPage(pageData);
      
      console.error('[DEBUG] handleMarkdownToPage - Created page:', JSON.stringify(createdPage, null, 2));
      
      return {
        success: true,
        message: 'Page created from Markdown successfully',
        pageId: createdPage.id,
        title: createdPage.title
      };
    } catch (error: any) {
      console.error('[DEBUG] handleMarkdownToPage - Error:', error);
      throw new Error(`Failed to create page from Markdown: ${error.message}`);
    }
  }



  private async handleUpdatePageFromMarkdown(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      // 既存ページの情報を取得
      const existingPage = await client.getPageById(args.pageId);
      const { title, content } = await this.markdownConverter.loadMarkdownForConfluence(args.filePath);

      const updateData = {
        id: args.pageId,
        title,
        body: {
          storage: {
            value: content,
            representation: 'storage' as const
          }
        },
        version: {
          number: existingPage.version.number + 1,
          message: args.versionMessage || 'Updated from Markdown file'
        }
      };

      const updatedPage = await client.updatePage(updateData);
      
      return {
        success: true,
        message: 'Page updated from Markdown successfully',
        pageId: updatedPage.id,
        title: updatedPage.title,
        version: updatedPage.version.number
      };
    } catch (error: any) {
      throw new Error(`Failed to update page from Markdown: ${error.message}`);
    }
  }

  private async handleExportSpaceToMarkdown(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      const pages = await client.getPages({ 
        spaceId: [args.spaceId],
        bodyFormat: 'storage',
        limit: 250
      });

      const exportResults = [];
      
      for (const page of pages.results || []) {
        const options: MarkdownConversionOptions = {
          outputDir: args.outputDir,
          includeMetadata: args.includeMetadata !== false
        };

        const result = await this.markdownConverter.savePageAsMarkdown(page, options);
        exportResults.push({
          pageId: page.id,
          title: page.title,
          filePath: result.filePath
        });
      }
      
      return {
        success: true,
        message: `Exported ${exportResults.length} pages to Markdown`,
        exportedPages: exportResults,
        outputDirectory: args.outputDir
      };
    } catch (error: any) {
      throw new Error(`Failed to export space to Markdown: ${error.message}`);
    }
  }

  private async handleSearchContent(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      const searchResult = await client.searchContent({
        cql: args.cql,
        expand: args.expand || 'space,version',
        limit: args.limit || 25,
        start: args.start || 0
      });
      
      return {
        success: true,
        message: `Found ${searchResult.results?.length || 0} content items`,
        results: searchResult.results,
        _links: searchResult._links
      };
    } catch (error: any) {
      throw new Error(`Failed to search content: ${error.message}`);
    }
  }

  private async handleGetContentLabels(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      const labelsResult = await client.getContentLabels(args.id);
      
      return {
        success: true,
        message: `Found ${labelsResult.results?.length || 0} labels`,
        results: labelsResult.results,
        _links: labelsResult._links
      };
    } catch (error: any) {
      throw new Error(`Failed to get content labels: ${error.message}`);
    }
  }

  private async handleAddContentLabel(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      const addedLabel = await client.addContentLabel(args.id, args.name);
      
      return {
        success: true,
        message: 'Label added successfully',
        label: addedLabel
      };
    } catch (error: any) {
      throw new Error(`Failed to add content label: ${error.message}`);
    }
  }

  private async handleGetUsers(client: ConfluenceApiClient, args: any): Promise<any> {
    try {
      const usersResult = await client.searchUsers({
        query: args.query,
        limit: args.limit || 50,
        start: args.start || 0
      });
      
      return {
        success: true,
        message: `Found ${usersResult.results?.length || 0} users`,
        results: usersResult.results,
        _links: usersResult._links
      };
    } catch (error: any) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }
}

// Start the server
const server = new ConfluenceMCPServer();
server.run().catch(console.error);
