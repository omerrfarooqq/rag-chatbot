from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .document_loader import extract_text, chunk_text
from .rag_service import sessions, answer_question

app = FastAPI(title="RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXT = (".pdf", ".docx", ".txt")


class ChatRequest(BaseModel):
    session_id: str
    question: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]


class UploadResponse(BaseModel):
    uploaded: List[str]
    chunks: int
    files_in_session: List[str]


class SessionInfo(BaseModel):
    session_id: str
    files: List[str]
    has_documents: bool
    message_count: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload", response_model=UploadResponse)
async def upload(session_id: str = Form(...), files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    state = sessions.get(session_id)
    uploaded, total_chunks = [], 0

    for f in files:
        name = f.filename or ""
        if not name.lower().endswith(ALLOWED_EXT):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {name}")
        data = await f.read()
        try:
            text = extract_text(name, data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse {name}: {e}")
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"No text extracted from {name}")
        docs = chunk_text(text, source=name)
        state.add_documents(docs, name)
        uploaded.append(name)
        total_chunks += len(docs)

    return UploadResponse(uploaded=uploaded, chunks=total_chunks, files_in_session=state.files)


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question is empty")
    try:
        result = answer_question(req.session_id, req.question)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return ChatResponse(**result)


@app.get("/session/{session_id}", response_model=SessionInfo)
def session_info(session_id: str):
    state = sessions.get(session_id)
    return SessionInfo(
        session_id=session_id,
        files=state.files,
        has_documents=state.vectorstore is not None,
        message_count=len(state.history),
    )


@app.post("/session/{session_id}/reset")
def reset_session(session_id: str):
    sessions.reset(session_id)
    return {"status": "reset", "session_id": session_id}
