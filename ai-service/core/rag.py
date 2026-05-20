import os
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain_groq import ChatGroq
from core.prompts import CUSTOM_PROMPT, get_mode_prompt

VECTOR_STORE_PATH = os.getenv("VECTOR_STORE_PATH", "./vector_store")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
active_sessions: dict = {}


def extract_text_from_pdfs(
    pdf_bytes_list: list[bytes],
    filenames: list[str] = None
) -> tuple[list[str], list[dict]]:
    all_texts     = []
    all_metadatas = []

    for idx, pdf_bytes in enumerate(pdf_bytes_list):
        import io
        source_name = (
            filenames[idx] if filenames and idx < len(filenames)
            else f"document_{idx + 1}.pdf"
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))

        for page_num, page in enumerate(reader.pages, start=1):
            extracted = page.extract_text()
            if extracted and extracted.strip():
                all_texts.append(extracted)
                all_metadatas.append({"source": source_name, "page": page_num})

    return all_texts, all_metadatas


def split_into_chunks(
    texts: list[str],
    metadatas: list[dict]
) -> tuple[list[str], list[dict]]:
    splitter = RecursiveCharacterTextSplitter(
        separators=["\n\n", "\n", ".", " ", ""],
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    all_chunks      = []
    all_chunk_metas = []

    for text, meta in zip(texts, metadatas):
        chunks = splitter.split_text(text)
        for chunk in chunks:
            all_chunks.append(chunk)
            all_chunk_metas.append(meta)

    return all_chunks, all_chunk_metas


def build_vectorstore(
    chunks: list[str],
    metadatas: list[dict],
    session_id: str
) -> FAISS:
    vectorstore = FAISS.from_texts(texts=chunks, embedding=embeddings, metadatas=metadatas)
    save_path = f"{VECTOR_STORE_PATH}/{session_id}"
    os.makedirs(save_path, exist_ok=True)
    vectorstore.save_local(save_path)
    return vectorstore


def load_vectorstore(session_id: str) -> FAISS:
    save_path = f"{VECTOR_STORE_PATH}/{session_id}"
    return FAISS.load_local(
        save_path, embeddings, allow_dangerous_deserialization=True
    )


def create_conversation_chain(vectorstore: FAISS) -> ConversationalRetrievalChain:
    llm    = ChatGroq(model_name="llama-3.1-8b-instant")
    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 8, "fetch_k": 30},
        ),
        memory=memory,
        combine_docs_chain_kwargs={"prompt": CUSTOM_PROMPT},
    )


def get_or_create_chain(session_id: str) -> ConversationalRetrievalChain:
    if session_id not in active_sessions:
        vectorstore = load_vectorstore(session_id)
        active_sessions[session_id] = create_conversation_chain(vectorstore)
    return active_sessions[session_id]


def process_pdfs_and_create_session(
    pdf_bytes_list: list[bytes],
    session_id: str,
    filenames: list[str] = None,
) -> str:
    texts, metadatas    = extract_text_from_pdfs(pdf_bytes_list, filenames)
    chunks, chunk_metas = split_into_chunks(texts, metadatas)
    vectorstore         = build_vectorstore(chunks, chunk_metas, session_id)
    active_sessions[session_id] = create_conversation_chain(vectorstore)
    return session_id


REFERENCE_WORDS = {
    "it", "its", "they", "them", "their", "this", "that", "these", "those",
    "he", "she", "him", "her",
    "second", "third", "fourth", "fifth", "next", "another", "previous",
    "former", "latter", "same", "above", "below",
    "more", "else", "also", "other", "similar",
}

MAX_WORDS_TO_REWRITE = 12


def is_followup_question(question: str, chat_history: list[dict]) -> bool:
    if not chat_history:
        return False
    words = question.lower().split()
    if len(words) > MAX_WORDS_TO_REWRITE:
        return False
    has_reference = any(w.strip("?.,!") in REFERENCE_WORDS for w in words)
    return has_reference


def rewrite_query(question: str, chat_history: list[dict]) -> str:
    if not is_followup_question(question, chat_history):
        return question

    recent = chat_history[-4:]
    history_str = "\n".join([
        f"{'Human' if m.get('role') == 'user' else 'AI'}: {m.get('message', '')}"
        for m in recent
    ])

    rewrite_prompt = (
        "You are a query rewriter. Given a conversation history and a short follow-up question, "
        "rewrite the follow-up into a complete standalone question by resolving any pronouns or "
        "references using the conversation context.\n\n"
        "Rules:\n"
        "- Return ONLY the rewritten question, nothing else\n"
        "- Do not add new information not implied by the context\n"
        "- If the question is already clear on its own, return it unchanged\n\n"
        f"Conversation:\n{history_str}\n\n"
        f"Follow-up question: {question}\n\n"
        "Standalone question:"
    )

    try:
        llm       = ChatGroq(model_name="llama-3.1-8b-instant")
        result    = llm.invoke(rewrite_prompt)
        rewritten = result.content.strip()
        return rewritten if rewritten and len(rewritten) > 3 else question
    except Exception:
        return question


def ask_question(session_id: str, question: str) -> dict:
    chain    = get_or_create_chain(session_id)
    response = chain.invoke({"question": question})
    return {
        "answer": response["answer"],
        "chat_history": [
            {"role": "user" if i % 2 == 0 else "bot", "content": m.content}
            for i, m in enumerate(response["chat_history"])
        ],
    }


async def ask_question_stream(
    session_id:   str,
    question:     str,
    mode:         str  = "normal",
    chat_history: list = None,
):
    vectorstore = load_vectorstore(session_id)

    rewritten_query = rewrite_query(question, chat_history or [])

    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 8, "fetch_k": 30},
    )
    docs = retriever.invoke(rewritten_query)

    context_parts = []
    sources       = []
    for doc in docs:
        src  = doc.metadata.get("source", "Unknown")
        page = doc.metadata.get("page", "?")
        context_parts.append(f"[{src} — Page {page}]\n{doc.page_content}")
        citation = f"{src} — Page {page}"
        if citation not in sources:
            sources.append(citation)

    context      = "\n\n".join(context_parts)
    sources_text = "\n".join(f"• {s}" for s in sources)

    history_text = "No previous conversation."
    if chat_history:
        recent = chat_history[-6:]
        lines  = []
        for msg in recent:
            role = "Human" if msg.get("role") == "user" else "Assistant"
            lines.append(f"{role}: {msg.get('message', '')}")
        history_text = "\n".join(lines)

    mode_instruction = get_mode_prompt(mode)

    full_prompt = f"""{mode_instruction}

You are a helpful study assistant. Answer using ONLY the document context provided below.
If the answer is genuinely not present in the context, respond with exactly:
"I cannot find this in the uploaded documents."
Try hard to find related content — the user may have misspelled or used a partial term.
Never hallucinate or use knowledge outside the provided context.
Use conversation history only to understand what the user is referring to — not as a source of facts.

---
Document Context:
{context}

---
Conversation History:
{history_text}

---
User Question: {question}
(Retrieval was performed for: {rewritten_query})

Answer the question using ONLY the document context above.
At the end of your answer, add:
Sources: {sources_text}

Answer:"""

    llm = ChatGroq(model_name="llama-3.1-8b-instant", streaming=True)
    async for chunk in llm.astream(full_prompt):
        if chunk.content:
            yield chunk.content