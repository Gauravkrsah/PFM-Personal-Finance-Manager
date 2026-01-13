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

  // if (loading) return ... (Removed to prevent layout shift)

  const savingsRate = stats.income > 0 ? Math.round((stats.balance / stats.income) * 100) : 0

  return (
    <div className={`bg-white dark:bg-paper-100 rounded-2xl shadow-card dark:shadow-none border border-paper-200/60 dark:border-paper-300/50 p-6 space-y-6 transition-all duration-300 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-xl tracking-tight text-ink-900">Financial Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">View your financial trends and insights</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <DateRangePicker value={range} onChange={setRange} className="w-40 sm:w-48" />
          <button
            onClick={fetch}
            disabled={loading}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-paper-200 hover:bg-gray-200 dark:hover:bg-paper-300 rounded-lg transition-colors text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards - Horizontal scroll on mobile */}
      <div className="flex lg:grid lg:grid-cols-3 gap-4 overflow-x-auto pb-2 -mx-2 px-2 lg:mx-0 lg:px-0 scrollbar-hide">
        {/* Expenses Card */}
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20 relative overflow-hidden min-w-[200px] lg:min-w-0 flex-shrink-0 lg:flex-shrink transition-colors">
          <div className="relative z-10">
            <div className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-1">Expenses</div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100 mb-1">Rs.{stats.expense.toLocaleString()}</div>
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Money spent</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-5 dark:opacity-10 transform translate-x-1/4 translate-y-1/4 text-red-900 dark:text-red-500">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/20 relative overflow-hidden min-w-[200px] lg:min-w-0 flex-shrink-0 lg:flex-shrink transition-colors">
          <div className="relative z-10">
            <div className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider mb-1">Income</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1">Rs.{stats.income.toLocaleString()}</div>
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Money earned</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-5 dark:opacity-10 transform translate-x-1/4 translate-y-1/4 text-green-900 dark:text-green-500">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        {/* Balance Card */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden min-w-[200px] lg:min-w-0 flex-shrink-0 lg:flex-shrink transition-colors ${stats.balance >= 0
          ? 'bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-200 dark:from-green-900/10 dark:to-emerald-900/20 dark:border-green-800/30'
          : 'bg-gradient-to-br from-red-50 to-orange-100/50 border-red-200 dark:from-red-900/10 dark:to-orange-900/20 dark:border-red-800/30'
          }`}>
          <div className="relative z-10">
            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${stats.balance >= 0
              ? 'text-green-800 dark:text-green-300'
              : 'text-red-800 dark:text-red-300'
              }`}>Balance</div>
            <div className={`text-2xl font-bold mb-1 ${stats.balance >= 0
              ? 'text-green-900 dark:text-green-100'
              : 'text-red-900 dark:text-red-100'
              }`}>
              Rs.{Math.abs(stats.balance).toLocaleString()}
            </div>
            <div className={`text-xs font-medium ${stats.balance >= 0
              ? 'text-green-700 dark:text-green-400'
              : 'text-red-700 dark:text-red-400'
              }`}>
              {stats.balance >= 0 ? '✨ Positive' : '⚠️ Negative'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(stats.categories).length > 0 && (
          <div className="bg-gray-50 dark:bg-paper-200/50 border border-gray-100 dark:border-paper-300/50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                <span className="text-lg">📊</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Expense Breakdown</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(stats.categories).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, amt], index) => {
                const pct = Math.round((amt / stats.expense) * 100)
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500']
                return (
                  <div key={cat} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm capitalize font-medium text-gray-800 dark:text-gray-200">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-paper-300 px-2 py-0.5 rounded-md border border-gray-200 dark:border-paper-400">{pct}%</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-20 text-right">Rs.{(amt / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-paper-300 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-500 ${colors[index % colors.length]}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-paper-200/50 border border-gray-100 dark:border-paper-300/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="text-lg">📋</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Financial Summary</h3>
          </div>
          <div className="space-y-0 divide-y divide-gray-200/50 dark:divide-paper-300/50">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expenses</span>
              </div>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">Rs.{stats.expense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Income</span>
              </div>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">Rs.{stats.income.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Balance</span>
              </div>
              <span className={`text-sm font-bold ${stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {stats.balance >= 0 ? '+' : '-'}Rs.{Math.abs(stats.balance).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Savings Rate</span>
              </div>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{savingsRate}%</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loans Given</span>
              </div>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400">Rs.{stats.loanOut.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loans Received</span>
              </div>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">Rs.{stats.loanIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${stats.loanOut >= stats.loanIn ? 'bg-teal-500' : 'bg-orange-500'}`}></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Loan Position</span>
              </div>
              <span className={`text-sm font-bold ${stats.loanOut >= stats.loanIn ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {stats.loanOut >= stats.loanIn ? '+' : '-'}Rs.{Math.abs(stats.loanOut - stats.loanIn).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {stats.expense === 0 && stats.income === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-paper-200/50 border border-gray-100 dark:border-paper-300/50 rounded-2xl">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Analytics Data</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Transactions you add will appear here</p>
        </div>
      )}
    </div>
  )
}
