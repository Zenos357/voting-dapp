@echo off
title Voting DApp Auto-Launcher
color 0b
echo ===================================================
echo    STARTING FULL-STACK HYBRID VOTING PROTOCOL
echo ===================================================
echo.

:: 1. Launch Hardhat Local Node in a new window
echo [1/4] Starting Hardhat Ethereum Node (Port 8545)...
start "Hardhat Blockchain Node" cmd /k "npx hardhat node"

:: Wait 5 seconds for the RPC node to become active
timeout /t 5 /nobreak >nul

:: 2. Auto-deploy the contract & seed blockchain
echo [2/4] Deploying Voting Contract to Localhost...
call npx hardhat run scripts/deploy.ts --network localhost

:: 3. Launch Backend API in a new window
echo [3/4] Starting Node.js / MongoDB API (Port 5000)...
start "Voting Backend API" cmd /k "cd backend && npx tsx src/server.ts"

:: 4. Launch Vite Frontend in a new window & open browser
echo [4/4] Starting React Frontend (Port 5173)...
start "Voting Frontend UI" cmd /k "cd frontend && npm run dev"

:: Wait 3 seconds then launch browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ===================================================
echo    ALL SYSTEMS OPERATIONAL // READY FOR DEMO
echo ===================================================
pause