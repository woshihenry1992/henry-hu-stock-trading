#!/usr/bin/env node

/**
 * Automated Daily Backup System for Stock Trading App
 * Runs daily at 5:00 AM Singapore time
 * Keeps only 2 most recent backups
 * Automatically deletes older backups
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

// Configuration
const CONFIG = {
  // Backup settings
  BACKUP_DIR: './backups',
  MAX_BACKUPS: 2,
  BACKUP_TIME: '05:00', // 5:00 AM Singapore time
  
  // API settings
  API_BASE_URL: 'https://henry-hu-stock-trading.onrender.com',
  USERNAME: 'henry',
  PASSWORD: 'Woshihenry8588$',
  
  // Email notifications (optional)
  EMAIL_ENABLED: false,
  EMAIL_CONFIG: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    }
  }
};

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
    return data.token;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

// Export data from production API
async function exportProductionData(token) {
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

// Create backup file
function createBackupFile(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(CONFIG.BACKUP_DIR, filename);
  
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: data.data,
      metadata: {
        totalUsers: data.summary.totalUsers,
        totalStocks: data.summary.totalStocks,
        totalTransactions: data.summary.totalTransactions,
        totalShareLots: data.summary.totalShareLots,
        backupType: 'automated_daily_complete_system'
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

// Clean up old backups (keep only 2 most recent)
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(CONFIG.BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(CONFIG.BACKUP_DIR, file),
        time: fs.statSync(path.join(CONFIG.BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first

    if (files.length > CONFIG.MAX_BACKUPS) {
      const filesToDelete = files.slice(CONFIG.MAX_BACKUPS);
      
      console.log(`🔄 Cleaning up ${filesToDelete.length} old backup(s)...`);
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Deleted old backup: ${file.name}`);
      });
      
      console.log(`✅ Cleanup complete. Keeping ${CONFIG.MAX_BACKUPS} most recent backups.`);
    } else {
      console.log(`✅ No cleanup needed. Current backups: ${files.length}/${CONFIG.MAX_BACKUPS}`);
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Send email notification (optional)
async function sendEmailNotification(success, details) {
  if (!CONFIG.EMAIL_ENABLED) return;

  try {
    const transporter = nodemailer.createTransporter(CONFIG.EMAIL_CONFIG);
    
    const mailOptions = {
      from: CONFIG.EMAIL_CONFIG.auth.user,
      to: CONFIG.EMAIL_CONFIG.auth.user,
      subject: success ? '✅ Daily Backup Successful' : '❌ Daily Backup Failed',
      html: `
        <h2>Stock Trading App - Daily Backup Report</h2>
        <p><strong>Status:</strong> ${success ? 'SUCCESS' : 'FAILED'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Details:</strong> ${details}</p>
        <hr>
        <p><em>This is an automated message from your backup system.</em></p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Email notification sent');
  } catch (error) {
    console.error('❌ Email notification failed:', error.message);
  }
}

// Main backup function
async function performBackup() {
  const startTime = new Date();
  console.log(`🚀 Starting daily backup at ${startTime.toISOString()}`);
  
  try {
    // Ensure backup directory exists
    ensureBackupDir();
    
    // Get authentication token
    const token = await getAuthToken();
    
    // Export production data
    const data = await exportProductionData(token);
    
    // Create backup file
    const filename = createBackupFile(data);
    
    // Clean up old backups
    cleanupOldBackups();
    
    // Calculate backup size
    const filepath = path.join(CONFIG.BACKUP_DIR, filename);
    const stats = fs.statSync(filepath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`🎉 Backup completed successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Size: ${sizeInMB} MB`);
    console.log(`⏱️ Duration: ${duration} seconds`);
    console.log(`🕐 Completed at: ${endTime.toISOString()}`);
    
    // Send success notification
    await sendEmailNotification(true, `Backup completed in ${duration}s. File: ${filename}, Size: ${sizeInMB} MB`);
    
    return { success: true, filename, size: sizeInMB, duration };
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    
    // Send failure notification
    await sendEmailNotification(false, `Backup failed: ${error.message}`);
    
    return { success: false, error: error.message };
  }
}

// Run backup if called directly
if (require.main === module) {
  performBackup()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Backup script error:', error);
      process.exit(1);
    });
}

module.exports = { performBackup, CONFIG };
