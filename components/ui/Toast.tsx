'use client'
import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastProps {
  toasts: ToastMessage[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />
  }

  const borderMap = {
    success: 'border-emerald-500/30 shadow-emerald-500/10',
    error: 'border-rose-500/30 shadow-rose-500/10',
    info: 'border-blue-500/30 shadow-blue-500/10'
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 bg-[#0d1224]/90 border backdrop-blur-md p-4 rounded-2xl shadow-xl transition-all duration-300 transform translate-y-0 animate-in slide-in-from-bottom-5 ${borderMap[toast.type]}`}
    >
      <div className="mt-0.5">{iconMap[toast.type]}</div>
      <div className="flex-1">
        <h4 className="text-xs font-bold text-white leading-none mb-1">{toast.title}</h4>
        <p className="text-[11px] text-gray-400 leading-relaxed font-normal">{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-gray-500 hover:text-white transition-colors shrink-0 p-0.5 rounded-lg hover:bg-white/[0.04]"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Hook helper for managing toasts in page components
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toasts,
    addToast,
    removeToast,
    ToastComponent: () => <ToastContainer toasts={toasts} onClose={removeToast} />
  }
}
