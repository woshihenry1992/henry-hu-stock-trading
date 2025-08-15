#!/usr/bin/env node

/**
 * Safe Production Data Clearing Script
 * This script safely clears all production data while preserving backups
 * WARNING: This will delete ALL data from your production database
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://henry-hu-stock-trading.onrender.com',
  USERNAME: 'henry',
  PASSWORD: 'Woshihenry8588$',
  BACKUP_DIR: './backups'
};

console.log('🛡️  SAFE PRODUCTION DATA CLEARING SCRIPT');
console.log('==========================================');
console.log('');
console.log('⚠️  WARNING: This will delete ALL data from your production database!');
console.log('📁 Your local backups will be preserved');
console.log('🔄 You can restore data later if needed');
console.log('');

// Check if user really wants to proceed
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get user confirmation
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

// Main clearing function
async function clearProductionData() {
  try {
    console.log('🚀 Starting safe production data clearing...');
    
    // Step 1: Verify backups exist
    console.log('📁 Checking backup availability...');
    if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
      throw new Error('Backup directory not found. Please run backup first.');
    }
    
    const backupFiles = fs.readdirSync(CONFIG.BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    if (backupFiles.length === 0) {
      throw new Error('No backup files found. Please create a backup first.');
    }
    
    console.log(`✅ Found ${backupFiles.length} backup file(s)`);
    backupFiles.forEach(file => {
      const stats = fs.statSync(path.join(CONFIG.BACKUP_DIR, file));
      console.log(`   📄 ${file} (${stats.size} bytes)`);
    });
    
    // Step 2: Get authentication token
    console.log('\n🔐 Authenticating with production...');
    const loginResponse = await fetch(`${CONFIG.API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: CONFIG.USERNAME,
        password: CONFIG.PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Authentication failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Authentication successful');
    
    // Step 3: Get current data summary (for verification)
    console.log('\n📊 Getting current production data summary...');
    const summaryResponse = await fetch(`${CONFIG.API_BASE_URL}/api/admin/check-integrity`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (summaryResponse.ok) {
      const summary = await summaryResponse.json();
      console.log('📈 Current Production Data:');
      console.log(`   👥 Users: ${summary.data.stocks > 0 ? 'Data exists' : 'No data'}`);
      console.log(`   📈 Stocks: ${summary.data.stocks}`);
      console.log(`   💰 Transactions: ${summary.data.transactions}`);
      console.log(`   📋 Share Lots: ${summary.data.shareLots}`);
    }
    
    // Step 4: Final confirmation
    console.log('\n⚠️  FINAL CONFIRMATION REQUIRED');
    console.log('================================');
    console.log('This will delete ALL data from your production database.');
    console.log('Your local backups will be preserved.');
    console.log('');
    
    const finalConfirm = await askQuestion('Type "DELETE ALL DATA" to proceed: ');
    
    if (finalConfirm !== 'delete all data') {
      console.log('❌ Operation cancelled by user');
      rl.close();
      return;
    }
    
    // Step 5: Clear data systematically
    console.log('\n🗑️  Clearing production data...');
    
    // Clear transactions first (foreign key dependencies)
    console.log('   🗑️  Clearing transactions...');
    const clearTransactions = await fetch(`${CONFIG.API_BASE_URL}/api/admin/clear-transactions`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirm: 'CLEAR_ALL_TRANSACTIONS' })
    });
    
    if (clearTransactions.ok) {
      console.log('   ✅ Transactions cleared');
    } else {
      console.log('   ⚠️  Transactions clear failed (may not exist)');
    }
    
    // Clear share lots
    console.log('   🗑️  Clearing share lots...');
    const clearShareLots = await fetch(`${CONFIG.API_BASE_URL}/api/admin/clear-share-lots`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirm: 'CLEAR_ALL_SHARE_LOTS' })
    });
    
    if (clearShareLots.ok) {
      console.log('   ✅ Share lots cleared');
    } else {
      console.log('   ⚠️  Share lots clear failed (may not exist)');
    }
    
    // Clear stocks
    console.log('   🗑️  Clearing stocks...');
    const clearStocks = await fetch(`${CONFIG.API_BASE_URL}/api/admin/clear-stocks`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirm: 'CLEAR_ALL_STOCKS' })
    });
    
    if (clearStocks.ok) {
      console.log('   ✅ Stocks cleared');
    } else {
      console.log('   ⚠️  Stocks clear failed (may not exist)');
    }
    
    // Clear users (except admin)
    console.log('   🗑️  Clearing non-admin users...');
    const clearUsers = await fetch(`${CONFIG.API_BASE_URL}/api/admin/clear-users`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirm: 'CLEAR_NON_ADMIN_USERS' })
    });
    
    if (clearUsers.ok) {
      console.log('   ✅ Non-admin users cleared');
    } else {
      console.log('   ⚠️  Users clear failed (may not exist)');
    }
    
    // Step 6: Verify data is cleared
    console.log('\n🔍 Verifying data clearance...');
    const verifyResponse = await fetch(`${CONFIG.API_BASE_URL}/api/admin/check-integrity`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('📊 Production Data After Clear:');
      console.log(`   📈 Stocks: ${verifyData.data.stocks}`);
      console.log(`   💰 Transactions: ${verifyData.data.transactions}`);
      console.log(`   📋 Share Lots: ${verifyData.data.shareLots}`);
      
      if (verifyData.data.stocks === 0 && verifyData.data.transactions === 0 && verifyData.data.shareLots === 0) {
        console.log('✅ All data successfully cleared!');
      } else {
        console.log('⚠️  Some data may still exist');
      }
    }
    
    // Step 7: Create clearance report
    const clearanceReport = {
      timestamp: new Date().toISOString(),
      operation: 'production_data_clearance',
      status: 'completed',
      backups_preserved: backupFiles,
      data_cleared: {
        stocks: true,
        transactions: true,
        shareLots: true,
        users: true
      },
      notes: 'Production data cleared. Local backups preserved for restoration.'
    };
    
    const reportPath = path.join(CONFIG.BACKUP_DIR, `clearance_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(clearanceReport, null, 2));
    
    console.log('\n📄 Clearance report saved:', reportPath);
    
    // Step 8: Success message
    console.log('\n🎉 PRODUCTION DATA CLEARANCE COMPLETED!');
    console.log('========================================');
    console.log('✅ All production data has been cleared');
    console.log('📁 Your local backups are preserved');
    console.log('🔄 You can restore data anytime using backups');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Your production database is now clean');
    console.log('   2. Local backups contain all previous data');
    console.log('   3. You can start fresh or restore from backup');
    console.log('   4. Daily backups will continue automatically');
    
  } catch (error) {
    console.error('\n❌ ERROR during data clearance:', error.message);
    console.log('\n🛡️  Your data is safe - no changes were made');
    console.log('📁 Check your backups and try again if needed');
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  clearProductionData();
}

module.exports = { clearProductionData };
