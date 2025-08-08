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
  origin: [
    'http://localhost:3000',
    'https://henry-hu-stock-trading.vercel.app',
    'https://henry-hu-stock-trading.onrender.com'
  ],
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

// Test share_lots table
app.get('/api/test-share-lots', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  if (isProduction) {
    // Test if share_lots table exists and has data
    pgPool.query(`
      SELECT 
        COUNT(*) as total_lots,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_lots,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_lots
      FROM share_lots 
      WHERE user_id = $1
    `, [userId])
    .then(result => {
      res.json({ 
        message: 'Share_lots table test successful',
        data: result.rows[0],
        userId: userId
      });
    })
    .catch(err => {
      console.error('Share_lots table test error:', err);
      res.status(500).json({ 
        error: 'Share_lots table test failed', 
        details: err.message,
        userId: userId
      });
    });
  } else {
    // SQLite version
    db.get(`
      SELECT 
        COUNT(*) as total_lots,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_lots,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_lots
      FROM share_lots 
      WHERE user_id = ?
    `, [userId], (err, result) => {
      if (err) {
        console.error('SQLite share_lots table test error:', err);
        return res.status(500).json({ 
          error: 'Share_lots table test failed', 
          details: err.message,
          userId: userId
        });
      }
      res.json({ 
        message: 'Share_lots table test successful',
        data: result,
        userId: userId
      });
    });
  }
});

// Clean all data (DANGEROUS - only use for testing)
app.delete('/api/clean-all-data', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  if (isProduction) {
    // PostgreSQL version - clean all data
    console.log('Cleaning all data for user:', userId);
    
    pgPool.query('BEGIN')
      .then(() => {
        // Delete in correct order to respect foreign keys
        return pgPool.query('DELETE FROM share_lots WHERE user_id = $1', [userId]);
      })
      .then(() => {
        return pgPool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      })
      .then(() => {
        return pgPool.query('DELETE FROM stocks WHERE user_id = $1', [userId]);
      })
      .then(() => {
        return pgPool.query('DELETE FROM users WHERE id = $1', [userId]);
      })
      .then(() => {
        return pgPool.query('COMMIT');
      })
      .then(() => {
        console.log('All data cleaned successfully for user:', userId);
        res.json({ 
          message: 'All data cleaned successfully',
          userId: userId
        });
      })
      .catch(err => {
        console.error('Error cleaning data:', err);
        return pgPool.query('ROLLBACK')
          .then(() => {
            res.status(500).json({ 
              error: 'Failed to clean data', 
              details: err.message
            });
          });
      });
  } else {
    // SQLite version
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      db.run('DELETE FROM share_lots WHERE user_id = ?', [userId], (err) => {
        if (err) {
          console.error('Error deleting share_lots:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to clean share_lots' });
        }
        
        db.run('DELETE FROM transactions WHERE user_id = ?', [userId], (err) => {
          if (err) {
            console.error('Error deleting transactions:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to clean transactions' });
          }
          
          db.run('DELETE FROM stocks WHERE user_id = ?', [userId], (err) => {
            if (err) {
              console.error('Error deleting stocks:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to clean stocks' });
            }
            
            db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
              if (err) {
                console.error('Error deleting user:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to clean user' });
              }
              
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  return res.status(500).json({ error: 'Failed to commit cleanup' });
                }
                
                console.log('All data cleaned successfully for user:', userId);
                res.json({ 
                  message: 'All data cleaned successfully',
                  userId: userId
                });
              });
            });
          });
        });
      });
    });
  }
});

// Test earnings query without year filter
app.get('/api/test-earnings-no-year', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  if (isProduction) {
    // Test query without year filter
    pgPool.query(`
      SELECT 
        COUNT(*) as total_sold_lots,
        COALESCE(SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares), 0) as total_earnings
      FROM share_lots sl
      WHERE sl.user_id = $1 
        AND sl.status = 'sold'
        AND sl.sell_date IS NOT NULL
    `, [userId])
    .then(result => {
      res.json({ 
        message: 'Test query without year filter',
        result: result.rows[0],
        userId: userId
      });
    })
    .catch(err => {
      console.error('Test query error:', err);
      res.status(500).json({ 
        error: 'Test query failed', 
        details: err.message,
        userId: userId
      });
    });
  } else {
    res.json({ error: 'Test endpoint only available in production' });
  }
});

// Debug earnings calculation
app.get('/api/debug-earnings', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  if (isProduction) {
    // Get detailed information about sold shares
    pgPool.query(`
      SELECT 
        sl.id,
        sl.shares,
        sl.buy_price_per_share,
        sl.sell_price_per_share,
        sl.buy_date,
        sl.sell_date,
        sl.status,
        EXTRACT(YEAR FROM sl.sell_date) as sell_year,
        (sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares as earnings_per_lot
      FROM share_lots sl
      WHERE sl.user_id = $1 
        AND sl.status = 'sold'
        AND sl.sell_date IS NOT NULL
      ORDER BY sl.sell_date DESC
    `, [userId])
    .then(result => {
      const totalEarnings = result.rows.reduce((sum, row) => {
        return sum + parseFloat(row.earnings_per_lot || 0);
      }, 0);
      
      // Group by year
      const earningsByYear = {};
      result.rows.forEach(row => {
        const year = row.sell_year;
        if (!earningsByYear[year]) {
          earningsByYear[year] = 0;
        }
        earningsByYear[year] += parseFloat(row.earnings_per_lot || 0);
      });
      
      res.json({ 
        message: 'Debug earnings calculation',
        soldLots: result.rows,
        totalEarnings: totalEarnings,
        earningsByYear: earningsByYear,
        userId: userId
      });
    })
    .catch(err => {
      console.error('Debug earnings query error:', err);
      res.status(500).json({ 
        error: 'Debug earnings query failed', 
        details: err.message,
        userId: userId
      });
    });
  } else {
    // SQLite version
    db.get(`
      SELECT 
        COUNT(*) as total_lots,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_lots,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_lots
      FROM share_lots 
      WHERE user_id = ?
    `, [userId], (err, result) => {
      if (err) {
        console.error('SQLite share_lots table test error:', err);
        return res.status(500).json({ 
          error: 'Share_lots table test failed', 
          details: err.message,
          userId: userId
        });
      }
      res.json({ 
        message: 'Share_lots table test successful',
        data: result,
        userId: userId
      });
    });
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
    if (isProduction) {
      // PostgreSQL version
      try {
        const result = await pgPool.query(
          'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
          [username, hashedPassword]
        );
        res.status(201).json({
          message: 'User created successfully',
          userId: result.rows[0].id
        });
      } catch (err) {
        if (err.code === '23505') { // unique_violation
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Error creating user', details: err.message });
      }
    } else {
      // SQLite version
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
    }
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

  if (isProduction) {
    // PostgreSQL version
    if (!pgPool) {
      console.error('pgPool not initialized');
      return res.status(500).json({ error: 'Database connection not available' });
    }

    pgPool.query('SELECT * FROM users WHERE username = $1', [username])
      .then(async (result) => {
        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
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
      })
      .catch(err => {
        console.error('Login database error:', err);
        res.status(500).json({ error: 'Database error' });
      });
  } else {
    // SQLite version
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
  }
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

// Update stock name
app.put('/api/stocks/:stockId', authenticateToken, (req, res) => {
  const { stockId } = req.params;
  const { stock_name } = req.body;
  const userId = req.user.userId;

  if (!stock_name || stock_name.trim() === '') {
    return res.status(400).json({ error: 'Stock name is required' });
  }

  // Verify stock belongs to user
  const verifyAndUpdate = (stock) => {
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Check if new name already exists for this user (excluding current stock)
    const checkDuplicate = (callback) => {
      if (isProduction) {
        pgPool.query('SELECT * FROM stocks WHERE user_id = $1 AND stock_name = $2 AND id != $3', 
          [userId, stock_name.trim(), stockId])
          .then(result => callback(null, result.rows[0]))
          .catch(err => callback(err));
      } else {
        db.get('SELECT * FROM stocks WHERE user_id = ? AND stock_name = ? AND id != ?', 
          [userId, stock_name.trim(), stockId], callback);
      }
    };

    checkDuplicate((err, duplicate) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (duplicate) {
        return res.status(400).json({ error: 'Stock name already exists' });
      }

      // Update stock name
      if (isProduction) {
        pgPool.query('UPDATE stocks SET stock_name = $1 WHERE id = $2 AND user_id = $3', 
          [stock_name.trim(), stockId, userId])
          .then(() => {
            res.json({ message: 'Stock renamed successfully' });
          })
          .catch(err => {
            console.error('Error updating stock:', err);
            res.status(500).json({ error: 'Failed to update stock' });
          });
      } else {
        db.run('UPDATE stocks SET stock_name = ? WHERE id = ? AND user_id = ?', 
          [stock_name.trim(), stockId, userId], function(err) {
            if (err) {
              console.error('Error updating stock:', err);
              return res.status(500).json({ error: 'Failed to update stock' });
            }
            res.json({ message: 'Stock renamed successfully' });
          });
      }
    });
  };

  // First verify stock ownership
  if (isProduction) {
    pgPool.query('SELECT * FROM stocks WHERE id = $1 AND user_id = $2', [stockId, userId])
      .then(result => verifyAndUpdate(result.rows[0]))
      .catch(err => {
        console.error('Error verifying stock:', err);
        res.status(500).json({ error: 'Database error' });
      });
  } else {
    db.get('SELECT * FROM stocks WHERE id = ? AND user_id = ?', 
      [stockId, userId], (err, stock) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        verifyAndUpdate(stock);
      });
  }
});

// Delete stock (and all related data)
app.delete('/api/stocks/:stockId', authenticateToken, (req, res) => {
  const { stockId } = req.params;
  const userId = req.user.userId;

  // Verify stock belongs to user
  const verifyAndDelete = (stock) => {
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Delete in correct order: share_lots -> transactions -> stock
    if (isProduction) {
      pgPool.query('BEGIN')
        .then(() => {
          // Delete share_lots first
          return pgPool.query('DELETE FROM share_lots WHERE stock_id = $1', [stockId]);
        })
        .then(() => {
          // Delete transactions
          return pgPool.query('DELETE FROM transactions WHERE stock_id = $1', [stockId]);
        })
        .then(() => {
          // Delete stock
          return pgPool.query('DELETE FROM stocks WHERE id = $1 AND user_id = $2', [stockId, userId]);
        })
        .then(() => {
          return pgPool.query('COMMIT');
        })
        .then(() => {
          res.json({ message: 'Stock and all related data deleted successfully' });
        })
        .catch(err => {
          pgPool.query('ROLLBACK');
          console.error('Error deleting stock:', err);
          res.status(500).json({ error: 'Failed to delete stock' });
        });
    } else {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete share_lots first
        db.run('DELETE FROM share_lots WHERE stock_id = ?', [stockId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to delete share lots' });
          }
          
          // Delete transactions
          db.run('DELETE FROM transactions WHERE stock_id = ?', [stockId], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to delete transactions' });
            }
            
            // Delete stock
            db.run('DELETE FROM stocks WHERE id = ? AND user_id = ?', [stockId, userId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete stock' });
              }
              
              db.run('COMMIT');
              res.json({ message: 'Stock and all related data deleted successfully' });
            });
          });
        });
      });
    }
  };

  // First verify stock ownership
  if (isProduction) {
    pgPool.query('SELECT * FROM stocks WHERE id = $1 AND user_id = $2', [stockId, userId])
      .then(result => verifyAndDelete(result.rows[0]))
      .catch(err => {
        console.error('Error verifying stock:', err);
        res.status(500).json({ error: 'Database error' });
      });
  } else {
    db.get('SELECT * FROM stocks WHERE id = ? AND user_id = ?', 
      [stockId, userId], (err, stock) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        verifyAndDelete(stock);
      });
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
app.post('/api/stocks/:stockId/sell-lots', authenticateToken, async (req, res) => {
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

  if (isProduction) {
    // PostgreSQL version
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      // 1. Verify stock belongs to user
      const stockResult = await client.query('SELECT * FROM stocks WHERE id = $1 AND user_id = $2', [stockId, userId]);
      if (stockResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Stock not found' });
      }
      // 2. Fetch all lots to sell and check they are all active
      const lotsResult = await client.query(
        `SELECT * FROM share_lots WHERE id = ANY($1) AND user_id = $2 AND stock_id = $3 AND status = 'active'`,
        [lotIds, userId, stockId]
      );
      if (lotsResult.rows.length !== lotIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Some selected lots are not available for sale' });
      }
      // 3. Calculate total shares
      const totalShares = lotsResult.rows.reduce((sum, lot) => sum + Number(lot.shares), 0);
      const totalAmount = totalShares * sellPricePerShare;
      // 4. Create sell transaction
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [userId, stockId, 'sell', totalShares, sellPricePerShare, totalAmount, sellDateValue]
      );
      const sellTransactionId = txResult.rows[0].id;
      // 5. Update all selected lots as sold
      for (const lot of lotsResult.rows) {
        await client.query(
          `UPDATE share_lots SET sell_transaction_id = $1, sell_price_per_share = $2, sell_date = $3, status = 'sold' WHERE id = $4`,
          [sellTransactionId, sellPricePerShare, sellDateValue, lot.id]
        );
      }
      await client.query('COMMIT');
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
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Database error', details: err.message });
    } finally {
      client.release();
    }
  } else {
    // SQLite version
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
  }
});

// Get portfolio summary
app.get('/api/portfolio', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  if (isProduction) {
    // PostgreSQL version - calculate actual_earned for each stock
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
      // For each stock, get the share lots data separately
      const portfolioPromises = result.rows.map(async (stock) => {
        try {
          // Get current shares and total invested
          const shareLotsResult = await pgPool.query(`
            SELECT 
              COALESCE(SUM(shares), 0) as current_shares,
              COALESCE(SUM(shares * buy_price_per_share), 0) as total_invested_current
            FROM share_lots 
            WHERE stock_id = $1 AND user_id = $2 AND status = 'active'
          `, [stock.id, userId]);
          const shareData = shareLotsResult.rows[0];
          const currentShares = parseFloat(shareData.current_shares) || 0;
          const totalInvested = parseFloat(shareData.total_invested_current) || 0;
          const avgBuyPrice = currentShares > 0 ? totalInvested / currentShares : 0;

          // Get actual earned (realized earnings from sold lots)
          const earnedResult = await pgPool.query(`
            SELECT 
              COALESCE(SUM((sell_price_per_share - buy_price_per_share) * shares), 0) as actual_earned
            FROM share_lots
            WHERE stock_id = $1 AND user_id = $2 AND status = 'sold' AND sell_date IS NOT NULL
          `, [stock.id, userId]);
          const actualEarned = parseFloat(earnedResult.rows[0].actual_earned) || 0;

          return {
            ...stock,
            current_shares: parseInt(currentShares),
            avg_buy_price: parseFloat(avgBuyPrice.toFixed(2)),
            total_invested: parseFloat(totalInvested.toFixed(2)),
            actual_earned: parseFloat(actualEarned.toFixed(2))
          };
        } catch (err) {
          return {
            ...stock,
            current_shares: 0,
            avg_buy_price: 0,
            total_invested: 0,
            actual_earned: 0,
            error: err.message
          };
        }
      });
      Promise.all(portfolioPromises).then(portfolio => res.json(portfolio));
    })
    .catch(err => {
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

// Debug endpoint to test portfolio query
app.get('/api/debug-portfolio', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const stockId = req.query.stock_id;

  if (isProduction) {
    // Test the exact query being used in portfolio
    pgPool.query(`
      SELECT 
        COALESCE(SUM(shares), 0) as current_shares,
        COALESCE(SUM(shares * buy_price_per_share), 0) as total_invested_current
      FROM share_lots 
      WHERE stock_id = $1 AND status = 'active'
    `, [stockId])
    .then(result => {
      res.json({
        stock_id: stockId,
        query_result: result.rows[0],
        expected_shares: 10
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
  } else {
    res.json({ error: 'Debug endpoint only available in production' });
  }
});

// Simple test endpoint for portfolio calculation
app.get('/api/test-portfolio-calculation', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const stockId = req.query.stock_id || 11;

  if (isProduction) {
    // Test the portfolio calculation step by step
    pgPool.query(`
      SELECT 
        s.id,
        s.stock_name,
        s.created_at
      FROM stocks s
      WHERE s.id = $1 AND s.user_id = $2
    `, [stockId, userId])
    .then(result => {
      if (result.rows.length === 0) {
        return res.json({ error: 'Stock not found' });
      }
      
      const stock = result.rows[0];
      
      return pgPool.query(`
        SELECT 
          COALESCE(SUM(shares), 0) as current_shares,
          COALESCE(SUM(shares * buy_price_per_share), 0) as total_invested_current
        FROM share_lots 
        WHERE stock_id = $1 AND status = 'active'
      `, [stock.id])
      .then(shareLotsResult => {
        const shareData = shareLotsResult.rows[0];
        // Convert string values to numbers
        const currentShares = parseFloat(shareData.current_shares) || 0;
        const totalInvested = parseFloat(shareData.total_invested_current) || 0;
        const avgBuyPrice = currentShares > 0 ? totalInvested / currentShares : 0;
        
        const portfolioItem = {
        ...stock,
          current_shares: parseInt(currentShares),
          avg_buy_price: parseFloat(avgBuyPrice.toFixed(2)),
          total_invested: parseFloat(totalInvested.toFixed(2)),
          actual_earned: 0
        };
        
        res.json({
          stock,
          shareData,
          portfolioItem,
          debug: {
            stockId,
            userId,
            shareLotsQuery: `SELECT COALESCE(SUM(shares), 0) as current_shares, COALESCE(SUM(shares * buy_price_per_share), 0) as total_invested_current FROM share_lots WHERE stock_id = ${stock.id} AND status = 'active'`
          }
        });
      });
    })
    .catch(err => {
      console.error('Test portfolio calculation error:', err);
      res.status(500).json({ error: err.message });
    });
  } else {
    res.json({ error: 'Test endpoint only available in production' });
  }
});

// Get monthly earnings data for charts
app.get('/api/earnings/monthly', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  console.log('Earnings query - userId:', userId, 'year:', year, 'year type:', typeof year, 'isProduction:', isProduction);

  if (isProduction) {
    // PostgreSQL version - simplified query first
    console.log('Earnings query - Production mode, userId:', userId, 'year:', year);
    
    // First, check if pgPool is available
    if (!pgPool) {
      console.error('pgPool not initialized');
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    // Get total earnings for the specific year - TEMPORARY FIX
            console.log('Running total earnings query with userId:', userId, 'year:', year, 'DEPLOYMENT TEST');
    
    // First get all earnings and filter by year in JavaScript as fallback
    pgPool.query(`
      SELECT 
        sl.shares,
        sl.buy_price_per_share,
        sl.sell_price_per_share,
        sl.sell_date,
        EXTRACT(YEAR FROM sl.sell_date) as sell_year,
        (sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares as earnings_per_lot
      FROM share_lots sl
      WHERE sl.user_id = $1 
        AND sl.status = 'sold'
        AND sl.sell_date IS NOT NULL
    `, [userId])
    .then(result => {
      console.log('All earnings query successful, rows:', result.rows.length);
      
      // Filter by year in JavaScript and calculate total
      const targetYear = parseInt(year);
      console.log('Target year (parsed):', targetYear, 'Type:', typeof targetYear);
      
      const yearFilteredRows = result.rows.filter(row => {
        const rowYear = parseInt(row.sell_year);
        console.log('Row year:', rowYear, 'Target year:', targetYear, 'Match:', rowYear === targetYear);
        return rowYear === targetYear;
      });
      
      console.log('Year filtered rows:', yearFilteredRows.length);
      
      const totalEarnings = yearFilteredRows.reduce((sum, row) => {
        return sum + parseFloat(row.earnings_per_lot || 0);
      }, 0);
      
      console.log('Calculated total earnings for year', year, ':', totalEarnings);
      
      // Debug: Check what years have data
      return pgPool.query(`
        SELECT 
          sl.sell_date,
          EXTRACT(YEAR FROM sl.sell_date) as year,
          EXTRACT(YEAR FROM sl.sell_date)::text as year_text,
          COUNT(*) as count,
          SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares) as earnings
        FROM share_lots sl
        WHERE sl.user_id = $1 
          AND sl.status = 'sold'
          AND sl.sell_date IS NOT NULL
        GROUP BY sl.sell_date, EXTRACT(YEAR FROM sl.sell_date)
        ORDER BY year DESC
        LIMIT 5
      `, [userId])
      .then(debugResult => {
        console.log('Available years with data:', debugResult.rows);
        
        // Add debug info to the response
        const debugInfo = {
          availableYears: debugResult.rows,
          requestedYear: year,
          totalEarnings: totalEarnings
        };
        
        // Now get monthly breakdown for the specific year
        return pgPool.query(`
          SELECT 
            EXTRACT(MONTH FROM sl.sell_date) as month,
            SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares) as monthly_earnings,
            COUNT(*) as transactions_count
          FROM share_lots sl
          WHERE sl.user_id = $1 
            AND sl.status = 'sold'
            AND sl.sell_date IS NOT NULL
            AND EXTRACT(YEAR FROM sl.sell_date) = $2
          GROUP BY EXTRACT(MONTH FROM sl.sell_date)
          ORDER BY month ASC
        `, [userId, year])
        .then(monthlyResult => {
          return { totalEarnings, debugResult, monthlyResult };
        });
      })
      .then(({ totalEarnings, debugResult, monthlyResult }) => {
        console.log('Monthly earnings query successful, rows:', monthlyResult.rows.length);
        
        // Create complete year data with all months
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        console.log('Monthly data for year', year, ':', monthlyResult.rows.length, 'rows');
        
        const completeYearData = monthNames.map((monthName, index) => {
          const monthNumber = (index + 1).toString().padStart(2, '0');
          const existingData = monthlyResult.rows.find(data => data.month.toString().padStart(2, '0') === monthNumber);
          
          return {
            month: monthName,
            monthNumber: monthNumber,
            earnings: existingData ? parseFloat(existingData.monthly_earnings.toFixed(2)) : 0,
            transactions: existingData ? existingData.transactions_count : 0
          };
        });

        const response = { 
          year: parseInt(year),
          monthlyEarnings: completeYearData,
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          debugInfo: debugInfo
        };
        
        console.log('Sending earnings response:', response);
        res.json(response);
      });
    })
    .catch(err => {
      console.error('Simple earnings query error:', err);
      console.error('Error details:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Error code:', err.code);
      console.error('Error constraint:', err.constraint);
      
      // Return empty data instead of error for now
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const completeYearData = monthNames.map((monthName, index) => {
        return {
          month: monthName,
          monthNumber: (index + 1).toString().padStart(2, '0'),
          earnings: 0,
          transactions: 0
        };
      });

      const fallbackResponse = { 
        year: parseInt(year),
        monthlyEarnings: completeYearData,
        totalEarnings: 0
      };
      
      console.log('Sending fallback earnings response due to error');
      res.json(fallbackResponse);
    })
    .catch(err => {
      console.error('Simple earnings query error:', err);
      console.error('Error details:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Error code:', err.code);
      console.error('Error constraint:', err.constraint);
      
      // Return empty data instead of error for now
      console.log('Returning fallback empty earnings data');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const completeYearData = monthNames.map((monthName, index) => {
        return {
          month: monthName,
          monthNumber: (index + 1).toString().padStart(2, '0'),
          earnings: 0,
          transactions: 0
        };
      });

      const response = { 
        year: parseInt(year),
        monthlyEarnings: completeYearData,
        totalEarnings: 0
      };
      
      res.json(response);
    });
  } else {
    // SQLite version
    console.log('Earnings query - Development mode, userId:', userId, 'year:', year);
    
  db.all(`
    SELECT 
      strftime('%m', sl.sell_date) as month,
      strftime('%Y', sl.sell_date) as year,
      SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares) as monthly_earnings,
      COUNT(*) as transactions_count
    FROM share_lots sl
    WHERE sl.user_id = ? 
      AND sl.status = 'sold'
        AND sl.sell_date IS NOT NULL
      AND strftime('%Y', sl.sell_date) = ?
    GROUP BY strftime('%m', sl.sell_date), strftime('%Y', sl.sell_date)
    ORDER BY month ASC
  `, [userId, year.toString()], (err, monthlyData) => {
    if (err) {
        console.error('SQLite earnings query error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
    }

      console.log('SQLite earnings query successful, rows:', monthlyData.length);

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

      const response = { 
      year: parseInt(year),
      monthlyEarnings: completeYearData,
      totalEarnings: completeYearData.reduce((sum, month) => sum + month.earnings, 0)
      };
      
      console.log('Sending SQLite earnings response:', response);
      res.json(response);
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

  if (isProduction) {
    // PostgreSQL version
    if (!pgPool) {
      console.error('pgPool not initialized');
      return res.status(500).json({ error: 'Database connection not available' });
  }

  // Verify all transactions belong to the user
    const placeholders = transactionIds.map((_, index) => `$${index + 1}`).join(',');
    pgPool.query(`SELECT id, transaction_type FROM transactions WHERE id IN (${placeholders}) AND user_id = $${transactionIds.length + 1}`, 
      [...transactionIds, userId])
      .then(result => {
        const transactions = result.rows;
        
        if (transactions.length !== transactionIds.length) {
          return res.status(400).json({ error: 'Some transactions not found or not accessible' });
        }

        // Start database transaction
        return pgPool.query('BEGIN')
          .then(() => {
            // FIRST: Update related share_lots (for sell transactions) to remove foreign key references
            const sellTransactionIds = transactions
              .filter(t => t.transaction_type === 'sell')
              .map(t => t.id);

            if (sellTransactionIds.length > 0) {
              const updatePlaceholders = sellTransactionIds.map((_, index) => `$${index + 1}`).join(',');
              return pgPool.query(`UPDATE share_lots SET sell_transaction_id = NULL, sell_price_per_share = NULL, sell_date = NULL, status = 'active' WHERE sell_transaction_id IN (${updatePlaceholders})`, 
                sellTransactionIds);
            } else {
              return Promise.resolve(); // No sell transactions to update
            }
          })
          .then(() => {
            // SECOND: Now delete the transactions (after foreign key references are removed)
            const deletePlaceholders = transactionIds.map((_, index) => `$${index + 1}`).join(',');
            return pgPool.query(`DELETE FROM transactions WHERE id IN (${deletePlaceholders}) AND user_id = $${transactionIds.length + 1}`, 
              [...transactionIds, userId]);
          })
          .then(deleteResult => {
            return pgPool.query('COMMIT')
              .then(() => {
                res.json({ 
                  message: 'Transactions deleted successfully',
                  deletedCount: deleteResult.rowCount
                });
              });
          });
      })
      .catch(err => {
        console.error('Error deleting transactions:', err);
        return pgPool.query('ROLLBACK')
          .then(() => {
            res.status(500).json({ 
              error: 'Error deleting transactions', 
              details: err.message
            });
          })
          .catch(() => {
            res.status(500).json({ error: 'Error deleting transactions' });
          });
      });
  } else {
    // SQLite version
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
  }
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

// Monthly earnings per stock endpoint
app.get('/api/earnings/monthly-by-stock', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  console.log('Monthly earnings by stock - userId:', userId, 'year:', year);

  if (isProduction) {
    if (!pgPool) {
      console.error('pgPool not initialized');
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get monthly earnings breakdown by stock
    // First, let's see what data exists without year filter
    pgPool.query(`
      SELECT 
        s.stock_name,
        sl.sell_date,
        EXTRACT(YEAR FROM sl.sell_date) as sell_year,
        EXTRACT(MONTH FROM sl.sell_date) as month,
        (sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares as earnings_per_lot
      FROM share_lots sl
      JOIN stocks s ON sl.stock_id = s.id
      WHERE sl.user_id = $1 
        AND sl.status = 'sold'
        AND sl.sell_date IS NOT NULL
      ORDER BY sl.sell_date DESC
      LIMIT 10
    `, [userId])
      .then(debugResult => {
        console.log('Debug - Recent sold lots:', debugResult.rows);
        
        // Now run the main query
        return pgPool.query(`
          SELECT 
            s.stock_name,
            EXTRACT(MONTH FROM sl.sell_date) as month,
            SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares) as monthly_earnings,
            COUNT(*) as transactions_count
          FROM share_lots sl
          JOIN stocks s ON sl.stock_id = s.id
          WHERE sl.user_id = $1 
            AND sl.status = 'sold'
            AND sl.sell_date IS NOT NULL
            AND EXTRACT(YEAR FROM sl.sell_date) = $2
          GROUP BY s.stock_name, EXTRACT(MONTH FROM sl.sell_date)
          ORDER BY month ASC, s.stock_name ASC
        `, [userId, year]);
      })
      .then(result => {
        console.log('Monthly by stock query successful, rows:', result.rows.length);
        
        // Get all unique stocks that have earnings in this year
        const stocks = [...new Set(result.rows.map(row => row.stock_name))];
        console.log('Stocks with earnings:', stocks);
        
        // Create month structure
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Initialize data structure
        const monthlyData = monthNames.map((monthName, index) => {
          const monthNumber = index + 1;
          const monthData = result.rows.filter(row => parseInt(row.month) === monthNumber);
          
          const stockEarnings = {};
          let monthTotal = 0;
          
          // Initialize all stocks with 0
          stocks.forEach(stock => {
            stockEarnings[stock] = 0;
          });
          
          // Fill in actual earnings
          monthData.forEach(row => {
            const earnings = parseFloat(row.monthly_earnings);
            stockEarnings[row.stock_name] = earnings;
            monthTotal += earnings;
          });
          
          return {
            month: monthName,
            monthNumber: monthNumber,
            stockEarnings: stockEarnings,
            totalEarnings: parseFloat(monthTotal.toFixed(2)),
            transactions: monthData.reduce((sum, row) => sum + parseInt(row.transactions_count), 0)
          };
        });

        // Calculate total earnings for the year
        const yearTotal = monthlyData.reduce((sum, month) => sum + month.totalEarnings, 0);

        const response = {
          year: parseInt(year),
          stocks: stocks,
          monthlyData: monthlyData,
          totalEarnings: parseFloat(yearTotal.toFixed(2))
        };
        
        console.log('Sending monthly by stock response:', response);
        res.json(response);
      })
      .catch(err => {
        console.error('Monthly by stock query error:', err);
        res.status(500).json({ error: 'Failed to load earnings data by stock' });
      });
  } else {
    // SQLite version
    db.all(`
      SELECT 
        s.stock_name,
        CAST(strftime('%m', sl.sell_date) AS INTEGER) as month,
        SUM((sl.sell_price_per_share - sl.buy_price_per_share) * sl.shares) as monthly_earnings,
        COUNT(*) as transactions_count
      FROM share_lots sl
      JOIN stocks s ON sl.stock_id = s.id
      WHERE sl.user_id = ? 
        AND sl.status = 'sold'
        AND sl.sell_date IS NOT NULL
        AND CAST(strftime('%Y', sl.sell_date) AS INTEGER) = ?
      GROUP BY s.stock_name, CAST(strftime('%m', sl.sell_date) AS INTEGER)
      ORDER BY month ASC, s.stock_name ASC
    `, [userId, year], (err, rows) => {
      if (err) {
        console.error('Monthly by stock query error:', err);
        return res.status(500).json({ error: 'Failed to load earnings data by stock' });
      }

      console.log('Monthly by stock query successful, rows:', rows.length);
      
      // Process the same way as PostgreSQL version
      const stocks = [...new Set(rows.map(row => row.stock_name))];
      console.log('Stocks with earnings:', stocks);
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const monthlyData = monthNames.map((monthName, index) => {
        const monthNumber = index + 1;
        const monthData = rows.filter(row => parseInt(row.month) === monthNumber);
        
        const stockEarnings = {};
        let monthTotal = 0;
        
        // Initialize all stocks with 0
        stocks.forEach(stock => {
          stockEarnings[stock] = 0;
        });
        
        // Fill in actual earnings
        monthData.forEach(row => {
          const earnings = parseFloat(row.monthly_earnings);
          stockEarnings[row.stock_name] = earnings;
          monthTotal += earnings;
        });
        
        return {
          month: monthName,
          monthNumber: monthNumber,
          stockEarnings: stockEarnings,
          totalEarnings: parseFloat(monthTotal.toFixed(2)),
          transactions: monthData.reduce((sum, row) => sum + parseInt(row.transactions_count), 0)
        };
      });

      const yearTotal = monthlyData.reduce((sum, month) => sum + month.totalEarnings, 0);

      const response = {
        year: parseInt(year),
        stocks: stocks,
        monthlyData: monthlyData,
        totalEarnings: parseFloat(yearTotal.toFixed(2))
      };
      
      console.log('Sending monthly by stock response:', response);
      res.json(response);
    });
  }
});

// Test endpoint to debug transaction deletion
app.post('/api/test-delete-transactions', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { transactionIds } = req.body;

  console.log('Test delete - userId:', userId, 'transactionIds:', transactionIds);

  if (isProduction) {
    if (!pgPool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // First, let's see what transactions exist
    pgPool.query('SELECT id, transaction_type, user_id FROM transactions WHERE user_id = $1', [userId])
      .then(result => {
        console.log('Available transactions for user:', result.rows);
        
        if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
          return res.json({ 
            message: 'No transaction IDs provided',
            availableTransactions: result.rows
          });
        }

        // Test the verification query
        const placeholders = transactionIds.map((_, index) => `$${index + 1}`).join(',');
        console.log('Query:', `SELECT id, transaction_type FROM transactions WHERE id IN (${placeholders}) AND user_id = $${transactionIds.length + 1}`);
        console.log('Parameters:', [...transactionIds, userId]);

        return pgPool.query(`SELECT id, transaction_type FROM transactions WHERE id IN (${placeholders}) AND user_id = $${transactionIds.length + 1}`, 
          [...transactionIds, userId])
          .then(verifyResult => {
            res.json({
              message: 'Test completed',
              requestedIds: transactionIds,
              foundTransactions: verifyResult.rows,
              allUserTransactions: result.rows
            });
          });
      })
      .catch(err => {
        console.error('Test delete error:', err);
        res.status(500).json({ 
          error: 'Test failed', 
          details: err.message,
          code: err.code
        });
      });
  } else {
    res.json({ message: 'Development mode - not implemented' });
  }
});

// Admin endpoint to clear ALL data and users (no authentication required for cleanup)
app.delete('/api/admin/reset-database', (req, res) => {
  const confirmationKey = req.query.confirm;
  
  // Require confirmation key for safety
  if (confirmationKey !== 'RESET_ALL_DATA_CONFIRM') {
    return res.status(400).json({ 
      error: 'Missing confirmation key. Add ?confirm=RESET_ALL_DATA_CONFIRM to URL' 
    });
  }

  if (isProduction) {
    // PostgreSQL version - clear ALL data
    console.log('ADMIN: Clearing ALL database data');
    
    if (!pgPool) {
      console.error('pgPool not initialized');
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    pgPool.query('BEGIN')
      .then(() => {
        // Delete in correct order to respect foreign keys
        console.log('Deleting share_lots...');
        return pgPool.query('DELETE FROM share_lots');
      })
      .then(() => {
        console.log('Deleting transactions...');
        return pgPool.query('DELETE FROM transactions');
      })
      .then(() => {
        console.log('Deleting stocks...');
        return pgPool.query('DELETE FROM stocks');
      })
      .then(() => {
        console.log('Deleting users...');
        return pgPool.query('DELETE FROM users');
      })
      .then(() => {
        return pgPool.query('COMMIT');
      })
      .then(() => {
        console.log('All data cleared successfully');
        res.json({ 
          message: 'All database data cleared successfully',
          cleared: ['share_lots', 'transactions', 'stocks', 'users']
        });
      })
      .catch(err => {
        console.error('Error clearing all data:', err);
        return pgPool.query('ROLLBACK')
          .then(() => {
            res.status(500).json({ 
              error: 'Failed to clear all data', 
              details: err.message
            });
          });
      });
  } else {
    // SQLite version - clear ALL data
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      db.run('DELETE FROM share_lots', (err) => {
        if (err) {
          console.error('Error deleting share_lots:', err);
          return res.status(500).json({ error: 'Failed to clear share_lots' });
        }
        
        db.run('DELETE FROM transactions', (err) => {
          if (err) {
            console.error('Error deleting transactions:', err);
            return res.status(500).json({ error: 'Failed to clear transactions' });
          }
          
          db.run('DELETE FROM stocks', (err) => {
            if (err) {
              console.error('Error deleting stocks:', err);
              return res.status(500).json({ error: 'Failed to clear stocks' });
            }
            
            db.run('DELETE FROM users', (err) => {
              if (err) {
                console.error('Error deleting users:', err);
                return res.status(500).json({ error: 'Failed to clear users' });
              }
              
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  return res.status(500).json({ error: 'Failed to commit transaction' });
                }
                
                console.log('All data cleared successfully');
                res.json({ 
                  message: 'All database data cleared successfully',
                  cleared: ['share_lots', 'transactions', 'stocks', 'users']
                });
              });
            });
          });
        });
      });
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