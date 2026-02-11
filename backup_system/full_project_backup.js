#!/usr/bin/env node

/**
 * Full Project Backup Script
 * Creates a compressed archive of the entire Stock Check project
 * Excludes node_modules and other unnecessary files to reduce size
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  PROJECT_ROOT: path.resolve(__dirname, '..'),
  BACKUP_DIR: path.join(__dirname, 'backups'),
  EXCLUDE_PATTERNS: [
    'node_modules',
    '*.log',
    '.git',
    '.DS_Store',
    '*.swp',
    '*.swo',
    '*~',
    '.env',
    'logs',
    'build/static/js/*.map',
    'build/static/css/*.map'
  ]
};

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
    fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${CONFIG.BACKUP_DIR}`);
  }
}

// Get project size
function getProjectSize(dir) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        const filePath = path.join(currentPath, file);
        try {
          calculateSize(filePath);
        } catch (err) {
          // Skip files we can't access
        }
      });
    } else {
      totalSize += stats.size;
    }
  }
  
  try {
    calculateSize(dir);
  } catch (err) {
    console.warn('⚠️  Could not calculate full size:', err.message);
  }
  
  return totalSize;
}

// Create full project backup
async function createFullProjectBackup() {
  const startTime = new Date();
  console.log(`🚀 Starting full project backup at ${startTime.toISOString()}`);
  console.log(`📁 Project root: ${CONFIG.PROJECT_ROOT}`);
  
  try {
    ensureBackupDir();
    
    // Create timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `full_project_backup_${timestamp}.tar.gz`;
    const backupPath = path.join(CONFIG.BACKUP_DIR, backupFilename);
    
    // Build exclude arguments for tar
    const excludeArgs = CONFIG.EXCLUDE_PATTERNS.flatMap(pattern => [
      '--exclude',
      pattern
    ]);
    
    console.log('🔄 Creating compressed archive...');
    console.log(`   Excluding: ${CONFIG.EXCLUDE_PATTERNS.join(', ')}`);
    
    // Create tar.gz archive - change to parent directory first
    const parentDir = path.dirname(CONFIG.PROJECT_ROOT);
    const projectDirName = path.basename(CONFIG.PROJECT_ROOT);
    
    // Build tar command arguments
    const tarArgs = [
      '-czf',
      backupPath
    ];
    
    // Add exclude patterns
    CONFIG.EXCLUDE_PATTERNS.forEach(pattern => {
      tarArgs.push('--exclude', pattern);
    });
    
    // Add the project directory name (we'll run from parent dir)
    tarArgs.push(projectDirName);
    
    // Use spawn with cwd option to run from parent directory
    await new Promise((resolve, reject) => {
      const tar = spawn('tar', tarArgs, {
        cwd: parentDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stderr = '';
      
      tar.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      tar.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`tar failed with code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });
      
      tar.on('error', (error) => {
        reject(error);
      });
    });
    
    // Get backup file stats
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    const sizeInGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Full project backup completed successfully!`);
    console.log(`📁 File: ${backupFilename}`);
    console.log(`📊 Size: ${sizeInMB} MB (${sizeInGB} GB)`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`🕐 Completed at: ${endTime.toISOString()}`);
    console.log(`📍 Location: ${backupPath}`);
    
    // List contents summary
    console.log(`\n📋 Project structure included:`);
    const projectDirs = fs.readdirSync(CONFIG.PROJECT_ROOT)
      .filter(item => {
        const itemPath = path.join(CONFIG.PROJECT_ROOT, item);
        return fs.statSync(itemPath).isDirectory() && item !== 'node_modules';
      });
    projectDirs.forEach(dir => {
      console.log(`   📂 ${dir}/`);
    });
    
    return {
      success: true,
      filename: backupFilename,
      path: backupPath,
      size: sizeInMB,
      sizeBytes: stats.size,
      duration
    };
    
  } catch (error) {
    console.error('❌ Full project backup failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Clean up old full project backups (keep only 3 most recent)
function cleanupOldFullBackups() {
  try {
    const files = fs.readdirSync(CONFIG.BACKUP_DIR)
      .filter(file => file.startsWith('full_project_backup_') && file.endsWith('.tar.gz'))
      .map(file => ({
        name: file,
        path: path.join(CONFIG.BACKUP_DIR, file),
        time: fs.statSync(path.join(CONFIG.BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first

    const MAX_FULL_BACKUPS = 3;
    
    if (files.length > MAX_FULL_BACKUPS) {
      const filesToDelete = files.slice(MAX_FULL_BACKUPS);
      
      console.log(`\n🔄 Cleaning up ${filesToDelete.length} old full project backup(s)...`);
      
      filesToDelete.forEach(file => {
        const sizeInMB = (fs.statSync(file.path).size / (1024 * 1024)).toFixed(2);
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name} (${sizeInMB} MB)`);
      });
      
      console.log(`✅ Cleanup complete. Keeping ${MAX_FULL_BACKUPS} most recent full project backups.`);
    } else {
      console.log(`\n✅ No cleanup needed. Current full project backups: ${files.length}/${MAX_FULL_BACKUPS}`);
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Main function
async function performFullProjectBackup() {
  const result = await createFullProjectBackup();
  
  if (result.success) {
    cleanupOldFullBackups();
  }
  
  return result;
}

// Run if called directly
if (require.main === module) {
  performFullProjectBackup()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Full project backup script error:', error);
      process.exit(1);
    });
}

module.exports = { performFullProjectBackup, CONFIG };

