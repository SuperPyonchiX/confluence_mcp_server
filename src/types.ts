/**
 * Confluence API configuration and types
 */

export interface ConfluenceConfig {
  domain: string;
  email?: string;
  username?: string;
  apiToken?: string;
  password?: string;
  baseUrl: string;
  authType: 'basic' | 'token';
}

export interface ConfluenceError {
  message: string;
  status?: number;
  errors?: Array<{
    message: string;
    field?: string;
  }>;
}

// Common types based on OpenAPI spec
export interface ContentBody {
  storage?: {
    value: string;
    representation: 'storage';
  };
  atlas_doc_format?: {
    value: string;
    representation: 'atlas_doc_format';
  };
  view?: {
    value: string;
    representation: 'view';
  };
}

export interface Version {
  number: number;
  when: string;
  message?: string;
  minorEdit: boolean;
  createdBy?: {
    accountId: string;
    displayName: string;
    email?: string;
  };
}

export interface Space {
  id: number;
  key: string;
  name: string;
  description?: {
    plain?: {
      value: string;
    };
  };
  status?: 'current' | 'archived';
  type: 'global' | 'personal';
  homepageId?: number;
  creator?: any;
  creationDate?: string;
  lastModifier?: any;
  lastModificationDate?: string;
  _links?: {
    self: string;
    webui: string;
  };
  _expandable?: any;
}

export interface Page {
  id: string | number;
  type?: string;
  status?: 'current' | 'archived' | 'deleted' | 'trashed' | 'draft';
  title: string;
  space?: {
    id: number;
    key: string;
    name: string;
  };
  spaceId?: number;
  parentId?: number;
  authorId?: string;
  createdAt?: string;
  version: Version;
  body?: ContentBody;
  position?: number;
  _links?: {
    self: string;
    webui: string;
    tinyui: string;
  };
  _expandable?: any;
}

export interface BlogPost {
  id: number;
  status: 'current' | 'deleted' | 'trashed';
  title: string;
  spaceId: number;
  authorId: string;
  createdAt: string;
  version: Version;
  body?: ContentBody;
}

export interface Attachment {
  id: string;
  status: 'current' | 'archived' | 'trashed';
  title: string;
  mediaType: string;
  mediaTypeDescription?: string;
  comment?: string;
  fileId: string;
  fileSize: number;
  webuiLink?: string;
  downloadLink?: string;
  version: Version;
}

export interface Comment {
  id: number;
  status: 'current' | 'deleted' | 'resolved';
  title?: string;
  parentCommentId?: number;
  version: Version;
  body?: ContentBody;
  resolutionStatus?: 'open' | 'resolved';
  properties?: Record<string, any>;
}

export interface Label {
  id: number;
  name: string;
  prefix: 'my' | 'team' | 'global' | 'system';
}

export interface User {
  accountId: string;
  displayName: string;
  email?: string;
  isExternalCollaborator?: boolean;
}

export interface CustomContent {
  id: number;
  type: string;
  status: 'current' | 'archived' | 'deleted' | 'trashed';
  spaceId: number;
  pageId?: number;
  blogPostId?: number;
  customContentId?: number;
  authorId: string;
  createdAt: string;
  version: Version;
  title: string;
  body?: ContentBody;
}

export interface ContentProperty {
  id: number;
  key: string;
  value: any;
  version: Version;
}

// Request types
export interface PageCreateRequest {
  spaceId: number;
  status?: 'current' | 'draft';
  title: string;
  parentId?: number;
  body: ContentBody;
  position?: number;
}

export interface PageUpdateRequest {
  id: number;
  status?: 'current' | 'draft';
  title?: string;
  parentId?: number;
  body?: ContentBody;
  position?: number;
  version: {
    number: number;
    message?: string;
  };
}

export interface BlogPostCreateRequest {
  spaceId: number;
  status?: 'current' | 'draft';
  title: string;
  body: ContentBody;
}

export interface BlogPostUpdateRequest {
  id: number;
  status?: 'current' | 'draft';
  title?: string;
  body?: ContentBody;
  version: {
    number: number;
    message?: string;
  };
}

export interface SpaceCreateRequest {
  key: string;
  name: string;
  description?: {
    plain: {
      value: string;
    };
  };
}

// Response types for bulk operations
export interface MultiEntityResult<T> {
  results: T[];
  _links?: {
    next?: string;
    base?: string;
  };
}

// Search and filter types
export type SortOrder = 'created-date' | '-created-date' | 'id' | '-id' | 'modified-date' | '-modified-date' | 'title' | '-title';

export interface SearchParams {
  cursor?: string;
  limit?: number;
  sort?: SortOrder;
}

export interface PageSearchParams extends SearchParams {
  id?: number[];
  spaceId?: number[];
  status?: ('current' | 'archived' | 'deleted' | 'trashed' | 'draft')[];
  title?: string;
  bodyFormat?: 'storage' | 'atlas_doc_format' | 'view';
}

export interface BlogPostSearchParams extends SearchParams {
  id?: number[];
  spaceId?: number[];
  status?: ('current' | 'deleted' | 'trashed')[];
  title?: string;
  bodyFormat?: 'storage' | 'atlas_doc_format' | 'view';
}

export interface AttachmentSearchParams extends SearchParams {
  status?: ('current' | 'archived' | 'trashed')[];
  mediaType?: string;
  filename?: string;
}
