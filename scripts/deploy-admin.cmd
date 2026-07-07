@echo off
REM Halolmia Admin Panel Deployment Script (Windows)
REM Usage: scripts\deploy-admin.cmd [vercel|netlify|build]

echo 🚀 Halolmia Admin Panel Deployment
echo ==================================

set DEPLOY_TYPE=%1
if "%DEPLOY_TYPE%"=="" set DEPLOY_TYPE=vercel

if "%DEPLOY_TYPE%"=="vercel" goto vercel
if "%DEPLOY_TYPE%"=="netlify" goto netlify
if "%DEPLOY_TYPE%"=="build" goto build
goto unknown

:vercel
echo 📦 Deploying to Vercel...

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vercel CLI not found. Installing...
    call npm install -g vercel
)

echo 🔨 Building and deploying...
call vercel --prod

echo ✅ Deployment complete!
echo Don't forget to set NEXT_PUBLIC_CONVEX_URL in Vercel dashboard
goto end

:netlify
echo 📦 Deploying to Netlify...

REM Check if netlify CLI is installed
where netlify >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Netlify CLI not found. Installing...
    call npm install -g netlify-cli
)

echo 🔨 Building admin panel...
call npm run build -w @halolmia/admin

echo 📤 Deploying...
cd apps\admin
call netlify deploy --prod --dir=.next

echo ✅ Deployment complete!
echo Don't forget to set NEXT_PUBLIC_CONVEX_URL in Netlify dashboard
goto end

:build
echo 🔨 Building admin panel for manual deployment...
call npm install
call npm run build -w @halolmia/admin

echo ✅ Build complete!
echo 📁 Build output: apps\admin\.next\
echo Upload this folder to your hosting provider
goto end

:unknown
echo ❌ Unknown deployment type: %DEPLOY_TYPE%
echo Usage: scripts\deploy-admin.cmd [vercel|netlify|build]
exit /b 1

:end
echo.
echo 🎉 Done!
