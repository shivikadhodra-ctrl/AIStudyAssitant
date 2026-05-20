import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from core.rag import process_pdfs_and_create_session, ask_question, ask_question_stream

router = APIRouter()


class AskRequest(BaseModel):
    session_id: str
    question:   str


class AskResponse(BaseModel):
    answer:       str
    chat_history: list[dict]


class ChatMessage(BaseModel):
    role:    str
    message: str


class AskStreamRequest(BaseModel):
    session_id:   str
    question:     str
    mode:         str = "normal"
    chat_history: Optional[List[ChatMessage]] = []


# ── POST /api/chat/upload ─────────────────────────────────────────────────
@router.post("/upload")
async def upload_pdfs(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{f.filename} is not a PDF")

    pdf_bytes_list = [await f.read() for f in files]
    filenames      = [f.filename for f in files]
    session_id     = str(uuid.uuid4())

    try:
        process_pdfs_and_create_session(pdf_bytes_list, session_id, filenames)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "session_id":      session_id,
        "files_processed": filenames,
        "message":         "PDFs processed successfully.",
    }


# ── POST /api/chat/ask (non-streaming) ────────────────────────────────────
@router.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    try:
        result = ask_question(body.session_id, body.question)
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /api/chat/ask-stream ─────────────────────────────────────────────
# Uses text/event-stream (SSE) format: "data: token\n\n"
# Each token is a separate SSE event.
# Final event: "data: [DONE]\n\n"
@router.post("/ask-stream")
async def ask_stream(body: AskStreamRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    valid_modes = {"normal", "beginner", "exam", "quick", "deep"}
    mode = body.mode if body.mode in valid_modes else "normal"

    history = [{"role": m.role, "message": m.message} for m in (body.chat_history or [])]

    async def sse_generator():
        try:
            async for token in ask_question_stream(
                session_id=body.session_id,
                question=body.question,
                mode=mode,
                chat_history=history,
            ):
                # SSE format — each token as its own event
                # Escape newlines inside token so SSE framing is not broken
                safe_token = token.replace("\n", "\\n")
                yield f"data: {safe_token}\n\n"
        except FileNotFoundError:
            yield "data: [ERROR] Session not found.\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        finally:
            # Signal stream completion
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":   "no-cache",
            "Connection":      "keep-alive",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )