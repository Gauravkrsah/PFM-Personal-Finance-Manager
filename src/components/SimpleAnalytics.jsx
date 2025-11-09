import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function SimpleAnalytics({ currentGroup, user }) {
  const [analytics, setAnalytics] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    netBalance: 0,
    loanLent: 0,
    loanReceived: 0,
    netLoan: 0,
    expenseCategories: {},
    topExpenseCategory: null,
    transactionCount: 0,
    expenseCount: 0,
    incomeCount: 0,
    dailyAverage: 0,
    savingsRate: 0,
    avgPerExpense: 0
  })
  const [timeRange, setTimeRange] = useState('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [currentGroup, timeRange, user])

  const fetchAnalytics = async () => {
    setLoading(true)
    
    try {
      if (!user?.id) {
        setLoading(false)
        return
      }

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(timeRange))
      
      let query = supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
      
      if (currentGroup) {
        query = query.eq('group_id', currentGroup.id)
      } else {
        query = query.eq('user_id', user.id).is('group_id', null)
      }
      
      const { data, error } = await query.order('date', { ascending: false })
      
      if (error) {
        console.error('Error fetching analytics:', error)
        setLoading(false)
        return
      }

      const transactions = data || []
      
      // Separate transactions logically
      const incomeTransactions = transactions.filter(t => 
        t.amount < 0 && t.category && t.category.toLowerCase() === 'income'
      )
      const loanGivenTransactions = transactions.filter(t => 
        t.amount > 0 && t.category && t.category.toLowerCase() === 'loan'
      )
      const loanReceivedTransactions = transactions.filter(t => 
        t.amount < 0 && t.category && t.category.toLowerCase() === 'loan'
      )
      const expenseTransactions = transactions.filter(t => 
        t.amount > 0 && t.category && t.category.toLowerCase() !== 'loan'
      )
      
      // Calculate totals accurately
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
      const loanLent = loanGivenTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      const loanReceived = loanReceivedTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
      const netLoan = loanLent - loanReceived
      const netBalance = totalIncome - totalExpenses
      
      // Calculate expense categories (only actual expenses)
      const expenseCategories = {}
      expenseTransactions.forEach(t => {
        const category = (t.category || 'other').toLowerCase()
        expenseCategories[category] = (expenseCategories[category] || 0) + Math.abs(t.amount || 0)
      })
      
      // Find top expense category (exclude income and loan)
      const topExpenseCategory = Object.entries(expenseCategories)
        .filter(([category]) => category !== 'income' && category !== 'loan')
        .sort(([,a], [,b]) => b - a)[0]
      
      const dailyAverage = Math.round(totalExpenses / parseInt(timeRange))
      const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0
      const avgPerExpense = expenseTransactions.length > 0 ? Math.round(totalExpenses / expenseTransactions.length) : 0
      
      setAnalytics({
        totalExpenses,
        totalIncome,
        netBalance,
        loanLent,
        loanReceived,
        netLoan,
        expenseCategories,
        topExpenseCategory,
        transactionCount: transactions.length,
        expenseCount: expenseTransactions.length,
        incomeCount: incomeTransactions.length,
        dailyAverage,
        savingsRate,
        avgPerExpense
      })
      
    } catch (error) {
      console.error('Analytics error:', error)
      // Reset to default values on error
      setAnalytics({
        totalExpenses: 0,
        totalIncome: 0,
        netBalance: 0,
        loanLent: 0,
        loanReceived: 0,
        netLoan: 0,
        expenseCategories: {},
        topExpenseCategory: null,
        transactionCount: 0,
        expenseCount: 0,
        incomeCount: 0,
        dailyAverage: 0,
        savingsRate: 0,
        avgPerExpense: 0
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex justify-center items-center h-24">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading analytics...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">
          📊 {currentGroup ? `${currentGroup.name} Group` : 'Personal'} Analytics
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            🔄 Refresh
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
          </select>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">💸 Expenses</h3>
          <p className="text-2xl font-bold text-black mb-1">Rs.{analytics.totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{analytics.expenseCount} transactions</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">💰 Income</h3>
          <p className="text-2xl font-bold text-black mb-1">Rs.{analytics.totalIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{analytics.incomeCount} transactions</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">📊 Net Balance</h3>
          <p className="text-2xl font-bold text-black mb-1">
            Rs.{Math.abs(analytics.netBalance).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{analytics.netBalance >= 0 ? 'Surplus' : 'Deficit'}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🎯 Savings Rate</h3>
          <p className="text-2xl font-bold text-black mb-1">{analytics.savingsRate}%</p>
          <p className="text-xs text-gray-500">Of total income</p>
        </div>
      </div>

      {/* Loan & Additional Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🤝 Loans Given</h3>
          <p className="text-2xl font-bold text-black mb-1">Rs.{analytics.loanLent.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Money lent out</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🔄 Loans Received</h3>
          <p className="text-2xl font-bold text-black mb-1">Rs.{analytics.loanReceived.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Money received back</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">📊 Net Loan</h3>
          <p className="text-2xl font-bold text-black mb-1">
            Rs.{Math.abs(analytics.netLoan).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{analytics.netLoan >= 0 ? 'Owed to you' : 'You owe'}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">📈 Daily Average</h3>
          <p className="text-2xl font-bold text-black mb-1">Rs.{analytics.dailyAverage.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Spending per day</p>
        </div>
      </div>





      {/* Summary Overview */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Financial Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-xl font-bold text-black">{analytics.transactionCount}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Avg Per Expense</p>
            <p className="text-xl font-bold text-black">Rs.{analytics.avgPerExpense.toLocaleString()}</p>
          </div>
          {analytics.topExpenseCategory && (
            <div className="text-center col-span-2">
              <p className="text-sm text-gray-600">Top Category</p>
              <p className="text-xl font-bold text-black capitalize">{analytics.topExpenseCategory[0]}</p>
              <p className="text-sm text-gray-500">Rs.{analytics.topExpenseCategory[1].toLocaleString()} ({Math.round((analytics.topExpenseCategory[1] / analytics.totalExpenses) * 100)}%)</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Expense Categories */}
      {Object.keys(analytics.expenseCategories).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">💸 Expense Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(analytics.expenseCategories)
              .filter(([category]) => category !== 'income' && category !== 'loan')
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([category, amount]) => {
                const percentage = Math.round((amount / analytics.totalExpenses) * 100)
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="capitalize font-medium text-gray-800">{category}</span>
                      <div className="text-right">
                        <div className="font-bold text-black">Rs.{amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-black h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* No Data State */}
      {analytics.transactionCount === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-500">
            {currentGroup 
              ? `No expenses found for ${currentGroup.name} group in the selected time range.`
              : 'No personal expenses found in the selected time range.'
            }
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Add some expenses to see your analytics!
          </p>
        </div>
      )}
    </div>
  )
}