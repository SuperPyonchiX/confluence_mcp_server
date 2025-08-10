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
          baseUrl: baseUrl || `http://${domain}/rest/api`,
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
        description: 'Get all pages with optional filtering by space, status, title, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by page IDs'
            },
            spaceId: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by space IDs'
            },
            status: {
              type: 'array',
              items: { type: 'string', enum: ['current', 'archived', 'deleted', 'trashed', 'draft'] },
              description: 'Filter by page status'
            },
            title: {
              type: 'string',
              description: 'Filter by page title'
            },
            bodyFormat: {
              type: 'string',
              enum: ['storage', 'atlas_doc_format', 'view'],
              description: 'Content format to return in body field'
            },
            sort: {
              type: 'string',
              description: 'Sort order (e.g., created-date, -created-date, title, -title)'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 250,
              default: 25,
              description: 'Maximum number of results to return'
            }
          }
        }
      },
      {
        name: 'confluence_get_page_by_id',
        description: 'Get a specific page by its ID with optional includes',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['string', 'number'],
              description: 'The ID of the page to retrieve'
            },
            bodyFormat: {
              type: 'string',
              enum: ['storage', 'atlas_doc_format', 'view'],
              description: 'Content format to return in body field'
            },
            getDraft: {
              type: 'boolean',
              description: 'Retrieve the draft version of the page'
            },
            version: {
              type: 'number',
              description: 'Retrieve a specific version number'
            },
            includeLabels: {
              type: 'boolean',
              description: 'Include labels associated with this page'
            },
            includeProperties: {
              type: 'boolean',
              description: 'Include content properties'
            },
            includeOperations: {
              type: 'boolean',
              description: 'Include permitted operations'
            },
            includeLikes: {
              type: 'boolean',
              description: 'Include likes information'
            },
            includeVersions: {
              type: 'boolean',
              description: 'Include version history'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'confluence_create_page',
        description: 'Create a new page in a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'number',
              description: 'The ID of the space to create the page in'
            },
            title: {
              type: 'string',
              description: 'The title of the page'
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
              description: 'The body content of the page'
            },
            parentId: {
              type: 'number',
              description: 'The ID of the parent page (optional)'
            },
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              default: 'current',
              description: 'The status of the page'
            },
            private: {
              type: 'boolean',
              description: 'Whether the page should be private'
            }
          },
          required: ['spaceId', 'title', 'body']
        }
      },
      {
        name: 'confluence_update_page',
        description: 'Update an existing page',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the page to update'
            },
            title: {
              type: 'string',
              description: 'The new title of the page'
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
              description: 'The new body content of the page'
            },
            version: {
              type: 'object',
              properties: {
                number: { type: 'number' },
                message: { type: 'string' }
              },
              required: ['number'],
              description: 'Version information for the update'
            },
            parentId: {
              type: 'number',
              description: 'The ID of the parent page'
            },
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              description: 'The status of the page'
            }
          },
          required: ['id', 'version']
        }
      },
      {
        name: 'confluence_delete_page',
        description: 'Delete a page (moves to trash unless purged)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the page to delete'
            },
            purge: {
              type: 'boolean',
              description: 'Permanently delete the page (must be in trash first)'
            },
            draft: {
              type: 'boolean',
              description: 'Delete a draft page'
            }
          },
          required: ['id']
        }
      },


      // Space tools
      {
        name: 'confluence_get_spaces',
        description: 'Get all spaces with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by space IDs'
            },
            key: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by space keys'
            },
            type: {
              type: 'array',
              items: { type: 'string', enum: ['global', 'personal'] },
              description: 'Filter by space type'
            },
            status: {
              type: 'array',
              items: { type: 'string', enum: ['current', 'archived'] },
              description: 'Filter by space status'
            },
            favorite: {
              type: 'boolean',
              description: 'Filter to only favorite spaces'
            },
            sort: {
              type: 'string',
              description: 'Sort order'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 250,
              default: 25,
              description: 'Maximum number of results to return'
            }
          }
        }
      },
      {
        name: 'confluence_get_space_by_id',
        description: 'Get a specific space by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['number', 'string'],
              description: 'The ID or key of the space to retrieve'
            },
            includeIcon: {
              type: 'boolean',
              description: 'Include space icon'
            },
            includeDescription: {
              type: 'boolean',
              description: 'Include space description'
            },
            includeHomepage: {
              type: 'boolean',
              description: 'Include homepage information'
            },
            includeOperations: {
              type: 'boolean',
              description: 'Include permitted operations'
            },
            includePermissions: {
              type: 'boolean',
              description: 'Include space permissions'
            },
            includeProperties: {
              type: 'boolean',
              description: 'Include space properties'
            },
            includeLabels: {
              type: 'boolean',
              description: 'Include space labels'
            }
          },
          required: ['id']
        }
      },
      
      // Content Search API (CQL)
      {
        name: 'confluence_search_content',
        description: 'Search for content using CQL (Confluence Query Language)',
        inputSchema: {
          type: 'object',
          properties: {
            cql: {
              type: 'string',
              description: 'CQL query string (e.g., "space=TEST AND type=page", "title~cheese")'
            },
            expand: {
              type: 'string',
              description: 'Properties to expand (e.g., "space,body.view,version")',
              default: 'space,version'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 25,
              description: 'Maximum number of results to return'
            },
            start: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Starting index for pagination'
            }
          },
          required: ['cql']
        }
      },

      // Content Labels API
      {
        name: 'confluence_get_content_labels',
        description: 'Get all labels for a piece of content',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['string', 'number'],
              description: 'The ID of the content'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'confluence_add_content_label',
        description: 'Add a label to a piece of content',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: ['string', 'number'],
              description: 'The ID of the content'
            },
            name: {
              type: 'string',
              description: 'The name of the label to add'
            }
          },
          required: ['id', 'name']
        }
      },

      // User tools
      {
        name: 'confluence_get_current_user',
        description: 'Get information about the current authenticated user',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'confluence_get_user_by_id',
        description: 'Get a specific user by account ID',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'The account ID of the user to retrieve'
            }
          },
          required: ['accountId']
        }
      },
      {
        name: 'confluence_get_users',
        description: 'Get users with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Query string to filter users by username or display name'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 200,
              default: 50,
              description: 'Maximum number of users to return'
            },
            start: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Starting index for pagination'
            }
          }
        }
      },


      // Markdown conversion tools
      {
        name: 'confluence_page_to_markdown',
        description: 'Convert a Confluence page to Markdown and save to file',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'number',
              description: 'The ID of the page to convert'
            },
            filePath: {
              type: 'string',
              description: 'Output file path (optional, .md extension will be added if missing)'
            },
            outputDir: {
              type: 'string',
              description: 'Output directory (default: ./exports)'
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Include page metadata as front matter (default: true)'
            }
          },
          required: ['pageId']
        }
      },
      {
        name: 'confluence_markdown_to_page',
        description: 'Create a Confluence page from a Markdown file',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the Markdown file to upload'
            },
            spaceId: {
              type: 'number',
              description: 'The ID of the space to create the page in'
            },
            parentId: {
              type: 'number',
              description: 'The ID of the parent page (optional)'
            },
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              default: 'current',
              description: 'The status of the page'
            }
          },
          required: ['filePath', 'spaceId']
        }
      },
      {
        name: 'confluence_update_page_from_markdown',
        description: 'Update an existing Confluence page with content from a Markdown file',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'number',
              description: 'The ID of the page to update'
            },
            filePath: {
              type: 'string',
              description: 'Path to the Markdown file'
            },
            versionMessage: {
              type: 'string',
              description: 'Version update message (optional)'
            }
          },
          required: ['pageId', 'filePath']
        }
      },

      {
        name: 'confluence_export_space_to_markdown',
        description: 'Export all pages in a space to Markdown files',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'number',
              description: 'The ID of the space to export'
            },
            outputDir: {
              type: 'string',
              description: 'Output directory for the exported files'
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Include page metadata as front matter (default: true)'
            }
          },
          required: ['spaceId', 'outputDir']
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
          const createdPage = await client.createPage(args as any, { private: args.private as boolean });
          return { content: [{ type: "text", text: JSON.stringify(createdPage, null, 2) }] };

        case 'confluence_update_page':
          const updatedPage = await client.updatePage(args as any);
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
          const mdToPageResult = await this.handleMarkdownToPage(client, args);
          return { content: [{ type: "text", text: JSON.stringify(mdToPageResult, null, 2) }] };

        case 'confluence_update_page_from_markdown':
          const updateFromMdResult = await this.handleUpdatePageFromMarkdown(client, args);
          return { content: [{ type: "text", text: JSON.stringify(updateFromMdResult, null, 2) }] };



        case 'confluence_export_space_to_markdown':
          const exportResult = await this.handleExportSpaceToMarkdown(client, args);
          return { content: [{ type: "text", text: JSON.stringify(exportResult, null, 2) }] };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      console.error(`Error executing tool ${name}:`, error);
      
      return {
        error: true,
        message: error.message || 'An unexpected error occurred',
        details: error.status ? `HTTP ${error.status}` : undefined
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
      const { title, content } = await this.markdownConverter.loadMarkdownForConfluence(args.filePath);

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

      const createdPage = await client.createPage(pageData);
      
      return {
        success: true,
        message: 'Page created from Markdown successfully',
        pageId: createdPage.id,
        title: createdPage.title
      };
    } catch (error: any) {
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
