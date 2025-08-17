"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedLocalEmbeddingService = exports.LocalEmbeddingService = void 0;
var fs = require("fs/promises");
var path = require("path");
/**
 * ローカル埋め込みサービス（OpenAI API不要）
 * TF-IDF + コサイン類似度ベースの軽量実装
 */
var LocalEmbeddingService = /** @class */ (function () {
    function LocalEmbeddingService() {
        this.vocabulary = new Map();
        this.idfScores = new Map();
        this.documentCount = 0;
        this.loadVocabulary();
    }
    /**
     * テキストから埋め込みベクトルを生成
     */
    LocalEmbeddingService.prototype.generateEmbeddings = function (texts) {
        return __awaiter(this, void 0, void 0, function () {
            var embeddings, _i, texts_1, text, embedding;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        embeddings = [];
                        for (_i = 0, texts_1 = texts; _i < texts_1.length; _i++) {
                            text = texts_1[_i];
                            embedding = this.textToEmbedding(text);
                            embeddings.push(embedding);
                        }
                        // 語彙を更新
                        return [4 /*yield*/, this.updateVocabulary(texts)];
                    case 1:
                        // 語彙を更新
                        _a.sent();
                        return [2 /*return*/, embeddings];
                }
            });
        });
    };
    /**
     * 単一テキストから埋め込みベクトルを生成
     */
    LocalEmbeddingService.prototype.textToEmbedding = function (text) {
        var tokens = this.tokenize(text);
        var termFrequency = this.calculateTermFrequency(tokens);
        // TF-IDF計算
        var embedding = [];
        var vocabularyArray = Array.from(this.vocabulary.keys()).sort();
        for (var _i = 0, vocabularyArray_1 = vocabularyArray; _i < vocabularyArray_1.length; _i++) {
            var term = vocabularyArray_1[_i];
            var tf = termFrequency.get(term) || 0;
            var idf = this.idfScores.get(term) || 0;
            embedding.push(tf * idf);
        }
        // ベクトル正規化
        return this.normalizeVector(embedding);
    };
    /**
     * 日本語対応トークン化
     */
    LocalEmbeddingService.prototype.tokenize = function (text) {
        // 基本的な日本語トークン化
        // より高精度な実装には MeCab や Kuromoji の使用を推奨
        return text
            .toLowerCase()
            .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ') // 日本語文字を保持
            .split(/\s+/)
            .filter(function (token) { return token.length > 1; }); // 1文字は除外
    };
    /**
     * 語彙頻度計算
     */
    LocalEmbeddingService.prototype.calculateTermFrequency = function (tokens) {
        var frequency = new Map();
        var totalTokens = tokens.length;
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            frequency.set(token, (frequency.get(token) || 0) + 1);
        }
        // TF正規化
        for (var _a = 0, _b = frequency.entries(); _a < _b.length; _a++) {
            var _c = _b[_a], term = _c[0], count = _c[1];
            frequency.set(term, count / totalTokens);
        }
        return frequency;
    };
    /**
     * ベクトル正規化
     */
    LocalEmbeddingService.prototype.normalizeVector = function (vector) {
        var magnitude = Math.sqrt(vector.reduce(function (sum, val) { return sum + val * val; }, 0));
        return magnitude > 0 ? vector.map(function (val) { return val / magnitude; }) : vector;
    };
    /**
     * 語彙とIDF値を更新
     */
    LocalEmbeddingService.prototype.updateVocabulary = function (texts) {
        return __awaiter(this, void 0, void 0, function () {
            var newTerms, documentTerms, _i, texts_2, text, tokens, uniqueTerms, _a, uniqueTerms_1, term, _loop_1, this_1, _b, newTerms_1, term;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        newTerms = new Set();
                        documentTerms = [];
                        // 各文書の語彙を収集
                        for (_i = 0, texts_2 = texts; _i < texts_2.length; _i++) {
                            text = texts_2[_i];
                            tokens = this.tokenize(text);
                            uniqueTerms = new Set(tokens);
                            documentTerms.push(uniqueTerms);
                            for (_a = 0, uniqueTerms_1 = uniqueTerms; _a < uniqueTerms_1.length; _a++) {
                                term = uniqueTerms_1[_a];
                                newTerms.add(term);
                                if (!this.vocabulary.has(term)) {
                                    this.vocabulary.set(term, this.vocabulary.size);
                                }
                            }
                        }
                        this.documentCount += texts.length;
                        _loop_1 = function (term) {
                            var documentFrequency = documentTerms.reduce(function (count, docTerms) {
                                return docTerms.has(term) ? count + 1 : count;
                            }, 0);
                            var idf = Math.log(this_1.documentCount / (documentFrequency + 1));
                            this_1.idfScores.set(term, idf);
                        };
                        this_1 = this;
                        // IDF値を更新
                        for (_b = 0, newTerms_1 = newTerms; _b < newTerms_1.length; _b++) {
                            term = newTerms_1[_b];
                            _loop_1(term);
                        }
                        // 語彙を永続化
                        return [4 /*yield*/, this.saveVocabulary()];
                    case 1:
                        // 語彙を永続化
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 語彙をファイルから読み込み
     */
    LocalEmbeddingService.prototype.loadVocabulary = function () {
        return __awaiter(this, void 0, void 0, function () {
            var vocabPath, data, vocabData, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        vocabPath = path.join(process.cwd(), 'vocabulary.json');
                        return [4 /*yield*/, fs.readFile(vocabPath, 'utf-8')];
                    case 1:
                        data = _a.sent();
                        vocabData = JSON.parse(data);
                        this.vocabulary = new Map(vocabData.vocabulary);
                        this.idfScores = new Map(vocabData.idfScores);
                        this.documentCount = vocabData.documentCount || 0;
                        console.log("\u8A9E\u5F59\u8AAD\u307F\u8FBC\u307F\u5B8C\u4E86: ".concat(this.vocabulary.size, "\u8A9E"));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.log('語彙ファイルが見つかりません。新規作成します。');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 語彙をファイルに保存
     */
    LocalEmbeddingService.prototype.saveVocabulary = function () {
        return __awaiter(this, void 0, void 0, function () {
            var vocabPath, vocabData, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        vocabPath = path.join(process.cwd(), 'vocabulary.json');
                        vocabData = {
                            vocabulary: Array.from(this.vocabulary.entries()),
                            idfScores: Array.from(this.idfScores.entries()),
                            documentCount: this.documentCount,
                            lastUpdated: new Date().toISOString()
                        };
                        return [4 /*yield*/, fs.writeFile(vocabPath, JSON.stringify(vocabData, null, 2))];
                    case 1:
                        _a.sent();
                        console.log('語彙保存完了');
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        console.error('語彙保存エラー:', error_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 語彙統計情報を取得
     */
    LocalEmbeddingService.prototype.getVocabularyStats = function () {
        var idfValues = Array.from(this.idfScores.values());
        var avgIdf = idfValues.length > 0
            ? idfValues.reduce(function (sum, val) { return sum + val; }, 0) / idfValues.length
            : 0;
        return {
            vocabularySize: this.vocabulary.size,
            documentCount: this.documentCount,
            avgIdfScore: avgIdf
        };
    };
    return LocalEmbeddingService;
}());
exports.LocalEmbeddingService = LocalEmbeddingService;
/**
 * より高精度な埋め込みが必要な場合の代替案
 */
var EnhancedLocalEmbeddingService = /** @class */ (function (_super) {
    __extends(EnhancedLocalEmbeddingService, _super);
    function EnhancedLocalEmbeddingService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * N-gram特徴量を追加したベクトル生成
     */
    EnhancedLocalEmbeddingService.prototype.textToEmbedding = function (text) {
        var tokens = this.tokenize(text);
        // ユニグラム（1-gram）
        var unigrams = tokens;
        // バイグラム（2-gram）
        var bigrams = [];
        for (var i = 0; i < tokens.length - 1; i++) {
            bigrams.push("".concat(tokens[i], "_").concat(tokens[i + 1]));
        }
        // 全特徴量を結合
        var allFeatures = __spreadArray(__spreadArray([], unigrams, true), bigrams, true);
        var termFrequency = this.calculateTermFrequency(allFeatures);
        // TF-IDF計算
        var embedding = [];
        var vocabularyArray = Array.from(this.vocabulary.keys()).sort();
        for (var _i = 0, vocabularyArray_2 = vocabularyArray; _i < vocabularyArray_2.length; _i++) {
            var term = vocabularyArray_2[_i];
            var tf = termFrequency.get(term) || 0;
            var idf = this.idfScores.get(term) || 0;
            embedding.push(tf * idf);
        }
        return this.normalizeVector(embedding);
    };
    /**
     * 改良されたトークン化（日本語形態素解析風）
     */
    EnhancedLocalEmbeddingService.prototype.tokenize = function (text) {
        // ひらがな・カタカナ・漢字の処理を改善
        var processed = text
            .toLowerCase()
            .replace(/[。、！？]/g, ' ') // 日本語句読点を空白に
            .replace(/\s+/g, ' ') // 連続空白を1つに
            .trim();
        // 日本語文字とアルファベットを分離
        var tokens = [];
        var currentToken = '';
        var currentType = null;
        for (var _i = 0, processed_1 = processed; _i < processed_1.length; _i++) {
            var char = processed_1[_i];
            var charType = null;
            if (/[\u3040-\u309F]/.test(char))
                charType = 'hiragana';
            else if (/[\u30A0-\u30FF]/.test(char))
                charType = 'katakana';
            else if (/[\u4E00-\u9FAF]/.test(char))
                charType = 'kanji';
            else if (/[a-zA-Z0-9]/.test(char))
                charType = 'latin';
            if (charType === currentType && charType !== null) {
                currentToken += char;
            }
            else {
                if (currentToken.length > 0) {
                    tokens.push(currentToken);
                }
                currentToken = char;
                currentType = charType;
            }
        }
        if (currentToken.length > 0) {
            tokens.push(currentToken);
        }
        return tokens.filter(function (token) { return token.length > 0 && !/^\s+$/.test(token); });
    };
    return EnhancedLocalEmbeddingService;
}(LocalEmbeddingService));
exports.EnhancedLocalEmbeddingService = EnhancedLocalEmbeddingService;
