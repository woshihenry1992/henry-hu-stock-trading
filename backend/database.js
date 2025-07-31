const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// Database configuration
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let db;

if (isProduction) {
  // PostgreSQL for production
  db = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  console.log('Connected to PostgreSQL database.');
} else {
  // SQLite for development
  db = new sqlite3.Database('./stock_trading.db', (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database.');
    }
  });
}

// Initialize database tables
async function initializeDatabase() {
  if (isProduction) {
    // PostgreSQL initialization
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS stocks (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          stock_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          stock_id INTEGER NOT NULL,
          transaction_type VARCHAR(10) NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
          shares INTEGER NOT NULL,
          price_per_share DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (stock_id) REFERENCES stocks (id)
        )
      `);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS share_lots (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          stock_id INTEGER NOT NULL,
          buy_transaction_id INTEGER NOT NULL,
          shares INTEGER NOT NULL,
          buy_price_per_share DECIMAL(10,2) NOT NULL,
          buy_date TIMESTAMP NOT NULL,
          sell_transaction_id INTEGER,
          sell_price_per_share DECIMAL(10,2),
          sell_date TIMESTAMP,
          status VARCHAR(10) DEFAULT 'active' CHECK(status IN ('active', 'sold')),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (stock_id) REFERENCES stocks (id),
          FOREIGN KEY (buy_transaction_id) REFERENCES transactions (id),
          FOREIGN KEY (sell_transaction_id) REFERENCES transactions (id)
        )
      `);
      
      console.log('PostgreSQL tables initialized successfully.');
    } catch (error) {
      console.error('Error initializing PostgreSQL database:', error);
    }
  } else {
    // SQLite initialization (existing code)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
        return;
      }
      console.log('Users table created/verified successfully.');
      
      db.run(`CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stock_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating stocks table:', err.message);
          return;
        }
        console.log('Stocks table created/verified successfully.');
        
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          stock_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
          shares INTEGER NOT NULL,
          price_per_share REAL NOT NULL,
          total_amount REAL NOT NULL,
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (stock_id) REFERENCES stocks (id)
        )`, (err) => {
          if (err) {
            console.error('Error creating transactions table:', err.message);
            return;
          }
          console.log('Transactions table created/verified successfully.');
          
          db.run(`CREATE TABLE IF NOT EXISTS share_lots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            stock_id INTEGER NOT NULL,
            buy_transaction_id INTEGER NOT NULL,
            shares INTEGER NOT NULL,
            buy_price_per_share REAL NOT NULL,
            buy_date DATETIME NOT NULL,
            sell_transaction_id INTEGER,
            sell_price_per_share REAL,
            sell_date DATETIME,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'sold')),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (stock_id) REFERENCES stocks (id),
            FOREIGN KEY (buy_transaction_id) REFERENCES transactions (id),
            FOREIGN KEY (sell_transaction_id) REFERENCES transactions (id)
          )`, (err) => {
            if (err) {
              console.error('Error creating share_lots table:', err.message);
              return;
            }
            console.log('Share_lots table created/verified successfully.');
            console.log('SQLite database tables initialized successfully.');
          });
        });
      });
    });
  }
}

module.exports = { db, initializeDatabase, isProduction }; 