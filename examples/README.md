# Confluence MCP Server Examples

This directory contains example configurations and usage patterns for the Confluence MCP Server.

## MCP Client Configuration

### Claude Desktop Configuration

Add this to your Claude Desktop `claude_app_config.json`:

```json
{
  "mcpServers": {
    "confluence": {
      "command": "node",
      "args": ["path/to/confluence-mcp-server/build/index.js"],
      "env": {
        "CONFLUENCE_DOMAIN": "your-domain.atlassian.net",
        "CONFLUENCE_EMAIL": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Other MCP Clients

For other MCP clients, use the following connection details:
- **Protocol**: stdio
- **Command**: `node build/index.js`
- **Working Directory**: Path to this project
- **Environment Variables**: CONFLUENCE_DOMAIN, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN

## Usage Examples

### 1. Getting Spaces

```
Can you show me all the spaces in my Confluence instance?
```

This will use the `confluence_get_spaces` tool to retrieve all spaces you have access to.

### 2. Creating a Page

```
Create a new page in the DEV space with the title "API Documentation" and the following content:

# API Documentation

This page contains our API documentation.

## Overview
...
```

This will use the `confluence_create_page` tool to create a new page with the specified content.

### 3. Searching for Pages

```
Find all pages in space ID 123 that contain "docker" in the title
```

This will use the `confluence_get_pages` tool with appropriate filters.

### 4. Managing Blog Posts

```
Create a blog post in the TEAM space titled "Weekly Update" with today's updates
```

This will use the `confluence_create_blog_post` tool.

### 5. Working with Attachments

```
Show me all PDF attachments that were uploaded this month
```

This will use the `confluence_get_attachments` tool with media type filtering.

### 6. User Information

```
Who is the current user and what are their permissions?
```

This will use the `confluence_get_current_user` tool.

### 7. Content Properties

```
Add a custom property "review-status" with value "pending" to page ID 456
```

This will use the `confluence_create_content_property` tool.

## Advanced Usage

### Batch Operations

```
I need to update multiple pages in the DEV space. First, show me all current pages, then I'll tell you which ones to update.
```

The AI can use multiple tool calls to first retrieve pages, then perform updates based on your instructions.

### Content Migration

```
Copy the content from page "Old Documentation" to a new page called "Updated Documentation" in the same space, but update all the links to point to the new location.
```

The AI can read the source page, create the new page, and help with content transformation.

### Reporting

```
Generate a report of all spaces, their page counts, and recent activity
```

The AI can gather data from multiple API calls and compile comprehensive reports.

## Error Handling

The server provides detailed error messages for common issues:

- **Authentication errors**: Check your credentials and API token
- **Permission errors**: Ensure you have the required permissions for the operation
- **Not found errors**: Verify that the specified IDs exist and you have access
- **Validation errors**: Check that required parameters are provided correctly

## Tips for Best Results

1. **Be specific**: Include IDs, space keys, or other specific identifiers when possible
2. **Use natural language**: The AI can interpret your requests and map them to appropriate API calls
3. **Ask for confirmation**: For destructive operations, the AI may ask for confirmation
4. **Provide context**: Let the AI know what you're trying to accomplish for better tool selection
