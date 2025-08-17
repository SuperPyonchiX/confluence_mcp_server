"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfluenceApiClient = void 0;
var axios_1 = require("axios");
var ConfluenceApiClient = /** @class */ (function () {
    function ConfluenceApiClient(config) {
        var _this = this;
        this.config = config;
        // 認証方法に応じて認証情報を設定
        var authConfig;
        if (config.authType === 'token') {
            // APIトークン認証（Cloud版）
            if (!config.email || !config.apiToken) {
                throw new Error('API token authentication requires email and apiToken');
            }
            authConfig = {
                username: config.email,
                password: config.apiToken
            };
        }
        else {
            // パスワード認証（DataCenter版）
            if (!config.username || !config.password) {
                throw new Error('Password authentication requires username and password');
            }
            authConfig = {
                username: config.username,
                password: config.password
            };
        }
        this.client = axios_1.default.create({
            baseURL: config.baseUrl,
            auth: authConfig,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use(function (response) { return response; }, function (error) {
            throw _this.handleApiError(error);
        });
    }
    ConfluenceApiClient.prototype.handleApiError = function (error) {
        var _a, _b;
        var status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
        var data = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data;
        var message = 'An error occurred while communicating with Confluence API';
        if (data === null || data === void 0 ? void 0 : data.message) {
            message = data.message;
        }
        else if (status === 401) {
            message = 'Authentication failed. Please check your credentials.';
        }
        else if (status === 403) {
            message = 'Access denied. You do not have permission to perform this action.';
        }
        else if (status === 404) {
            message = 'The requested resource was not found.';
        }
        else if (status === 400) {
            message = 'Invalid request. Please check your parameters.';
        }
        return {
            message: message,
            status: status,
            errors: data === null || data === void 0 ? void 0 : data.errors
        };
    };
    // Page operations
    ConfluenceApiClient.prototype.getPages = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, isDataCenter, limitParam, endpoint, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        isDataCenter = this.config.authType === 'basic';
                        if (params === null || params === void 0 ? void 0 : params.id) {
                            searchParams.append('id', params.id.join(','));
                        }
                        if (params === null || params === void 0 ? void 0 : params.spaceId) {
                            if (isDataCenter) {
                                // DataCenter版ではspaceパラメータを使用（spaceIdまたはspaceKey）
                                searchParams.append('space', params.spaceId.join(','));
                            }
                            else {
                                searchParams.append('space-id', params.spaceId.join(','));
                            }
                        }
                        if (params === null || params === void 0 ? void 0 : params.status) {
                            params.status.forEach(function (status) { return searchParams.append('status', status); });
                        }
                        if (params === null || params === void 0 ? void 0 : params.title) {
                            searchParams.append('title', params.title);
                        }
                        if ((params === null || params === void 0 ? void 0 : params.bodyFormat) && !isDataCenter) {
                            searchParams.append('body-format', params.bodyFormat);
                        }
                        else if ((params === null || params === void 0 ? void 0 : params.bodyFormat) && isDataCenter) {
                            // DataCenter版では expand パラメータを使用
                            searchParams.append('expand', 'body.storage,version');
                        }
                        if (params === null || params === void 0 ? void 0 : params.sort) {
                            searchParams.append('sort', params.sort);
                        }
                        if ((params === null || params === void 0 ? void 0 : params.cursor) && !isDataCenter) {
                            // DataCenter版ではcursor-based paginationは使用しない
                            searchParams.append('cursor', params.cursor);
                        }
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            limitParam = isDataCenter ? 'limit' : 'limit';
                            searchParams.append(limitParam, params.limit.toString());
                        }
                        endpoint = isDataCenter ? '/content' : '/pages';
                        return [4 /*yield*/, this.client.get("".concat(endpoint, "?").concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        // DataCenter版のレスポンス形式を統一
                        if (isDataCenter) {
                            // DataCenter版では直接results配列を返す
                            return [2 /*return*/, {
                                    results: response.data.results || [],
                                    _links: response.data._links || {}
                                }];
                        }
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.getPageById = function (id, options) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, isDataCenter, expandParams, endpoint, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        isDataCenter = this.config.authType === 'basic';
                        if (isDataCenter) {
                            expandParams = ['version'];
                            if ((options === null || options === void 0 ? void 0 : options.bodyFormat) === 'storage' || (options === null || options === void 0 ? void 0 : options.bodyFormat) === 'view') {
                                expandParams.push('body.storage');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeLabels) {
                                expandParams.push('metadata.labels');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeProperties) {
                                expandParams.push('metadata.properties');
                            }
                            if (expandParams.length > 0) {
                                searchParams.append('expand', expandParams.join(','));
                            }
                        }
                        else {
                            // Cloud版のパラメータ
                            if (options === null || options === void 0 ? void 0 : options.bodyFormat) {
                                searchParams.append('body-format', options.bodyFormat);
                            }
                            if (options === null || options === void 0 ? void 0 : options.getDraft) {
                                searchParams.append('get-draft', 'true');
                            }
                            if (options === null || options === void 0 ? void 0 : options.status) {
                                options.status.forEach(function (status) { return searchParams.append('status', status); });
                            }
                            if (options === null || options === void 0 ? void 0 : options.version) {
                                searchParams.append('version', options.version.toString());
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeLabels) {
                                searchParams.append('include-labels', 'true');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeProperties) {
                                searchParams.append('include-properties', 'true');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeOperations) {
                                searchParams.append('include-operations', 'true');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeLikes) {
                                searchParams.append('include-likes', 'true');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeVersions) {
                                searchParams.append('include-versions', 'true');
                            }
                            if ((options === null || options === void 0 ? void 0 : options.includeVersion) !== undefined) {
                                searchParams.append('include-version', options.includeVersion.toString());
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeFavoritedByCurrentUserStatus) {
                                searchParams.append('include-favorited-by-current-user-status', 'true');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeWebresources) {
                                searchParams.append('include-webresources', 'true');
                            }
                            if (options === null || options === void 0 ? void 0 : options.includeCollaborators) {
                                searchParams.append('include-collaborators', 'true');
                            }
                        }
                        endpoint = isDataCenter ? "/content/".concat(id) : "/pages/".concat(id);
                        return [4 /*yield*/, this.client.get("".concat(endpoint, "?").concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.createPage = function (pageData, options) {
        return __awaiter(this, void 0, void 0, function () {
            var isDataCenter, spaceKey, spacesResult, targetSpace, dcPageData, response, searchParams, response;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 5];
                        spaceKey = void 0;
                        if (!(typeof pageData.spaceId === 'number')) return [3 /*break*/, 2];
                        console.error('[DEBUG] Looking for space with ID:', pageData.spaceId);
                        return [4 /*yield*/, this.getSpaces({ limit: 50 })];
                    case 1:
                        spacesResult = _b.sent();
                        targetSpace = (_a = spacesResult.results) === null || _a === void 0 ? void 0 : _a.find(function (space) { return space.id === pageData.spaceId; });
                        if (!targetSpace) {
                            throw new Error("Space with ID ".concat(pageData.spaceId, " not found"));
                        }
                        spaceKey = targetSpace.key;
                        console.error('[DEBUG] Found space key:', spaceKey, 'for ID:', pageData.spaceId);
                        return [3 /*break*/, 3];
                    case 2:
                        spaceKey = pageData.spaceId;
                        _b.label = 3;
                    case 3:
                        dcPageData = __assign({ type: 'page', title: pageData.title, space: {
                                key: spaceKey // DataCenter版ではkeyを使用
                            }, body: {
                                storage: pageData.body.storage
                            } }, (pageData.parentId && { ancestors: [{ id: pageData.parentId }] }));
                        console.error('[DEBUG] Sending dcPageData:', JSON.stringify(dcPageData, null, 2));
                        return [4 /*yield*/, this.client.post('/content', dcPageData)];
                    case 4:
                        response = _b.sent();
                        return [2 /*return*/, response.data];
                    case 5:
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.private) {
                            searchParams.append('private', 'true');
                        }
                        return [4 /*yield*/, this.client.post("/pages?".concat(searchParams), pageData)];
                    case 6:
                        response = _b.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.updatePage = function (pageData) {
        return __awaiter(this, void 0, void 0, function () {
            var isDataCenter, updateData, response, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 2];
                        updateData = {
                            title: pageData.title,
                            type: 'page',
                            body: pageData.body,
                            version: pageData.version
                        };
                        return [4 /*yield*/, this.client.put("/content/".concat(pageData.id), updateData)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2: return [4 /*yield*/, this.client.put("/pages/".concat(pageData.id), pageData)];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.deletePage = function (id, options) {
        return __awaiter(this, void 0, void 0, function () {
            var isDataCenter, searchParams, searchParams;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 2];
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.purge) {
                            searchParams.append('status', 'trashed'); // DataCenterではstatusパラメータ
                        }
                        return [4 /*yield*/, this.client.delete("/content/".concat(id, "?").concat(searchParams))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.purge) {
                            searchParams.append('purge', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.draft) {
                            searchParams.append('draft', 'true');
                        }
                        return [4 /*yield*/, this.client.delete("/pages/".concat(id, "?").concat(searchParams))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Blog Post operations
    ConfluenceApiClient.prototype.getBlogPosts = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (params === null || params === void 0 ? void 0 : params.id) {
                            searchParams.append('id', params.id.join(','));
                        }
                        if (params === null || params === void 0 ? void 0 : params.spaceId) {
                            searchParams.append('space-id', params.spaceId.join(','));
                        }
                        if (params === null || params === void 0 ? void 0 : params.status) {
                            params.status.forEach(function (status) { return searchParams.append('status', status); });
                        }
                        if (params === null || params === void 0 ? void 0 : params.title) {
                            searchParams.append('title', params.title);
                        }
                        if (params === null || params === void 0 ? void 0 : params.bodyFormat) {
                            searchParams.append('body-format', params.bodyFormat);
                        }
                        if (params === null || params === void 0 ? void 0 : params.sort) {
                            searchParams.append('sort', params.sort);
                        }
                        if (params === null || params === void 0 ? void 0 : params.cursor) {
                            searchParams.append('cursor', params.cursor);
                        }
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        return [4 /*yield*/, this.client.get("/blogposts?".concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.getBlogPostById = function (id, options) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.bodyFormat) {
                            searchParams.append('body-format', options.bodyFormat);
                        }
                        if (options === null || options === void 0 ? void 0 : options.getDraft) {
                            searchParams.append('get-draft', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.status) {
                            options.status.forEach(function (status) { return searchParams.append('status', status); });
                        }
                        if (options === null || options === void 0 ? void 0 : options.version) {
                            searchParams.append('version', options.version.toString());
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeLabels) {
                            searchParams.append('include-labels', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeProperties) {
                            searchParams.append('include-properties', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeOperations) {
                            searchParams.append('include-operations', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeLikes) {
                            searchParams.append('include-likes', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeVersions) {
                            searchParams.append('include-versions', 'true');
                        }
                        if ((options === null || options === void 0 ? void 0 : options.includeVersion) !== undefined) {
                            searchParams.append('include-version', options.includeVersion.toString());
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeFavoritedByCurrentUserStatus) {
                            searchParams.append('include-favorited-by-current-user-status', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeWebresources) {
                            searchParams.append('include-webresources', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeCollaborators) {
                            searchParams.append('include-collaborators', 'true');
                        }
                        return [4 /*yield*/, this.client.get("/blogposts/".concat(id, "?").concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.createBlogPost = function (blogPostData, options) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.private) {
                            searchParams.append('private', 'true');
                        }
                        return [4 /*yield*/, this.client.post("/blogposts?".concat(searchParams), blogPostData)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.updateBlogPost = function (blogPostData) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.put("/blogposts/".concat(blogPostData.id), blogPostData)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.deleteBlogPost = function (id, options) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.purge) {
                            searchParams.append('purge', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.draft) {
                            searchParams.append('draft', 'true');
                        }
                        return [4 /*yield*/, this.client.delete("/blogposts/".concat(id, "?").concat(searchParams))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Space operations
    ConfluenceApiClient.prototype.getSpaces = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, isDataCenter, endpoint, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        isDataCenter = this.config.authType === 'basic';
                        if (isDataCenter) {
                            // DataCenter版では異なるパラメータ名を使用
                            if (params === null || params === void 0 ? void 0 : params.key) {
                                searchParams.append('spaceKey', params.key.join(','));
                            }
                            if (params === null || params === void 0 ? void 0 : params.type) {
                                params.type.forEach(function (type) { return searchParams.append('type', type); });
                            }
                            if (params === null || params === void 0 ? void 0 : params.status) {
                                params.status.forEach(function (status) { return searchParams.append('status', status); });
                            }
                            if (params === null || params === void 0 ? void 0 : params.limit) {
                                searchParams.append('limit', params.limit.toString());
                            }
                            searchParams.append('expand', 'description.plain,homepage');
                        }
                        else {
                            // Cloud版のパラメータ
                            if (params === null || params === void 0 ? void 0 : params.id) {
                                searchParams.append('ids', params.id.join(','));
                            }
                            if (params === null || params === void 0 ? void 0 : params.key) {
                                searchParams.append('keys', params.key.join(','));
                            }
                            if (params === null || params === void 0 ? void 0 : params.type) {
                                params.type.forEach(function (type) { return searchParams.append('type', type); });
                            }
                            if (params === null || params === void 0 ? void 0 : params.status) {
                                params.status.forEach(function (status) { return searchParams.append('status', status); });
                            }
                            if (params === null || params === void 0 ? void 0 : params.label) {
                                params.label.forEach(function (label) { return searchParams.append('label', label); });
                            }
                            if (params === null || params === void 0 ? void 0 : params.favorite) {
                                searchParams.append('favorite', 'true');
                            }
                            if (params === null || params === void 0 ? void 0 : params.sort) {
                                searchParams.append('sort', params.sort);
                            }
                            if (params === null || params === void 0 ? void 0 : params.cursor) {
                                searchParams.append('cursor', params.cursor);
                            }
                            if (params === null || params === void 0 ? void 0 : params.limit) {
                                searchParams.append('limit', params.limit.toString());
                            }
                        }
                        endpoint = isDataCenter ? '/space' : '/spaces';
                        return [4 /*yield*/, this.client.get("".concat(endpoint, "?").concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        // DataCenter版のレスポンス形式を統一
                        if (isDataCenter) {
                            // DataCenter版では直接results配列を返す
                            return [2 /*return*/, {
                                    results: response.data.results || [],
                                    _links: response.data._links || {}
                                }];
                        }
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.getSpaceById = function (id, options) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, isDataCenter, expandParams, endpoint, response, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 2];
                        expandParams = [];
                        if (options === null || options === void 0 ? void 0 : options.includeDescription) {
                            expandParams.push('description.plain');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeHomepage) {
                            expandParams.push('homepage');
                        }
                        if (expandParams.length > 0) {
                            searchParams.append('expand', expandParams.join(','));
                        }
                        endpoint = "/space/".concat(id);
                        return [4 /*yield*/, this.client.get("".concat(endpoint, "?").concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        // Cloud版のパラメータ
                        if (options === null || options === void 0 ? void 0 : options.includeIcon) {
                            searchParams.append('include-icon', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeDescription) {
                            searchParams.append('include-description', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeHomepage) {
                            searchParams.append('include-homepage', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeOperations) {
                            searchParams.append('include-operations', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includePermissions) {
                            searchParams.append('include-permissions', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeProperties) {
                            searchParams.append('include-properties', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeLabels) {
                            searchParams.append('include-labels', 'true');
                        }
                        return [4 /*yield*/, this.client.get("/spaces/".concat(id, "?").concat(searchParams))];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.createSpace = function (spaceData) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/spaces', spaceData)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.updateSpace = function (id, spaceData) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.put("/spaces/".concat(id), spaceData)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.deleteSpace = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.delete("/spaces/".concat(id))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Attachment operations
    ConfluenceApiClient.prototype.getAttachments = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (params === null || params === void 0 ? void 0 : params.status) {
                            params.status.forEach(function (status) { return searchParams.append('status', status); });
                        }
                        if (params === null || params === void 0 ? void 0 : params.mediaType) {
                            searchParams.append('mediaType', params.mediaType);
                        }
                        if (params === null || params === void 0 ? void 0 : params.filename) {
                            searchParams.append('filename', params.filename);
                        }
                        if (params === null || params === void 0 ? void 0 : params.sort) {
                            searchParams.append('sort', params.sort);
                        }
                        if (params === null || params === void 0 ? void 0 : params.cursor) {
                            searchParams.append('cursor', params.cursor);
                        }
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        return [4 /*yield*/, this.client.get("/attachments?".concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.getAttachmentById = function (id, options) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.version) {
                            searchParams.append('version', options.version.toString());
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeLabels) {
                            searchParams.append('include-labels', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeProperties) {
                            searchParams.append('include-properties', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeOperations) {
                            searchParams.append('include-operations', 'true');
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeVersions) {
                            searchParams.append('include-versions', 'true');
                        }
                        if ((options === null || options === void 0 ? void 0 : options.includeVersion) !== undefined) {
                            searchParams.append('include-version', options.includeVersion.toString());
                        }
                        if (options === null || options === void 0 ? void 0 : options.includeCollaborators) {
                            searchParams.append('include-collaborators', 'true');
                        }
                        return [4 /*yield*/, this.client.get("/attachments/".concat(id, "?").concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.deleteAttachment = function (id, options) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (options === null || options === void 0 ? void 0 : options.purge) {
                            searchParams.append('purge', 'true');
                        }
                        return [4 /*yield*/, this.client.delete("/attachments/".concat(id, "?").concat(searchParams))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Label operations
    ConfluenceApiClient.prototype.getLabels = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (params === null || params === void 0 ? void 0 : params.prefix) {
                            searchParams.append('prefix', params.prefix);
                        }
                        if (params === null || params === void 0 ? void 0 : params.sort) {
                            searchParams.append('sort', params.sort);
                        }
                        if (params === null || params === void 0 ? void 0 : params.cursor) {
                            searchParams.append('cursor', params.cursor);
                        }
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        return [4 /*yield*/, this.client.get("/labels?".concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.getLabelById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get("/labels/".concat(id))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // User operations
    ConfluenceApiClient.prototype.getCurrentUser = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isDataCenter, response, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.client.get('/user/current')];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                accountId: response.data.userKey || response.data.username,
                                displayName: response.data.displayName,
                                email: response.data.email || undefined
                            }];
                    case 2: return [4 /*yield*/, this.client.get('/user')];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.getUserById = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var isDataCenter, response, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.client.get("/user?key=".concat(accountId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2: return [4 /*yield*/, this.client.get("/users/".concat(accountId))];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.getUsers = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, isDataCenter, response, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 2];
                        // DataCenter版では異なるパラメータを使用
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        return [4 /*yield*/, this.client.get("/user/search?".concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                results: Array.isArray(response.data) ? response.data : [response.data],
                                _links: {}
                            }];
                    case 2:
                        // Cloud版
                        if (params === null || params === void 0 ? void 0 : params.accountId) {
                            searchParams.append('accountId', params.accountId.join(','));
                        }
                        if (params === null || params === void 0 ? void 0 : params.cursor) {
                            searchParams.append('cursor', params.cursor);
                        }
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        return [4 /*yield*/, this.client.get("/users?".concat(searchParams))];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // Content properties operations
    ConfluenceApiClient.prototype.getContentProperties = function (contentId, contentType, params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, endpoint, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        if (params === null || params === void 0 ? void 0 : params.key) {
                            searchParams.append('key', params.key);
                        }
                        if (params === null || params === void 0 ? void 0 : params.sort) {
                            searchParams.append('sort', params.sort);
                        }
                        if (params === null || params === void 0 ? void 0 : params.cursor) {
                            searchParams.append('cursor', params.cursor);
                        }
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        switch (contentType) {
                            case 'page':
                                endpoint = "/pages/".concat(contentId, "/properties");
                                break;
                            case 'blogpost':
                                endpoint = "/blogposts/".concat(contentId, "/properties");
                                break;
                            case 'attachment':
                                endpoint = "/attachments/".concat(contentId, "/properties");
                                break;
                        }
                        return [4 /*yield*/, this.client.get("".concat(endpoint, "?").concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.createContentProperty = function (contentId, contentType, property) {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        switch (contentType) {
                            case 'page':
                                endpoint = "/pages/".concat(contentId, "/properties");
                                break;
                            case 'blogpost':
                                endpoint = "/blogposts/".concat(contentId, "/properties");
                                break;
                            case 'attachment':
                                endpoint = "/attachments/".concat(contentId, "/properties");
                                break;
                        }
                        return [4 /*yield*/, this.client.post(endpoint, property)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // Admin Key operations
    ConfluenceApiClient.prototype.getAdminKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get('/admin-key')];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.enableAdminKey = function (durationInMinutes) {
        return __awaiter(this, void 0, void 0, function () {
            var body, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        body = durationInMinutes ? { durationInMinutes: durationInMinutes } : {};
                        return [4 /*yield*/, this.client.post('/admin-key', body)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.disableAdminKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.delete('/admin-key')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Content Search API (CQL)
    ConfluenceApiClient.prototype.searchContent = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
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
                        return [4 /*yield*/, this.client.get("/content/search?".concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // Content Labels API  
    ConfluenceApiClient.prototype.getContentLabels = function (contentId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get("/content/".concat(contentId, "/label"))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    ConfluenceApiClient.prototype.addContentLabel = function (contentId, name) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post("/content/".concat(contentId, "/label"), {
                            name: name
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // User Search API
    ConfluenceApiClient.prototype.searchUsers = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, isDataCenter, response, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchParams = new URLSearchParams();
                        isDataCenter = this.config.authType === 'basic';
                        if (!isDataCenter) return [3 /*break*/, 2];
                        // DataCenter版では /user エンドポイントを使用
                        if (params === null || params === void 0 ? void 0 : params.query) {
                            searchParams.append('username', params.query);
                        }
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        if (params === null || params === void 0 ? void 0 : params.start) {
                            searchParams.append('start', params.start.toString());
                        }
                        return [4 /*yield*/, this.client.get("/user?".concat(searchParams))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                results: Array.isArray(response.data) ? response.data : [response.data],
                                _links: {}
                            }];
                    case 2:
                        // Cloud版
                        if (params === null || params === void 0 ? void 0 : params.limit) {
                            searchParams.append('limit', params.limit.toString());
                        }
                        if (params === null || params === void 0 ? void 0 : params.start) {
                            searchParams.append('cursor', params.start.toString());
                        }
                        return [4 /*yield*/, this.client.get("/users?".concat(searchParams))];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    return ConfluenceApiClient;
}());
exports.ConfluenceApiClient = ConfluenceApiClient;
