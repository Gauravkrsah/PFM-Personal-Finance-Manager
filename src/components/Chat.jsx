import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { supabase } from '../supabase'

const getApiBaseUrl = () => {
  const isNgrok = window.location.hostname.includes('ngrok')
  
  if (isNgrok && process.env.REACT_APP_BACKEND_NGROK_URL) {
    return process.env.REACT_APP_BACKEND_NGROK_URL
  }
  
  if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL
  }
  
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    return 'http://localhost:8000'
  }
  
  return 'http://localhost:8000'
}

export default function Chat({ onExpenseAdded, onTableRefresh, user, currentGroup, isVisible = true, compact = false, onClearChat }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pfm_messages') || '[]')
    } catch { return [] }
  })
  const [expensesData, setExpensesData] = useState([])
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  useEffect(() => {
    localStorage.setItem('pfm_messages', JSON.stringify(messages))
  }, [messages])

  const fetchExpensesData = useCallback(async () => {
    try {
      let query = supabase.from('expenses').select('*')
      if (currentGroup) {
        query = query.eq('group_id', currentGroup.id)
      } else {
        query = query.eq('user_id', user.id).is('group_id', null)
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(50)
      if (!error) setExpensesData(data || [])
    } catch (err) {}
  }, [user, currentGroup])

  useEffect(() => {
    if (user) fetchExpensesData()
  }, [user, currentGroup, fetchExpensesData])

  const detectIntent = (text) => {
    const expensePattern = /\d+/
    const chatPattern = /\b(how much|total|spent|what|when|who|show|list|tell|calculate)\b/i
    if (chatPattern.test(text)) return 'chat'
    return expensePattern.test(text) ? 'expense' : 'chat'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = input
    setMessages(prev => [...prev, { type: 'user', text: userMsg }])
    setInput('')
    setLoading(true)

    try {
      const intent = detectIntent(userMsg)
      
      if (intent === 'expense') {
        const response = await axios.post(`${getApiBaseUrl()}/api/expenses/parse`, { text: userMsg })
        const { expenses, reply } = response.data
        setMessages(prev => [...prev, { type: 'bot', text: reply }])
        
        if (expenses && expenses.length > 0) {
          await onExpenseAdded(expenses)
          setMessages(prev => [...prev, { type: 'bot', text: '✓ Saved' }])
        }
      } else {
        const { data: { user: freshUser } } = await supabase.auth.getUser()
        const currentUser = freshUser || user
        const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User'
        
        const payload = {
          text: userMsg,
          user_id: currentUser?.id,
          user_email: currentUser?.email,
          user_name: userName
        }

        if (currentGroup) {
          payload.group_name = currentGroup.name
          payload.group_expenses_data = expensesData
        } else {
          payload.expenses_data = expensesData
        }

        const response = await axios.post(`${getApiBaseUrl()}/api/expenses/chat`, payload)
        setMessages(prev => [...prev, { type: 'bot', text: response.data.reply }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { type: 'bot', text: 'Error: Unable to process request' }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem('pfm_messages')
  }

  return (
    <div className="flex flex-col h-full" style={{ display: isVisible ? 'flex' : 'none' }}>
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 pb-48 lg:pb-32">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center min-h-[50vh] text-center text-gray-400">
              <div>
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm">Add expenses or ask questions</p>
                <p className="text-xs mt-1 text-gray-400">e.g., "lunch 250" or "total spent?"</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] lg:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${msg.type === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl text-sm text-gray-500">...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 lg:left-56 z-30">
        <div className="absolute inset-x-0 bottom-full h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        <div className="bg-white px-4 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Add expense or ask question..." 
              className="flex-1 px-5 py-3 text-sm border border-gray-300 rounded-full focus:border-black focus:outline-none focus:shadow-sm transition-all" 
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()} className="w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center text-lg flex-shrink-0">
              {loading ? '...' : '↑'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
