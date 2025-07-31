#!/bin/bash

# Stock Trading App Server Management Script

case "$1" in
    "start")
        echo "🚀 Starting Stock Trading servers..."
        pm2 start ecosystem.config.js
        echo "✅ Servers started! Access your app at: http://localhost:3000"
        ;;
    "stop")
        echo "🛑 Stopping servers..."
        pm2 stop all
        echo "✅ Servers stopped!"
        ;;
    "restart")
        echo "🔄 Restarting servers..."
        pm2 restart all
        echo "✅ Servers restarted!"
        ;;
    "status")
        echo "📊 Server Status:"
        pm2 status
        ;;
    "logs")
        echo "📝 Server Logs:"
        pm2 logs
        ;;
    "monitor")
        echo "📈 Opening PM2 Monitor..."
        pm2 monit
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|monitor}"
        echo ""
        echo "Commands:"
        echo "  start   - Start both backend and frontend servers"
        echo "  stop    - Stop all servers"
        echo "  restart - Restart all servers"
        echo "  status  - Show server status"
        echo "  logs    - Show server logs"
        echo "  monitor - Open PM2 monitoring dashboard"
        echo ""
        echo "Your website will be available at: http://localhost:3000"
        echo "Backend API will be available at: http://localhost:3001"
        ;;
esac 