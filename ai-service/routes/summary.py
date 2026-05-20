from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_groq import ChatGroq
from core.rag import load_vectorstore
from core.prompts import SUMMARY_PROMPT

router = APIRouter()


class SummaryRequest(BaseModel):
    session_id: str


# ── POST /api/summary/generate ─────────────────────────────────────────────

@router.post("/generate")
async def generate_summary(body: SummaryRequest):
    try:
        vectorstore = load_vectorstore(body.session_id)

        # Use a broad query to get representative chunks across the document
        docs = vectorstore.similarity_search(
            "summary overview introduction conclusion main points",
            k=8
        )
        context = "\n\n".join([d.page_content for d in docs])
        prompt  = SUMMARY_PROMPT.format(context=context)

        llm      = ChatGroq(model_name="llama-3.1-8b-instant")
        response = llm.invoke(prompt)

        return {
            "summary":    response.content,
            "session_id": body.session_id
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Upload PDFs first."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))