#!/usr/bin/env node

/**
 * Backup Management Script
 * View, restore, and manage backup files
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = './backups';

// List all available backups
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('❌ Backup directory not found. Run setup first.');
      return;
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filepath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        return {
          name: file,
          size: sizeInMB,
          date: stats.mtime.toISOString(),
          path: filepath
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (files.length === 0) {
      console.log('📭 No backup files found.');
      return;
    }

    console.log(`📋 Found ${files.length} backup file(s):\n`);
    
    files.forEach((file, index) => {
      const status = index < 2 ? '🟢 KEEPING' : '🗑️ OLD (will be deleted)';
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   📅 Date: ${file.date}`);
      console.log(`   📊 Size: ${file.size} MB`);
      console.log(`   📍 Status: ${status}`);
      console.log('');
    });

    // Show backup info
    const totalSize = files.reduce((sum, file) => sum + parseFloat(file.size), 0);
    console.log(`📊 Total backup size: ${totalSize.toFixed(2)} MB`);
    console.log(`🔄 Keeping ${Math.min(files.length, 2)} most recent backups`);
    
  } catch (error) {
    console.error('❌ Error listing backups:', error.message);
  }
}

// View backup details
function viewBackup(backupName) {
  try {
    const filepath = path.join(BACKUP_DIR, backupName);
    
    if (!fs.existsSync(filepath)) {
      console.log(`❌ Backup file not found: ${backupName}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    console.log(`📖 Backup Details: ${backupName}\n`);
    console.log(`📅 Timestamp: ${data.timestamp}`);
    console.log(`🔢 Version: ${data.version}`);
    console.log(`📊 Metadata:`);
    console.log(`   - Users: ${data.metadata.totalUsers}`);
    console.log(`   - Stocks: ${data.metadata.totalStocks}`);
    console.log(`   - Transactions: ${data.metadata.totalTransactions}`);
    console.log(`   - Share Lots: ${data.metadata.totalShareLots}`);
    console.log(`   - Type: ${data.metadata.backupType}`);
    
    // Show sample data
    if (data.data.users && data.data.users.length > 0) {
      console.log(`\n👥 Users in Backup:`);
      data.data.users.forEach(user => {
        console.log(`   - ${user.username} (ID: ${user.id})`);
      });
    }
    
    if (data.data.stocks && data.data.stocks.length > 0) {
      console.log(`\n📈 Sample Stocks:`);
      data.data.stocks.slice(0, 5).forEach(stock => {
        console.log(`   - ${stock.stock_name} (User ID: ${stock.user_id}, Stock ID: ${stock.id})`);
      });
      if (data.data.stocks.length > 5) {
        console.log(`   ... and ${data.data.stocks.length - 5} more`);
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
    
  } catch (error) {
    console.error('❌ Error viewing backup:', error.message);
  }
}

// Test backup restoration (dry run)
function testRestore(backupName) {
  try {
    const filepath = path.join(BACKUP_DIR, backupName);
    
    if (!fs.existsSync(filepath)) {
      console.log(`❌ Backup file not found: ${backupName}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    console.log(`🧪 Testing restoration from: ${backupName}\n`);
    console.log(`📊 This backup contains:`);
    console.log(`   - ${data.metadata.totalStocks} stocks`);
    console.log(`   - ${data.metadata.totalTransactions} transactions`);
    console.log(`   - ${data.metadata.totalShareLots} share lots`);
    console.log(`\n📝 To actually restore this data, you would need to:`);
    console.log(`   1. Clear current production data (if needed)`);
    console.log(`   2. Use the data from this backup file`);
    console.log(`   3. Import stocks, transactions, and share lots`);
    console.log(`\n⚠️  Note: This is a dry run. No data will be modified.`);
    
  } catch (error) {
    console.error('❌ Error testing restore:', error.message);
  }
}

// Show backup system status
function showStatus() {
  try {
    console.log('🔍 Backup System Status\n');
    
    // Check backup directory
    if (fs.existsSync(BACKUP_DIR)) {
      console.log('✅ Backup directory exists');
      
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      console.log(`📁 Backup files: ${files.length}`);
      
      if (files.length > 0) {
        const latest = files
          .map(file => ({ name: file, time: fs.statSync(path.join(BACKUP_DIR, file)).mtime }))
          .sort((a, b) => b.time - a.time)[0];
        
        console.log(`🕐 Latest backup: ${latest.name} (${latest.time.toISOString()})`);
        
        // Check if backup is recent (within 24 hours)
        const hoursSinceBackup = (Date.now() - latest.time.getTime()) / (1000 * 60 * 60);
        if (hoursSinceBackup < 24) {
          console.log('🟢 Backup system is working correctly');
        } else {
          console.log('🟡 Backup may be overdue');
        }
      }
    } else {
      console.log('❌ Backup directory not found');
    }
    
    // Check cron job
    const { exec } = require('child_process');
    exec('crontab -l', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Cron job not found or error checking');
        return;
      }
      
      if (stdout.includes('backup_script.js')) {
        console.log('✅ Cron job is configured');
      } else {
        console.log('❌ Cron job not configured');
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

// Main function
function main() {
  const command = process.argv[2];
  const backupName = process.argv[3];
  
  console.log('🛡️  Stock Trading App - Backup Management System\n');
  
  switch (command) {
    case 'list':
    case 'ls':
      listBackups();
      break;
      
    case 'view':
      if (!backupName) {
        console.log('❌ Usage: node manage_backups.js view <backup_name>');
        console.log('   Example: node manage_backups.js view backup_2025-08-15T05-00-00-000Z.json');
        return;
      }
      viewBackup(backupName);
      break;
      
    case 'test-restore':
      if (!backupName) {
        console.log('❌ Usage: node manage_backups.js test-restore <backup_name>');
        return;
      }
      testRestore(backupName);
      break;
      
    case 'status':
      showStatus();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node manage_backups.js list                    - List all backups');
      console.log('  node manage_backups.js view <backup_name>      - View backup details');
      console.log('  node manage_backups.js test-restore <backup_name> - Test restoration (dry run)');
      console.log('  node manage_backups.js status                  - Show system status');
      console.log('');
      console.log('📁 Backup files are stored in: ./backups/');
      console.log('⏰ Backups run daily at 5:00 AM Singapore time');
      console.log('🔄 Keeps only 2 most recent backups');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { listBackups, viewBackup, testRestore, showStatus };
