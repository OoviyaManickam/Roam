import { subscribe } from '@/lib/store'
import { SSEEvent } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const unsub = subscribe((event: SSEEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // controller already closed
        }
      })

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat)
          return
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          closed = true
          clearInterval(heartbeat)
          unsub()
        }
      }, 15000)

      return () => {
        closed = true
        clearInterval(heartbeat)
        unsub()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
