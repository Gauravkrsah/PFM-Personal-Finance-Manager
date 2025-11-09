import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [dots, setDots] = useState('')
  const [tip, setTip] = useState(0)
  
  const tips = [
    "💡 Type natural language like '500 on biryani, 400 on grocery'",
    "🤖 Chat mode can answer questions about your expenses",
    "👥 Create groups to track shared expenses with friends",
    "📊 View detailed analytics and spending patterns",
    "🔍 Ask specific questions like 'how much did I spend on food?'"
  ]

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    const tipsInterval = setInterval(() => {
      setTip(prev => (prev + 1) % tips.length)
    }, 3000)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(tipsInterval)
    }
  }, [tips.length])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Logo Animation */}
        <div className="relative mb-6">
          <div className="text-6xl mb-4 animate-bounce">🧾</div>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        
        {/* App Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Minimalist PFM</h1>
        <p className="text-gray-600 mb-8">Your personal finance companion</p>
        
        {/* Loading Animation */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
        
        {/* Loading Text */}
        <p className="text-gray-600 mb-8">
          Loading your dashboard{dots}
        </p>
        
        {/* Tips Carousel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm border">
          <div className="text-sm text-gray-700 transition-all duration-500 ease-in-out">
            {tips[tip]}
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
}