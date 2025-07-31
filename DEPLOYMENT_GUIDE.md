# 🚀 **DEPLOYMENT GUIDE - Stock Trading App**

**Date:** July 31, 2025  
**Status:** ✅ **READY FOR DEPLOYMENT**

## 📋 **Deployment Strategy**

### **Platforms:**
- **Frontend (React):** Vercel (excellent for React apps)
- **Backend (Node.js):** Railway (great for APIs)
- **Database:** Railway PostgreSQL (production-ready)

### **Benefits:**
- ✅ **Free tiers** available
- ✅ **Automatic deployments** from Git
- ✅ **SSL certificates** included
- ✅ **Global CDN** for frontend
- ✅ **Database backups** included

## 🔧 **Pre-Deployment Checklist**

### ✅ **Completed:**
- ✅ Database configuration (SQLite → PostgreSQL)
- ✅ Environment variables setup
- ✅ API URL configuration
- ✅ CORS configuration
- ✅ JWT secret environment variable
- ✅ Production dependencies added
- ✅ All features tested locally

## 📦 **Step 1: Prepare Your Code**

### **1.1 Install PostgreSQL Dependencies**
```bash
cd backend
npm install pg
```

### **1.2 Test Local Setup**
```bash
# Test backend
curl http://localhost:3001/api/health

# Test frontend
curl http://localhost:3000
```

## 🌐 **Step 2: Deploy Backend to Railway**

### **2.1 Create Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project

### **2.2 Deploy Backend**
1. **Connect GitHub repository**
2. **Add environment variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-here
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   ```

3. **Deploy settings:**
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### **2.3 Add PostgreSQL Database**
1. In Railway dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. Connect to your backend service
4. Copy the `DATABASE_URL` to environment variables

### **2.4 Get Backend URL**
- Railway will provide: `https://your-app-name.railway.app`
- Save this URL for frontend configuration

## 🎨 **Step 3: Deploy Frontend to Vercel**

### **3.1 Create Vercel Account**
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository

### **3.2 Configure Frontend**
1. **Set environment variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.railway.app
   ```

2. **Build settings:**
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

### **3.3 Deploy**
1. Click "Deploy"
2. Vercel will build and deploy your app
3. Get your frontend URL: `https://your-app-name.vercel.app`

## 🔗 **Step 4: Connect Frontend to Backend**

### **4.1 Update CORS in Railway**
1. Go to Railway backend environment variables
2. Update `CORS_ORIGIN` to your Vercel domain:
   ```
   CORS_ORIGIN=https://your-app-name.vercel.app
   ```

### **4.2 Redeploy Backend**
1. Railway will automatically redeploy
2. Test the connection

## 🧪 **Step 5: Testing**

### **5.1 Test Backend**
```bash
curl https://your-backend-url.railway.app/api/health
```

### **5.2 Test Frontend**
1. Visit your Vercel URL
2. Test login/register
3. Test all features

### **5.3 Test Database**
1. Create a test user
2. Add some stocks
3. Make transactions
4. Verify data persists

## 🔧 **Step 6: Environment Variables**

### **Backend (Railway):**
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
DATABASE_URL=postgresql://username:password@host:port/database
CORS_ORIGIN=https://your-frontend-domain.vercel.app
PORT=3001
```

### **Frontend (Vercel):**
```
REACT_APP_API_URL=https://your-backend-url.railway.app
```

## 🛡️ **Step 7: Security Checklist**

### ✅ **Backend Security:**
- ✅ JWT secret in environment variables
- ✅ CORS properly configured
- ✅ Database connection secured
- ✅ Input validation in place

### ✅ **Frontend Security:**
- ✅ API URL in environment variables
- ✅ HTTPS enforced
- ✅ No sensitive data in code

## 📊 **Step 8: Monitoring**

### **Railway Monitoring:**
- Logs available in dashboard
- Performance metrics
- Error tracking

### **Vercel Monitoring:**
- Build logs
- Performance analytics
- Error tracking

## 🚨 **Troubleshooting**

### **Common Issues:**

**1. CORS Errors:**
- Check `CORS_ORIGIN` environment variable
- Ensure frontend URL is correct

**2. Database Connection:**
- Verify `DATABASE_URL` is correct
- Check Railway database is running

**3. JWT Issues:**
- Ensure `JWT_SECRET` is set
- Check token expiration

**4. API 404 Errors:**
- Verify backend URL in frontend
- Check Railway deployment status

## 📈 **Step 9: Post-Deployment**

### **✅ Verify Everything Works:**
1. **User Registration/Login** ✅
2. **Stock Management** ✅
3. **Trading Features** ✅
4. **Portfolio Analytics** ✅
5. **Charts and Reports** ✅

### **🔧 Optional Optimizations:**
1. **Custom Domain** (Vercel/Railway)
2. **Database Backups** (Railway)
3. **Performance Monitoring**
4. **Error Tracking** (Sentry)

## 🎯 **Your Deployed URLs**

After deployment, you'll have:
- **Frontend:** `https://your-app-name.vercel.app`
- **Backend:** `https://your-backend-url.railway.app`
- **Database:** Managed by Railway

## ✅ **DEPLOYMENT COMPLETE**

**Status:** 🟢 **READY TO DEPLOY**

Your application is fully prepared for deployment with all features intact and production-ready configuration.

**Next:** Follow the step-by-step guide above to deploy to Vercel and Railway! 