'use client'

import { motion } from 'framer-motion'

interface Props {
  text: string
  isStreaming: boolean
}

export function AgentFeed({ text, isStreaming }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-2 h-2 rounded-full ${
            isStreaming ? 'bg-violet-500 animate-pulse' : 'bg-gray-600'
          }`}
        />
        <span className="text-xs text-gray-500 uppercase tracking-wider">Roam Agent</span>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">
        {text || (isStreaming ? '' : 'Waiting for agent...')}
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className="inline-block w-2 h-4 bg-violet-500 ml-1 align-middle"
          />
        )}
      </p>
    </div>
  )
}
