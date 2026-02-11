#!/bin/bash

# Server Keep-Alive Setup Script
# This script sets up multiple methods to prevent your server from sleeping

echo "🚀 Setting up Server Keep-Alive System"
echo "======================================"

# Make scripts executable
chmod +x keep_alive.js
chmod +x setup_keepalive.sh

echo "✅ Scripts made executable"

# Create a simple cron job for keep-alive
echo "📅 Setting up cron job for server ping..."

# Create a temporary cron file
CRON_FILE="/tmp/stock_trading_keepalive_cron"

# Add cron job to ping server every 2 minutes
echo "# Stock Trading App Keep-Alive - Pings server every 2 minutes" > $CRON_FILE
echo "*/2 * * * * curl -s 'https://henry-hu-stock-trading.onrender.com/api/health' > /dev/null 2>&1" >> $CRON_FILE
echo "*/2 * * * * curl -s 'https://henry-hu-stock-trading.onrender.com/' > /dev/null 2>&1" >> $CRON_FILE

echo "📋 Cron job created. To install it, run:"
echo "   crontab $CRON_FILE"
echo ""
echo "💡 Alternative: Run keep-alive script manually:"
echo "   node keep_alive.js"
echo ""
echo "🌐 Or use external services like UptimeRobot"
echo ""
echo "🎯 Recommended: Use UptimeRobot (free) - Set up at:"
echo "   https://uptimerobot.com"
echo "   Add monitor for: https://henry-hu-stock-trading.onrender.com/api/health"
echo "   Set interval to: 5 minutes"
echo ""
echo "✅ Setup complete!"
