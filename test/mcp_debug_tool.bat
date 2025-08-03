@echo off
setlocal enabledelayedexpansion

:: 文字化け対策: UTF-8コードページに設定
chcp 65001 >nul

:: =============================================================================
:: Excel MCP Server デバッグツール
:: =============================================================================
:: 本バッチファイルはMCPサーバーのデバッグを支援します
:: 可読性とメンテナンス性を重視した実装
:: =============================================================================

title Excel MCP Server Debug Tool
color 0A

:: カレントディレクトリの絶対パスを取得
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"
set "CURRENT_DIR=%CURRENT_DIR:\=/%"

:: チェック用ファイルパスの定義
set "TEST_WORKBOOK=%CURRENT_DIR%/output/integration_test.xlsx"
set "TEST_CSV_EXPORT=%CURRENT_DIR%/output/integration_test_export.csv"
set "TOOL_TEST_WORKBOOK=%CURRENT_DIR%/output/tool_test.xlsx"
set "TOOL_TEST_CSV=%CURRENT_DIR%/output/exported_data.csv"

:: 一時ディレクトリの確保
if not exist "d:\temp" mkdir "d:\temp"

echo.
echo ===============================================================================
echo                    Excel MCP Server Debug Tool
echo ===============================================================================
echo.

:MAIN_MENU
echo [利用可能なデバッグオプション]
echo.
echo  [1] ツール一覧の取得 (tools/list)
echo  [2] サーバー状態確認
echo  [3] 基本機能テスト (initialize + tools/list)
echo  [4] 統合テスト (全APIの動作確認)
echo  [5] 個別ツールテスト (各ツールのJSONRPC確認)
echo  [6] カスタムJSONRPCリクエスト送信
echo  [7] ログ出力モード
echo  [8] サーバービルド実行
echo  [9] 終了
echo.
set /p CHOICE="選択してください (1-9): "

if "!CHOICE!"=="1" goto :TOOLS_LIST
if "!CHOICE!"=="2" goto :SERVER_STATUS
if "!CHOICE!"=="3" goto :BASIC_TEST
if "!CHOICE!"=="4" goto :INTEGRATION_TEST
if "!CHOICE!"=="5" goto :INDIVIDUAL_TEST
if "!CHOICE!"=="6" goto :CUSTOM_REQUEST
if "!CHOICE!"=="7" goto :LOG_MODE
if "!CHOICE!"=="8" goto :BUILD_SERVER
if "!CHOICE!"=="9" goto :EXIT
goto :INVALID_CHOICE

:: =============================================================================
:: [1] ツール一覧の取得
:: =============================================================================
:TOOLS_LIST
echo.
echo [*] MCPサーバーからツール一覧を取得しています...
echo.
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
echo.
echo [<] レスポンス:
echo {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}} | npm run start
echo.
goto :CONTINUE

:: =============================================================================
:: [2] サーバー状態確認
:: =============================================================================
:SERVER_STATUS
echo.
echo [*] MCPサーバーの状態を確認しています...
echo.
npm run server:status
echo.
goto :CONTINUE

:: =============================================================================
:: [3] 基本機能テスト実行
:: =============================================================================
:BASIC_TEST
echo.
echo [*] 基本機能テスト: サーバー初期化とツール一覧取得
echo.
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}
echo.
echo [<] 初期化レスポンス:
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}} | npm run start
echo.
echo 📡 続いてツール一覧を取得:
echo {"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
echo.
echo [<] ツール一覧レスポンス:
echo {"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}} | npm run start
echo.
goto :CONTINUE

:: =============================================================================
:: [4] 統合テスト - 全APIの動作確認
:: =============================================================================
:INTEGRATION_TEST
echo.
echo [*] 統合テスト: 全Excel MCP APIの動作確認
echo ===============================================================================
echo.

echo 📝 Step 1: ワークブック作成 (create_workbook)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"create_workbook","arguments":{"filePath":"!TEST_WORKBOOK!"}}}
echo.
echo {"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"create_workbook","arguments":{"filePath":"!TEST_WORKBOOK!"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 2: ワークブック情報取得 (get_workbook_info)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"get_workbook_info","arguments":{"filePath":"!TEST_WORKBOOK!"}}}
echo.
echo {"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"get_workbook_info","arguments":{"filePath":"!TEST_WORKBOOK!"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 3: ワークシート追加 (add_worksheet)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"add_worksheet","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet"}}}
echo.
echo {"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"add_worksheet","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 4: セル値設定 (set_cell_value)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":13,"method":"tools/call","params":{"name":"set_cell_value","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","value":"統合テストデータ"}}}
echo.
echo {"jsonrpc":"2.0","id":13,"method":"tools/call","params":{"name":"set_cell_value","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","value":"統合テストデータ"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 5: セル値取得 (get_cell_value)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":14,"method":"tools/call","params":{"name":"get_cell_value","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1"}}}
echo.
echo {"jsonrpc":"2.0","id":14,"method":"tools/call","params":{"name":"get_cell_value","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 6: 範囲データ設定 (set_range_values)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":15,"method":"tools/call","params":{"name":"set_range_values","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","startCell":"B1","values":[["商品名","価格","在庫"],["商品A",1000,50],["商品B",1500,30],["商品C",800,100]]}}}
echo.
echo {"jsonrpc":"2.0","id":15,"method":"tools/call","params":{"name":"set_range_values","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","startCell":"B1","values":[["商品名","価格","在庫"],["商品A",1000,50],["商品B",1500,30],["商品C",800,100]]}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 7: 範囲データ取得 (get_range_values)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":16,"method":"tools/call","params":{"name":"get_range_values","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","range":"B1:D4"}}}
echo.
echo {"jsonrpc":"2.0","id":16,"method":"tools/call","params":{"name":"get_range_values","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","range":"B1:D4"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 8: 数式追加 (add_formula)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":17,"method":"tools/call","params":{"name":"add_formula","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"E1","formula":"=SUM(C2:C4)"}}}
echo.
echo {"jsonrpc":"2.0","id":17,"method":"tools/call","params":{"name":"add_formula","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"E1","formula":"=SUM(C2:C4)"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 9: セル書式設定 (format_cell)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":18,"method":"tools/call","params":{"name":"format_cell","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","format":{"font":{"bold":true,"color":"FF0000FF","size":14},"fill":{"type":"pattern","pattern":"solid","fgColor":"FFFFFF00"}}}}}
echo.
echo {"jsonrpc":"2.0","id":18,"method":"tools/call","params":{"name":"format_cell","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","format":{"font":{"bold":true,"color":"FF0000FF","size":14},"fill":{"type":"pattern","pattern":"solid","fgColor":"FFFFFF00"}}}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 10: データ検索 (find_data)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":19,"method":"tools/call","params":{"name":"find_data","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","searchValue":"商品A"}}}
echo.
echo {"jsonrpc":"2.0","id":19,"method":"tools/call","params":{"name":"find_data","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","searchValue":"商品A"}}} | npm run start
echo.
echo -------------------------------------------------------------------------------

echo 📝 Step 11: CSV出力 (export_to_csv)
echo 📡 JSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":20,"method":"tools/call","params":{"name":"export_to_csv","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","csvPath":"!TEST_CSV_EXPORT!"}}}
echo.
echo {"jsonrpc":"2.0","id":20,"method":"tools/call","params":{"name":"export_to_csv","arguments":{"filePath":"!TEST_WORKBOOK!","sheetName":"TestSheet","csvPath":"!TEST_CSV_EXPORT!"}}} | npm run start
echo.
echo ===============================================================================
echo [OK] 統合テスト完了: 全11個のAPIをテストしました
echo.
goto :CONTINUE

:: =============================================================================
:: [5] 個別ツールテスト実行
:: =============================================================================
:INDIVIDUAL_TEST
echo.
echo [*] 個別ツールテスト: 各ツールの個別動作確認
echo.
echo [*] 以下から選択してテストしてください:
echo.
echo   [a] create_workbook - ワークブック作成
echo   [b] add_worksheet - ワークシート追加  
echo   [c] set_cell_value - セル値設定
echo   [d] get_cell_value - セル値取得
echo   [e] set_range_values - 範囲データ設定
echo   [f] get_range_values - 範囲データ取得
echo   [g] add_formula - 数式追加
echo   [h] format_cell - セル書式設定
echo   [i] find_data - データ検索
echo   [j] export_to_csv - CSV出力
echo   [k] 戻る
echo.
set /p TOOL_CHOICE="テストするツールを選択してください (a-k): "

if /i "!TOOL_CHOICE!"=="a" goto :TEST_CREATE_WORKBOOK
if /i "!TOOL_CHOICE!"=="b" goto :TEST_ADD_WORKSHEET
if /i "!TOOL_CHOICE!"=="c" goto :TEST_SET_CELL_VALUE
if /i "!TOOL_CHOICE!"=="d" goto :TEST_GET_CELL_VALUE
if /i "!TOOL_CHOICE!"=="e" goto :TEST_SET_RANGE_VALUES
if /i "!TOOL_CHOICE!"=="f" goto :TEST_GET_RANGE_VALUES
if /i "!TOOL_CHOICE!"=="g" goto :TEST_ADD_FORMULA
if /i "!TOOL_CHOICE!"=="h" goto :TEST_FORMAT_CELL
if /i "!TOOL_CHOICE!"=="i" goto :TEST_FIND_DATA
if /i "!TOOL_CHOICE!"=="j" goto :TEST_EXPORT_CSV
if /i "!TOOL_CHOICE!"=="k" goto :CONTINUE
echo [ERROR] 無効な選択肢です
timeout /t 2 >nul
goto :INDIVIDUAL_TEST

:TEST_CREATE_WORKBOOK
echo.
echo [*] create_workbook テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":30,"method":"tools/call","params":{"name":"create_workbook","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!"}}}
echo.
echo {"jsonrpc":"2.0","id":30,"method":"tools/call","params":{"name":"create_workbook","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_ADD_WORKSHEET
echo.
echo 📝 add_worksheet テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":31,"method":"tools/call","params":{"name":"add_worksheet","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet"}}}
echo.
echo {"jsonrpc":"2.0","id":31,"method":"tools/call","params":{"name":"add_worksheet","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_SET_CELL_VALUE
echo.
echo 📝 set_cell_value テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":32,"method":"tools/call","params":{"name":"set_cell_value","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","value":"Hello World"}}}
echo.
echo {"jsonrpc":"2.0","id":32,"method":"tools/call","params":{"name":"set_cell_value","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","value":"Hello World"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_GET_CELL_VALUE
echo.
echo 📝 get_cell_value テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":33,"method":"tools/call","params":{"name":"get_cell_value","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1"}}}
echo.
echo {"jsonrpc":"2.0","id":33,"method":"tools/call","params":{"name":"get_cell_value","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_SET_RANGE_VALUES
echo.
echo 📝 set_range_values テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":34,"method":"tools/call","params":{"name":"set_range_values","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","startCell":"B1","values":[["名前","年齢"],["田中",25],["佐藤",30]]}}}
echo.
echo {"jsonrpc":"2.0","id":34,"method":"tools/call","params":{"name":"set_range_values","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","startCell":"B1","values":[["名前","年齢"],["田中",25],["佐藤",30]]}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_GET_RANGE_VALUES
echo.
echo 📝 get_range_values テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":35,"method":"tools/call","params":{"name":"get_range_values","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","range":"B1:C3"}}}
echo.
echo {"jsonrpc":"2.0","id":35,"method":"tools/call","params":{"name":"get_range_values","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","range":"B1:C3"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_ADD_FORMULA
echo.
echo 📝 add_formula テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":36,"method":"tools/call","params":{"name":"add_formula","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"D1","formula":"=SUM(C2:C3)"}}}
echo.
echo {"jsonrpc":"2.0","id":36,"method":"tools/call","params":{"name":"add_formula","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"D1","formula":"=SUM(C2:C3)"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_FORMAT_CELL
echo.
echo 📝 format_cell テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":37,"method":"tools/call","params":{"name":"format_cell","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","format":{"font":{"bold":true,"color":"FF0000FF"}}}}}
echo.
echo {"jsonrpc":"2.0","id":37,"method":"tools/call","params":{"name":"format_cell","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","cell":"A1","format":{"font":{"bold":true,"color":"FF0000FF"}}}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_FIND_DATA
echo.
echo 📝 find_data テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":38,"method":"tools/call","params":{"name":"find_data","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","searchValue":"田中"}}}
echo.
echo {"jsonrpc":"2.0","id":38,"method":"tools/call","params":{"name":"find_data","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","searchValue":"田中"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:TEST_EXPORT_CSV
echo.
echo 📝 export_to_csv テスト
echo 📡 送信するJSONRPCリクエスト:
echo {"jsonrpc":"2.0","id":39,"method":"tools/call","params":{"name":"export_to_csv","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","csvPath":"!TOOL_TEST_CSV!"}}}
echo.
echo {"jsonrpc":"2.0","id":39,"method":"tools/call","params":{"name":"export_to_csv","arguments":{"filePath":"!TOOL_TEST_WORKBOOK!","sheetName":"TestSheet","csvPath":"!TOOL_TEST_CSV!"}}} | npm run start
echo.
goto :INDIVIDUAL_TEST

:: =============================================================================
:: [6] カスタムJSONRPCリクエスト送信
:: =============================================================================
:CUSTOM_REQUEST
echo.
echo [*] カスタムJSONRPCリクエストを送信します
echo.
echo [例] 使用例:
echo    {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_workbook","arguments":{"filePath":"C:/temp/test.xlsx"}}}
echo.
set /p JSON_REQUEST="JSONRPCリクエストを入力してください: "
echo.
echo 📡 送信中...
echo !JSON_REQUEST! | npm run start
echo.
goto :CONTINUE

:: =============================================================================
:: [7] ログ出力モード
:: =============================================================================
:LOG_MODE
echo.
echo [*] ログ出力モードでMCPサーバーを起動します
echo    (Ctrl+C で終了)
echo.
npm run dev
echo.
goto :CONTINUE

:: =============================================================================
:: [8] サーバービルド実行
:: =============================================================================
:BUILD_SERVER
echo.
echo [*] TypeScriptファイルをビルドしています...
echo.
npm run build
if !ERRORLEVEL! EQU 0 (
    echo [OK] ビルド成功
) else (
    echo [ERROR] ビルド失敗
)
echo.
goto :CONTINUE

:: =============================================================================
:: 継続確認
:: =============================================================================
:CONTINUE
echo.
echo -------------------------------------------------------------------------------
set /p CONTINUE_CHOICE="メニューに戻りますか？ (Y/N): "
if /i "!CONTINUE_CHOICE!"=="Y" (
    cls
    goto :MAIN_MENU
)
if /i "!CONTINUE_CHOICE!"=="N" goto :EXIT
goto :CONTINUE

:: =============================================================================
:: 無効な選択肢
:: =============================================================================
:INVALID_CHOICE
echo.
echo [ERROR] 無効な選択肢です。1-9の数字を入力してください。
echo.
timeout /t 2 >nul
goto :MAIN_MENU

:: =============================================================================
:: 終了処理
:: =============================================================================
:EXIT
echo.
echo [*] Excel MCP Server Debug Tool を終了します
echo.
timeout /t 1 >nul
exit /b 0