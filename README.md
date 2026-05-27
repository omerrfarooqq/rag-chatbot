# RAG Chatbot

Upload PDF / DOCX / TXT files and ask questions about them. Follow-up questions use chat history for context.

## Stack

- **Backend:** FastAPI + LangChain + FAISS + HuggingFace embeddings (`all-MiniLM-L6-v2`) + Groq (`llama-3.3-70b-versatile`)
- **Frontend:** React (Vite) + plain CSS
- **Chat history:** in-memory per session
- **Vector store:** per-session FAISS index (cleared on reset)

## Features

- Upload PDF, DOCX, TXT (multiple files per session)
- Question answering grounded in uploaded documents
- History-aware follow-ups (the retriever rewrites your question using prior chat history before searching)
- Source filenames shown with each answer
- Reset button clears documents + chat history
- **Anti-hallucination:** if the answer isn't in the uploaded documents, the bot replies "I could not find that information in the uploaded documents" instead of guessing
- **Prompt-injection resistant:** instructions embedded in user questions or document text (e.g. "ignore previous instructions") are treated as data, not commands

## How to run

You need **Python 3.10+**, **Node 18+**, and a free **Groq API key** from https://console.groq.com.

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          
pip install -r requirements.txt

copy .env.example .env          

uvicorn app.main:app --reload --port 8000
```

First request downloads the embedding model (~90 MB) once.

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

## Usage

1. Click **Upload** and select one or more PDF / DOCX / TXT files.
2. Wait for the file list to appear in the sidebar.
3. Type a question and press **Send**.
4. Ask follow-ups — the chatbot remembers the conversation.
5. **Reset session** clears uploaded docs and chat history.

## API

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| POST | `/upload` | multipart: `session_id`, `files[]` | Extract, chunk, embed, store in FAISS |
| POST | `/chat` | `{session_id, question}` | History-aware RAG answer |
| GET | `/session/{id}` | - | List uploaded files + message count |
| POST | `/session/{id}/reset` | - | Clear documents and chat history |
| GET | `/health` | - | Health check |

## Project structure

```
rag-chatbot/
  backend/
    app/
      main.py             FastAPI routes
      rag_service.py      FAISS + LangChain RAG pipeline + session state
      document_loader.py  PDF/DOCX/TXT extraction and chunking
      config.py           Model + chunking settings
    requirements.txt
    .env.example
  frontend/
    src/
      App.jsx             UI (upload / chat / history / reset)
      api.js              Backend client
      App.css
    package.json
```

## How the RAG pipeline works

1. **Extract** text from the uploaded file (PDF / DOCX / TXT).
2. **Chunk** with `RecursiveCharacterTextSplitter` (1000 chars, 150 overlap).
3. **Embed** chunks with `all-MiniLM-L6-v2` and store in a per-session FAISS index.
4. **Retrieve** — `create_history_aware_retriever` rewrites the latest question into a standalone query using chat history, then pulls top-4 relevant chunks.
5. **Answer** — Groq LLaMA-3.3 70B answers using only the retrieved context.
6. **Remember** — Q and A are appended to that session's chat history for the next turn.

## Notes

- Session ID is generated in the browser and stored in `localStorage`.
- All state is in memory — restarting the backend clears everything.
- Only `.pdf`, `.docx`, `.txt` are accepted.
