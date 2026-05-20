from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.chat import router as chat_router
from routes.quiz import router as quiz_router
from routes.summary import router as summary_router

load_dotenv()

app = FastAPI(
    title="PDF Study Assistant AI Service",
    description="RAG pipeline powered by LangChain + Groq",
    version="1.0.0"
)

# Allow React frontend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route groups
app.include_router(chat_router,    prefix="/api/chat",    tags=["Chat"])
app.include_router(quiz_router,    prefix="/api/quiz",    tags=["Quiz"])
app.include_router(summary_router, prefix="/api/summary", tags=["Summary"])

@app.get("/")
def health_check():
    return {"status": "ok", "service": "PDF Study Assistant AI"}

# Run with: uvicorn main:app --reload --port 8000