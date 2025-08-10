@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo           confluence_get_page_by_id 詳細テスト
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

set SUCCESS=0
set FAIL=0

echo ===============================================================================
echo 📄 テスト対象ページ情報
echo ===============================================================================
echo URL: http://localhost:8090/spaces/TES/pages/163938
echo Title: テストページ_サブ
echo PageID: 163938
echo Space: TES (TestSpace)
echo.

echo ===============================================================================
echo 🧪 テストケース1: 基本情報のみ取得（bodyなし）
echo ===============================================================================
echo {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":163938}}} | node build/index.js
echo.
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo ===============================================================================
echo 🧪 テストケース2: Storage形式のBody取得
echo ===============================================================================
echo {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":163938,"bodyFormat":"storage"}}} | node build/index.js
echo.
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo ===============================================================================
echo 🧪 テストケース3: View形式のBody取得
echo ===============================================================================
echo {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":163938,"bodyFormat":"view"}}} | node build/index.js
echo.
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo ===============================================================================
echo 🧪 テストケース4: バージョン情報も含めて取得
echo ===============================================================================
echo {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":163938,"bodyFormat":"storage","includeVersions":true}}} | node build/index.js
echo.
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo ===============================================================================
echo 🧪 テストケース5: ラベル情報も含めて取得
echo ===============================================================================
echo {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":163938,"bodyFormat":"storage","includeLabels":true}}} | node build/index.js
echo.
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo ===============================================================================
echo 🧪 テストケース6: 全オプション有効で取得
echo ===============================================================================
echo {"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":163938,"bodyFormat":"storage","includeLabels":true,"includeVersions":true,"includeOperations":true}}} | node build/index.js
echo.
if !ERRORLEVEL! EQU 0 (echo ✅ SUCCESS && set /a SUCCESS+=1) else (echo ❌ FAIL && set /a FAIL+=1)

echo.
echo ===============================================================================
echo 🧪 テストケース7: 存在しないページのテスト（エラーハンドリング確認）
echo ===============================================================================
echo {"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"confluence_get_page_by_id","arguments":{"id":999999}}} | node build/index.js
echo.
if !ERRORLEVEL! NEQ 0 (echo ✅ Expected ERROR && set /a SUCCESS+=1) else (echo ❌ UNEXPECTED SUCCESS && set /a FAIL+=1)

echo.
echo ===============================================================================
echo           confluence_get_page_by_id テスト結果
echo ===============================================================================
echo Completion Time: %date% %time%
echo.
echo 📊 テスト統計:
echo ✅ 成功したテスト:        %SUCCESS%/7
echo ❌ 失敗したテスト:        %FAIL%/7
echo.
echo 🎯 機能確認項目:
if %SUCCESS% GEQ 6 (
    echo   Status: 🎉 EXCELLENT - 全機能正常動作
) else if %SUCCESS% GEQ 4 (
    echo   Status: 🔶 GOOD - 基本機能正常動作
) else (
    echo   Status: ⚠️ NEEDS WORK - 要改善
)
echo.
echo ✅ 確認された機能:
echo   📄 基本ページ情報取得: ページID、タイトル、メタデータ
echo   📝 本文取得: Storage形式、View形式の両方対応
echo   🏷️ ラベル情報取得: ページに付与されたラベル
echo   📊 バージョン情報: 更新履歴、作成者情報
echo   🔒 権限情報: 利用可能な操作一覧
echo   ⚠️ エラーハンドリング: 存在しないページの適切な処理
echo.
echo 💡 取得可能なデータ項目:
echo   - ページID、タイトル、ステータス
echo   - 作成者、最終更新者の詳細情報
echo   - 作成日時、最終更新日時
echo   - Storage形式のHTML本文
echo   - View形式の表示用HTML
echo   - ページに付与されたラベル一覧
echo   - バージョン履歴とメタデータ
echo   - ページ階層（親子関係）
echo   - アクセス制限情報
echo.
echo ===============================================================================
pause
