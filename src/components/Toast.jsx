import { useState, useEffect, createContext, useContext } from 'react'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const [activeConfirms, setActiveConfirms] = useState(new Set())

  const addToast = (message, type = 'info', duration = 3000) => {
    // Prevent duplicate toasts
    const exists = toasts.some(toast => toast.message === message && toast.type === type)
    if (exists) return
    
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
    
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showConfirm = (message, onConfirm, onCancel) => {
    // Prevent multiple confirm dialogs with same message
    if (activeConfirms.has(message)) return
    
    setActiveConfirms(prev => new Set([...prev, message]))
    const id = Date.now() + Math.random()
    
    setToasts(prev => [...prev, { 
      id, 
      message, 
      type: 'confirm', 
      onConfirm: () => {
        removeToast(id)
        setActiveConfirms(prev => {
          const newSet = new Set(prev)
          newSet.delete(message)
          return newSet
        })
        onConfirm()
      },
      onCancel: () => {
        removeToast(id)
        setActiveConfirms(prev => {
          const newSet = new Set(prev)
          newSet.delete(message)
          return newSet
        })
        onCancel?.()
      }
    }])
  }

  const toast = {
    success: (message) => addToast(message, 'success'),
    error: (message) => addToast(message, 'error'),
    info: (message) => addToast(message, 'info'),
    warning: (message) => addToast(message, 'warning'),
    confirm: showConfirm
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      toasts.forEach(toast => {
        if (toast.type !== 'confirm') {
          removeToast(toast.id)
        }
      })
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-20 min-h-screen space-y-4"
      onClick={handleBackdropClick}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

const ToastItem = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleRemove = () => {
    setIsVisible(false)
    setTimeout(onRemove, 300)
  }

  const getToastStyles = () => {
    const base = "transform transition-all duration-300 ease-in-out w-full max-w-md mx-4 bg-white shadow-2xl rounded-xl pointer-events-auto border"
    
    if (!isVisible) {
      return `${base} scale-95 opacity-0 -translate-y-2`
    }
    
    return `${base} scale-100 opacity-100 translate-y-0`
  }

  const getIconAndColor = () => {
    switch (toast.type) {
      case 'success':
        return { icon: '✅', bg: 'bg-green-100', border: 'border-green-200' }
      case 'error':
        return { icon: '❌', bg: 'bg-red-100', border: 'border-red-200' }
      case 'warning':
        return { icon: '⚠️', bg: 'bg-yellow-100', border: 'border-yellow-200' }
      case 'confirm':
        return { icon: '❓', bg: 'bg-blue-100', border: 'border-blue-200' }
      default:
        return { icon: 'ℹ️', bg: 'bg-blue-100', border: 'border-blue-200' }
    }
  }

  const { icon, bg, border } = getIconAndColor()

  if (toast.type === 'confirm') {
    return (
      <div className={`${getToastStyles()} ${border}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 ${bg} rounded-full mb-4`}>
              <span className="text-3xl">{icon}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Action</h3>
            <p className="text-gray-600 mb-6">{toast.message}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={toast.onConfirm}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Confirm
              </button>
              <button
                onClick={toast.onCancel}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${getToastStyles()} ${border}`} onClick={(e) => e.stopPropagation()}>
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${bg} rounded-full p-3 mr-4`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="flex-1">
            <p className="text-base font-medium text-gray-900">{toast.message}</p>
          </div>
          <button
            onClick={handleRemove}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}