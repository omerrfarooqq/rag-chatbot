import { useEffect, useRef, useState } from 'react'
import { uploadFiles, sendChat, getSession, resetSession } from './api'

function getSessionId() {
  let id = localStorage.getItem('rag_session_id')
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem('rag_session_id', id)
  }
  return id
}

export default function App() {
  const [sessionId] = useState(getSessionId)
  const [files, setFiles] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    getSession(sessionId).then(s => setFiles(s.files)).catch(() => {})
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleUpload(e) {
    e.preventDefault()
    const selected = fileInputRef.current?.files
    if (!selected || selected.length === 0) return
    setUploading(true)
    setError('')
    try {
      const res = await uploadFiles(sessionId, selected)
      setFiles(res.files_in_session)
      fileInputRef.current.value = ''
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleAsk(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || asking) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q }])
    setAsking(true)
    setError('')
    try {
      const res = await sendChat(sessionId, q)
      setMessages(m => [...m, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch (err) {
      setError(err.message)
      setMessages(m => [...m, { role: 'assistant', content: '[Error] ' + err.message }])
    } finally {
      setAsking(false)
    }
  }

  async function handleReset() {
    if (!confirm('Clear uploaded documents and chat history?')) return
    await resetSession(sessionId)
    setFiles([])
    setMessages([])
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>RAG Chatbot</h2>
        <p className="muted">Session: <code>{sessionId.slice(0, 14)}</code></p>

        <form onSubmit={handleUpload} className="upload-form">
          <label className="label">Upload documents</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
          />
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        <div className="files">
          <div className="label">Files in session</div>
          {files.length === 0 ? (
            <p className="muted">No files uploaded yet.</p>
          ) : (
            <ul>{files.map(f => <li key={f}>{f}</li>)}</ul>
          )}
        </div>

        <button className="reset" onClick={handleReset}>Reset session</button>
        {error && <div className="error">{error}</div>}
      </aside>

      <main className="chat">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty">
              Upload a PDF, DOCX, or TXT, then ask a question about it.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className="bubble">
                <div className="content">{m.content}</div>
                {m.sources && m.sources.length > 0 && (
                  <div className="sources">Sources: {m.sources.join(', ')}</div>
                )}
              </div>
            </div>
          ))}
          {asking && <div className="msg assistant"><div className="bubble"><i>Thinking...</i></div></div>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleAsk} className="input-row">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={asking}
          />
          <button type="submit" disabled={asking || !input.trim()}>Send</button>
        </form>
      </main>
    </div>
  )
}
