import { ConfluenceApiClient } from '../confluence-client.js';
import { ConfluenceConfig } from '../types.js';

// Mock axios
jest.mock('axios');

describe('ConfluenceApiClient', () => {
  let client: ConfluenceApiClient;
  let mockConfig: ConfluenceConfig;

  beforeEach(() => {
    mockConfig = {
      domain: 'test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token',
      baseUrl: 'https://test.atlassian.net/wiki/api/v2'
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with correct configuration', () => {
      expect(() => {
        client = new ConfluenceApiClient(mockConfig);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      client = new ConfluenceApiClient(mockConfig);
    });

    it('should handle 401 authentication errors', async () => {
      const mockAxios = require('axios');
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 401,
            data: {}
          }
        }),
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      });

      client = new ConfluenceApiClient(mockConfig);
      
      try {
        await client.getPages();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
        expect(error.message).toContain('Authentication failed');
      }
    });

    it('should handle 403 permission errors', async () => {
      const mockAxios = require('axios');
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 403,
            data: {}
          }
        }),
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      });

      client = new ConfluenceApiClient(mockConfig);
      
      try {
        await client.getPages();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(403);
        expect(error.message).toContain('Access denied');
      }
    });

    it('should handle 404 not found errors', async () => {
      const mockAxios = require('axios');
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 404,
            data: {}
          }
        }),
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      });

      client = new ConfluenceApiClient(mockConfig);
      
      try {
        await client.getPages();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('API methods', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      const mockAxios = require('axios');
      mockAxiosInstance = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      };
      
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      client = new ConfluenceApiClient(mockConfig);
    });

    describe('getPages', () => {
      it('should make GET request to /pages', async () => {
        const mockResponse = { data: { results: [], _links: {} } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await client.getPages();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pages?');
        expect(result).toEqual(mockResponse.data);
      });

      it('should include query parameters', async () => {
        const mockResponse = { data: { results: [], _links: {} } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        await client.getPages({
          spaceId: [123],
          status: ['current'],
          title: 'test',
          limit: 50
        });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('space-id=123')
        );
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('status=current')
        );
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('title=test')
        );
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('limit=50')
        );
      });
    });

    describe('createPage', () => {
      it('should make POST request to /pages', async () => {
        const mockResponse = { data: { id: 123, title: 'Test Page' } };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const pageData = {
          spaceId: 123,
          title: 'Test Page',
          body: {
            storage: {
              value: '<p>Test content</p>',
              representation: 'storage' as const
            }
          }
        };

        const result = await client.createPage(pageData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/pages?', pageData);
        expect(result).toEqual(mockResponse.data);
      });

      it('should include private parameter when specified', async () => {
        const mockResponse = { data: { id: 123, title: 'Test Page' } };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const pageData = {
          spaceId: 123,
          title: 'Test Page',
          body: {
            storage: {
              value: '<p>Test content</p>',
              representation: 'storage' as const
            }
          }
        };

        await client.createPage(pageData, { private: true });

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/pages?private=true',
          pageData
        );
      });
    });

    describe('updatePage', () => {
      it('should make PUT request to /pages/{id}', async () => {
        const mockResponse = { data: { id: 123, title: 'Updated Page' } };
        mockAxiosInstance.put.mockResolvedValue(mockResponse);

        const pageData = {
          id: 123,
          title: 'Updated Page',
          version: { number: 2 }
        };

        const result = await client.updatePage(pageData);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/pages/123', pageData);
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('deletePage', () => {
      it('should make DELETE request to /pages/{id}', async () => {
        mockAxiosInstance.delete.mockResolvedValue({});

        await client.deletePage(123);

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/pages/123?');
      });

      it('should include purge parameter when specified', async () => {
        mockAxiosInstance.delete.mockResolvedValue({});

        await client.deletePage(123, { purge: true });

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/pages/123?purge=true');
      });
    });
  });
});
