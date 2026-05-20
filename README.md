# 🎓 StudyAI — AI-Powered Multi-PDF Study Assistant

> A full-stack AI study platform that enables students to upload PDFs and interact with them through intelligent chat, quizzes, flashcards, and summaries using Retrieval-Augmented Generation (RAG).

## 🎯 One-Line Summary

Transform your study materials into interactive learning experiences with AI-powered document Q&A, quiz generation, and content summarization.

---

## 📚 Project Structure

```
StudyAI/
├── ai-service/          # Python FastAPI backend for AI/RAG pipeline
├── backend/             # Node.js Express application server
└── studyai-frontend/    # React + Vite user interface
```

---

## 🏗️ Architecture

### **3-Tier Modular Architecture**

```
┌─────────────────────────────────────────┐
│   React Frontend (Vite + TailwindCSS)  │  Port 3000
├─────────────────────────────────────────┤
│   Express Backend (JWT, MongoDB)        │  Port 5000
├─────────────────────────────────────────┤
│   FastAPI AI Service (RAG Pipeline)     │  Port 8000
├─────────────────────────────────────────┤
│   MongoDB + FAISS Vector Store          │
└─────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🤖 **AI-Powered Learning**
- **Conversational Q&A**: Chat with your PDFs using a Context-Aware AI tutor
- **Intelligent Retrieval**: MMR (Maximal Marginal Relevance) search for diverse, relevant answers
- **Query Rewriting**: Converts follow-up questions into standalone queries for better context retrieval
- **Multi-Document Context**: Query across multiple PDFs simultaneously in a unified session

### 📝 **Content Generation**
- **Automated Quiz Generation**: Create practice quizzes directly from your study materials
- **Smart Summaries**: AI-generated document summaries for quick review
- **Flashcard Creation**: Auto-generated flashcards for spaced repetition learning

### 💾 **Workspace Management**
- **Multi-Workspace Support**: Organize study materials across different courses/subjects
- **Session-Based Vector Stores**: Dedicated FAISS indices for each workspace
- **PDF Batch Upload**: Upload multiple documents simultaneously

### 🔐 **Security & Performance**
- **JWT Authentication**: Secure user sessions with token-based auth
- **Rate Limiting**: Protected endpoints with express-rate-limit
- **Caching Layer**: MongoDB stores previously generated AI outputs to reduce API calls
- **Selective Field Projection**: Optimized payload sizes by loading only required document fields

---

## 🛠️ Tech Stack

### **Frontend**
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| TailwindCSS | Styling |
| React Router | Navigation |
| Axios | API client with JWT interceptors |
| react-pdf | PDF viewing component |
| Radix UI | Accessible UI components |

### **Backend (Application Server)**
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | API server |
| MongoDB + Mongoose | Database & data modeling |
| JWT + bcryptjs | Authentication & password hashing |
| Multer | File upload handling |
| express-rate-limit | Rate limiting middleware |
| Helmet | Security headers |

### **AI Service**
| Technology | Purpose |
|-----------|---------|
| Python + FastAPI | Async API for RAG pipeline |
| LangChain | LLM orchestration & prompt management |
| Groq LLaMA 3.1 (8B) | Large Language Model |
| FAISS | Vector database for semantic search |
| sentence-transformers | Embedding model (all-MiniLM-L6-v2) |
| pypdf | PDF text extraction |
| RecursiveCharacterTextSplitter | Intelligent text chunking |

---

## 🧠 RAG Pipeline Details

### **1. Document Processing**
```
PDFs → Text Extraction → Chunking (1000 tokens, 200 overlap)
```

### **2. Vector Store Creation**
```
Text Chunks → HuggingFace Embeddings → FAISS Index → Persistent Storage
```

### **3. Retrieval Strategy**
- **Search Type**: MMR (Maximal Marginal Relevance)
- **Retrieved Chunks**: 8 (k=8)
- **Fetch Size**: 30 (fetch_k=30) - For diversity filtering
- **Reduces**: Redundant information in responses

### **4. Conversation Chain**
```
User Query → ConversationalRetrievalChain → MMR Retrieval
↓
Retrieved Docs + Chat History → Groq LLaMA 3.1 → Response
```

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas connection string)
- Groq API key

### **Installation**

#### **1. Backend Setup**
```bash
cd backend
npm install
# Create .env file with MongoDB URI and JWT_SECRET
npm run dev
```

#### **2. AI Service Setup**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Create .env file with GROQ_API_KEY and VECTOR_STORE_PATH
uvicorn main:app --reload --port 8000
```

#### **3. Frontend Setup**
```bash
cd studyai-frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

---

## 📋 Environment Variables

### **Backend** (`.env`)
```env
MONGODB_URI=mongodb://localhost:27017/studyai
JWT_SECRET=your_secret_key_here
PORT=5000
```

### **AI Service** (`.env`)
```env
GROQ_API_KEY=your_groq_api_key
VECTOR_STORE_PATH=./vector_store
```

---

## 🔄 Data Flow

### **PDF Upload & Indexing**
```
1. User uploads PDF → Frontend
2. Frontend sends to Backend (JWT auth, Multer)
3. Backend stores in MongoDB + sends to AI Service
4. AI Service extracts text, chunks, embeds, & stores in FAISS
5. Session ID returned for future queries
```

### **Query Processing**
```
1. User asks question → Frontend
2. Backend retrieves session + workspace data
3. Sends query to AI Service
4. AI Service performs MMR retrieval from FAISS
5. Groq LLaMA 3.1 generates response with context
6. Response cached in MongoDB
7. Frontend displays answer with source citations
```

---

## 📊 Database Schema

### **Users Collection**
```javascript
{
  name: String,
  email: String (unique),
  passwordHash: String,
  createdAt: Date
}
```

### **Workspaces Collection**
```javascript
{
  userId: ObjectId,
  title: String,
  createdAt: Date,
  documents: [ObjectId]
}
```

### **Workspace Data Collection**
```javascript
{
  workspaceId: ObjectId,
  filename: String,
  pdfBinary: Buffer,
  uploadedAt: Date,
  sessionId: String (matches FAISS index folder)
}
```

---

## 🎯 Core Concepts

### **Retrieval-Augmented Generation (RAG)**
Combines document retrieval with LLM generation to ensure responses are grounded in your study materials.

### **Maximal Marginal Relevance (MMR)**
Balances relevance with diversity—returns chunks that are similar to the query but different from each other, reducing redundancy.

### **Query Rewriting**
Converts questions like "What about that?" into "What is X about that subject?" for better semantic search.

### **Embedding Model**
`all-MiniLM-L6-v2` (384-dimensional) provides fast, accurate semantic similarity for educational content.

---

## 📈 Performance Optimizations

✅ **Caching**: Previously generated summaries & quizzes stored in MongoDB  
✅ **Async Processing**: FastAPI handles I/O-bound RAG operations concurrently  
✅ **Vector Indexing**: FAISS provides O(log n) similarity search  
✅ **Selective Projections**: MongoDB queries fetch only needed fields  
✅ **Session Management**: Active conversation chains kept in memory  
✅ **Rate Limiting**: Prevents abuse and ensures fair resource usage  

---

## 🔒 Security Features

✅ **JWT Authentication**: Stateless, token-based user sessions  
✅ **Password Hashing**: bcryptjs with salt rounds for secure storage  
✅ **CORS Protection**: Restricted origins for API requests  
✅ **Security Headers**: Helmet.js for HTTP header protection  
✅ **Protected Routes**: All sensitive endpoints require authentication  
✅ **File Upload Validation**: Multer constraints on file size/type  

---

## 🧪 Testing

```bash
# Frontend tests
cd studyai-frontend
npm run lint

# Backend tests (when configured)
cd backend
npm test

# AI Service tests (when configured)
cd ai-service
pytest
```

---

## 📦 Deployment

### **Frontend** → Vercel / Netlify
```bash
npm run build
# Deploy `dist/` folder
```

### **Backend** → Railway / Render
```bash
# Ensure Node.js 18+ selected
# Set environment variables
npm install && npm start
```

### **AI Service** → Railway / Render
```bash
# Ensure Python 3.11+ selected
# Set environment variables
pip install -r requirements.txt
# Start with: uvicorn main:app --port 8000
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 About

**StudyAI** was built to make studying more efficient by leveraging cutting-edge AI and retrieval technologies. It's perfect for students preparing for exams, researchers analyzing papers, or anyone wanting to learn from their documents interactively.

**Built with ❤️ using React, Node.js, FastAPI, and LangChain**

---

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

## 🎓 Learning Resources

- [LangChain Documentation](https://python.langchain.com/)
- [FAISS Tutorial](https://github.com/facebookresearch/faiss)
- [Groq API](https://console.groq.com/)
- [FastAPI Guide](https://fastapi.tiangolo.com/)
- [RAG Best Practices](https://arxiv.org/abs/2005.11401)
