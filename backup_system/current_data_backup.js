#!/usr/bin/env node

/**
 * Current Data Backup Script
 * Backs up all accessible data from production database
 * Works with current user permissions
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://henry-hu-stock-trading.onrender.com',
  USERNAME: 'henry1',
  PASSWORD: 'SecurePass123$',
  BACKUP_DIR: './backups'
};

console.log('📁 CURRENT DATA BACKUP');
console.log('=======================');
console.log('');
console.log('📊 This will backup all accessible data from production');
console.log('✅ NO DATA WILL BE DELETED - READ ONLY OPERATION');
console.log('🔄 Your data will be safely exported to local files');
console.log('');

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
    fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${CONFIG.BACKUP_DIR}`);
  }
}

// Get authentication token
async function getAuthToken() {
  try {
    console.log('🔐 Authenticating with production...');
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: CONFIG.USERNAME,
        password: CONFIG.PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Authentication successful');
    console.log(`   👤 User ID: ${data.user.id}`);
    return data.token;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

// Export current user's data
async function exportCurrentUserData(token) {
  try {
    console.log('🔄 Exporting current user data from production...');
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/admin/export-data`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Data exported successfully:`);
    console.log(`   📈 Stocks: ${data.data.stocks.length}`);
    console.log(`   💰 Transactions: ${data.data.transactions.length}`);
    console.log(`   📋 Share Lots: ${data.data.shareLots.length}`);
    
    return data;
  } catch (error) {
    console.error('❌ Data export failed:', error.message);
    throw error;
  }
}

// Get system information
async function getSystemInfo(token) {
  try {
    console.log('📊 Getting system information...');
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/admin/check-integrity`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ System info retrieved:`);
      console.log(`   📈 Stocks: ${data.data.stocks}`);
      console.log(`   💰 Transactions: ${data.data.transactions}`);
      console.log(`   📋 Share Lots: ${data.data.shareLots}`);
      return data;
    } else {
      console.log('⚠️ Could not get system info (admin access required)');
      return null;
    }
  } catch (error) {
    console.log('⚠️ Could not get system info:', error.message);
    return null;
  }
}

// Create backup file
function createBackupFile(userData, systemInfo) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `current_data_backup_${timestamp}.json`;
  const filepath = path.join(CONFIG.BACKUP_DIR, filename);
  
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      backupType: 'current_user_data_backup',
      userData: userData.data,
      systemInfo: systemInfo ? systemInfo.data : null,
      metadata: {
        userStocks: userData.data.stocks.length,
        userTransactions: userData.data.transactions.length,
        userShareLots: userData.data.shareLots.length,
        systemStocks: systemInfo ? systemInfo.data.stocks : 'unknown',
        systemTransactions: systemInfo ? systemInfo.data.transactions : 'unknown',
        systemShareLots: systemInfo ? systemInfo.data.shareLots : 'unknown',
        backupScope: 'CURRENT_USER_ACCESSIBLE_DATA',
        operation: 'READ_ONLY_EXPORT'
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${filename}`);
    
    return filename;
  } catch (error) {
    console.error('❌ Failed to create backup file:', error.message);
    throw error;
  }
}

// Show backup summary
function showBackupSummary(filename, userData, systemInfo) {
  console.log('\n📊 BACKUP SUMMARY');
  console.log('==================');
  console.log(`📁 File: ${filename}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔢 Version: 1.0.0`);
  console.log(`📊 Data Included:`);
  console.log(`   👤 Current User Data:`);
  console.log(`      📈 Stocks: ${userData.data.stocks.length}`);
  console.log(`      💰 Transactions: ${userData.data.transactions.length}`);
  console.log(`      📋 Share Lots: ${userData.data.shareLots.length}`);
  
  if (systemInfo) {
    console.log(`   🌐 System Data:`);
    console.log(`      📈 Total Stocks: ${systemInfo.data.stocks}`);
    console.log(`      💰 Total Transactions: ${systemInfo.data.transactions}`);
    console.log(`      📋 Total Share Lots: ${systemInfo.data.shareLots}`);
  }
  
  // Show sample data if available
  if (userData.data.stocks && userData.data.stocks.length > 0) {
    console.log(`\n📈 Sample Stocks:`);
    userData.data.stocks.slice(0, 3).forEach(stock => {
      console.log(`   - ${stock.stock_name} (ID: ${stock.id})`);
    });
  }
  
  if (userData.data.transactions && userData.data.transactions.length > 0) {
    console.log(`\n💰 Sample Transactions:`);
    userData.data.transactions.slice(0, 3).forEach(tx => {
      console.log(`   - ${tx.transaction_type.toUpperCase()}: ${tx.shares} shares @ $${tx.price_per_share}`);
    });
  }
}

// Main backup function
async function performCurrentDataBackup() {
  const startTime = new Date();
  console.log(`🚀 Starting current data backup at ${startTime.toISOString()}`);
  
  try {
    // Ensure backup directory exists
    ensureBackupDir();
    
    // Get authentication token
    const token = await getAuthToken();
    
    // Export current user data
    const userData = await exportCurrentUserData(token);
    
    // Get system information (if accessible)
    const systemInfo = await getSystemInfo(token);
    
    // Create backup file
    const filename = createBackupFile(userData, systemInfo);
    
    // Show backup summary
    showBackupSummary(filename, userData, systemInfo);
    
    // Calculate backup size
    const filepath = path.join(CONFIG.BACKUP_DIR, filename);
    const stats = fs.statSync(filepath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 CURRENT DATA BACKUP COMPLETED!`);
    console.log(`===================================`);
    console.log(`📁 Backup File: ${filename}`);
    console.log(`📊 Size: ${sizeInMB} MB`);
    console.log(`⏱️ Duration: ${duration} seconds`);
    console.log(`🕐 Completed at: ${endTime.toISOString()}`);
    console.log(`✅ Scope: Current user accessible data backed up`);
    console.log(`🛡️ Safety: NO data was modified or deleted`);
    
    // List all backup files
    const backupFiles = fs.readdirSync(CONFIG.BACKUP_DIR)
      .filter(file => file.startsWith('backup_') || file.startsWith('comprehensive_backup_') || file.startsWith('current_data_backup_'))
      .sort((a, b) => {
        const statsA = fs.statSync(path.join(CONFIG.BACKUP_DIR, a));
        const statsB = fs.statSync(path.join(CONFIG.BACKUP_DIR, b));
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      });
    
    console.log(`\n📋 Available Backup Files:`);
    backupFiles.forEach((file, index) => {
      const stats = fs.statSync(path.join(CONFIG.BACKUP_DIR, file));
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${index + 1}. ${file} (${sizeInMB} MB) - ${stats.mtime.toISOString()}`);
    });
    
    return { success: true, filename, size: sizeInMB, duration };
    
  } catch (error) {
    console.error('\n❌ Current data backup failed:', error.message);
    console.log('\n🛡️ Your data is safe - no changes were made');
    console.log('📁 Check your backups and try again if needed');
    
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  performCurrentDataBackup()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Current data backup script error:', error);
      process.exit(1);
    });
}

module.exports = { performCurrentDataBackup };
