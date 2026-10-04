type ErrorPayload = {
  source: 'client'
  message: string
  name?: string
  stack?: string
  route: string
  metadata?: Record<string, unknown>
}

function messageFromReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  if (typeof reason === 'string') return reason
  return 'Unhandled promise rejection'
}

function payloadFromError(error: unknown, fallbackMessage: string): ErrorPayload {
  if (error instanceof Error) {
    return {
      source: 'client',
      name: error.name,
      message: error.message || fallbackMessage,
      stack: error.stack,
      route: window.location.pathname,
    }
  }
  return {
    source: 'client',
    message: fallbackMessage,
    route: window.location.pathname,
  }
}

function sendErrorEvent(payload: ErrorPayload) {
  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/error-events', new Blob([body], { type: 'application/json' }))
      return
    }
    void fetch('/api/error-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  }
  catch {
    // Monitoring must never break the app path that already failed.
  }
}

window.addEventListener('error', (event) => {
  const payload = payloadFromError(event.error, event.message || 'Unhandled browser error')
  sendErrorEvent({
    ...payload,
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  })
})

window.addEventListener('unhandledrejection', (event) => {
  sendErrorEvent(payloadFromError(event.reason, messageFromReason(event.reason)))
})
