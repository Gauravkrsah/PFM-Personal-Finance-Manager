import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { Send } from 'lucide-react'
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
  const [pendingTransactions, setPendingTransactions] = useState(null) // For confirmation flow
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
      const { data, error } = await query.order('created_at', { ascending: false }).limit(1000)
      if (!error) setExpensesData(data || [])
    } catch (err) { }
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
          // Check if any transaction has ambiguous category ("Other")
          const hasAmbiguous = expenses.some(exp => exp.category === 'Other')

          if (hasAmbiguous) {
            // Store pending transactions and ask for confirmation
            setPendingTransactions(expenses)
            setMessages(prev => [...prev, {
              type: 'confirmation',
              text: `I'm not sure where to save this. Please choose:`,
              expenses: expenses
            }])
          } else {
            // Auto-save if confident
            await onExpenseAdded(expenses)
            setMessages(prev => [...prev, { type: 'bot', text: '✓ Saved' }])
          }
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

  // Handle confirmation - save to chosen category
  const handleConfirmSave = async (category) => {
    if (!pendingTransactions) return

    // Special handling for Loan: If person missing, try to extract from remarks/item
    if (category === 'Loan' && !pendingTransactions[0].paid_by) {
      const exp = pendingTransactions[0]
      const text = (exp.remarks || exp.item || '').toLowerCase()

      // Stopwords to ignore when looking for names
      const stopWords = ['i', 'me', 'my', 'to', 'from', 'for', 'on', 'in', 'at', 'the', 'a', 'an', 'send', 'sent', 'gave', 'given', 'lent', 'borrowed', 'took', 'paid', 'loan', 'transaction', 'transfer', 'money', 'cash', 'online', 'upi']

      let person = null
      const words = (exp.remarks || exp.item || '').split(' ')

      for (const word of words) {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '')
        if (cleanWord.length > 2 && !stopWords.includes(cleanWord.toLowerCase())) {
          person = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase()
          break
        }
      }

      // If we found a likely person, UPDATE the UI to ask for specific loan type instead of saving generic loan
      if (person) {
        const updatedExpenses = pendingTransactions.map(e => ({
          ...e,
          paid_by: person
        }))

        setPendingTransactions(updatedExpenses)

        // Also update the message to reflect the change so UI re-renders with new buttons
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMsg = newMessages[newMessages.length - 1]
          if (lastMsg.type === 'confirmation') {
            lastMsg.expenses = updatedExpenses
          }
          return newMessages
        })
        return // Stop here, let user choose specific type now
      }
    }

    try {
      // Override category for all pending transactions
      const updatedExpenses = pendingTransactions.map(exp => ({
        ...exp,
        category: category
      }))

      await onExpenseAdded(updatedExpenses)
      setMessages(prev => [...prev, { type: 'bot', text: `✓ Saved to ${category}` }])
      setPendingTransactions(null)
    } catch (error) {
      setMessages(prev => [...prev, { type: 'bot', text: 'Error saving transaction' }])
    }
  }

  // Handle confirmation with specific type (for person-based transactions)
  const handleConfirmSaveWithType = async (category, itemType, amount) => {
    if (!pendingTransactions) return

    try {
      const exp = pendingTransactions[0]

      // Determine label and remarks based on type
      let typeLabel, remarks
      if (itemType === 'received from') {
        typeLabel = 'RECEIVED'
        remarks = `Received from ${exp.paid_by}`
      } else if (itemType === 'lent to') {
        typeLabel = 'LENT'
        remarks = `Lent to ${exp.paid_by}`
      } else if (itemType === 'borrowed from') {
        typeLabel = 'BORROWED'
        remarks = `Borrowed from ${exp.paid_by}`
      } else if (itemType === 'paid to') {
        typeLabel = 'PAID'
        remarks = `Paid to ${exp.paid_by}`
      } else {
        typeLabel = itemType.toUpperCase()
        remarks = `${itemType} ${exp.paid_by}`
      }

      const updatedExpense = {
        ...exp,
        category: category,
        item: itemType,
        amount: amount,
        remarks: remarks
      }

      await onExpenseAdded([updatedExpense])
      setMessages(prev => [...prev, { type: 'bot', text: `✓ Saved as ${typeLabel} (${exp.paid_by})` }])
      setPendingTransactions(null)
    } catch (error) {
      setMessages(prev => [...prev, { type: 'bot', text: 'Error saving transaction' }])
    }
  }

  const handleCancelPending = () => {
    setPendingTransactions(null)
    setMessages(prev => [...prev, { type: 'bot', text: '✗ Cancelled' }])
  }

  return (
    <div className="flex flex-col h-full relative" style={{ display: isVisible ? 'flex' : 'none' }}>

      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 pb-48 lg:pb-48">
        <div className="max-w-4xl mx-auto space-y-3 pt-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center min-h-[50vh] text-center text-gray-400 dark:text-gray-500">
              <div>
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Add expenses or ask questions</p>
                <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">e.g., "lunch 250" or "total spent?"</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'confirmation' ? (
                <div className="max-w-[90%] lg:max-w-[80%] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 rounded-2xl">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">{msg.text}</p>
                  {msg.expenses && msg.expenses.map((exp, j) => (
                    <p key={j} className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Rs.{Math.abs(exp.amount).toLocaleString()} → {exp.remarks || exp.item}
                    </p>
                  ))}
                  <div className="flex flex-col gap-2 mt-3">
                    {/* Check if there's a person name in paid_by */}
                    {msg.expenses && msg.expenses[0]?.paid_by ? (
                      <>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">What type of transaction?</p>
                        <div className="flex flex-wrap gap-2">
                          {/* Check item/remarks for direction hint */}
                          {(() => {
                            const exp = msg.expenses[0]
                            const item = (exp.item || '').toLowerCase()
                            const remarks = (exp.remarks || '').toLowerCase()

                            // Check for direction hints
                            const isGaveOrTo = item.includes('i gave') || item.includes('to person') || remarks.includes('i gave')
                            const isFrom = item.includes('from') || remarks.includes(' from ')

                            // If "I gave" or "to person" - show LENT and PAID (money going out)
                            if (isGaveOrTo && !isFrom) {
                              return (
                                <>
                                  <button onClick={() => handleConfirmSaveWithType('Loan', 'lent to', Math.abs(exp.amount))}
                                    className="px-3 py-2 text-xs font-medium bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors">
                                    I lent to {exp.paid_by} → <span className="font-bold">LENT</span>
                                  </button>
                                  <button onClick={() => handleConfirmSaveWithType('Loan', 'paid to', Math.abs(exp.amount))}
                                    className="px-3 py-2 text-xs font-medium bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors">
                                    I paid back {exp.paid_by} → <span className="font-bold">PAID</span>
                                  </button>
                                  <button onClick={() => handleConfirmSaveWithType('Income', 'received from', -Math.abs(exp.amount))}
                                    className="px-3 py-2 text-xs font-medium bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 transition-colors">
                                    Income from {exp.paid_by} → <span className="font-bold">INCOME</span>
                                  </button>
                                  <button onClick={() => handleConfirmSaveWithType('Income', 'received from', -Math.abs(exp.amount))}
                                    className="px-3 py-2 text-xs font-medium bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 transition-colors">
                                    Income from {exp.paid_by} → <span className="font-bold">INCOME</span>
                                  </button>
                                </>
                              )
                            }

                            // If "from person" - show RECEIVED and BORROWED (money coming in)
                            if (isFrom) {
                              return (
                                <>
                                  <button onClick={() => handleConfirmSaveWithType('Loan', 'received from', -Math.abs(exp.amount))}
                                    className="px-3 py-2 text-xs font-medium bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors">
                                    {exp.paid_by} paid back → <span className="font-bold">RECEIVED</span>
                                  </button>
                                  <button onClick={() => handleConfirmSaveWithType('Loan', 'borrowed from', -Math.abs(exp.amount))}
                                    className="px-3 py-2 text-xs font-medium bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors">
                                    I borrowed from {exp.paid_by} → <span className="font-bold">BORROWED</span>
                                  </button>
                                  <button onClick={() => handleConfirmSaveWithType('Income', 'received from', -Math.abs(exp.amount))}
                                    className="px-3 py-2 text-xs font-medium bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 transition-colors">
                                    Income from {exp.paid_by} → <span className="font-bold">INCOME</span>
                                  </button>
                                </>
                              )
                            }

                            // Otherwise show all 4 options
                            return (
                              <>
                                <button onClick={() => handleConfirmSaveWithType('Loan', 'received from', -Math.abs(exp.amount))}
                                  className="px-3 py-2 text-xs font-medium bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors">
                                  {exp.paid_by} paid back → <span className="font-bold">RECEIVED</span>
                                </button>
                                <button onClick={() => handleConfirmSaveWithType('Loan', 'lent to', Math.abs(exp.amount))}
                                  className="px-3 py-2 text-xs font-medium bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors">
                                  I gave to {exp.paid_by} → <span className="font-bold">LENT</span>
                                </button>
                                <button onClick={() => handleConfirmSaveWithType('Loan', 'borrowed from', -Math.abs(exp.amount))}
                                  className="px-3 py-2 text-xs font-medium bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors">
                                  I took from {exp.paid_by} → <span className="font-bold">BORROWED</span>
                                </button>
                                <button onClick={() => handleConfirmSaveWithType('Loan', 'paid to', Math.abs(exp.amount))}
                                  className="px-3 py-2 text-xs font-medium bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors">
                                  I paid back {exp.paid_by} → <span className="font-bold">PAID</span>
                                </button>
                              </>
                            )
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleConfirmSave('Food')}
                          className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        >
                          Expense
                        </button>
                        <button
                          onClick={() => handleConfirmSave('Loan')}
                          className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                        >
                          Loan
                        </button>
                        <button
                          onClick={() => handleConfirmSave('Income')}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          Income
                        </button>
                      </div>
                    )}
                    <button
                      onClick={handleCancelPending}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-paper-300 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-paper-400 transition-colors self-start"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`max-w-[80%] lg:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${msg.type === 'user' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-paper-200 text-gray-900 dark:text-gray-100'}`}>
                  {msg.text}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-paper-200 px-4 py-2.5 rounded-2xl text-sm text-gray-500 dark:text-gray-400">...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 lg:left-56 z-30">
        <div className="absolute inset-x-0 bottom-full h-16 bg-gradient-to-t from-paper-50 dark:from-paper-50 to-transparent pointer-events-none" />
        <div className="bg-paper-50/95 dark:bg-paper-50/95 backdrop-blur-xl px-4 lg:px-8 py-4 lg:pb-10 lg:pt-6">
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add expense or ask question..."
              className="w-full px-5 py-3 pr-12 text-sm border border-gray-300 dark:border-paper-300/60 bg-white dark:bg-paper-100 text-ink-900 rounded-full focus:border-black dark:focus:border-gray-500 focus:outline-none focus:shadow-sm transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-paper-300 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
