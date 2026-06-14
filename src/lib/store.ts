import { SSEEvent } from './types'

type Listener = (event: SSEEvent) => void

const listeners = new Set<Listener>()

export function subscribe(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function publish(event: SSEEvent) {
  listeners.forEach((fn) => {
    try {
      fn(event)
    } catch {
      // stale subscriber — remove it
      listeners.delete(fn)
    }
  })
}
