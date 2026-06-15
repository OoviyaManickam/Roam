import { NextRequest } from 'next/server'
import { streamItinerary } from '@/lib/venice'
import { publish } from '@/lib/store'
import { UserPreferences } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const prefs: UserPreferences = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamItinerary(prefs)) {
          // Stream directly to the client
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          // Also publish to in-memory store for localhost SSE (no-op on Vercel)
          if (event.chunk) publish({ type: 'agent_chunk', chunk: event.chunk })
          if (event.itinerary) publish({ type: 'itinerary_ready', itinerary: event.itinerary })
        }
      } catch (err) {
        console.error('[agent] streamItinerary error:', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`))
      } finally {
        controller.close()
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
