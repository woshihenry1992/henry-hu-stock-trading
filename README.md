# Henry Hu's Stock Trading Web Application

A full-stack web application for tracking stock investments, managing transactions, and calculating profit/loss.

## 🚀 Current Status

**Phase 1 Complete**: Basic setup with authentication system

### ✅ What's Working
- **Backend Server** (Node.js + Express + SQLite)
  - User registration and login
  - JWT token authentication
  - Database setup with users, stocks, and transactions tables
  - API endpoints for authentication

- **Frontend** (React + Tailwind CSS)
  - User registration and login forms
  - Protected routes with authentication
  - Responsive navigation bar
  - Basic dashboard layout

### 🔧 Technical Stack
- **Backend**: Node.js, Express, SQLite, JWT, bcryptjs
- **Frontend**: React, React Router, Axios, Tailwind CSS
- **Database**: SQLite (file-based, perfect for development)

## 🏃‍♂️ How to Run

### Prerequisites
- Node.js (v14 or higher)
- npm

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend will run on: http://localhost:3001

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend will run on: http://localhost:3000

## 📋 Next Steps (Phase 2)

The following features will be implemented next:

1. **Stock Management**
   - Add new stocks to track
   - List user's stocks
   - Stock details view

2. **Transaction System**
   - Buy transactions (shares + price)
   - Transaction history table
   - Select multiple buy records

3. **Selling & Calculations**
   - Sell transactions
   - Average price calculations
   - Profit/loss calculations

4. **Dashboard Features**
   - Portfolio summary
   - Real-time totals
   - Performance metrics

## 🔐 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile (protected)
- `GET /api/health` - Health check

### Database Schema
- **users**: id, username, password, created_at
- **stocks**: id, user_id, stock_name, created_at
- **transactions**: id, user_id, stock_id, transaction_type, shares, price_per_share, total_amount, transaction_date

## 🎯 Features Planned

Based on the requirements, the application will include:

1. **User Authentication** ✅
2. **Add New Stock** (Next)
3. **Buy Transactions** (Next)
4. **Select and Calculate Average Price** (Next)
5. **Sell Function with Profit/Loss** (Next)
6. **Dynamic Portfolio Summary** (Next)

## 🛠️ Development Notes

- Backend runs on port 3001 (changed from 5000 due to AirTunes conflict)
- Frontend runs on port 3000
- SQLite database file: `backend/stock_trading.db`
- JWT tokens expire in 24 hours
- All passwords are hashed with bcrypt

---

**Ready for Phase 2: Stock Management Features!** 🚀 