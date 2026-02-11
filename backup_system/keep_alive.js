#!/usr/bin/env node

/**
 * Server Keep-Alive Script
 * Pings your server every 25 minutes to prevent sleeping
 * Run this script continuously to keep your server awake
 */

const https = require('https');

const CONFIG = {
  SERVER_URL: 'https://henry-hu-stock-trading.onrender.com',
  PING_INTERVAL: 2 * 60 * 1000, // 2 minutes
  ENDPOINTS: [
    '/api/health',
    '/',
    '/api/login'
  ]
};

// Ping a specific endpoint
async function pingEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `${CONFIG.SERVER_URL}${endpoint}`;
    const startTime = Date.now();
    
    const req = https.get(url, (res) => {
      const duration = Date.now() - startTime;
      console.log(`✅ ${endpoint}: ${res.statusCode} (${duration}ms)`);
      resolve({ success: true, status: res.statusCode, duration });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log(`❌ ${endpoint}: ${error.message} (${duration}ms)`);
      resolve({ success: false, error: error.message, duration });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`⏰ ${endpoint}: Timeout`);
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

// Ping all endpoints
async function pingAllEndpoints() {
  console.log(`\n🔄 Pinging server at ${new Date().toISOString()}`);
  
  const results = [];
  for (const endpoint of CONFIG.ENDPOINTS) {
    const result = await pingEndpoint(endpoint);
    results.push({ endpoint, ...result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`📊 Results: ${successCount}/${totalCount} endpoints successful`);
  
  if (successCount === totalCount) {
    console.log('🎉 All endpoints responding - server is awake!');
  } else {
    console.log('⚠️  Some endpoints failed - server may be sleeping');
  }
  
  return results;
}

// Main keep-alive loop
async function startKeepAlive() {
  console.log('🚀 Starting Server Keep-Alive System');
  console.log(`📍 Server: ${CONFIG.SERVER_URL}`);
  console.log(`⏰ Interval: ${CONFIG.PING_INTERVAL / 60000} minutes`);
  console.log(`🎯 Endpoints: ${CONFIG.ENDPOINTS.join(', ')}`);
  console.log('\n' + '='.repeat(60));
  
  // Ping immediately
  await pingAllEndpoints();
  
  // Set up interval
  setInterval(async () => {
    await pingAllEndpoints();
  }, CONFIG.PING_INTERVAL);
  
  console.log('\n💡 Keep-alive system is now running...');
  console.log('💡 Press Ctrl+C to stop');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down keep-alive system...');
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Start the system
if (require.main === module) {
  startKeepAlive().catch(error => {
    console.error('❌ Keep-alive system error:', error);
    process.exit(1);
  });
}

module.exports = { pingAllEndpoints, startKeepAlive };
