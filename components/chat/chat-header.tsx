'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatHeaderProps {
  onClose: () => void
  isOnline?: boolean
}

export function ChatHeader({ onClose, isOnline = true }: ChatHeaderProps) {
  return (
    <div className="bg-green-600 rounded-t-2xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className={cn(
              'h-3 w-3 rounded-full',
              isOnline ? 'bg-green-300 animate-pulse' : 'bg-slate-400'
            )}
          />
          {isOnline && (
            <div className="absolute inset-0 rounded-full bg-green-300 animate-ping opacity-30" />
          )}
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Support RecoCycle</h3>
          <p className="text-green-100 text-xs">Biasanya membalas dalam 1 jam</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-full text-white/80 hover:bg-green-700 hover:text-white transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}