@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo           confluence_markdown_to_page コードブロック対応テスト
echo ===============================================================================
echo Start: %date% %time%
echo ===============================================================================

cd /d "%~dp0.."

REM 🔐 Confluence DataCenter認証情報の設定
echo 🔐 Setting Confluence DataCenter authentication...
set CONFLUENCE_DOMAIN=localhost:8090
set CONFLUENCE_AUTH_TYPE=basic
set CONFLUENCE_USERNAME=kosuke
set CONFLUENCE_PASSWORD=Ksk0112010602030

echo ✅ Authentication configured for %CONFLUENCE_DOMAIN%
echo.

echo ===============================================================================
echo 📄 コードブロック対応テスト実行
echo ===============================================================================
echo Testing File: examples/codeblock-test.md
echo Space: TES (ID: 131083)
echo Expected: Confluence structured-macro format for code blocks
echo.

echo {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"confluence_markdown_to_page","arguments":{"filePath":"test/examples/codeblock-test.md","spaceId":131083}}} | node build/index.js

echo.
echo ===============================================================================
echo 🔍 結果の確認
echo ===============================================================================
echo 作成されたページで以下を確認してください:
echo 1. Bashコマンドが code マクロで正しく表示されている
echo 2. Pythonコードが適切にハイライトされている  
echo 3. JavaScriptコードが適切にハイライトされている
echo 4. 言語指定なしコードも正しく表示されている
echo.

echo 💡 期待される HTML 形式:
echo ^<ac:structured-macro ac:name="code" ac:schema-version="1" ac:macro-id="..."^>
echo   ^<ac:parameter ac:name="language"^>bash^</ac:parameter^>
echo   ^<ac:plain-text-body^>^<![CDATA[docker start ubuntu24_04\ndocker exec -it ubuntu24_04 /bin/bash]]^>^</ac:plain-text-body^>
echo ^</ac:structured-macro^>
echo.

echo ===============================================================================
pause
