const API_BASE = 'http://127.0.0.1:8000'

async function parseError(res) {
  try {
    const data = await res.json()
    return data.detail || JSON.stringify(data)
  } catch {
    try {
      return await res.text()
    } catch {
      return `HTTP ${res.status}`
    }
  }
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, options)
  } catch (e) {
    throw new Error(
      `Cannot reach backend at ${API_BASE}. Is uvicorn running on port 8000? (${e.message})`
    )
  }
  if (!res.ok) {
    const msg = await parseError(res)
    throw new Error(`[${res.status}] ${msg}`)
  }
  return res.json()
}

export async function uploadFiles(sessionId, files) {
  const fd = new FormData()
  fd.append('session_id', sessionId)
  for (const f of files) fd.append('files', f)
  return request('/upload', { method: 'POST', body: fd })
}

export async function sendChat(sessionId, question) {
  return request('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question }),
  })
}

export async function getSession(sessionId) {
  return request(`/session/${sessionId}`)
}

export async function resetSession(sessionId) {
  return request(`/session/${sessionId}/reset`, { method: 'POST' })
}
