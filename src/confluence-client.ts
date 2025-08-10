import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ConfluenceConfig,
  ConfluenceError,
  Page,
  BlogPost,
  Space,
  Attachment,
  Label,
  User,
  ContentProperty,
  MultiEntityResult,
  PageCreateRequest,
  PageUpdateRequest,
  BlogPostCreateRequest,
  BlogPostUpdateRequest,
  SpaceCreateRequest,
  PageSearchParams,
  BlogPostSearchParams,
  AttachmentSearchParams
} from './types.js';

export class ConfluenceApiClient {
  private client: AxiosInstance;
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;

    // 認証方法に応じて認証情報を設定
    let authConfig: { username: string; password: string };
    
    if (config.authType === 'token') {
      // APIトークン認証（Cloud版）
      if (!config.email || !config.apiToken) {
        throw new Error('API token authentication requires email and apiToken');
      }
      authConfig = {
        username: config.email,
        password: config.apiToken
      };
    } else {
      // パスワード認証（DataCenter版）
      if (!config.username || !config.password) {
        throw new Error('Password authentication requires username and password');
      }
      authConfig = {
        username: config.username,
        password: config.password
      };
    }

    this.client = axios.create({
      baseURL: config.baseUrl,
      auth: authConfig,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleApiError(error);
      }
    );
  }

  private handleApiError(error: AxiosError): ConfluenceError {
    const status = error.response?.status;
    const data = error.response?.data as any;

    let message = 'An error occurred while communicating with Confluence API';
    
    if (data?.message) {
      message = data.message;
    } else if (status === 401) {
      message = 'Authentication failed. Please check your credentials.';
    } else if (status === 403) {
      message = 'Access denied. You do not have permission to perform this action.';
    } else if (status === 404) {
      message = 'The requested resource was not found.';
    } else if (status === 400) {
      message = 'Invalid request. Please check your parameters.';
    }

    return {
      message,
      status,
      errors: data?.errors
    };
  }

  // Page operations
  async getPages(params?: PageSearchParams): Promise<MultiEntityResult<Page>> {
    const searchParams = new URLSearchParams();
    
    // DataCenter版では異なるパラメータ名を使用
    const isDataCenter = this.config.authType === 'basic';
    
    if (params?.id) {
      searchParams.append('id', params.id.join(','));
    }
    if (params?.spaceId) {
      if (isDataCenter) {
        // DataCenter版ではspaceパラメータを使用（spaceIdまたはspaceKey）
        searchParams.append('space', params.spaceId.join(','));
      } else {
        searchParams.append('space-id', params.spaceId.join(','));
      }
    }
    if (params?.status) {
      params.status.forEach(status => searchParams.append('status', status));
    }
    if (params?.title) {
      searchParams.append('title', params.title);
    }
    if (params?.bodyFormat && !isDataCenter) {
      searchParams.append('body-format', params.bodyFormat);
    } else if (params?.bodyFormat && isDataCenter) {
      // DataCenter版では expand パラメータを使用
      searchParams.append('expand', 'body.storage,version');
    }
    if (params?.sort) {
      searchParams.append('sort', params.sort);
    }
    if (params?.cursor && !isDataCenter) {
      // DataCenter版ではcursor-based paginationは使用しない
      searchParams.append('cursor', params.cursor);
    }
    if (params?.limit) {
      const limitParam = isDataCenter ? 'limit' : 'limit';
      searchParams.append(limitParam, params.limit.toString());
    }

    const endpoint = isDataCenter ? '/content' : '/pages';
    const response = await this.client.get(`${endpoint}?${searchParams}`);
    
    // DataCenter版のレスポンス形式を統一
    if (isDataCenter) {
      // DataCenter版では直接results配列を返す
      return {
        results: response.data.results || [],
        _links: response.data._links || {}
      };
    }
    
    return response.data;
  }

  async getPageById(id: string | number, options?: {
    bodyFormat?: 'storage' | 'atlas_doc_format' | 'view';
    getDraft?: boolean;
    status?: string[];
    version?: number;
    includeLabels?: boolean;
    includeProperties?: boolean;
    includeOperations?: boolean;
    includeLikes?: boolean;
    includeVersions?: boolean;
    includeVersion?: boolean;
    includeFavoritedByCurrentUserStatus?: boolean;
    includeWebresources?: boolean;
    includeCollaborators?: boolean;
  }): Promise<Page> {
    const searchParams = new URLSearchParams();
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では expand パラメータを使用
      let expandParams = ['version'];
      if (options?.bodyFormat === 'storage' || options?.bodyFormat === 'view') {
        expandParams.push('body.storage');
      }
      if (options?.includeLabels) {
        expandParams.push('metadata.labels');
      }
      if (options?.includeProperties) {
        expandParams.push('metadata.properties');
      }
      if (expandParams.length > 0) {
        searchParams.append('expand', expandParams.join(','));
      }
    } else {
      // Cloud版のパラメータ
      if (options?.bodyFormat) {
        searchParams.append('body-format', options.bodyFormat);
      }
      if (options?.getDraft) {
        searchParams.append('get-draft', 'true');
      }
      if (options?.status) {
        options.status.forEach(status => searchParams.append('status', status));
      }
      if (options?.version) {
        searchParams.append('version', options.version.toString());
      }
      if (options?.includeLabels) {
        searchParams.append('include-labels', 'true');
      }
      if (options?.includeProperties) {
        searchParams.append('include-properties', 'true');
      }
      if (options?.includeOperations) {
        searchParams.append('include-operations', 'true');
      }
      if (options?.includeLikes) {
        searchParams.append('include-likes', 'true');
      }
      if (options?.includeVersions) {
        searchParams.append('include-versions', 'true');
      }
      if (options?.includeVersion !== undefined) {
        searchParams.append('include-version', options.includeVersion.toString());
      }
      if (options?.includeFavoritedByCurrentUserStatus) {
        searchParams.append('include-favorited-by-current-user-status', 'true');
      }
      if (options?.includeWebresources) {
        searchParams.append('include-webresources', 'true');
      }
      if (options?.includeCollaborators) {
        searchParams.append('include-collaborators', 'true');
      }
    }

    const endpoint = isDataCenter ? `/content/${id}` : `/pages/${id}`;
    
    const response = await this.client.get(`${endpoint}?${searchParams}`);
    
    return response.data;
  }

  async createPage(pageData: PageCreateRequest, options?: { private?: boolean }): Promise<Page> {
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では /content エンドポイントを使用し、異なるパラメータ構造
      const dcPageData = {
        type: 'page',
        title: pageData.title,
        space: {
          key: pageData.spaceId  // DataCenter版ではkeyを使用
        },
        body: {
          storage: pageData.body.storage
        },
        ...(pageData.parentId && { ancestors: [{ id: pageData.parentId }] })
      };

      const response = await this.client.post('/content', dcPageData);
      return response.data;
    } else {
      // Cloud版の処理
      const searchParams = new URLSearchParams();
      if (options?.private) {
        searchParams.append('private', 'true');
      }

      const response = await this.client.post(`/pages?${searchParams}`, pageData);
      return response.data;
    }
  }

  async updatePage(pageData: PageUpdateRequest): Promise<Page> {
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版: /rest/api/content/{id} を使用
      const updateData = {
        title: pageData.title,
        type: 'page',
        body: pageData.body,
        version: pageData.version
      };
      const response = await this.client.put(`/content/${pageData.id}`, updateData);
      return response.data;
    } else {
      // Cloud版: /pages/{id} を使用
      const response = await this.client.put(`/pages/${pageData.id}`, pageData);
      return response.data;
    }
  }

  async deletePage(id: number, options?: { purge?: boolean; draft?: boolean }): Promise<void> {
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版: /rest/api/content/{id} を使用
      const searchParams = new URLSearchParams();
      if (options?.purge) {
        searchParams.append('status', 'trashed'); // DataCenterではstatusパラメータ
      }
      
      await this.client.delete(`/content/${id}?${searchParams}`);
    } else {
      // Cloud版: /pages/{id} を使用
      const searchParams = new URLSearchParams();
      if (options?.purge) {
        searchParams.append('purge', 'true');
      }
      if (options?.draft) {
        searchParams.append('draft', 'true');
      }
      
      await this.client.delete(`/pages/${id}?${searchParams}`);
    }
  }

  // Blog Post operations
  async getBlogPosts(params?: BlogPostSearchParams): Promise<MultiEntityResult<BlogPost>> {
    const searchParams = new URLSearchParams();
    
    if (params?.id) {
      searchParams.append('id', params.id.join(','));
    }
    if (params?.spaceId) {
      searchParams.append('space-id', params.spaceId.join(','));
    }
    if (params?.status) {
      params.status.forEach(status => searchParams.append('status', status));
    }
    if (params?.title) {
      searchParams.append('title', params.title);
    }
    if (params?.bodyFormat) {
      searchParams.append('body-format', params.bodyFormat);
    }
    if (params?.sort) {
      searchParams.append('sort', params.sort);
    }
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor);
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }

    const response = await this.client.get(`/blogposts?${searchParams}`);
    return response.data;
  }

  async getBlogPostById(id: number, options?: {
    bodyFormat?: 'storage' | 'atlas_doc_format' | 'view';
    getDraft?: boolean;
    status?: string[];
    version?: number;
    includeLabels?: boolean;
    includeProperties?: boolean;
    includeOperations?: boolean;
    includeLikes?: boolean;
    includeVersions?: boolean;
    includeVersion?: boolean;
    includeFavoritedByCurrentUserStatus?: boolean;
    includeWebresources?: boolean;
    includeCollaborators?: boolean;
  }): Promise<BlogPost> {
    const searchParams = new URLSearchParams();
    
    if (options?.bodyFormat) {
      searchParams.append('body-format', options.bodyFormat);
    }
    if (options?.getDraft) {
      searchParams.append('get-draft', 'true');
    }
    if (options?.status) {
      options.status.forEach(status => searchParams.append('status', status));
    }
    if (options?.version) {
      searchParams.append('version', options.version.toString());
    }
    if (options?.includeLabels) {
      searchParams.append('include-labels', 'true');
    }
    if (options?.includeProperties) {
      searchParams.append('include-properties', 'true');
    }
    if (options?.includeOperations) {
      searchParams.append('include-operations', 'true');
    }
    if (options?.includeLikes) {
      searchParams.append('include-likes', 'true');
    }
    if (options?.includeVersions) {
      searchParams.append('include-versions', 'true');
    }
    if (options?.includeVersion !== undefined) {
      searchParams.append('include-version', options.includeVersion.toString());
    }
    if (options?.includeFavoritedByCurrentUserStatus) {
      searchParams.append('include-favorited-by-current-user-status', 'true');
    }
    if (options?.includeWebresources) {
      searchParams.append('include-webresources', 'true');
    }
    if (options?.includeCollaborators) {
      searchParams.append('include-collaborators', 'true');
    }

    const response = await this.client.get(`/blogposts/${id}?${searchParams}`);
    return response.data;
  }

  async createBlogPost(blogPostData: BlogPostCreateRequest, options?: { private?: boolean }): Promise<BlogPost> {
    const searchParams = new URLSearchParams();
    if (options?.private) {
      searchParams.append('private', 'true');
    }

    const response = await this.client.post(`/blogposts?${searchParams}`, blogPostData);
    return response.data;
  }

  async updateBlogPost(blogPostData: BlogPostUpdateRequest): Promise<BlogPost> {
    const response = await this.client.put(`/blogposts/${blogPostData.id}`, blogPostData);
    return response.data;
  }

  async deleteBlogPost(id: number, options?: { purge?: boolean; draft?: boolean }): Promise<void> {
    const searchParams = new URLSearchParams();
    if (options?.purge) {
      searchParams.append('purge', 'true');
    }
    if (options?.draft) {
      searchParams.append('draft', 'true');
    }

    await this.client.delete(`/blogposts/${id}?${searchParams}`);
  }

  // Space operations
  async getSpaces(params?: {
    id?: number[];
    key?: string[];
    type?: ('global' | 'personal')[];
    status?: ('current' | 'archived')[];
    label?: string[];
    favorite?: boolean;
    sort?: string;
    cursor?: string;
    limit?: number;
  }): Promise<MultiEntityResult<Space>> {
    const searchParams = new URLSearchParams();
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では異なるパラメータ名を使用
      if (params?.key) {
        searchParams.append('spaceKey', params.key.join(','));
      }
      if (params?.type) {
        params.type.forEach(type => searchParams.append('type', type));
      }
      if (params?.status) {
        params.status.forEach(status => searchParams.append('status', status));
      }
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }
      searchParams.append('expand', 'description.plain,homepage');
    } else {
      // Cloud版のパラメータ
      if (params?.id) {
        searchParams.append('ids', params.id.join(','));
      }
      if (params?.key) {
        searchParams.append('keys', params.key.join(','));
      }
      if (params?.type) {
        params.type.forEach(type => searchParams.append('type', type));
      }
      if (params?.status) {
        params.status.forEach(status => searchParams.append('status', status));
      }
      if (params?.label) {
        params.label.forEach(label => searchParams.append('label', label));
      }
      if (params?.favorite) {
        searchParams.append('favorite', 'true');
      }
      if (params?.sort) {
        searchParams.append('sort', params.sort);
      }
      if (params?.cursor) {
        searchParams.append('cursor', params.cursor);
      }
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }
    }

    const endpoint = isDataCenter ? '/space' : '/spaces';
    
    const response = await this.client.get(`${endpoint}?${searchParams}`);
    
    // DataCenter版のレスポンス形式を統一
    if (isDataCenter) {
      // DataCenter版では直接results配列を返す
      return {
        results: response.data.results || [],
        _links: response.data._links || {}
      };
    }
    
    return response.data;
  }

  async getSpaceById(id: number | string, options?: {
    includeIcon?: boolean;
    includeDescription?: boolean;
    includeHomepage?: boolean;
    includeOperations?: boolean;
    includePermissions?: boolean;
    includeProperties?: boolean;
    includeLabels?: boolean;
  }): Promise<Space> {
    const searchParams = new URLSearchParams();
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では expand パラメータを使用
      let expandParams = [];
      if (options?.includeDescription) {
        expandParams.push('description.plain');
      }
      if (options?.includeHomepage) {
        expandParams.push('homepage');
      }
      if (expandParams.length > 0) {
        searchParams.append('expand', expandParams.join(','));
      }
      
      // DataCenter版では spaceKey でもアクセス可能
      const endpoint = `/space/${id}`;
      const response = await this.client.get(`${endpoint}?${searchParams}`);
      return response.data;
    } else {
      // Cloud版のパラメータ
      if (options?.includeIcon) {
        searchParams.append('include-icon', 'true');
      }
      if (options?.includeDescription) {
        searchParams.append('include-description', 'true');
      }
      if (options?.includeHomepage) {
        searchParams.append('include-homepage', 'true');
      }
      if (options?.includeOperations) {
        searchParams.append('include-operations', 'true');
      }
      if (options?.includePermissions) {
        searchParams.append('include-permissions', 'true');
      }
      if (options?.includeProperties) {
        searchParams.append('include-properties', 'true');
      }
      if (options?.includeLabels) {
        searchParams.append('include-labels', 'true');
      }

      const response = await this.client.get(`/spaces/${id}?${searchParams}`);
      return response.data;
    }
  }

  async createSpace(spaceData: SpaceCreateRequest): Promise<Space> {
    const response = await this.client.post('/spaces', spaceData);
    return response.data;
  }

  async updateSpace(id: number, spaceData: Partial<SpaceCreateRequest>): Promise<Space> {
    const response = await this.client.put(`/spaces/${id}`, spaceData);
    return response.data;
  }

  async deleteSpace(id: number): Promise<void> {
    await this.client.delete(`/spaces/${id}`);
  }

  // Attachment operations
  async getAttachments(params?: AttachmentSearchParams): Promise<MultiEntityResult<Attachment>> {
    const searchParams = new URLSearchParams();
    
    if (params?.status) {
      params.status.forEach(status => searchParams.append('status', status));
    }
    if (params?.mediaType) {
      searchParams.append('mediaType', params.mediaType);
    }
    if (params?.filename) {
      searchParams.append('filename', params.filename);
    }
    if (params?.sort) {
      searchParams.append('sort', params.sort);
    }
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor);
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }

    const response = await this.client.get(`/attachments?${searchParams}`);
    return response.data;
  }

  async getAttachmentById(id: string, options?: {
    version?: number;
    includeLabels?: boolean;
    includeProperties?: boolean;
    includeOperations?: boolean;
    includeVersions?: boolean;
    includeVersion?: boolean;
    includeCollaborators?: boolean;
  }): Promise<Attachment> {
    const searchParams = new URLSearchParams();
    
    if (options?.version) {
      searchParams.append('version', options.version.toString());
    }
    if (options?.includeLabels) {
      searchParams.append('include-labels', 'true');
    }
    if (options?.includeProperties) {
      searchParams.append('include-properties', 'true');
    }
    if (options?.includeOperations) {
      searchParams.append('include-operations', 'true');
    }
    if (options?.includeVersions) {
      searchParams.append('include-versions', 'true');
    }
    if (options?.includeVersion !== undefined) {
      searchParams.append('include-version', options.includeVersion.toString());
    }
    if (options?.includeCollaborators) {
      searchParams.append('include-collaborators', 'true');
    }

    const response = await this.client.get(`/attachments/${id}?${searchParams}`);
    return response.data;
  }

  async deleteAttachment(id: number, options?: { purge?: boolean }): Promise<void> {
    const searchParams = new URLSearchParams();
    if (options?.purge) {
      searchParams.append('purge', 'true');
    }

    await this.client.delete(`/attachments/${id}?${searchParams}`);
  }

  // Label operations
  async getLabels(params?: {
    prefix?: 'my' | 'team' | 'global' | 'system';
    sort?: string;
    cursor?: string;
    limit?: number;
  }): Promise<MultiEntityResult<Label>> {
    const searchParams = new URLSearchParams();
    
    if (params?.prefix) {
      searchParams.append('prefix', params.prefix);
    }
    if (params?.sort) {
      searchParams.append('sort', params.sort);
    }
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor);
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }

    const response = await this.client.get(`/labels?${searchParams}`);
    return response.data;
  }

  async getLabelById(id: number): Promise<Label> {
    const response = await this.client.get(`/labels/${id}`);
    return response.data;
  }

  // User operations
  async getCurrentUser(): Promise<User> {
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では /user/current エンドポイントを使用
      const response = await this.client.get('/user/current');
      return {
        accountId: response.data.userKey || response.data.username,
        displayName: response.data.displayName,
        email: response.data.email || undefined
      };
    } else {
      // Cloud版
      const response = await this.client.get('/user');
      return response.data;
    }
  }

  async getUserById(accountId: string): Promise<User> {
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では /user エンドポイントを使用
      const response = await this.client.get(`/user?key=${accountId}`);
      return response.data;
    } else {
      // Cloud版
      const response = await this.client.get(`/users/${accountId}`);
      return response.data;
    }
  }

  async getUsers(params?: {
    accountId?: string[];
    cursor?: string;
    limit?: number;
  }): Promise<MultiEntityResult<User>> {
    const searchParams = new URLSearchParams();
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では異なるパラメータを使用
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }
      const response = await this.client.get(`/user/search?${searchParams}`);
      return {
        results: Array.isArray(response.data) ? response.data : [response.data],
        _links: {}
      };
    } else {
      // Cloud版
      if (params?.accountId) {
        searchParams.append('accountId', params.accountId.join(','));
      }
      if (params?.cursor) {
        searchParams.append('cursor', params.cursor);
      }
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }
      const response = await this.client.get(`/users?${searchParams}`);
      return response.data;
    }
  }

  // Content properties operations
  async getContentProperties(contentId: number, contentType: 'page' | 'blogpost' | 'attachment', params?: {
    key?: string;
    sort?: string;
    cursor?: string;
    limit?: number;
  }): Promise<MultiEntityResult<ContentProperty>> {
    const searchParams = new URLSearchParams();
    
    if (params?.key) {
      searchParams.append('key', params.key);
    }
    if (params?.sort) {
      searchParams.append('sort', params.sort);
    }
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor);
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }

    let endpoint: string;
    switch (contentType) {
      case 'page':
        endpoint = `/pages/${contentId}/properties`;
        break;
      case 'blogpost':
        endpoint = `/blogposts/${contentId}/properties`;
        break;
      case 'attachment':
        endpoint = `/attachments/${contentId}/properties`;
        break;
    }

    const response = await this.client.get(`${endpoint}?${searchParams}`);
    return response.data;
  }

  async createContentProperty(
    contentId: number, 
    contentType: 'page' | 'blogpost' | 'attachment',
    property: { key: string; value: any }
  ): Promise<ContentProperty> {
    let endpoint: string;
    switch (contentType) {
      case 'page':
        endpoint = `/pages/${contentId}/properties`;
        break;
      case 'blogpost':
        endpoint = `/blogposts/${contentId}/properties`;
        break;
      case 'attachment':
        endpoint = `/attachments/${contentId}/properties`;
        break;
    }

    const response = await this.client.post(endpoint, property);
    return response.data;
  }

  // Admin Key operations
  async getAdminKey(): Promise<{ key: string; expiresAt: string }> {
    const response = await this.client.get('/admin-key');
    return response.data;
  }

  async enableAdminKey(durationInMinutes?: number): Promise<{ key: string; expiresAt: string }> {
    const body = durationInMinutes ? { durationInMinutes } : {};
    const response = await this.client.post('/admin-key', body);
    return response.data;
  }

  async disableAdminKey(): Promise<void> {
    await this.client.delete('/admin-key');
  }

  // Content Search API (CQL)
  async searchContent(params: {
    cql: string;
    expand?: string;
    limit?: number;
    start?: number;
  }): Promise<MultiEntityResult<any>> {
    const searchParams = new URLSearchParams();
    searchParams.append('cql', params.cql);
    
    if (params.expand) {
      searchParams.append('expand', params.expand);
    }
    if (params.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params.start) {
      searchParams.append('start', params.start.toString());
    }

    const response = await this.client.get(`/content/search?${searchParams}`);
    return response.data;
  }

  // Content Labels API  
  async getContentLabels(contentId: string | number): Promise<MultiEntityResult<Label>> {
    const response = await this.client.get(`/content/${contentId}/label`);
    return response.data;
  }

  async addContentLabel(contentId: string | number, name: string): Promise<Label> {
    const response = await this.client.post(`/content/${contentId}/label`, {
      name: name
    });
    return response.data;
  }

  // User Search API
  async searchUsers(params?: {
    query?: string;
    limit?: number;
    start?: number;
  }): Promise<MultiEntityResult<User>> {
    const searchParams = new URLSearchParams();
    const isDataCenter = this.config.authType === 'basic';
    
    if (isDataCenter) {
      // DataCenter版では /user エンドポイントを使用
      if (params?.query) {
        searchParams.append('username', params.query);
      }
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }
      if (params?.start) {
        searchParams.append('start', params.start.toString());
      }
      const response = await this.client.get(`/user?${searchParams}`);
      return {
        results: Array.isArray(response.data) ? response.data : [response.data],
        _links: {}
      };
    } else {
      // Cloud版
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }
      if (params?.start) {
        searchParams.append('cursor', params.start.toString());
      }
      const response = await this.client.get(`/users?${searchParams}`);
      return response.data;
    }
  }
}
