@echo off
setlocal enabledelayedexpansion

echo ================================================
echo Confluence Vector Database Builder
echo ================================================
echo.

if "%~1"=="" (
    echo Usage: build-vectors.bat ^<SPACE_KEY^> [OUTPUT_FILE]
    echo.
    echo Examples:
    echo   build-vectors.bat PROJ
    echo   build-vectors.bat PROJ ../vectors/proj-vectors.json
    echo.
    echo Environment Variables Required:
    echo   DataCenter/Server版 ^(Basic認証^):
    echo     CONFLUENCE_DOMAIN     - Confluence domain ^(例: server.com:8090^)
    echo     CONFLUENCE_USERNAME   - Username
    echo     CONFLUENCE_PASSWORD   - Password  
    echo     CONFLUENCE_AUTH_TYPE  - 'basic' ^(default^)
    echo.
    echo   Cloud版 ^(Token認証^):
    echo     CONFLUENCE_DOMAIN     - Confluence domain ^(例: company.atlassian.net^)
    echo     CONFLUENCE_EMAIL      - User email
    echo     CONFLUENCE_API_TOKEN  - API token
    echo     CONFLUENCE_AUTH_TYPE  - 'token'
    echo.
    echo Current Environment Variables:
    echo   CONFLUENCE_DOMAIN=%CONFLUENCE_DOMAIN%
    echo   CONFLUENCE_USERNAME=%CONFLUENCE_USERNAME%
    echo   CONFLUENCE_AUTH_TYPE=%CONFLUENCE_AUTH_TYPE%
    echo.
    goto :eof
)

set SPACE_KEY=%~1
set OUTPUT_FILE=%~2

if "%OUTPUT_FILE%"=="" (
    set OUTPUT_FILE=../vectors/%SPACE_KEY%-vectors.json
)

echo Space Key: %SPACE_KEY%
echo Output File: %OUTPUT_FILE%
echo Current Environment:
echo   CONFLUENCE_DOMAIN=%CONFLUENCE_DOMAIN%
echo   CONFLUENCE_USERNAME=%CONFLUENCE_USERNAME%
echo   CONFLUENCE_AUTH_TYPE=%CONFLUENCE_AUTH_TYPE%
echo.

REM Check if TypeScript needs to be compiled
if not exist "dist\tools\vector-builder.js" (
    echo Compiling TypeScript...
    npx tsc
    if errorlevel 1 (
        echo ❌ Compilation failed!
        pause
        goto :eof
    )
    echo ✅ TypeScript compilation completed.
    echo.
)

echo Starting vector database creation...
node dist/tools/vector-builder.js "%SPACE_KEY%" "%OUTPUT_FILE%"
set BUILD_EXIT_CODE=%errorlevel%

if %BUILD_EXIT_CODE% neq 0 (
    echo.
    echo ❌ Vector database creation failed! ^(Exit code: %BUILD_EXIT_CODE%^)
    echo.
    echo 考えられる原因:
    echo - 環境変数が正しく設定されていない
    echo - Confluenceサーバーに接続できない
    echo - スペースキー '%SPACE_KEY%' が存在しない、またはアクセス権限がない
    echo - 認証情報が間違っている
    echo.
    echo 現在の環境変数:
    echo   CONFLUENCE_DOMAIN=%CONFLUENCE_DOMAIN%
    echo   CONFLUENCE_USERNAME=%CONFLUENCE_USERNAME%
    echo   CONFLUENCE_AUTH_TYPE=%CONFLUENCE_AUTH_TYPE%
    echo.
    echo 解決方法:
    echo 1. .env ファイルを確認・編集
    echo 2. Confluenceサーバーが稼働中か確認 ^(http://%CONFLUENCE_DOMAIN%/^)
    echo 3. ユーザー名・パスワードの確認
    echo 4. スペースキーとアクセス権限の確認: '%SPACE_KEY%'
) else (
    echo.
    echo ✅ Vector database created successfully: %OUTPUT_FILE%
)

pause