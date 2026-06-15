'use client'

import { motion } from 'framer-motion'

interface Props {
  text: string
  isStreaming: boolean
}

export function AgentFeed({ text, isStreaming }: Props) {
  return (
    <div className="bg-stone-50/80 backdrop-blur-sm border border-stone-200 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <div
          className={`w-2 h-2 rounded-full ${
            isStreaming ? 'bg-black animate-pulse' : 'bg-stone-300'
          }`}
        />
        <span className="text-xs text-stone-400 uppercase tracking-wider">Roam Agent</span>
      </div>
      <p className="text-stone-700 text-sm leading-relaxed font-mono whitespace-pre-wrap flex-1 overflow-y-auto">
        {text || (isStreaming ? '' : 'Waiting for agent...')}
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className="inline-block w-2 h-4 bg-black ml-1 align-middle"
          />
        )}
      </p>
    </div>
  )
}
