# 🚀 StudyAI - Complete Deployment Guide

Complete step-by-step instructions to deploy StudyAI from development to production.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Testing Setup](#local-testing-setup)
3. [Database Setup](#database-setup)
4. [Service-by-Service Deployment](#service-by-service-deployment)
5. [Production Configuration](#production-configuration)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### **Required Accounts & Keys**
- [ ] MongoDB Atlas account (free tier available)
- [ ] Groq API key (https://console.groq.com/)
- [ ] GitHub repository (for CI/CD)
- [ ] Hosting platform account (Railway/Render/Azure/Vercel)
- [ ] Optional: Docker Hub account (for containerization)

### **Environment Files Ready**
- [ ] `.env` for backend
- [ ] `.env` for AI service
- [ ] `.env.production` for frontend
- [ ] All sensitive keys backed up securely

### **Code Quality**
- [ ] All dependencies installed locally
- [ ] No console errors on `npm run dev` / `npm start`
- [ ] Frontend builds successfully (`npm run build`)
- [ ] No hardcoded credentials in code

---

## 🏠 Local Testing Setup

### **Step 1: Start MongoDB Locally**

**Option A: MongoDB Community (Local)**
```bash
# Windows - Download from https://www.mongodb.com/try/download/community
# After installation, MongoDB runs as a service on port 27017

# Or use MongoDB via Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: MongoDB Atlas (Cloud)**
```
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster
4. Get connection string: mongodb+srv://username:password@cluster.mongodb.net/studyai
5. Whitelist your IP address
```

### **Step 2: Setup Environment Files**

**backend/.env**
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/studyai
# or for Atlas: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/studyai

# JWT
JWT_SECRET=your_super_secret_key_change_in_production

# Server
PORT=5000
NODE_ENV=development

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

**ai-service/.env**
```env
# Groq
GROQ_API_KEY=your_groq_api_key_here

# Paths
VECTOR_STORE_PATH=./vector_store

# Environment
PYTHON_ENV=development
```

**studyai-frontend/.env.local** (create this file)
```env
VITE_API_BASE_URL=http://localhost:5000
```

### **Step 3: Start All Services Locally**

**Terminal 1: Backend**
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2: AI Service**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs available at http://localhost:8000/docs
```

**Terminal 3: Frontend**
```bash
cd studyai-frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### **Step 4: Test Locally**
```bash
# 1. Open http://localhost:3000 in browser
# 2. Sign up / Login
# 3. Create a workspace
# 4. Upload a PDF
# 5. Try asking a question
# 6. Generate a quiz
```

---

## 💾 Database Setup

### **MongoDB Collections Setup**

Run these commands in MongoDB client or Atlas:

```javascript
// Create collections
db.createCollection("users")
db.createCollection("workspaces")
db.createCollection("workspace_datas")
db.createCollection("ai_cache")

// Create indexes for faster queries
db.users.createIndex({ email: 1 }, { unique: true })
db.workspaces.createIndex({ userId: 1 })
db.workspace_datas.createIndex({ workspaceId: 1 })
db.ai_cache.createIndex({ sessionId: 1, query: 1 })

// Create TTL index for auto-cleanup of cache (30 days)
db.ai_cache.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
```

### **Backup Strategy**
```bash
# Export data (local MongoDB)
mongoexport --db studyai --collection users --out users.json

# Restore data
mongoimport --db studyai --collection users --file users.json

# For MongoDB Atlas: Use built-in backup options in dashboard
```

---

## 🎯 Service-by-Service Deployment

---

## **OPTION 1: Railway (Recommended for Beginners)**

### **A. Deploy Backend to Railway**

1. **Connect to Railway**
   - Go to https://railway.app
   - Sign up with GitHub
   - Create new project → Deploy from GitHub repo

2. **Configure Backend Service**
   ```bash
   # In Railway dashboard:
   - Select your repo
   - Choose "backend" folder as root
   - Select "Node.js" runtime
   ```

3. **Set Environment Variables**
   ```
   In Railway Dashboard → Variables:
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studyai
   JWT_SECRET=your_production_jwt_secret
   NODE_ENV=production
   AI_SERVICE_URL=https://your-ai-service-url.railway.app
   PORT=5000
   ```

4. **Deploy**
   - Railway auto-detects Node.js and deploys
   - Get URL: `https://your-backend-production.railway.app`

---

### **B. Deploy AI Service to Railway**

1. **Create New Service**
   - Railway Dashboard → New Project
   - Connect same repo

2. **Configure AI Service**
   ```bash
   # In Railway dashboard:
   - Select "ai-service" as root directory
   - Select "Python" runtime
   - Set start command: uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Set Environment Variables**
   ```
   GROQ_API_KEY=your_groq_api_key
   VECTOR_STORE_PATH=/tmp/vector_store  # Railway has ephemeral storage
   PYTHON_ENV=production
   ```

4. **Deploy**
   - Get URL: `https://your-ai-service-production.railway.app`

---

### **C. Deploy Frontend to Vercel**

1. **Connect to Vercel**
   - Go to https://vercel.com
   - Sign up with GitHub
   - Import project

2. **Configure Frontend**
   ```bash
   Framework: Vite
   Root Directory: studyai-frontend
   Build Command: npm run build
   Output Directory: dist
   ```

3. **Set Environment Variables**
   ```
   VITE_API_BASE_URL=https://your-backend-production.railway.app
   ```

4. **Deploy**
   - Vercel auto-deploys on push to main
   - Get URL: `https://studyai.vercel.app`

---

## **OPTION 2: Docker + AWS / Azure / GCP**

### **A. Containerize Each Service**

**Create: Dockerfile (Backend)**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

**Create: Dockerfile (AI Service)**
```dockerfile
# ai-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Create: Dockerfile (Frontend)**
```dockerfile
# studyai-frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Create: nginx.conf (Frontend)**
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://backend:5000;
    }
}
```

### **B. Docker Compose (Local Testing)**

**Create: docker-compose.yml**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: studyai
    volumes:
      - mongo_data:/data/db

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      GROQ_API_KEY: ${GROQ_API_KEY}
      VECTOR_STORE_PATH: /app/vector_store
    volumes:
      - ai_vector_store:/app/vector_store
    depends_on:
      - mongodb

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/studyai
      JWT_SECRET: ${JWT_SECRET}
      AI_SERVICE_URL: http://ai-service:8000
      NODE_ENV: production
    depends_on:
      - mongodb
      - ai-service

  frontend:
    build:
      context: ./studyai-frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      VITE_API_BASE_URL: http://backend:5000
    depends_on:
      - backend

volumes:
  mongo_data:
  ai_vector_store:
```

**Run locally:**
```bash
docker-compose up -d
# Access at http://localhost
```

### **C. Deploy to AWS ECS**

1. **Push Docker Images to ECR**
   ```bash
   # Create ECR repositories
   aws ecr create-repository --repository-name studyai-backend
   aws ecr create-repository --repository-name studyai-ai-service
   aws ecr create-repository --repository-name studyai-frontend

   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Build and push backend
   docker build -t studyai-backend ./backend
   docker tag studyai-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/studyai-backend:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/studyai-backend:latest

   # Repeat for ai-service and frontend
   ```

2. **Create RDS MongoDB (or use MongoDB Atlas)**
   ```bash
   # MongoDB Atlas is easier - already set up
   # Just use connection string in ECS task env vars
   ```

3. **Create ECS Cluster & Services**
   ```bash
   # AWS Console → ECS → Create Cluster
   # For each service: Create Task Definition → Create Service
   # Map ports: Backend 5000, AI 8000, Frontend 80
   ```

---

## **OPTION 3: Google Cloud Run (Serverless)**

### **A. Deploy Backend**
```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/studyai-backend ./backend

# Deploy to Cloud Run
gcloud run deploy studyai-backend \
  --image gcr.io/PROJECT_ID/studyai-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/studyai,JWT_SECRET=secret \
  --allow-unauthenticated
```

### **B. Deploy AI Service**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/studyai-ai ./ai-service

gcloud run deploy studyai-ai-service \
  --image gcr.io/PROJECT_ID/studyai-ai \
  --platform managed \
  --region us-central1 \
  --set-env-vars GROQ_API_KEY=key \
  --allow-unauthenticated
```

### **C. Deploy Frontend**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/studyai-frontend ./studyai-frontend

gcloud run deploy studyai-frontend \
  --image gcr.io/PROJECT_ID/studyai-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## **OPTION 4: Azure App Service**

### **A. Prepare Azure Resources**
```bash
# Login to Azure
az login

# Create resource group
az group create --name StudyAI-RG --location eastus

# Create App Service Plan
az appservice plan create \
  --name StudyAI-Plan \
  --resource-group StudyAI-RG \
  --sku B1

# Create MongoDB Atlas (or CosmosDB)
# Use MongoDB Atlas for simplicity
```

### **B. Deploy Backend**
```bash
# Create Web App
az webapp create \
  --resource-group StudyAI-RG \
  --plan StudyAI-Plan \
  --name studyai-backend \
  --runtime "NODE|18-lts"

# Set environment variables
az webapp config appsettings set \
  --resource-group StudyAI-RG \
  --name studyai-backend \
  --settings MONGODB_URI="mongodb+srv://..." JWT_SECRET="secret"

# Deploy code
cd backend
zip -r deploy.zip .
az webapp deployment source config-zip \
  --resource-group StudyAI-RG \
  --name studyai-backend \
  --src deploy.zip
```

### **C. Deploy AI Service**
```bash
# Create Web App for Python
az webapp create \
  --resource-group StudyAI-RG \
  --plan StudyAI-Plan \
  --name studyai-ai \
  --runtime "PYTHON|3.11"

# Deploy
cd ai-service
zip -r deploy.zip .
az webapp deployment source config-zip \
  --resource-group StudyAI-RG \
  --name studyai-ai \
  --src deploy.zip
```

### **D. Deploy Frontend to Static Web App**
```bash
az staticwebapp create \
  --name studyai-frontend \
  --resource-group StudyAI-RG \
  --source https://github.com/yourusername/AiStudyAssistant \
  --branch main \
  --app-location "studyai-frontend" \
  --output-location "dist"
```

---

## 🔧 Production Configuration

### **Backend Production Settings**

**backend/.env (Production)**
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/studyai?retryWrites=true&w=majority
JWT_SECRET=use_a_strong_random_key_min_32_chars
NODE_ENV=production
PORT=5000
AI_SERVICE_URL=https://your-ai-service-production-url
LOG_LEVEL=info
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

**Update: backend/server.js**
```javascript
// Add before app.listen():
if (process.env.NODE_ENV === 'production') {
  app.use(require('compression')());  // Gzip compression
  app.use(helmet({ contentSecurityPolicy: false }));
}

// Health check endpoint for load balancers
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

### **AI Service Production Settings**

**ai-service/.env (Production)**
```env
GROQ_API_KEY=your_groq_key
VECTOR_STORE_PATH=/tmp/vector_store  # Ephemeral storage on cloud
PYTHON_ENV=production
LOG_LEVEL=INFO
```

**Update: ai-service/main.py**
```python
import logging
from fastapi import FastAPI
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="PDF Study Assistant AI Service",
    description="RAG pipeline powered by LangChain + Groq",
    version="1.0.0"
)

# Add health check
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-service"}
```

### **Frontend Production Settings**

**studyai-frontend/.env.production**
```env
VITE_API_BASE_URL=https://your-backend-production-url
VITE_LOG_LEVEL=error
```

**Create: studyai-frontend/vite.config.production.js**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: { drop_console: true }
    }
  }
})
```

---

## 📊 Monitoring & Logging

### **Backend Logging Setup**

**backend/middleware/logger.js**
```javascript
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const loggerMiddleware = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${req.method} ${req.path} - Status: ${res.statusCode}`;
  
  console.log(logMessage);
  
  fs.appendFileSync(path.join(logDir, 'app.log'), logMessage + '\n');
  next();
};

module.exports = loggerMiddleware;
```

### **Monitoring Services**

**Option 1: Railway Built-in Monitoring**
- Railway Dashboard → Your Service → Deployments → View Logs
- Metrics tab shows CPU, Memory, Network

**Option 2: Vercel Analytics (Frontend)**
- Vercel Dashboard → Analytics
- Monitors Core Web Vitals, Performance

**Option 3: Third-party Services**

**DataDog**
```bash
# Add DataDog agent to backend
npm install @datadog/browser-rum

# Initialize in backend
const datadogRum = require('@datadog/browser-rum')
datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'studyai-backend',
  env: 'production',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20
})
```

**Sentry (Error Tracking)**
```bash
npm install @sentry/node

# In backend/server.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "YOUR_SENTRY_DSN" });
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### **Database Monitoring**

**MongoDB Atlas Dashboard**
- Monitor → Metrics
- Check: Connection count, Query performance, Disk usage
- Set up alerts for high CPU/memory

---

## 🔐 Security Checklist

- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] JWT secret changed from default
- [ ] MongoDB credentials stored in environment variables
- [ ] API rate limiting enabled
- [ ] CORS properly configured for production domain
- [ ] Helmet.js enabled for security headers
- [ ] Password hashing with bcryptjs
- [ ] No console.logs with sensitive data
- [ ] File upload size limits enforced
- [ ] SQL injection protection (using Mongoose)

---

## 🐛 Troubleshooting

### **Backend Not Connecting to MongoDB**
```bash
# Check connection string format
# For Atlas: mongodb+srv://user:password@cluster.mongodb.net/studyai
# For Local: mongodb://localhost:27017/studyai

# Test connection
mongo mongodb+srv://user:password@cluster.mongodb.net/studyai

# Check network access in MongoDB Atlas
# Ensure your IP is whitelisted
```

### **Frontend Can't Reach Backend**
```bash
# Check VITE_API_BASE_URL in .env
# Ensure backend URL is correct
# Test API manually: curl https://your-backend-url/health

# Check CORS configuration in backend
# Should allow frontend origin
```

### **AI Service Slow Responses**
```bash
# Check vector store size
# Vector stores grow with documents
# Clean old indices if needed

# Monitor Groq API rate limits
# Groq free tier: ~30 req/min
# Upgrade plan if needed

# Check FAISS query time
# Add logging to rag.py to measure
```

### **PDF Upload Fails**
```bash
# Check file size limit in Multer
# backend/controllers/Aicontroller.js

# Ensure MongoDB has space
# Check MongoDB storage usage

# Verify PDF format is standard
# Corrupted PDFs may fail extraction
```

---

## 📞 Getting Help

**Common Resources:**
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Groq API Docs: https://console.groq.com/docs
- LangChain Docs: https://python.langchain.com/docs

**Community Support:**
- Stack Overflow (tag: fastapi, express, mongodb)
- Reddit: r/webdev, r/nodejs
- GitHub Issues: your repo

---

## ✅ Post-Deployment Checklist

- [ ] All three services deployed and running
- [ ] Frontend loads without errors
- [ ] Can sign up and login
- [ ] Can upload PDF and see it in workspace
- [ ] Chat with AI returns responses
- [ ] Quiz generation works
- [ ] Summary generation works
- [ ] Flashcards display correctly
- [ ] Analytics page loads
- [ ] Rate limiting is working
- [ ] Logs are being collected
- [ ] Backups are configured
- [ ] Domain name configured (if using custom domain)
- [ ] SSL/HTTPS working
- [ ] Monitoring alerts configured

---

## 🎉 Congratulations!

Your StudyAI platform is now live in production! Users can start uploading documents and learning with AI.

**Next Steps:**
1. Monitor logs for errors
2. Collect user feedback
3. Scale services as needed
4. Add more AI features
5. Optimize performance based on metrics
