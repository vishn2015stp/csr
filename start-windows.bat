@echo off
echo ========================================================
echo Starting Hyper-CSR with Backend on Windows...
echo ========================================================

echo [1/4] Installing frontend dependencies...
call npm install

echo [2/4] Installing backend dependencies...
cd server
call npm install
cd ..

echo [3/4] Building the production application...
call npm run build

echo [4/4] Starting the servers...
echo Server running on http://0.0.0.0:3001
echo You can access this application from any device on your local network!

start "Hyper-CSR App" cmd /k "cd server && node server.js"
