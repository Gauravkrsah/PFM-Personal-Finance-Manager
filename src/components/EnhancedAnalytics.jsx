import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import DateRangePicker, { getDateRange } from './ui/DateRangePicker'

export default function EnhancedAnalytics({ currentGroup, user }) {
  const [stats, setStats] = useState({
    expense: 0, income: 0, balance: 0, loanOut: 0, loanIn: 0,
    categories: {}, incomeCategories: {}, weekData: [], monthData: []
  })
  const [range, setRange] = useState({ type: 'all', start: null, end: null })
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!user?.id) { setLoading(false); return }

    let query = supabase.from('expenses').select('*')

    if (range.type !== 'all') {
      const { start, end } = range.type === 'custom'
        ? { start: new Date(range.start), end: new Date(range.end) }
        : getDateRange(range.type)

      // Ensure we have valid dates
      if (start && end) {
        query = query.gte('date', start.toISOString().split('T')[0]).lte('date', end.toISOString().split('T')[0])
      }
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
        <div>
          <h2 className="font-semibold text-xl tracking-tight">📊 Financial Analytics</h2>
          <p className="text-gray-500 text-xs mt-0.5 sm:block hidden">View your financial trends and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetch} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors hidden sm:block">Refresh</button>
          <DateRangePicker value={range} onChange={setRange} className="w-40 sm:w-48" />
        </div>
      </div>

      {/* Summary Cards - Horizontal scroll on mobile */}
      <div className="flex lg:grid lg:grid-cols-3 gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        {/* Expenses Card */}
        <div className="bg-red-50 p-3 lg:p-4 rounded-xl border border-red-100 shadow-sm relative overflow-hidden min-w-[170px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
          <div className="relative z-10">
            <div className="text-[10px] lg:text-xs font-semibold text-red-800 uppercase tracking-wide mb-1">Expenses</div>
            <div className="text-lg lg:text-2xl font-bold text-red-900">Rs.{stats.expense.toLocaleString()}</div>
            <div className="text-[10px] lg:text-xs text-red-700 mt-1">Money spent</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-green-50 p-3 lg:p-4 rounded-xl border border-green-100 shadow-sm relative overflow-hidden min-w-[170px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
          <div className="relative z-10">
            <div className="text-[10px] lg:text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Income</div>
            <div className="text-lg lg:text-2xl font-bold text-green-900">Rs.{stats.income.toLocaleString()}</div>
            <div className="text-[10px] lg:text-xs text-green-700 mt-1">Money earned</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        {/* Balance Card */}
        <div className={`p-3 lg:p-4 rounded-xl border shadow-sm relative overflow-hidden min-w-[170px] lg:min-w-0 flex-shrink-0 lg:flex-shrink ${stats.balance >= 0 ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200' : 'bg-gradient-to-br from-red-50 to-orange-100 border-red-200'}`}>
          <div className="relative z-10">
            <div className={`text-[10px] lg:text-xs font-semibold uppercase tracking-wide mb-1 ${stats.balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>Balance</div>
            <div className={`text-lg lg:text-2xl font-bold ${stats.balance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              Rs.{Math.abs(stats.balance).toLocaleString()}
            </div>
            <div className={`text-[10px] lg:text-xs font-medium mt-1 ${stats.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {stats.balance >= 0 ? '✨ Positive' : '⚠️ Negative'}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-amber-50 p-3 lg:p-4 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden min-w-[170px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
          <div className="relative z-10">
            <div className="text-[10px] lg:text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Savings</div>
            <div className="text-lg lg:text-2xl font-bold text-amber-900">{savingsRate}%</div>
            <div className="text-[10px] lg:text-xs text-amber-700 mt-1">{savingsRate >= 20 ? '🎯 Great!' : 'Of income'}</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        {/* Loans Out Card */}
        <div className="bg-teal-50 p-3 lg:p-4 rounded-xl border border-teal-100 shadow-sm relative overflow-hidden min-w-[170px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
          <div className="relative z-10">
            <div className="text-[10px] lg:text-xs font-semibold text-teal-800 uppercase tracking-wide mb-1">Lent</div>
            <div className="text-lg lg:text-2xl font-bold text-teal-900">Rs.{stats.loanOut.toLocaleString()}</div>
            <div className="text-[10px] lg:text-xs text-teal-700 mt-1">Given out</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        {/* Net Loan Card */}
        <div className={`p-3 lg:p-4 rounded-xl border shadow-sm relative overflow-hidden min-w-[170px] lg:min-w-0 flex-shrink-0 lg:flex-shrink ${stats.loanOut >= stats.loanIn ? 'bg-gradient-to-br from-teal-50 to-cyan-100 border-teal-200' : 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200'}`}>
          <div className="relative z-10">
            <div className={`text-[10px] lg:text-xs font-semibold uppercase tracking-wide mb-1 ${stats.loanOut >= stats.loanIn ? 'text-teal-800' : 'text-orange-800'}`}>Net Loan</div>
            <div className={`text-lg lg:text-2xl font-bold ${stats.loanOut >= stats.loanIn ? 'text-teal-900' : 'text-orange-900'}`}>
              Rs.{Math.abs(stats.loanOut - stats.loanIn).toLocaleString()}
            </div>
            <div className={`text-[10px] lg:text-xs font-medium mt-1 ${stats.loanOut >= stats.loanIn ? 'text-teal-700' : 'text-orange-700'}`}>
              {stats.loanOut >= stats.loanIn ? '✨ Owed' : '⚠️ Owe'}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.keys(stats.categories).length > 0 && (
          <div className="bg-gradient-to-br from-white to-red-50/30 border border-red-100/50 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-sm">💸</span>
              </div>
              <h3 className="text-sm font-bold text-gray-900">Expense Breakdown</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.categories).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, amt], index) => {
                const pct = Math.round((amt / stats.expense) * 100)
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500']
                return (
                  <div key={cat} className="group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm capitalize font-medium text-gray-800">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{pct}%</span>
                        <span className="text-sm font-bold text-gray-900">Rs.{amt.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-500 ${colors[index % colors.length]}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-white to-blue-50/30 border border-blue-100/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Financial Summary</h3>
          </div>
          <div className="space-y-0">
            <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Total Expenses</span>
              </div>
              <span className="text-sm font-bold text-red-600">Rs.{stats.expense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Total Income</span>
              </div>
              <span className="text-sm font-bold text-green-600">Rs.{stats.income.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                <span className="text-sm text-gray-600">Net Balance</span>
              </div>
              <span className={`text-sm font-bold ${stats.balance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                {stats.balance >= 0 ? '+' : '-'}Rs.{Math.abs(stats.balance).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-sm text-gray-600">Savings Rate</span>
              </div>
              <span className="text-sm font-bold text-amber-600">{savingsRate}%</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                <span className="text-sm text-gray-600">Loans Given</span>
              </div>
              <span className="text-sm font-bold text-teal-600">Rs.{stats.loanOut.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-sm text-gray-600">Loans Received</span>
              </div>
              <span className="text-sm font-bold text-purple-600">Rs.{stats.loanIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stats.loanOut >= stats.loanIn ? 'bg-teal-500' : 'bg-orange-500'}`}></div>
                <span className="text-sm text-gray-600">Net Loan Position</span>
              </div>
              <span className={`text-sm font-bold ${stats.loanOut >= stats.loanIn ? 'text-teal-600' : 'text-orange-600'}`}>
                {stats.loanOut >= stats.loanIn ? '+' : '-'}Rs.{Math.abs(stats.loanOut - stats.loanIn).toLocaleString()}
              </span>
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
