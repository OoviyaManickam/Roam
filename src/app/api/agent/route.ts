import { NextRequest, NextResponse } from 'next/server'
import { streamItinerary } from '@/lib/venice'
import { publish } from '@/lib/store'
import { UserPreferences } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const prefs: UserPreferences = await req.json()

  let fullText = ''
  try {
    for await (const event of streamItinerary(prefs)) {
      if (event.chunk) {
        fullText += event.chunk
        publish({ type: 'agent_chunk', chunk: event.chunk })
      }
      if (event.itinerary) {
        publish({ type: 'itinerary_ready', itinerary: event.itinerary })
      }
    }
  } catch (err) {
    console.error('[agent] streamItinerary error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, length: fullText.length })
}
