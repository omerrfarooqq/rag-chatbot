const API_BASE = 'http://localhost:8000'

export async function uploadFiles(sessionId, files) {
  const fd = new FormData()
  fd.append('session_id', sessionId)
  for (const f of files) fd.append('files', f)
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed')
  return res.json()
}

export async function sendChat(sessionId, question) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Chat failed')
  return res.json()
}

export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE}/session/${sessionId}`)
  if (!res.ok) throw new Error('Failed to fetch session')
  return res.json()
}

export async function resetSession(sessionId) {
  const res = await fetch(`${API_BASE}/session/${sessionId}/reset`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to reset')
  return res.json()
}
