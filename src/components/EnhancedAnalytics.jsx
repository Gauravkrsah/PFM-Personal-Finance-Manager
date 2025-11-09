import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export default function EnhancedAnalytics({ currentGroup, user }) {
  const [stats, setStats] = useState({
    expense: 0, income: 0, balance: 0, loanOut: 0, loanIn: 0, 
    categories: {}, incomeCategories: {}, weekData: [], monthData: []
  })
  const [range, setRange] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!user?.id) { setLoading(false); return }

    let query = supabase.from('expenses').select('*')
    
    if (range !== 'all') {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - parseInt(range))
      query = query.gte('date', start.toISOString().split('T')[0]).lte('date', end.toISOString().split('T')[0])
    }
    
    query = currentGroup ? query.eq('group_id', currentGroup.id) : query.eq('user_id', user.id).is('group_id', null)
    
    const { data } = await query.order('date', { ascending: false })
    
    if (data?.length) {
      const expenses = data.filter(r => r.amount > 0 && r.category?.toLowerCase() !== 'income' && r.category?.toLowerCase() !== 'loan')
      const income = data.filter(r => r.category?.toLowerCase() === 'income')
      const loanOut = data.filter(r => r.amount > 0 && r.category?.toLowerCase() === 'loan')
      const loanIn = data.filter(r => r.amount < 0 && r.category?.toLowerCase() === 'loan')
      
      const expenseTotal = expenses.reduce((s, r) => s + r.amount, 0)
      const incomeTotal = income.reduce((s, r) => s + Math.abs(r.amount), 0)
      const loanOutTotal = loanOut.reduce((s, r) => s + r.amount, 0)
      const loanInTotal = loanIn.reduce((s, r) => s + Math.abs(r.amount), 0)
      
      const categories = {}
      expenses.forEach(r => {
        const cat = (r.category || 'other').toLowerCase()
        categories[cat] = (categories[cat] || 0) + r.amount
      })
      
      setStats({
        expense: expenseTotal,
        income: incomeTotal,
        balance: incomeTotal - expenseTotal,
        loanOut: loanOutTotal,
        loanIn: loanInTotal,
        categories
      })
    } else {
      setStats({ expense: 0, income: 0, balance: 0, loanOut: 0, loanIn: 0, categories: {} })
    }
    setLoading(false)
  }, [user, currentGroup, range])

  useEffect(() => { fetch() }, [fetch])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-sm text-gray-500">Loading...</div></div>

  const savingsRate = stats.income > 0 ? Math.round((stats.balance / stats.income) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📊 Financial Analytics</h2>
        <div className="flex items-center gap-2">
          <button onClick={fetch} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors">Refresh</button>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-black">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">💸 Expenses</div>
          <div className="text-xl font-bold">₹{stats.expense.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">💰 Income</div>
          <div className="text-xl font-bold">₹{stats.income.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">💵 Balance</div>
          <div className="text-xl font-bold">₹{Math.abs(stats.balance).toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">🎯 Savings</div>
          <div className="text-xl font-bold">{savingsRate}%</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">🤝 Loans Out</div>
          <div className="text-xl font-bold">₹{stats.loanOut.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">📊 Net Loan</div>
          <div className="text-xl font-bold">₹{Math.abs(stats.loanOut - stats.loanIn).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.keys(stats.categories).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">💸 Expense Breakdown</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.categories).sort(([,a], [,b]) => b - a).map(([cat, amt]) => {
                const pct = Math.round((amt / stats.expense) * 100)
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs capitalize font-medium">{cat}</span>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-black h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                    <span className="text-sm font-bold w-20 text-right">₹{amt.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">📊 Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600">Total Expenses</span>
              <span className="text-sm font-bold">₹{stats.expense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600">Total Income</span>
              <span className="text-sm font-bold">₹{stats.income.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600">Net Balance</span>
              <span className="text-sm font-bold">{stats.balance >= 0 ? '+' : '-'}₹{Math.abs(stats.balance).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600">Savings Rate</span>
              <span className="text-sm font-bold">{savingsRate}%</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600">Loans Given</span>
              <span className="text-sm font-bold">₹{stats.loanOut.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600">Loans Received</span>
              <span className="text-sm font-bold">₹{stats.loanIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs text-gray-600">Net Loan Position</span>
              <span className="text-sm font-bold">{stats.loanOut >= stats.loanIn ? '+' : '-'}₹{Math.abs(stats.loanOut - stats.loanIn).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {stats.expense === 0 && stats.income === 0 && (
        <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">No Data Available</h3>
          <p className="text-xs text-gray-500">Add some transactions to see your analytics</p>
        </div>
      )}
    </div>
  )
}
