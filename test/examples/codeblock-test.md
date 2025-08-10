# コードブロック対応テスト

## 概要
これはMarkdown to Confluenceのコードブロック変換をテストするためのページです。

## Dockerコマンドの例

Ubuntuコンテナを開始して、bashでアクセスするコマンドです：

```bash
docker start ubuntu24_04
docker exec -it ubuntu24_04 /bin/bash
```

## Python コードの例

```python
def hello_world():
    print("Hello, Confluence!")
    return "success"

# 関数呼び出し
result = hello_world()
```

## JavaScript コードの例

```javascript
function greetUser(name) {
    console.log(`Hello, ${name}!`);
    return `Welcome ${name}`;
}

// 関数の実行
const message = greetUser("MCP Server");
```

## 言語指定なしのコードブロック

```
echo "このコードブロックには言語指定がありません"
ls -la
pwd
```

## まとめ

このテストファイルには以下のコードブロックが含まれています：
- Bashコマンド
- Pythonコード  
- JavaScriptコード
- 言語指定なしのコード

すべてのコードブロックが正しくConfluenceのマクロ形式に変換されることを確認します。
