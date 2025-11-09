import { useState, useRef, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Auth from './components/Auth'
import ResetPassword from './components/ResetPassword'
import Header from './components/Header'
import GroupManager from './components/GroupManager'
import Chat from './components/Chat'
import Table from './components/Table'
import Income from './components/Income'
import Loans from './components/Loans'
import EnhancedAnalytics from './components/EnhancedAnalytics'
import { ToastProvider } from './components/Toast'
import { supabase } from './supabase'
import { initializeMobile, getMobileStyles } from './mobile'
import axios from 'axios'

function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('pfm_active_tab') || 'chat')
  const [expenses] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentGroup, setCurrentGroup] = useState(() => {
    try {
      const saved = localStorage.getItem('pfm_current_group')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [showAddExpense, setShowAddExpense] = useState(false)
  const tableRef = useRef()
  const incomeRef = useRef()
  const loansRef = useRef()

  const mobileStyles = getMobileStyles()
  
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slide-up {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .animate-slide-up { animation: slide-up 0.3s ease-out; }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])
  
  useEffect(() => {
    initializeMobile()
  }, [])
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])
  
  useEffect(() => {
    localStorage.setItem('pfm_active_tab', activeTab)
  }, [activeTab])
  
  useEffect(() => {
    if (currentGroup) {
      localStorage.setItem('pfm_current_group', JSON.stringify(currentGroup))
    } else {
      localStorage.removeItem('pfm_current_group')
    }
  }, [currentGroup])

  const handleExpenseAdded = async (newExpenses) => {
    try {
      // Get user's display name
      const getUserDisplayName = () => {
        if (user?.user_metadata?.name && user.user_metadata.name.trim()) {
          return user.user_metadata.name.trim()
        }
        if (user?.email) {
          const emailName = user.email.split('@')[0]
          // Clean up email name and capitalize
          const cleanName = emailName.replace(/[^a-zA-Z ]/g, ' ').replace(/\s+/g, ' ').trim()
          return cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Unknown'
        }
        return 'Unknown'
      }
      
      const displayName = getUserDisplayName()
      
      for (const expense of newExpenses) {
        const expenseData = {
          amount: expense.amount || 0,
          item: expense.item || 'item',
          category: expense.category || 'other',
          remarks: expense.remarks || '',
          paid_by: expense.paid_by || null,
          date: new Date().toISOString().split('T')[0],
          user_id: user?.id,
          added_by: displayName  // Always use the actual user who added it
        }
        
        if (currentGroup) {
          expenseData.group_id = currentGroup.id
        }
        
        const { error } = await supabase.from('expenses').insert(expenseData)
        
        if (error) {
          throw error
        }
      }
      
      // Refresh all tables immediately
      if (tableRef.current) {
        tableRef.current.refresh()
      }
      if (incomeRef.current) {
        incomeRef.current.refresh()
      }
      if (loansRef.current) {
        loansRef.current.refresh()
      }
    } catch (error) {
      throw error
    }
  }

  const handleTableRefresh = () => {
    if (tableRef.current) {
      tableRef.current.refresh()
    }
    if (incomeRef.current) {
      incomeRef.current.refresh()
    }
    if (loansRef.current) {
      loansRef.current.refresh()
    }
  }

  const MainApp = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-sm font-bold rounded-full mx-auto mb-3">PFM</div>
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        </div>
      )
    }
    
    if (!user) {
      return <Auth onAuth={setUser} />
    }

    const sidebarItems = [
      { id: 'chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
      { id: 'expenses', label: 'Expenses', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { id: 'income', label: 'Income', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'loans', label: 'Loans', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
      { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
    ]

    const mobileNavItems = [
      { id: 'expenses', label: 'Expenses', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { id: 'income', label: 'Income', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
      { id: 'loans', label: 'Loans', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
      { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
    ]

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar - Desktop */}
        <aside className="sidebar">
          <div className="p-4 border-b border-gray-200">
            <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-xs font-bold rounded-full">PFM</div>
            </button>
          </div>
          
          <nav className="p-2">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === item.id ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <Header user={user} onLogout={() => setUser(null)} onProfileUpdate={() => {}} currentGroup={currentGroup} compact />
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:ml-56 h-screen flex flex-col">
          <div className="lg:hidden flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 bg-black text-white flex items-center justify-center text-[10px] font-bold rounded-full">PFM</div>
              </button>
              <Header user={user} onLogout={() => setUser(null)} onProfileUpdate={() => {}} currentGroup={currentGroup} compact />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 lg:px-8">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <GroupManager 
                          user={user} 
                          currentGroup={currentGroup} 
                          onGroupChange={setCurrentGroup}
                          onClearChat={() => {
                            localStorage.removeItem('pfm_messages')
                            setActiveTab('expenses')
                            setTimeout(() => setActiveTab('chat'), 0)
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          localStorage.removeItem('pfm_messages')
                          setActiveTab('expenses')
                          setTimeout(() => setActiveTab('chat'), 0)
                        }}
                        className="hidden lg:block px-3 py-2 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                      >
                        Clear Chat
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Chat onExpenseAdded={handleExpenseAdded} onTableRefresh={handleTableRefresh} user={user} currentGroup={currentGroup} isVisible={true} />
                </div>
              </div>
            )}
            
            {activeTab === 'expenses' && (
              <div className="flex flex-col h-full relative">
                <div className="flex-shrink-0 p-4 lg:p-6 lg:pt-6 max-w-7xl mx-auto w-full">
                  <GroupManager user={user} currentGroup={currentGroup} onGroupChange={setCurrentGroup} />
                </div>
                <div className="flex-1 overflow-auto px-4 lg:px-6 pb-32 lg:pb-4 max-w-7xl mx-auto w-full">
                  <Table ref={tableRef} expenses={expenses} currentGroup={currentGroup} user={user} />
                </div>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="fixed bottom-24 lg:bottom-8 right-6 lg:right-12 w-14 h-14 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-md text-gray-900 rounded-full shadow-lg hover:bg-white/20 transition-all flex items-center justify-center z-40 border border-white/20"
                >
                  <svg className="w-6 h-6 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
            
            {activeTab === 'income' && (
              <div className="flex flex-col h-full relative">
                <div className="flex-shrink-0 p-4 lg:p-6 lg:pt-6 max-w-7xl mx-auto w-full">
                  <GroupManager user={user} currentGroup={currentGroup} onGroupChange={setCurrentGroup} />
                </div>
                <div className="flex-1 overflow-auto px-4 lg:px-6 pb-32 lg:pb-4 max-w-7xl mx-auto w-full">
                  <Income ref={incomeRef} currentGroup={currentGroup} user={user} />
                </div>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="fixed bottom-24 lg:bottom-8 right-6 lg:right-12 w-14 h-14 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-md text-gray-900 rounded-full shadow-lg hover:bg-white/20 transition-all flex items-center justify-center z-40 border border-white/20"
                >
                  <svg className="w-6 h-6 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
            
            {activeTab === 'loans' && (
              <div className="flex flex-col h-full relative">
                <div className="flex-shrink-0 p-4 lg:p-6 lg:pt-6 max-w-7xl mx-auto w-full">
                  <GroupManager user={user} currentGroup={currentGroup} onGroupChange={setCurrentGroup} />
                </div>
                <div className="flex-1 overflow-auto px-4 lg:px-6 pb-32 lg:pb-4 max-w-7xl mx-auto w-full">
                  <Loans ref={loansRef} currentGroup={currentGroup} user={user} />
                </div>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="fixed bottom-24 lg:bottom-8 right-6 lg:right-12 w-14 h-14 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-md text-gray-900 rounded-full shadow-lg hover:bg-white/20 transition-all flex items-center justify-center z-40 border border-white/20"
                >
                  <svg className="w-6 h-6 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div className="flex flex-col h-full relative">
                <div className="flex-shrink-0 p-4 lg:p-6 lg:pt-6 max-w-7xl mx-auto w-full">
                  <GroupManager user={user} currentGroup={currentGroup} onGroupChange={setCurrentGroup} />
                </div>
                <div className="flex-1 overflow-auto px-4 lg:px-6 pb-32 lg:pb-4 max-w-7xl mx-auto w-full">
                  <EnhancedAnalytics currentGroup={currentGroup} user={user} />
                </div>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="fixed bottom-24 lg:bottom-8 right-6 lg:right-12 w-14 h-14 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-md text-gray-900 rounded-full shadow-lg hover:bg-white/20 transition-all flex items-center justify-center z-40 border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </main>



        {/* Bottom Nav - Mobile */}
        <nav className="bottom-nav safe-bottom">
          <div className="flex h-14">
            {mobileNavItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === item.id ? 'text-black' : 'text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={activeTab === item.id ? 2 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Add Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center" onClick={() => setShowAddExpense(false)}>
            <div className="bg-white w-full h-[90vh] lg:h-[600px] lg:w-[600px] lg:rounded-2xl shadow-2xl flex flex-col animate-slide-up lg:animate-none" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-lg">Add Expense</h3>
                <button onClick={() => setShowAddExpense(false)} className="text-gray-400 hover:text-black transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-3">
                  {/* Chat messages will go here */}
                </div>
              </div>
              <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  const text = formData.get('expense')
                  if (!text.trim()) return
                  
                  try {
                    const response = await axios.post(`${window.APP_CONFIG?.API_BASE_URL || ''}/api/expenses/parse`, { text })
                    const { expenses } = response.data
                    if (expenses && expenses.length > 0) {
                      await handleExpenseAdded(expenses)
                      setShowAddExpense(false)
                    }
                  } catch (error) {
                    console.error(error)
                  }
                }} className="flex gap-2">
                  <input 
                    name="expense"
                    placeholder="e.g., 500 on lunch, 200 on coffee" 
                    className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-full focus:border-black focus:outline-none transition-colors" 
                    autoFocus
                  />
                  <button type="submit" className="w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-all flex items-center justify-center text-lg flex-shrink-0">
                    ↑
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<MainApp />} />
        </Routes>
      </Router>
    </ToastProvider>
  )
}

export default App