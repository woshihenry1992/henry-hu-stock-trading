# 🚀 Stock Trading App - Server Management Guide

## ✅ **Current Status: SERVERS ARE RUNNING!**

Your servers are now running with PM2 and will stay on even when you close Cursor or restart your computer.

## 🌐 **Access Your Website**

- **Frontend (React App):** http://localhost:3000
- **Backend (API):** http://localhost:3001

## 📋 **Quick Commands**

### Using the Management Script:
```bash
./start-servers.sh start    # Start servers
./start-servers.sh stop     # Stop servers  
./start-servers.sh restart  # Restart servers
./start-servers.sh status   # Check server status
./start-servers.sh logs     # View server logs
./start-servers.sh monitor  # Open monitoring dashboard
```

### Using PM2 Directly:
```bash
pm2 status                    # Check server status
pm2 logs                     # View logs
pm2 monit                    # Open monitoring dashboard
pm2 restart all              # Restart all servers
pm2 stop all                 # Stop all servers
pm2 start ecosystem.config.js # Start servers
```

## 🔧 **Why PM2?**

**Before:** Servers stopped when you closed Cursor or terminal
**Now:** Servers run independently and stay on 24/7

### Benefits:
- ✅ **Always On:** Servers stay running even when you close Cursor
- ✅ **Auto-Restart:** If a server crashes, it automatically restarts
- ✅ **System Boot:** Servers start automatically when your computer boots
- ✅ **Monitoring:** Built-in monitoring and logging
- ✅ **Easy Management:** Simple commands to start/stop/restart

## 📊 **Current Server Status**

Run this to check if servers are running:
```bash
pm2 status
```

You should see:
- `stock-backend` - Online (Port 3001)
- `stock-frontend` - Online (Port 3000)

## 🛠️ **Troubleshooting**

### If servers aren't responding:
1. Check status: `pm2 status`
2. View logs: `pm2 logs`
3. Restart: `pm2 restart all`

### If you need to completely reset:
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### To set up auto-start on system boot:
```bash
sudo env PATH=$PATH:/opt/homebrew/Cellar/node/24.4.1/bin /opt/homebrew/lib/node_modules/pm2/bin/pm2 startup launchd -u henryhu --hp /Users/henryhu
```

## 📁 **File Structure**

```
Stock Check copy/
├── ecosystem.config.js    # PM2 configuration
├── start-servers.sh      # Management script
├── SERVER_SETUP.md       # This guide
├── backend/              # Backend server
├── frontend/             # Frontend React app
└── logs/                 # Server logs
```

## 🎯 **Your Website is Ready!**

1. **Open your browser**
2. **Go to:** http://localhost:3000
3. **Start trading stocks!** 📈

The servers will now stay running 24/7, even when you close Cursor or restart your computer! 🚀 