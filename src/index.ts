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

// Confluence tools implementation
class ConfluenceMCPServer {
  private server: Server;
  private confluenceClient: ConfluenceApiClient | null = null;

  constructor() {
    this.server = new Server({
      name: 'confluence-mcp-server',
      version: '1.0.0',
    });

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
      const domain = process.env.CONFLUENCE_DOMAIN;
      const baseUrl = process.env.CONFLUENCE_BASE_URL;
      const authType = (process.env.CONFLUENCE_AUTH_TYPE as 'basic' | 'token') || 'token';

      if (!domain) {
        throw new Error('Missing required environment variable: CONFLUENCE_DOMAIN');
      }

      let config: ConfluenceConfig;

      if (authType === 'basic') {
        // DataCenter版の場合：ユーザー名とパスワード
        const username = process.env.CONFLUENCE_USERNAME;
        const password = process.env.CONFLUENCE_PASSWORD;

        if (!username || !password) {
          throw new Error(
            'Password authentication requires CONFLUENCE_USERNAME and CONFLUENCE_PASSWORD environment variables'
          );
        }

        config = {
          domain,
          username,
          password,
          baseUrl: baseUrl || `https://${domain}/rest/api/2`,
          authType: 'basic'
        };
      } else {
        // Cloud版の場合：メールとAPIトークン
        const email = process.env.CONFLUENCE_EMAIL;
        const apiToken = process.env.CONFLUENCE_API_TOKEN;

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
              type: 'number',
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

      // Blog Post tools
      {
        name: 'confluence_get_blog_posts',
        description: 'Get all blog posts with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by blog post IDs'
            },
            spaceId: {
              type: 'array',
              items: { type: 'number' },
              description: 'Filter by space IDs'
            },
            status: {
              type: 'array',
              items: { type: 'string', enum: ['current', 'deleted', 'trashed'] },
              description: 'Filter by blog post status'
            },
            title: {
              type: 'string',
              description: 'Filter by blog post title'
            },
            bodyFormat: {
              type: 'string',
              enum: ['storage', 'atlas_doc_format', 'view'],
              description: 'Content format to return in body field'
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
        name: 'confluence_get_blog_post_by_id',
        description: 'Get a specific blog post by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the blog post to retrieve'
            },
            bodyFormat: {
              type: 'string',
              enum: ['storage', 'atlas_doc_format', 'view'],
              description: 'Content format to return in body field'
            },
            getDraft: {
              type: 'boolean',
              description: 'Retrieve the draft version'
            },
            version: {
              type: 'number',
              description: 'Retrieve a specific version number'
            },
            includeLabels: {
              type: 'boolean',
              description: 'Include labels'
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
            }
          },
          required: ['id']
        }
      },
      {
        name: 'confluence_create_blog_post',
        description: 'Create a new blog post in a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'number',
              description: 'The ID of the space to create the blog post in'
            },
            title: {
              type: 'string',
              description: 'The title of the blog post'
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
              description: 'The body content of the blog post'
            },
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              default: 'current',
              description: 'The status of the blog post'
            },
            private: {
              type: 'boolean',
              description: 'Whether the blog post should be private'
            }
          },
          required: ['spaceId', 'title', 'body']
        }
      },
      {
        name: 'confluence_update_blog_post',
        description: 'Update an existing blog post',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the blog post to update'
            },
            title: {
              type: 'string',
              description: 'The new title of the blog post'
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
              description: 'The new body content of the blog post'
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
            status: {
              type: 'string',
              enum: ['current', 'draft'],
              description: 'The status of the blog post'
            }
          },
          required: ['id', 'version']
        }
      },
      {
        name: 'confluence_delete_blog_post',
        description: 'Delete a blog post',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the blog post to delete'
            },
            purge: {
              type: 'boolean',
              description: 'Permanently delete the blog post'
            },
            draft: {
              type: 'boolean',
              description: 'Delete a draft blog post'
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
              type: 'number',
              description: 'The ID of the space to retrieve'
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
      {
        name: 'confluence_create_space',
        description: 'Create a new space',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The key for the space (must be unique)'
            },
            name: {
              type: 'string',
              description: 'The name of the space'
            },
            description: {
              type: 'object',
              properties: {
                plain: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' }
                  },
                  required: ['value']
                }
              },
              description: 'The description of the space'
            }
          },
          required: ['key', 'name']
        }
      },
      {
        name: 'confluence_update_space',
        description: 'Update an existing space',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the space to update'
            },
            key: {
              type: 'string',
              description: 'The new key for the space'
            },
            name: {
              type: 'string',
              description: 'The new name of the space'
            },
            description: {
              type: 'object',
              properties: {
                plain: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' }
                  },
                  required: ['value']
                }
              },
              description: 'The new description of the space'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'confluence_delete_space',
        description: 'Delete a space',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the space to delete'
            }
          },
          required: ['id']
        }
      },

      // Attachment tools
      {
        name: 'confluence_get_attachments',
        description: 'Get all attachments with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'array',
              items: { type: 'string', enum: ['current', 'archived', 'trashed'] },
              description: 'Filter by attachment status'
            },
            mediaType: {
              type: 'string',
              description: 'Filter by media type'
            },
            filename: {
              type: 'string',
              description: 'Filter by filename'
            },
            sort: {
              type: 'string',
              description: 'Sort order'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 250,
              default: 50,
              description: 'Maximum number of results to return'
            }
          }
        }
      },
      {
        name: 'confluence_get_attachment_by_id',
        description: 'Get a specific attachment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the attachment to retrieve'
            },
            version: {
              type: 'number',
              description: 'Retrieve a specific version'
            },
            includeLabels: {
              type: 'boolean',
              description: 'Include labels'
            },
            includeProperties: {
              type: 'boolean',
              description: 'Include content properties'
            },
            includeOperations: {
              type: 'boolean',
              description: 'Include permitted operations'
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
        name: 'confluence_delete_attachment',
        description: 'Delete an attachment',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the attachment to delete'
            },
            purge: {
              type: 'boolean',
              description: 'Permanently delete the attachment'
            }
          },
          required: ['id']
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
        description: 'Get multiple users',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by account IDs'
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

      // Label tools
      {
        name: 'confluence_get_labels',
        description: 'Get all labels with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: {
              type: 'string',
              enum: ['my', 'team', 'global', 'system'],
              description: 'Filter by label prefix'
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
        name: 'confluence_get_label_by_id',
        description: 'Get a specific label by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The ID of the label to retrieve'
            }
          },
          required: ['id']
        }
      },

      // Content Properties tools
      {
        name: 'confluence_get_content_properties',
        description: 'Get content properties for a page, blog post, or attachment',
        inputSchema: {
          type: 'object',
          properties: {
            contentId: {
              type: 'number',
              description: 'The ID of the content'
            },
            contentType: {
              type: 'string',
              enum: ['page', 'blogpost', 'attachment'],
              description: 'The type of content'
            },
            key: {
              type: 'string',
              description: 'Filter by property key'
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
          },
          required: ['contentId', 'contentType']
        }
      },
      {
        name: 'confluence_create_content_property',
        description: 'Create a content property for a page, blog post, or attachment',
        inputSchema: {
          type: 'object',
          properties: {
            contentId: {
              type: 'number',
              description: 'The ID of the content'
            },
            contentType: {
              type: 'string',
              enum: ['page', 'blogpost', 'attachment'],
              description: 'The type of content'
            },
            key: {
              type: 'string',
              description: 'The key for the property'
            },
            value: {
              description: 'The value for the property (can be any type)'
            }
          },
          required: ['contentId', 'contentType', 'key', 'value']
        }
      },

      // Admin Key tools
      {
        name: 'confluence_get_admin_key',
        description: 'Get current admin key information',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'confluence_enable_admin_key',
        description: 'Enable admin key access',
        inputSchema: {
          type: 'object',
          properties: {
            durationInMinutes: {
              type: 'number',
              description: 'Duration in minutes for the admin key (default: 10)'
            }
          }
        }
      },
      {
        name: 'confluence_disable_admin_key',
        description: 'Disable admin key access',
        inputSchema: {
          type: 'object',
          properties: {}
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
          return await client.getPages(args as any);

        case 'confluence_get_page_by_id':
          return await client.getPageById(args.id as number, args as any);

        case 'confluence_create_page':
          return await client.createPage(args as any, { private: args.private as boolean });

        case 'confluence_update_page':
          return await client.updatePage(args as any);

        case 'confluence_delete_page':
          await client.deletePage(args.id as number, { 
            purge: args.purge as boolean, 
            draft: args.draft as boolean 
          });
          return { success: true, message: 'Page deleted successfully' };

        // Blog post operations
        case 'confluence_get_blog_posts':
          return await client.getBlogPosts(args as any);

        case 'confluence_get_blog_post_by_id':
          return await client.getBlogPostById(args.id as number, args as any);

        case 'confluence_create_blog_post':
          return await client.createBlogPost(args as any, { private: args.private as boolean });

        case 'confluence_update_blog_post':
          return await client.updateBlogPost(args as any);

        case 'confluence_delete_blog_post':
          await client.deleteBlogPost(args.id as number, { 
            purge: args.purge as boolean, 
            draft: args.draft as boolean 
          });
          return { success: true, message: 'Blog post deleted successfully' };

        // Space operations
        case 'confluence_get_spaces':
          return await client.getSpaces(args as any);

        case 'confluence_get_space_by_id':
          return await client.getSpaceById(args.id as number, args as any);

        case 'confluence_create_space':
          return await client.createSpace(args as any);

        case 'confluence_update_space':
          return await client.updateSpace(args.id as number, args as any);

        case 'confluence_delete_space':
          await client.deleteSpace(args.id as number);
          return { success: true, message: 'Space deleted successfully' };

        // Attachment operations
        case 'confluence_get_attachments':
          return await client.getAttachments(args as any);

        case 'confluence_get_attachment_by_id':
          return await client.getAttachmentById(args.id as string, args as any);

        case 'confluence_delete_attachment':
          await client.deleteAttachment(args.id as number, { purge: args.purge as boolean });
          return { success: true, message: 'Attachment deleted successfully' };

        // User operations
        case 'confluence_get_current_user':
          return await client.getCurrentUser();

        case 'confluence_get_user_by_id':
          return await client.getUserById(args.accountId as string);

        case 'confluence_get_users':
          return await client.getUsers(args as any);

        // Label operations
        case 'confluence_get_labels':
          return await client.getLabels(args as any);

        case 'confluence_get_label_by_id':
          return await client.getLabelById(args.id as number);

        // Content properties operations
        case 'confluence_get_content_properties':
          return await client.getContentProperties(
            args.contentId as number, 
            args.contentType as any, 
            args as any
          );

        case 'confluence_create_content_property':
          return await client.createContentProperty(
            args.contentId as number, 
            args.contentType as any, 
            {
              key: args.key as string,
              value: args.value
            }
          );

        // Admin key operations
        case 'confluence_get_admin_key':
          return await client.getAdminKey();

        case 'confluence_enable_admin_key':
          return await client.enableAdminKey(args.durationInMinutes as number);

        case 'confluence_disable_admin_key':
          await client.disableAdminKey();
          return { success: true, message: 'Admin key disabled successfully' };

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
}

// Start the server
const server = new ConfluenceMCPServer();
server.run().catch(console.error);
