import { UserPreferences, Itinerary } from './types'

// Temporarily using Groq for testing — swap back to Venice for demo recording
// Venice: https://api.venice.ai/api/v1 with VENICE_API_KEY
// Groq:   https://api.groq.com/openai/v1 with GROQ_API_KEY
const VENICE_BASE_URL = process.env.GROQ_API_KEY
  ? 'https://api.groq.com/openai/v1'
  : 'https://api.venice.ai/api/v1'
const API_KEY = process.env.GROQ_API_KEY ?? process.env.VENICE_API_KEY
const MODEL = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'llama-3.3-70b'

export async function* streamItinerary(
  prefs: UserPreferences
): AsyncGenerator<{ chunk?: string; itinerary?: Itinerary }> {
  const systemPrompt = `You are Roam, an AI city day agent. Given user preferences, create a day itinerary with exactly 3 activities.

Respond with a short reasoning paragraph first, then output raw JSON after the marker "ITINERARY_JSON:" (no markdown, no code fences).

ITINERARY_JSON:
{
  "city": "<city>",
  "activities": [
    {
      "id": "food",
      "name": "<venue name>",
      "time": "<HH:MM>",
      "costUsdc": 0.80,
      "serviceEndpoint": "/api/services/food",
      "description": "<one sentence>",
      "category": "street-food"
    },
    {
      "id": "coffee",
      "name": "<venue name>",
      "time": "<HH:MM>",
      "costUsdc": 0.60,
      "serviceEndpoint": "/api/services/coffee",
      "description": "<one sentence>",
      "category": "coffee"
    },
    {
      "id": "music",
      "name": "<venue name>",
      "time": "<HH:MM>",
      "costUsdc": 1.20,
      "serviceEndpoint": "/api/services/music",
      "description": "<one sentence>",
      "category": "live-music"
    }
  ],
  "totalCost": 2.60,
  "reasoning": "<one sentence summary>"
}`

  const userMessage = `Plan my day in ${prefs.city}.
Vibes: ${prefs.vibes.join(', ')}
Budget: $${prefs.budgetUsdc} USDC
Time: ${prefs.startTime} to ${prefs.endTime}

Keep total cost under budget. Space activities across the time window.`

  const response = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Venice API error: ${response.status} ${await response.text()}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const json = JSON.parse(data)
        const chunk = json.choices?.[0]?.delta?.content
        if (chunk) {
          fullText += chunk
          yield { chunk }
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  const jsonMatch = fullText.match(/ITINERARY_JSON:\s*(\{[\s\S]+\})/m)
  if (jsonMatch) {
    try {
      const itinerary = JSON.parse(jsonMatch[1]) as Itinerary
      yield { itinerary }
    } catch {
      // ignore parse errors — agent text still streamed
    }
  }
}
