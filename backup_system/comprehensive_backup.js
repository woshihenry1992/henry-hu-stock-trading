#!/usr/bin/env node

/**
 * Comprehensive Database Backup Script
 * Exports ALL users and data from production database
 * NO DATA DELETION - READ ONLY OPERATION
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

console.log('🛡️  COMPREHENSIVE DATABASE BACKUP');
console.log('===================================');
console.log('');
console.log('📁 This will backup ALL users and data from production');
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

// Export ALL users data from production
async function exportAllUsersData(token) {
  try {
    console.log('🔄 Exporting ALL users data from production...');
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/admin/export-all-users-data`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Complete system data exported successfully:`);
    console.log(`   👥 Users: ${data.summary.totalUsers}`);
    console.log(`   📈 Stocks: ${data.summary.totalStocks}`);
    console.log(`   💰 Transactions: ${data.summary.totalTransactions}`);
    console.log(`   📋 Share Lots: ${data.summary.totalShareLots}`);
    
    return data;
  } catch (error) {
    console.error('❌ Data export failed:', error.message);
    throw error;
  }
}

// Create comprehensive backup file
function createComprehensiveBackup(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `comprehensive_backup_${timestamp}.json`;
  const filepath = path.join(CONFIG.BACKUP_DIR, filename);
  
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      backupType: 'comprehensive_system_backup',
      data: data.data,
      summary: data.summary,
      metadata: {
        totalUsers: data.summary.totalUsers,
        totalStocks: data.summary.totalStocks,
        totalTransactions: data.summary.totalTransactions,
        totalShareLots: data.summary.totalShareLots,
        backupScope: 'ALL_USERS_AND_DATA',
        operation: 'READ_ONLY_EXPORT'
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Comprehensive backup created: ${filename}`);
    
    return filename;
  } catch (error) {
    console.error('❌ Failed to create backup file:', error.message);
    throw error;
  }
}

// Show backup summary
function showBackupSummary(filename, data) {
  console.log('\n📊 COMPREHENSIVE BACKUP SUMMARY');
  console.log('=================================');
  console.log(`📁 File: ${filename}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔢 Version: 1.0.0`);
  console.log(`📊 Data Included:`);
  console.log(`   👥 Users: ${data.summary.totalUsers}`);
  console.log(`   📈 Stocks: ${data.summary.totalStocks}`);
  console.log(`   💰 Transactions: ${data.summary.totalTransactions}`);
  console.log(`   📋 Share Lots: ${data.summary.totalShareLots}`);
  
  // Show user details
  if (data.data.users && data.data.users.length > 0) {
    console.log(`\n👥 Users in Backup:`);
    data.data.users.forEach(user => {
      console.log(`   - ${user.username} (ID: ${user.id})`);
    });
  }
  
  // Show sample data
  if (data.data.stocks && data.data.stocks.length > 0) {
    console.log(`\n📈 Sample Stocks:`);
    data.data.stocks.slice(0, 3).forEach(stock => {
      console.log(`   - ${stock.stock_name} (User ID: ${stock.user_id})`);
    });
    if (data.data.stocks.length > 3) {
      console.log(`   ... and ${data.data.stocks.length - 3} more`);
    }
  }
  
  if (data.data.transactions && data.data.transactions.length > 0) {
    console.log(`\n💰 Sample Transactions:`);
    data.data.transactions.slice(0, 3).forEach(tx => {
      console.log(`   - User ${tx.user_id}: ${tx.transaction_type.toUpperCase()} ${tx.shares} shares @ $${tx.price_per_share}`);
    });
    if (data.data.transactions.length > 3) {
      console.log(`   ... and ${data.data.transactions.length - 3} more`);
    }
  }
}

// Main backup function
async function performComprehensiveBackup() {
  const startTime = new Date();
  console.log(`🚀 Starting comprehensive backup at ${startTime.toISOString()}`);
  
  try {
    // Ensure backup directory exists
    ensureBackupDir();
    
    // Get authentication token
    const token = await getAuthToken();
    
    // Export ALL users data
    const data = await exportAllUsersData(token);
    
    // Create comprehensive backup file
    const filename = createComprehensiveBackup(data);
    
    // Show backup summary
    showBackupSummary(filename, data);
    
    // Calculate backup size
    const filepath = path.join(CONFIG.BACKUP_DIR, filename);
    const stats = fs.statSync(filepath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 COMPREHENSIVE BACKUP COMPLETED SUCCESSFULLY!`);
    console.log(`================================================`);
    console.log(`📁 Backup File: ${filename}`);
    console.log(`📊 Size: ${sizeInMB} MB`);
    console.log(`⏱️ Duration: ${duration} seconds`);
    console.log(`🕐 Completed at: ${endTime.toISOString()}`);
    console.log(`✅ Scope: ALL users and data backed up`);
    console.log(`🛡️ Safety: NO data was modified or deleted`);
    
    // List all backup files
    const backupFiles = fs.readdirSync(CONFIG.BACKUP_DIR)
      .filter(file => file.startsWith('backup_') || file.startsWith('comprehensive_backup_'))
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
    console.error('\n❌ Comprehensive backup failed:', error.message);
    console.log('\n🛡️ Your data is safe - no changes were made');
    console.log('📁 Check your backups and try again if needed');
    
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  performComprehensiveBackup()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Comprehensive backup script error:', error);
      process.exit(1);
    });
}

module.exports = { performComprehensiveBackup };
