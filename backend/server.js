const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');

// Import database configuration
const { db, initializeDatabase, isProduction } = require('./database');

// Create PostgreSQL pool for direct access
let pgPool;
if (isProduction) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initializeDatabase();

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Root route - API information
app.get('/', (req, res) => {
  res.json({ 
    message: 'Stock Trading API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      register: '/api/register',
      login: '/api/login',
      profile: '/api/profile',
      stocks: '/api/stocks',
      transactions: '/api/transactions',
      portfolio: '/api/portfolio',
      earnings: '/api/earnings/monthly'
    },
    status: 'running'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Stock Trading API is running!' });
});

// Test database connection
app.get('/api/test-connection', (req, res) => {
  if (isProduction) {
    if (!pgPool) {
      return res.status(500).json({ error: 'pgPool not initialized' });
    }
    pgPool.query('SELECT 1 as test', (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database connection failed', details: err.message });
      }
      res.json({ message: 'Database connection successful', isProduction });
    });
  } else {
    res.json({ message: 'Development mode - SQLite', isProduction });
  }
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
      [username, hashedPassword], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }
        
        res.status(201).json({ 
          message: 'User created successfully',
          userId: this.lastID 
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username }
    });
  });
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ 
    user: { 
      id: req.user.userId, 
      username: req.user.username 
    } 
  });
});

// Stock Management Routes

// Add new stock
app.post('/api/stocks', authenticateToken, (req, res) => {
  const { stock_name } = req.body;
  const userId = req.user.userId;

  if (!stock_name || stock_name.trim() === '') {
    return res.status(400).json({ error: 'Stock name is required' });
  }

  // Check if stock already exists for this user
  db.get('SELECT * FROM stocks WHERE user_id = ? AND stock_name = ?', 
    [userId, stock_name.trim()], (err, existingStock) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existingStock) {
        return res.status(400).json({ error: 'Stock already exists in your portfolio' });
      }

      // Insert new stock
      db.run('INSERT INTO stocks (user_id, stock_name) VALUES (?, ?)', 
        [userId, stock_name.trim()], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating stock' });
          }
          
          res.status(201).json({ 
            message: 'Stock added successfully',
            stock: {
              id: this.lastID,
              stock_name: stock_name.trim(),
              user_id: userId
            }
          });
        }
      );
    }
  );
});

// Get user's stocks
app.get('/api/stocks', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  if (isProduction) {
    // PostgreSQL version
    db.query('SELECT * FROM stocks WHERE user_id = $1 ORDER BY created_at DESC', [userId])
      .then(result => {
        res.json({ stocks: result.rows });
      })
      .catch(err => {
        console.error('Stocks query error:', err);
        res.status(500).json({ error: 'Database error' });
      });
  } else {
    // SQLite version
    db.all('SELECT * FROM stocks WHERE user_id = ? ORDER BY created_at DESC', 
      [userId], (err, stocks) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ stocks });
      }
    );
  }
});

// Add transaction (buy or sell)
app.post('/api/transactions', authenticateToken, (req, res) => {
  const { stock_id, transaction_type, shares, price_per_share, transaction_date } = req.body;
  const userId = req.user.userId;

  if (!stock_id || !transaction_type || !shares || !price_per_share) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (transaction_type !== 'buy' && transaction_type !== 'sell') {
    return res.status(400).json({ error: 'Transaction type must be buy or sell' });
  }

  if (shares <= 0 || price_per_share <= 0) {
    return res.status(400).json({ error: 'Shares and price must be positive' });
  }

  const total_amount = shares * price_per_share;
  const date = transaction_date || new Date().toISOString();

  if (isProduction) {
    // PostgreSQL version
    // First verify stock belongs to user
    pgPool.query('SELECT * FROM stocks WHERE id = $1 AND user_id = $2', [stock_id, userId])
      .then(stockResult => {
        if (stockResult.rows.length === 0) {
          return res.status(404).json({ error: 'Stock not found' });
        }

        // Use transaction
        return pgPool.query('BEGIN')
          .then(() => {
            // Insert transaction
            return pgPool.query(
              'INSERT INTO transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
              [userId, stock_id, transaction_type, shares, price_per_share, total_amount, date]
            );
          })
          .then(transactionResult => {
            const transactionId = transactionResult.rows[0].id;

            // If it's a buy transaction, create share lots
            if (transaction_type === 'buy') {
              return pgPool.query(
                'INSERT INTO share_lots (user_id, stock_id, buy_transaction_id, shares, buy_price_per_share, buy_date) VALUES ($1, $2, $3, $4, $5, $6)',
                [userId, stock_id, transactionId, shares, price_per_share, date]
              );
            }
            return Promise.resolve();
          })
          .then(() => {
            return pgPool.query('COMMIT');
          })
          .then(() => {
            res.status(201).json({ 
              message: 'Transaction created successfully',
              transaction: {
                stock_id,
                transaction_type,
                shares,
                price_per_share,
                total_amount,
                transaction_date: date
              }
            });
          })
          .catch(err => {
            return pgPool.query('ROLLBACK')
              .then(() => {
                console.error('Transaction error:', err);
                res.status(500).json({ error: 'Error creating transaction' });
              });
          });
      })
      .catch(err => {
        console.error('Stock verification error:', err);
        res.status(500).json({ error: 'Database error' });
      });
  } else {
    // SQLite version
    db.get('SELECT * FROM stocks WHERE id = ? AND user_id = ?', 
      [stock_id, userId], (err, stock) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!stock) {
          return res.status(404).json({ error: 'Stock not found' });
        }

        // Start transaction
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          // Insert transaction
          db.run('INSERT INTO transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [userId, stock_id, transaction_type, shares, price_per_share, total_amount, date], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error creating transaction' });
              }

              const transactionId = this.lastID;

              // If it's a buy transaction, create share lots
              if (transaction_type === 'buy') {
                db.run('INSERT INTO share_lots (user_id, stock_id, buy_transaction_id, shares, buy_price_per_share, buy_date) VALUES (?, ?, ?, ?, ?, ?)', 
                  [userId, stock_id, transactionId, shares, price_per_share, date], function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Error creating share lots' });
                    }

                    db.run('COMMIT');
                    res.status(201).json({ 
                      message: 'Transaction created successfully',
                      transaction: {
                        id: transactionId,
                        stock_id,
                        transaction_type,
                        shares,
                        price_per_share,
                        total_amount,
                        transaction_date: date
                      }
                    });
                  }
                );
              } else {
                // For sell transactions, just commit the transaction
                db.run('COMMIT');
                res.status(201).json({ 
                  message: 'Transaction created successfully',
                  transaction: {
                    id: transactionId,
                    stock_id,
                    transaction_type,
                    shares,
                    price_per_share,
                    total_amount,
                    transaction_date: date
                  }
                });
              }
            }
          );
        });
      }
    );
  }
});

// Get transactions for a stock
app.get('/api/stocks/:stockId/transactions', authenticateToken, (req, res) => {
  const { stockId } = req.params;
  const userId = req.user.userId;

  // Verify stock belongs to user
  db.get('SELECT * FROM stocks WHERE id = ? AND user_id = ?', 
    [stockId, userId], (err, stock) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!stock) {
        return res.status(404).json({ error: 'Stock not found' });
      }

      // Get transactions
      db.all('SELECT * FROM transactions WHERE stock_id = ? ORDER BY transaction_date DESC', 
        [stockId], (err, transactions) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({ transactions });
        }
      );
    }
  );
});

// Get all transactions for user with earned amounts
app.get('/api/transactions', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.all(`
    SELECT 
      t.*,
      s.stock_name,
      CASE 
        WHEN t.transaction_type = 'sell' THEN
          COALESCE(
            (SELECT SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares)
             FROM share_lots sl 
             WHERE sl.sell_transaction_id = t.id), 0
          )
        ELSE 0
      END as earned_amount
    FROM transactions t
    JOIN stocks s ON t.stock_id = s.id
    WHERE t.user_id = ?
    ORDER BY t.transaction_date DESC
  `, [userId], (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ transactions });
  });
});

// Get available share lots for a stock (for selling)
app.get('/api/stocks/:stockId/share-lots', authenticateToken, (req, res) => {
  const { stockId } = req.params;
  const userId = req.user.userId;

  // Verify stock belongs to user
  db.get('SELECT * FROM stocks WHERE id = ? AND user_id = ?', 
    [stockId, userId], (err, stock) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!stock) {
        return res.status(404).json({ error: 'Stock not found' });
      }

      // Get available share lots (not sold yet)
      db.all(`
        SELECT 
          sl.id,
          sl.shares,
          sl.buy_price_per_share,
          sl.buy_date,
          sl.status
        FROM share_lots sl
        WHERE sl.stock_id = ? AND sl.user_id = ? AND sl.status = 'active'
        ORDER BY sl.buy_date ASC
      `, [stockId, userId], (err, shareLots) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ shareLots });
      });
    }
  );
});

// Sell specific share lots
app.post('/api/stocks/:stockId/sell-lots', authenticateToken, (req, res) => {
  const { stockId } = req.params;
  const { lotIds, sellPricePerShare, sellDate } = req.body;
  const userId = req.user.userId;

  if (!lotIds || !Array.isArray(lotIds) || lotIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one lot to sell' });
  }

  if (!sellPricePerShare || sellPricePerShare <= 0) {
    return res.status(400).json({ error: 'Sell price must be positive' });
  }

  const sellDateValue = sellDate || new Date().toISOString();

  // Verify stock belongs to user
  db.get('SELECT * FROM stocks WHERE id = ? AND user_id = ?', 
    [stockId, userId], (err, stock) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!stock) {
        return res.status(404).json({ error: 'Stock not found' });
      }

      // Start transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Get the share lots to sell
        const placeholders = lotIds.map(() => '?').join(',');
        db.all(`SELECT * FROM share_lots WHERE id IN (${placeholders}) AND user_id = ? AND stock_id = ? AND status = 'active'`, 
          [...lotIds, userId, stockId], (err, lotsToSell) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Database error' });
            }

            if (lotsToSell.length !== lotIds.length) {
              db.run('ROLLBACK');
              return res.status(400).json({ error: 'Some selected lots are not available for sale' });
            }

            // Calculate total shares and create sell transaction
            const totalShares = lotsToSell.reduce((sum, lot) => sum + lot.shares, 0);
            const totalAmount = totalShares * sellPricePerShare;

            // Create sell transaction
            db.run('INSERT INTO transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)', 
              [userId, stockId, 'sell', totalShares, sellPricePerShare, totalAmount, sellDateValue], function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Error creating sell transaction' });
                }

                const sellTransactionId = this.lastID;

                // Update each lot as sold
                const updatePromises = lotsToSell.map(lot => {
                  return new Promise((resolve, reject) => {
                    db.run('UPDATE share_lots SET sell_transaction_id = ?, sell_price_per_share = ?, sell_date = ?, status = ? WHERE id = ?', 
                      [sellTransactionId, sellPricePerShare, sellDateValue, 'sold', lot.id], function(err) {
                        if (err) reject(err);
                        else resolve();
                      });
                  });
                });

                Promise.all(updatePromises)
                  .then(() => {
                    db.run('COMMIT');
                    res.status(201).json({ 
                      message: 'Shares sold successfully',
                      transaction: {
                        id: sellTransactionId,
                        stock_id: stockId,
                        transaction_type: 'sell',
                        shares: totalShares,
                        price_per_share: sellPricePerShare,
                        total_amount: totalAmount,
                        transaction_date: sellDateValue
                      }
                    });
                  })
                  .catch(err => {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: 'Error updating share lots' });
                  });
              }
            );
          }
        );
      });
    }
  );
});

// Get portfolio summary
app.get('/api/portfolio', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  if (isProduction) {
    // PostgreSQL version - very simple query first
    pgPool.query(`
      SELECT 
        s.id,
        s.stock_name,
        s.created_at
      FROM stocks s
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [userId])
    .then(result => {
      // Add basic portfolio metrics
      const portfolio = result.rows.map(stock => ({
        ...stock,
        current_shares: 25, // Hardcoded for now - we'll fix this later
        avg_buy_price: 150.00,
        total_invested: 3750.00,
        actual_earned: 0
      }));

      res.json(portfolio);
    })
    .catch(err => {
      console.error('Portfolio query error:', err);
      res.status(500).json({ error: 'Database error' });
    });
  } else {
    // SQLite version - simplified for development
    db.all(`
      SELECT 
        s.id,
        s.stock_name,
        s.created_at,
        0 as current_shares,
        0 as avg_buy_price,
        0 as total_invested,
        0 as actual_earned
      FROM stocks s
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `, [userId], (err, portfolio) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(portfolio);
    });
  }
});

// Get monthly earnings data for charts
app.get('/api/earnings/monthly', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const year = req.query.year || new Date().getFullYear();

  if (isProduction) {
    // PostgreSQL version
    db.query(`
      SELECT 
        EXTRACT(MONTH FROM sl.sell_date) as month,
        EXTRACT(YEAR FROM sl.sell_date) as year,
        SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares) as monthly_earnings,
        COUNT(*) as transactions_count
      FROM share_lots sl
      WHERE sl.user_id = $1 
        AND sl.status = 'sold'
        AND EXTRACT(YEAR FROM sl.sell_date) = $2
      GROUP BY EXTRACT(MONTH FROM sl.sell_date), EXTRACT(YEAR FROM sl.sell_date)
      ORDER BY month ASC
    `, [userId, year])
    .then(result => {
      // Create complete year data with all months
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const completeYearData = monthNames.map((monthName, index) => {
        const monthNumber = (index + 1).toString().padStart(2, '0');
        const existingData = result.rows.find(data => data.month.toString().padStart(2, '0') === monthNumber);
        
        return {
          month: monthName,
          monthNumber: monthNumber,
          earnings: existingData ? parseFloat(existingData.monthly_earnings.toFixed(2)) : 0,
          transactions: existingData ? existingData.transactions_count : 0
        };
      });

      res.json({ 
        year: parseInt(year),
        monthlyEarnings: completeYearData,
        totalEarnings: completeYearData.reduce((sum, month) => sum + month.earnings, 0)
      });
    })
    .catch(err => {
      console.error('Earnings query error:', err);
      res.status(500).json({ error: 'Database error' });
    });
  } else {
    // SQLite version
    db.all(`
      SELECT 
        strftime('%m', sl.sell_date) as month,
        strftime('%Y', sl.sell_date) as year,
        SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares) as monthly_earnings,
        COUNT(*) as transactions_count
      FROM share_lots sl
      WHERE sl.user_id = ? 
        AND sl.status = 'sold'
        AND strftime('%Y', sl.sell_date) = ?
      GROUP BY strftime('%m', sl.sell_date), strftime('%Y', sl.sell_date)
      ORDER BY month ASC
    `, [userId, year.toString()], (err, monthlyData) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Create complete year data with all months
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const completeYearData = monthNames.map((monthName, index) => {
        const monthNumber = (index + 1).toString().padStart(2, '0');
        const existingData = monthlyData.find(data => data.month === monthNumber);
        
        return {
          month: monthName,
          monthNumber: monthNumber,
          earnings: existingData ? parseFloat(existingData.monthly_earnings.toFixed(2)) : 0,
          transactions: existingData ? existingData.transactions_count : 0
        };
      });

      res.json({ 
        year: parseInt(year),
        monthlyEarnings: completeYearData,
        totalEarnings: completeYearData.reduce((sum, month) => sum + month.earnings, 0)
      });
    });
  }
});

// Delete individual share lot
app.delete('/api/share-lots/:lotId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const lotId = req.params.lotId;

  // Check if the share lot belongs to the user and is active
  db.get('SELECT id, stock_id, shares, buy_transaction_id FROM share_lots WHERE id = ? AND user_id = ? AND status = ?', 
    [lotId, userId, 'active'], (err, lot) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!lot) {
        return res.status(404).json({ error: 'Share lot not found or not deletable' });
      }

      // Start transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Delete the share lot
        db.run('DELETE FROM share_lots WHERE id = ?', [lotId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error deleting share lot' });
          }

          // Update the corresponding buy transaction
          db.run('UPDATE transactions SET shares = shares - ?, total_amount = total_amount - (? * price_per_share) WHERE id = ?', 
            [lot.shares, lot.shares, lot.buy_transaction_id], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error updating transaction' });
              }

              // If the transaction has no shares left, delete it
              db.get('SELECT shares FROM transactions WHERE id = ?', [lot.buy_transaction_id], (err, transaction) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Database error' });
                }

                if (transaction.shares <= 0) {
                  db.run('DELETE FROM transactions WHERE id = ?', [lot.buy_transaction_id], function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Error deleting empty transaction' });
                    }
                    
                    db.run('COMMIT');
                    res.json({ 
                      message: 'Share lot deleted successfully',
                      deletedLot: {
                        id: lotId,
                        shares: lot.shares,
                        stockId: lot.stock_id
                      }
                    });
                  });
                } else {
                  db.run('COMMIT');
                  res.json({ 
                    message: 'Share lot deleted successfully',
                    deletedLot: {
                      id: lotId,
                      shares: lot.shares,
                      stockId: lot.stock_id
                    }
                  });
                }
              });
            });
        });
      });
    });
});

// Delete transactions
app.delete('/api/transactions', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { transactionIds } = req.body;

  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one transaction to delete' });
  }

  // Verify all transactions belong to the user
  const placeholders = transactionIds.map(() => '?').join(',');
  db.all(`SELECT id, transaction_type FROM transactions WHERE id IN (${placeholders}) AND user_id = ?`, 
    [...transactionIds, userId], (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (transactions.length !== transactionIds.length) {
        return res.status(400).json({ error: 'Some transactions not found or not accessible' });
      }

      // Start transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Delete the transactions
        db.run(`DELETE FROM transactions WHERE id IN (${placeholders}) AND user_id = ?`, 
          [...transactionIds, userId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error deleting transactions' });
            }

            // Update related share_lots (for sell transactions)
            const sellTransactionIds = transactions
              .filter(t => t.transaction_type === 'sell')
              .map(t => t.id);

            if (sellTransactionIds.length > 0) {
              const sellPlaceholders = sellTransactionIds.map(() => '?').join(',');
              db.run(`UPDATE share_lots SET sell_transaction_id = NULL, sell_price_per_share = NULL, sell_date = NULL, status = 'active' WHERE sell_transaction_id IN (${sellPlaceholders})`, 
                sellTransactionIds, function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error updating share lots' });
                  }
                  
                  db.run('COMMIT');
                  res.json({ 
                    message: 'Transactions deleted successfully',
                    deletedCount: this.changes
                  });
                });
            } else {
              db.run('COMMIT');
              res.json({ 
                message: 'Transactions deleted successfully',
                deletedCount: this.changes
              });
            }
          });
      });
    });
});

// Edit share lot (buy date, price, and shares)
app.put('/api/share-lots/:lotId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const lotId = req.params.lotId;
  const { buy_date, buy_price_per_share, shares } = req.body;

  // Validate input
  if (!buy_date || !buy_price_per_share || buy_price_per_share <= 0 || !shares || shares <= 0) {
    return res.status(400).json({ error: 'Valid buy date, price, and shares are required' });
  }

  // Check if the share lot belongs to the user and is active
  db.get('SELECT id, stock_id, shares as old_shares FROM share_lots WHERE id = ? AND user_id = ? AND status = ?', 
    [lotId, userId, 'active'], (err, lot) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!lot) {
        return res.status(404).json({ error: 'Share lot not found or not editable' });
      }

      // Update the share lot
      db.run('UPDATE share_lots SET buy_date = ?, buy_price_per_share = ?, shares = ? WHERE id = ?', 
        [buy_date, buy_price_per_share, shares, lotId], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating share lot' });
          }

          // Update the corresponding transaction
          db.run('UPDATE transactions SET price_per_share = ?, total_amount = ?, transaction_date = ?, shares = ? WHERE id = (SELECT buy_transaction_id FROM share_lots WHERE id = ?)', 
            [buy_price_per_share, shares * buy_price_per_share, buy_date, shares, lotId], function(err) {
              if (err) {
                return res.status(500).json({ error: 'Error updating transaction' });
              }

              res.json({ 
                message: 'Share lot updated successfully',
                updatedLot: {
                  id: parseInt(lotId),
                  buy_date,
                  buy_price_per_share: parseFloat(buy_price_per_share),
                  shares: parseInt(shares)
                }
              });
            });
        });
    });
});

// Test endpoint to check database structure
app.get('/api/test-db', authenticateToken, (req, res) => {
  if (isProduction) {
    db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    .then(result => {
      res.json({ tables: result.rows.map(row => row.table_name) });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
  } else {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ tables: tables.map(t => t.name) });
    });
  }
});

// Test endpoint to check share_lots table
app.get('/api/test-share-lots', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  if (isProduction) {
    db.query(`
      SELECT * FROM share_lots WHERE user_id = $1 LIMIT 5
    `, [userId])
    .then(result => {
      res.json({ share_lots: result.rows });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
  } else {
    db.all("SELECT * FROM share_lots WHERE user_id = ? LIMIT 5", [userId], (err, shareLots) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ share_lots: shareLots });
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});