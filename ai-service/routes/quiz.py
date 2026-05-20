import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_groq import ChatGroq
from core.rag import load_vectorstore
from core.prompts import QUIZ_PROMPT, FLASHCARD_PROMPT

router = APIRouter()


class QuizRequest(BaseModel):
    session_id:    str
    num_questions: int = 5

class FlashcardRequest(BaseModel):
    session_id: str
    num_cards:  int = 10


def get_full_context(session_id: str, k: int = 10) -> str:
    """Retrieve top-k chunks from the vector store as context."""
    vectorstore = load_vectorstore(session_id)
    docs = vectorstore.similarity_search("main topics and key concepts", k=k)
    return "\n\n".join([d.page_content for d in docs])


def clean_json(raw: str) -> str:
    """Strip markdown code fences if Groq wraps JSON in ```json ... ```"""
    raw = raw.strip()
    if raw.startswith("```"):
        # Remove opening fence (```json or ```)
        raw = raw[raw.index("\n") + 1:]
        # Remove closing fence
        if raw.endswith("```"):
            raw = raw[:raw.rfind("```")]
    return raw.strip()


# ── POST /api/quiz/generate ────────────────────────────────────────────────

@router.post("/generate")
async def generate_quiz(body: QuizRequest):
    if not 1 <= body.num_questions <= 20:
        raise HTTPException(status_code=400, detail="num_questions must be 1–20")
    try:
        context  = get_full_context(body.session_id)
        prompt   = QUIZ_PROMPT.format(context=context, num_questions=body.num_questions)
        llm      = ChatGroq(model_name="llama-3.1-8b-instant")
        response = llm.invoke(prompt)
        questions = json.loads(clean_json(response.content))
        return {"questions": questions}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {str(e)}. Try again.")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /api/quiz/flashcards ──────────────────────────────────────────────

@router.post("/flashcards")
async def generate_flashcards(body: FlashcardRequest):
    try:
        context  = get_full_context(body.session_id)
        prompt   = FLASHCARD_PROMPT.format(context=context, num_cards=body.num_cards)
        llm      = ChatGroq(model_name="llama-3.1-8b-instant")
        response = llm.invoke(prompt)
        cards    = json.loads(clean_json(response.content))
        return {"flashcards": cards}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {str(e)}. Try again.")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))