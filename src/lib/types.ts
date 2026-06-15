export type Vibe = 'street-food' | 'coffee' | 'live-music' | 'art' | 'markets' | 'rooftop-bars' | 'nature-walks' | 'bookshops' | 'museums' | 'nightlife' | 'brunch'

export interface UserPreferences {
  city: string
  vibes: Vibe[]
  budgetUsdc: number
  startTime: string // "HH:MM"
  endTime: string   // "HH:MM"
  walletAddress: string
}

export interface Activity {
  id: string
  name: string
  time: string        // "HH:MM"
  costUsdc: number
  serviceEndpoint: string
  description: string
  category: Vibe
}

export interface Itinerary {
  city: string
  activities: Activity[]
  totalCost: number
  reasoning: string
}

export type PaymentStatus = 'pending' | 'paying' | 'confirmed' | 'failed'

export interface PaymentEvent {
  type: 'payment_update'
  activityId: string
  status: PaymentStatus
  txHash?: string
  accessToken?: string
  relayedVia?: '1shot'
}

export interface AgentEvent {
  type: 'agent_chunk' | 'itinerary_ready' | 'session_complete'
  chunk?: string
  itinerary?: Itinerary
  summary?: { spent: number; budget: number }
}

export type SSEEvent = PaymentEvent | AgentEvent

export interface PermissionContext {
  permissionsContext: string
  accountAddress: `0x${string}`
  budgetUsdc: number
  expiryTimestamp: number
}
