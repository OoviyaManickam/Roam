import { NextRequest } from 'next/server'
import { streamItinerary } from '@/lib/venice'
import { publish } from '@/lib/store'
import { UserPreferences } from '@/lib/types'

export async function POST(req: NextRequest) {
  const prefs: UserPreferences = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamItinerary(prefs)) {
          if (event.chunk) {
            publish({ type: 'agent_chunk', chunk: event.chunk })
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk: event.chunk })}\n\n`)
            )
          }
          if (event.itinerary) {
            publish({ type: 'itinerary_ready', itinerary: event.itinerary })
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ itinerary: event.itinerary })}\n\n`)
            )
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
