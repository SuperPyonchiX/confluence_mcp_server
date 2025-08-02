# Confluence MCP Server API Reference

This document provides a comprehensive reference for all tools available in the Confluence MCP Server.

## Table of Contents

- [Authentication](#authentication)
- [Page Operations](#page-operations)
- [Blog Post Operations](#blog-post-operations)
- [Space Operations](#space-operations)
- [Attachment Operations](#attachment-operations)
- [User Operations](#user-operations)
- [Label Operations](#label-operations)
- [Content Properties](#content-properties)
- [Administrative Operations](#administrative-operations)

## Authentication

The server uses basic authentication with your Confluence email and API token. Set these environment variables:

- `CONFLUENCE_DOMAIN`: Your Confluence domain (e.g., `company.atlassian.net`)
- `CONFLUENCE_EMAIL`: Your Confluence account email
- `CONFLUENCE_API_TOKEN`: Your API token (generate at https://id.atlassian.com/manage-profile/security/api-tokens)

## Page Operations

### confluence_get_pages

Get all pages with optional filtering.

**Parameters:**
- `id` (array of numbers, optional): Filter by page IDs
- `spaceId` (array of numbers, optional): Filter by space IDs
- `status` (array of strings, optional): Filter by page status (`current`, `archived`, `deleted`, `trashed`, `draft`)
- `title` (string, optional): Filter by page title
- `bodyFormat` (string, optional): Content format (`storage`, `atlas_doc_format`, `view`)
- `sort` (string, optional): Sort order
- `limit` (number, optional): Maximum results (1-250, default: 25)

**Example:**
```json
{
  "spaceId": [123],
  "status": ["current"],
  "bodyFormat": "storage",
  "limit": 50
}
```

### confluence_get_page_by_id

Get a specific page by its ID.

**Parameters:**
- `id` (number, required): The page ID
- `bodyFormat` (string, optional): Content format
- `getDraft` (boolean, optional): Retrieve draft version
- `version` (number, optional): Retrieve specific version
- `includeLabels` (boolean, optional): Include labels
- `includeProperties` (boolean, optional): Include content properties
- `includeOperations` (boolean, optional): Include permitted operations
- `includeLikes` (boolean, optional): Include likes information
- `includeVersions` (boolean, optional): Include version history

**Example:**
```json
{
  "id": 123456,
  "bodyFormat": "storage",
  "includeLabels": true,
  "includeVersions": true
}
```

### confluence_create_page

Create a new page in a space.

**Parameters:**
- `spaceId` (number, required): The space ID
- `title` (string, required): The page title
- `body` (object, required): The page content
- `parentId` (number, optional): Parent page ID
- `status` (string, optional): Page status (`current`, `draft`)
- `private` (boolean, optional): Make page private

**Example:**
```json
{
  "spaceId": 123,
  "title": "New Documentation Page",
  "body": {
    "storage": {
      "value": "<h1>Welcome</h1><p>This is the content.</p>",
      "representation": "storage"
    }
  },
  "status": "current"
}
```

### confluence_update_page

Update an existing page.

**Parameters:**
- `id` (number, required): The page ID
- `title` (string, optional): New title
- `body` (object, optional): New content
- `version` (object, required): Version information with `number` and optional `message`
- `parentId` (number, optional): New parent page ID
- `status` (string, optional): New status

**Example:**
```json
{
  "id": 123456,
  "title": "Updated Title",
  "body": {
    "storage": {
      "value": "<h1>Updated Content</h1>",
      "representation": "storage"
    }
  },
  "version": {
    "number": 2,
    "message": "Updated content and title"
  }
}
```

### confluence_delete_page

Delete a page (moves to trash unless purged).

**Parameters:**
- `id` (number, required): The page ID
- `purge` (boolean, optional): Permanently delete
- `draft` (boolean, optional): Delete draft page

**Example:**
```json
{
  "id": 123456,
  "purge": false
}
```

## Blog Post Operations

### confluence_get_blog_posts

Get all blog posts with optional filtering.

**Parameters:**
- `id` (array of numbers, optional): Filter by blog post IDs
- `spaceId` (array of numbers, optional): Filter by space IDs
- `status` (array of strings, optional): Filter by status (`current`, `deleted`, `trashed`)
- `title` (string, optional): Filter by title
- `bodyFormat` (string, optional): Content format
- `sort` (string, optional): Sort order
- `limit` (number, optional): Maximum results

### confluence_get_blog_post_by_id

Get a specific blog post by its ID.

**Parameters:** Similar to `confluence_get_page_by_id`

### confluence_create_blog_post

Create a new blog post.

**Parameters:**
- `spaceId` (number, required): The space ID
- `title` (string, required): The blog post title
- `body` (object, required): The content
- `status` (string, optional): Status (`current`, `draft`)
- `private` (boolean, optional): Make private

### confluence_update_blog_post

Update an existing blog post.

**Parameters:** Similar to `confluence_update_page`

### confluence_delete_blog_post

Delete a blog post.

**Parameters:** Similar to `confluence_delete_page`

## Space Operations

### confluence_get_spaces

Get all spaces with optional filtering.

**Parameters:**
- `id` (array of numbers, optional): Filter by space IDs
- `key` (array of strings, optional): Filter by space keys
- `type` (array of strings, optional): Filter by type (`global`, `personal`)
- `status` (array of strings, optional): Filter by status (`current`, `archived`)
- `favorite` (boolean, optional): Filter to favorites only
- `sort` (string, optional): Sort order
- `limit` (number, optional): Maximum results

### confluence_get_space_by_id

Get a specific space by its ID.

**Parameters:**
- `id` (number, required): The space ID
- `includeIcon` (boolean, optional): Include space icon
- `includeDescription` (boolean, optional): Include description
- `includeHomepage` (boolean, optional): Include homepage info
- `includeOperations` (boolean, optional): Include operations
- `includePermissions` (boolean, optional): Include permissions
- `includeProperties` (boolean, optional): Include properties
- `includeLabels` (boolean, optional): Include labels

### confluence_create_space

Create a new space.

**Parameters:**
- `key` (string, required): Unique space key
- `name` (string, required): Space name
- `description` (object, optional): Space description

**Example:**
```json
{
  "key": "NEWSPACE",
  "name": "New Space",
  "description": {
    "plain": {
      "value": "This is a new space for our team"
    }
  }
}
```

### confluence_update_space

Update an existing space.

**Parameters:**
- `id` (number, required): The space ID
- `key` (string, optional): New space key
- `name` (string, optional): New name
- `description` (object, optional): New description

### confluence_delete_space

Delete a space.

**Parameters:**
- `id` (number, required): The space ID

## Attachment Operations

### confluence_get_attachments

Get all attachments with optional filtering.

**Parameters:**
- `status` (array of strings, optional): Filter by status
- `mediaType` (string, optional): Filter by media type
- `filename` (string, optional): Filter by filename
- `sort` (string, optional): Sort order
- `limit` (number, optional): Maximum results

### confluence_get_attachment_by_id

Get a specific attachment by its ID.

**Parameters:**
- `id` (string, required): The attachment ID
- `version` (number, optional): Specific version
- `includeLabels` (boolean, optional): Include labels
- `includeProperties` (boolean, optional): Include properties
- `includeOperations` (boolean, optional): Include operations
- `includeVersions` (boolean, optional): Include versions

### confluence_delete_attachment

Delete an attachment.

**Parameters:**
- `id` (number, required): The attachment ID
- `purge` (boolean, optional): Permanently delete

## User Operations

### confluence_get_current_user

Get information about the current authenticated user.

**Parameters:** None

### confluence_get_user_by_id

Get a specific user by account ID.

**Parameters:**
- `accountId` (string, required): The user's account ID

### confluence_get_users

Get multiple users.

**Parameters:**
- `accountId` (array of strings, optional): Filter by account IDs
- `limit` (number, optional): Maximum results

## Label Operations

### confluence_get_labels

Get all labels with optional filtering.

**Parameters:**
- `prefix` (string, optional): Filter by prefix (`my`, `team`, `global`, `system`)
- `sort` (string, optional): Sort order
- `limit` (number, optional): Maximum results

### confluence_get_label_by_id

Get a specific label by its ID.

**Parameters:**
- `id` (number, required): The label ID

## Content Properties

### confluence_get_content_properties

Get content properties for a page, blog post, or attachment.

**Parameters:**
- `contentId` (number, required): The content ID
- `contentType` (string, required): Content type (`page`, `blogpost`, `attachment`)
- `key` (string, optional): Filter by property key
- `sort` (string, optional): Sort order
- `limit` (number, optional): Maximum results

### confluence_create_content_property

Create a content property.

**Parameters:**
- `contentId` (number, required): The content ID
- `contentType` (string, required): Content type
- `key` (string, required): Property key
- `value` (any, required): Property value

**Example:**
```json
{
  "contentId": 123456,
  "contentType": "page",
  "key": "review-status",
  "value": {
    "status": "pending",
    "reviewer": "john.doe@company.com",
    "deadline": "2024-01-15"
  }
}
```

## Administrative Operations

### confluence_get_admin_key

Get current admin key information.

**Parameters:** None

### confluence_enable_admin_key

Enable admin key access.

**Parameters:**
- `durationInMinutes` (number, optional): Duration in minutes (default: 10)

### confluence_disable_admin_key

Disable admin key access.

**Parameters:** None

## Error Handling

All tools return error information in a consistent format:

```json
{
  "error": true,
  "message": "Description of the error",
  "details": "Additional error details (e.g., HTTP status)"
}
```

Common error scenarios:
- **401 Unauthorized**: Invalid credentials
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist or no access
- **400 Bad Request**: Invalid parameters
- **413 Payload Too Large**: Request exceeds size limits

## Rate Limiting

Confluence API has rate limits. The server will handle rate limit responses appropriately. For high-volume operations, consider:

- Using appropriate `limit` parameters
- Implementing delays between requests
- Filtering results to reduce API calls

## Best Practices

1. **Use specific IDs**: When possible, use specific IDs rather than broad searches
2. **Include only needed data**: Use include parameters judiciously
3. **Handle pagination**: Use cursors for large result sets
4. **Validate permissions**: Ensure users have appropriate permissions before operations
5. **Use appropriate content formats**: Choose the right body format for your use case
