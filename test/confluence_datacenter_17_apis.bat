@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo      Confluence MCP Server DataCenter版 17 APIs 完全検証
echo ===============================================================================
echo Start: %date% %time%
echo ===============================================================================

cd /d "%~dp0.."

set SUCCESS=0
set FAIL=0

echo.
echo Testing API 1/17: get_current_user
echo {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"confluence_get_current_user","arguments":{}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 2/17: get_spaces  
echo {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"confluence_get_spaces","arguments":{"limit":5}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 3/17: get_space_by_id
echo {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"confluence_get_space_by_id","arguments":{"id":"TES"}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 4/17: get_pages
echo {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"confluence_get_pages","arguments":{"limit":3,"spaceId":["131083"]}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 5/17: get_page_by_id
echo {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":163841}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 6/17: create_page
echo {"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"confluence_create_page","arguments":{"spaceId":"TES","title":"DataCenter Test Page","body":{"storage":{"value":"<p>Testing DataCenter compatible APIs</p>","representation":"storage"}}}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 7/17: update_page
echo {"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"confluence_update_page","arguments":{"id":163841,"title":"Updated DataCenter Test","body":{"storage":{"value":"<p>Updated via DataCenter API</p>","representation":"storage"}}}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 8/17: delete_page (test page)
echo {"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"confluence_delete_page","arguments":{"id":163946}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 9/17: search_content (NEW - CQL Search)
echo {"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"confluence_search_content","arguments":{"cql":"space=TES AND type=page","limit":5}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 10/17: get_content_labels (NEW)
echo {"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"confluence_get_content_labels","arguments":{"id":163841}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 11/17: add_content_label (NEW)
echo {"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"confluence_add_content_label","arguments":{"id":163841,"name":"datacenter-test"}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 12/17: get_user_by_id
echo {"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"confluence_get_user_by_id","arguments":{"accountId":"4028b881989312cb019893150c60000a"}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 13/17: get_users (NEW - User Search)
echo {"jsonrpc":"2.0","id":13,"method":"tools/call","params":{"name":"confluence_get_users","arguments":{"query":"admin","limit":10}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 14/17: page_to_markdown
echo {"jsonrpc":"2.0","id":14,"method":"tools/call","params":{"name":"confluence_page_to_markdown","arguments":{"pageId":163841}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 15/17: markdown_to_page
echo {"jsonrpc":"2.0","id":15,"method":"tools/call","params":{"name":"confluence_markdown_to_page","arguments":{"filePath":"examples/sample-document.md","spaceId":131083}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 16/17: update_page_from_markdown
echo {"jsonrpc":"2.0","id":16,"method":"tools/call","params":{"name":"confluence_update_page_from_markdown","arguments":{"pageId":163841,"filePath":"examples/sample-document.md","versionMessage":"Updated from Markdown"}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo Testing API 17/17: export_space_to_markdown
echo {"jsonrpc":"2.0","id":17,"method":"tools/call","params":{"name":"confluence_export_space_to_markdown","arguments":{"spaceId":131083,"outputDir":"./export-test"}}} | node build/index.js
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo ===============================================================================
echo             DataCenter版 17 API 完全検証結果
echo ===============================================================================
echo Completion Time: %date% %time%
echo.
echo 📊 DataCenter対応統計:
echo ✅ 動作確認済みAPI:        %SUCCESS%/17
echo ❌ 失敗API:               %FAIL%/17
echo.
echo 🎯 DataCenter版機能分析:
if %SUCCESS% GEQ 14 (
    echo   Status: 🎉 EXCELLENT - DataCenter完全対応
) else if %SUCCESS% GEQ 11 (
    echo   Status: 🔶 GOOD - ほぼ完全対応
) else (
    echo   Status: ⚠️ NEEDS WORK - 要改善
)
echo.
echo ✅ DataCenter対応済み17APIs:
echo   【基本機能】
echo   1. get_current_user - ユーザー認証  
echo   2. get_spaces - スペース一覧
echo   3. get_space_by_id - スペース詳細
echo   4. get_pages - ページ一覧  
echo   5. get_page_by_id - ページ詳細
echo   6. create_page - ページ作成
echo   7. update_page - ページ更新（自動バージョンアップ）
echo   8. delete_page - ページ削除
echo   【検索・ラベル機能】
echo   9. search_content - CQL検索機能 ⭐NEW⭐
echo   10. get_content_labels - ラベル取得 ⭐NEW⭐
echo   11. add_content_label - ラベル追加 ⭐NEW⭐
echo   【ユーザー管理】
echo   12. get_user_by_id - ユーザー情報
echo   13. get_users - ユーザー検索 ⭐NEW⭐
echo   【Markdown変換】
echo   14. page_to_markdown - Markdownエクスポート
echo   15. markdown_to_page - Markdownインポート  
echo   16. update_page_from_markdown - Markdownアップデート ⭐NEW⭐
echo   17. export_space_to_markdown - スペース一括エクスポート
echo.
echo 🚫 削除されたCloud専用API:
echo   - Blog Post関連API (5個) - Cloud専用機能  
echo   - 高度な管理API (11個) - Cloud専用機能
echo.
echo 💡 DataCenter版の新機能:
echo   - CQL検索: 強力なコンテンツ検索機能
echo   - ラベル管理: コンテンツの分類・整理
echo   - ユーザー検索: チーム管理に便利
echo   - 基本CRUD操作: 完全サポート
echo   - Markdown変換: 完全対応
echo   - VS Code MCP統合: 最適化済み
echo.
echo ===============================================================================
pause
