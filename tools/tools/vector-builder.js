#!/usr/bin/env node
"use strict";
/**
 * Confluence Vector DB Builder
 * 特定のスペースの全ページをベクトル化してJSONファイルに保存するツール
 */
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
var fs = require("fs/promises");
var path = require("path");
var confluence_client_js_1 = require("../src/confluence-client.js");
var local_embedding_service_js_1 = require("../src/local-embedding-service.js");
/**
 * .envファイルを読み込んで環境変数に設定
 */
function loadEnvFile() {
    return __awaiter(this, void 0, void 0, function () {
        var envPath, envContent, lines, loadedCount, _i, lines_1, line, trimmedLine, equalIndex, key, value, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    envPath = path.join(process.cwd(), '.env');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs.readFile(envPath, 'utf-8')];
                case 2:
                    envContent = _a.sent();
                    console.log('📁 .envファイルを読み込み中...');
                    lines = envContent.split('\n');
                    loadedCount = 0;
                    for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                        line = lines_1[_i];
                        trimmedLine = line.trim();
                        // コメント行と空行をスキップ
                        if (!trimmedLine || trimmedLine.startsWith('#')) {
                            continue;
                        }
                        equalIndex = trimmedLine.indexOf('=');
                        if (equalIndex > 0) {
                            key = trimmedLine.substring(0, equalIndex).trim();
                            value = trimmedLine.substring(equalIndex + 1).trim();
                            // 既存の環境変数を優先（process.envが既に設定されている場合は上書きしない）
                            if (!process.env[key]) {
                                process.env[key] = value;
                                loadedCount++;
                                console.log("   ".concat(key, "=").concat(value));
                            }
                        }
                    }
                    console.log("\u2705 ".concat(loadedCount, "\u500B\u306E\u74B0\u5883\u5909\u6570\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F"));
                    console.log('');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    if (error_1.code === 'ENOENT') {
                        console.log('📋 .envファイルが見つかりません（環境変数で設定済みの場合は問題ありません）');
                        console.log('   .env.datacenter-sampleを参考に.envファイルを作成できます');
                    }
                    else {
                        console.warn("\u26A0\uFE0F  .env\u30D5\u30A1\u30A4\u30EB\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC: ".concat(error_1.message));
                    }
                    console.log('');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var ConfluenceVectorBuilder = /** @class */ (function () {
    function ConfluenceVectorBuilder(config) {
        this.confluenceClient = new confluence_client_js_1.ConfluenceApiClient(config);
        this.embeddingService = new local_embedding_service_js_1.LocalEmbeddingService();
    }
    /**
     * スペース全体のベクトルDBを構築
     */
    ConfluenceVectorBuilder.prototype.buildVectorDB = function (spaceKey, outputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var space, pagesResponse, allVectors, processedPages, _i, _a, page, vectors, error_2, vectorDB, _b, _c, _d, error_3;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        console.log("\uD83D\uDE80 \u30D9\u30AF\u30C8\u30EBDB\u69CB\u7BC9\u958B\u59CB: ".concat(spaceKey));
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 13, , 14]);
                        return [4 /*yield*/, this.confluenceClient.getSpaceById(spaceKey)];
                    case 2:
                        space = _e.sent();
                        console.log("\uD83D\uDCC2 \u30B9\u30DA\u30FC\u30B9: ".concat(space.name, " (").concat(space.key, ")"));
                        return [4 /*yield*/, this.confluenceClient.getPages({
                                spaceId: [space.id],
                                status: ['current'],
                                bodyFormat: 'storage',
                                limit: 250
                            })];
                    case 3:
                        pagesResponse = _e.sent();
                        console.log("\uD83D\uDCC4 \u5BFE\u8C61\u30DA\u30FC\u30B8\u6570: ".concat(pagesResponse.results.length));
                        allVectors = [];
                        processedPages = 0;
                        _i = 0, _a = pagesResponse.results;
                        _e.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        page = _a[_i];
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 8, , 9]);
                        console.log("\uD83D\uDCDD \u51E6\u7406\u4E2D: ".concat(page.title, " (").concat(page.id, ")"));
                        return [4 /*yield*/, this.processPage(page, spaceKey)];
                    case 6:
                        vectors = _e.sent();
                        allVectors.push.apply(allVectors, vectors);
                        processedPages++;
                        console.log("\u2705 \u5B8C\u4E86 (".concat(processedPages, "/").concat(pagesResponse.results.length, "): ").concat(vectors.length, "\u30BB\u30AF\u30B7\u30E7\u30F3"));
                        // API制限対策で少し待機
                        return [4 /*yield*/, this.sleep(100)];
                    case 7:
                        // API制限対策で少し待機
                        _e.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_2 = _e.sent();
                        console.error("\u274C \u30DA\u30FC\u30B8\u51E6\u7406\u30A8\u30E9\u30FC (".concat(page.id, "): ").concat(error_2.message));
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 4];
                    case 10:
                        vectorDB = {
                            metadata: {
                                spaceKey: space.key,
                                spaceName: space.name,
                                totalPages: processedPages,
                                totalSections: allVectors.length,
                                createdAt: new Date().toISOString(),
                                embeddingModel: 'local-tfidf',
                                version: '1.0.0'
                            },
                            vectors: allVectors
                        };
                        return [4 /*yield*/, fs.writeFile(outputPath, JSON.stringify(vectorDB, null, 2), 'utf-8')];
                    case 11:
                        _e.sent();
                        console.log("\uD83C\uDF89 \u30D9\u30AF\u30C8\u30EBDB\u69CB\u7BC9\u5B8C\u4E86!");
                        console.log("\uD83D\uDCCA \u7D71\u8A08:");
                        console.log("   - \u30B9\u30DA\u30FC\u30B9: ".concat(space.name));
                        console.log("   - \u30DA\u30FC\u30B8\u6570: ".concat(processedPages));
                        console.log("   - \u30BB\u30AF\u30B7\u30E7\u30F3\u6570: ".concat(allVectors.length));
                        console.log("   - \u51FA\u529B\u30D5\u30A1\u30A4\u30EB: ".concat(outputPath));
                        _c = (_b = console).log;
                        _d = "   - \u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA: ".concat;
                        return [4 /*yield*/, fs.stat(outputPath)];
                    case 12:
                        _c.apply(_b, [_d.apply("   - \u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA: ", [((_e.sent()).size / 1024 / 1024).toFixed(2), " MB"])]);
                        return [3 /*break*/, 14];
                    case 13:
                        error_3 = _e.sent();
                        console.error("\u274C \u30D9\u30AF\u30C8\u30EBDB\u69CB\u7BC9\u30A8\u30E9\u30FC:", error_3);
                        throw error_3;
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 個別ページを処理してベクトル化
     */
    ConfluenceVectorBuilder.prototype.processPage = function (page, spaceKey) {
        return __awaiter(this, void 0, void 0, function () {
            var sections, sectionTexts, embeddings, vectors, i, section, embedding;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!((_b = (_a = page.body) === null || _a === void 0 ? void 0 : _a.storage) === null || _b === void 0 ? void 0 : _b.value)) {
                            console.warn("\u26A0\uFE0F  \u30DA\u30FC\u30B8\u672C\u6587\u304C\u7A7A: ".concat(page.title));
                            return [2 /*return*/, []];
                        }
                        sections = this.extractSections(page.body.storage.value, page.title);
                        if (sections.length === 0) {
                            console.warn("\u26A0\uFE0F  \u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ".concat(page.title));
                            return [2 /*return*/, []];
                        }
                        sectionTexts = sections.map(function (section) {
                            return "".concat(section.title, "\n").concat(section.content).trim();
                        });
                        return [4 /*yield*/, this.embeddingService.generateEmbeddings(sectionTexts)];
                    case 1:
                        embeddings = _d.sent();
                        vectors = [];
                        for (i = 0; i < sections.length; i++) {
                            section = sections[i];
                            embedding = embeddings[i];
                            if (embedding) {
                                vectors.push({
                                    pageId: String(page.id),
                                    pageTitle: page.title,
                                    sectionId: section.id,
                                    sectionTitle: section.title,
                                    embedding: embedding,
                                    spaceKey: spaceKey,
                                    lastUpdated: ((_c = page.version) === null || _c === void 0 ? void 0 : _c.when) || new Date().toISOString(),
                                    url: this.buildPageUrl(page.id)
                                });
                            }
                        }
                        return [2 /*return*/, vectors];
                }
            });
        });
    };
    /**
     * HTMLコンテンツをセクションに分割
     */
    ConfluenceVectorBuilder.prototype.extractSections = function (htmlContent, pageTitle) {
        // HTMLをプレーンテキストに変換
        var textContent = this.htmlToText(htmlContent);
        var lines = textContent.split('\n');
        var sections = [];
        var currentSection = null;
        var sectionIndex = 0;
        for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
            var line = lines_2[_i];
            var trimmedLine = line.trim();
            // 見出しを検出（#、##、### または大文字のみの行）
            if (this.isHeading(trimmedLine)) {
                // 前のセクションを保存
                if (currentSection && currentSection.content.length > 0) {
                    sections.push({
                        id: "section_".concat(sectionIndex),
                        title: currentSection.title,
                        content: currentSection.content.join('\n').trim()
                    });
                    sectionIndex++;
                }
                // 新しいセクションを開始
                var title = this.cleanHeading(trimmedLine);
                currentSection = {
                    title: title || "Section ".concat(sectionIndex + 1),
                    content: []
                };
            }
            else if (currentSection && trimmedLine.length > 0) {
                currentSection.content.push(line);
            }
            else if (!currentSection && trimmedLine.length > 0) {
                // 最初のコンテンツ（見出しなし）
                currentSection = {
                    title: pageTitle,
                    content: [line]
                };
            }
        }
        // 最後のセクションを保存
        if (currentSection && currentSection.content.length > 0) {
            sections.push({
                id: "section_".concat(sectionIndex),
                title: currentSection.title,
                content: currentSection.content.join('\n').trim()
            });
        }
        // 短すぎるセクションを除外
        return sections.filter(function (section) { return section.content.length > 30; });
    };
    /**
     * 見出しかどうかを判定
     */
    ConfluenceVectorBuilder.prototype.isHeading = function (text) {
        // Markdown見出し
        if (/^#{1,6}\s+/.test(text))
            return true;
        // 大文字のみの短い行（見出しっぽい）
        if (text.length > 2 && text.length < 50 && text === text.toUpperCase() && /^[A-Z\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(text)) {
            return true;
        }
        // 数字で始まる行（1. 2. など）
        if (/^\d+[\.\)]\s+/.test(text))
            return true;
        return false;
    };
    /**
     * 見出しテキストをクリーンアップ
     */
    ConfluenceVectorBuilder.prototype.cleanHeading = function (text) {
        return text
            .replace(/^#{1,6}\s+/, '') // Markdown見出し記号を除去
            .replace(/^\d+[\.\)]\s+/, '') // 数字リストを除去
            .trim();
    };
    /**
     * HTMLをプレーンテキストに変換
     */
    ConfluenceVectorBuilder.prototype.htmlToText = function (html) {
        return html
            .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, function (_, level, text) {
            var headerLevel = '#'.repeat(parseInt(level));
            return "".concat(headerLevel, " ").concat(text.trim(), "\n");
        })
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<[^>]+>/g, '') // HTMLタグを除去
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\n\s*\n\s*\n/g, '\n\n') // 連続改行を統合
            .trim();
    };
    /**
     * ページURLを構築
     */
    ConfluenceVectorBuilder.prototype.buildPageUrl = function (pageId) {
        var domain = process.env.CONFLUENCE_DOMAIN;
        if (domain) {
            return "https://".concat(domain, "/wiki/pages/viewpage.action?pageId=").concat(pageId);
        }
        return "page:".concat(pageId);
    };
    /**
     * 待機関数
     */
    ConfluenceVectorBuilder.prototype.sleep = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return ConfluenceVectorBuilder;
}());
/**
 * メイン実行関数
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var args, spaceKey, outputPath, domain, baseUrl, authType, config, username, password, email, apiToken, outputDir, builder, error_4;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    console.log('🚀 Confluence Vector DB Builder');
                    console.log('================================');
                    console.log('');
                    // .envファイルを読み込み
                    return [4 /*yield*/, loadEnvFile()];
                case 1:
                    // .envファイルを読み込み
                    _h.sent();
                    args = process.argv.slice(2);
                    if (args.length < 2) {
                        console.log("\n\u4F7F\u7528\u65B9\u6CD5: \n  node vector-builder.js <SPACE_KEY> <OUTPUT_FILE>\n\n\u4F8B:\n  node vector-builder.js PROJ ./vectors/proj-vectors.json\n\n\u74B0\u5883\u5909\u6570\uFF08DataCenter\u7248 - Basic\u8A8D\u8A3C\uFF09:\n  CONFLUENCE_DOMAIN     - Confluence\u30C9\u30E1\u30A4\u30F3\uFF08\u4F8B: confluence.company.com:8090\uFF09\n  CONFLUENCE_USERNAME   - \u30E6\u30FC\u30B6\u30FC\u540D\n  CONFLUENCE_PASSWORD   - \u30D1\u30B9\u30EF\u30FC\u30C9\n  CONFLUENCE_AUTH_TYPE  - 'basic'\uFF08DataCenter\u7248\u306E\u30C7\u30D5\u30A9\u30EB\u30C8\uFF09\n  CONFLUENCE_BASE_URL   - \u30D9\u30FC\u30B9URL\uFF08\u4EFB\u610F\u3001\u672A\u6307\u5B9A\u6642\u306F\u81EA\u52D5\u751F\u6210\uFF09\n\n\u74B0\u5883\u5909\u6570\uFF08Cloud\u7248 - Token\u8A8D\u8A3C\uFF09:\n  CONFLUENCE_DOMAIN     - Confluence\u30C9\u30E1\u30A4\u30F3\uFF08\u4F8B: company.atlassian.net\uFF09\n  CONFLUENCE_EMAIL      - \u30E6\u30FC\u30B6\u30FC\u30E1\u30FC\u30EB\n  CONFLUENCE_API_TOKEN  - API\u30C8\u30FC\u30AF\u30F3  \n  CONFLUENCE_AUTH_TYPE  - 'token'\uFF08Cloud\u7248\u3067\u4F7F\u7528\uFF09\n  CONFLUENCE_BASE_URL   - \u30D9\u30FC\u30B9URL\uFF08\u4EFB\u610F\u3001\u672A\u6307\u5B9A\u6642\u306F\u81EA\u52D5\u751F\u6210\uFF09\n\n\u73FE\u5728\u306E\u74B0\u5883\u5909\u6570:\n  CONFLUENCE_DOMAIN=".concat(process.env.CONFLUENCE_DOMAIN || '(未設定)', "\n  CONFLUENCE_USERNAME=").concat(process.env.CONFLUENCE_USERNAME || '(未設定)', "\n  CONFLUENCE_AUTH_TYPE=").concat(process.env.CONFLUENCE_AUTH_TYPE || 'basic(デフォルト)', "\n"));
                        process.exit(1);
                    }
                    spaceKey = args[0], outputPath = args[1];
                    domain = (_a = process.env.CONFLUENCE_DOMAIN) === null || _a === void 0 ? void 0 : _a.trim();
                    baseUrl = (_b = process.env.CONFLUENCE_BASE_URL) === null || _b === void 0 ? void 0 : _b.trim();
                    authType = ((_c = process.env.CONFLUENCE_AUTH_TYPE) === null || _c === void 0 ? void 0 : _c.trim()) || 'basic';
                    if (!domain) {
                        console.error('❌ CONFLUENCE_DOMAIN環境変数が設定されていません');
                        process.exit(1);
                    }
                    if (authType === 'basic') {
                        username = (_d = process.env.CONFLUENCE_USERNAME) === null || _d === void 0 ? void 0 : _d.trim();
                        password = (_e = process.env.CONFLUENCE_PASSWORD) === null || _e === void 0 ? void 0 : _e.trim();
                        if (!username || !password) {
                            console.error('❌ Basic認証にはCONFLUENCE_USERNAMEとCONFLUENCE_PASSWORDが必要です');
                            console.error('   DataCenter版ではパスワード認証を使用してください');
                            process.exit(1);
                        }
                        config = {
                            domain: domain,
                            username: username,
                            password: password,
                            baseUrl: baseUrl || "http://".concat(domain, "/rest/api"),
                            authType: 'basic'
                        };
                    }
                    else {
                        email = (_f = process.env.CONFLUENCE_EMAIL) === null || _f === void 0 ? void 0 : _f.trim();
                        apiToken = (_g = process.env.CONFLUENCE_API_TOKEN) === null || _g === void 0 ? void 0 : _g.trim();
                        if (!email || !apiToken) {
                            console.error('❌ Token認証にはCONFLUENCE_EMAILとCONFLUENCE_API_TOKENが必要です');
                            console.error('   Cloud版ではトークン認証を使用してください');
                            process.exit(1);
                        }
                        config = {
                            domain: domain,
                            email: email,
                            apiToken: apiToken,
                            baseUrl: baseUrl || "https://".concat(domain, "/wiki/api/v2"),
                            authType: 'token'
                        };
                    }
                    _h.label = 2;
                case 2:
                    _h.trys.push([2, 5, , 6]);
                    outputDir = path.dirname(outputPath);
                    return [4 /*yield*/, fs.mkdir(outputDir, { recursive: true })];
                case 3:
                    _h.sent();
                    builder = new ConfluenceVectorBuilder(config);
                    return [4 /*yield*/, builder.buildVectorDB(spaceKey, outputPath)];
                case 4:
                    _h.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_4 = _h.sent();
                    console.error('❌ 実行エラー:', error_4);
                    process.exit(1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// スクリプトが直接実行された場合にメイン関数を実行
main().catch(function (error) {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
});
