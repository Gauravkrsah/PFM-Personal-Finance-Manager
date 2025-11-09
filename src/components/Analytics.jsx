import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabase'

const COLORS = ['#374151', '#6b7280', '#9ca3af', '#d1d5db']

export default function Analytics() {
  const [categoryData, setCategoryData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [totalSpend, setTotalSpend] = useState(0)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    const { data } = await supabase.from('expenses').select('*')
    
    if (data) {
      // Category breakdown
      const categoryTotals = data.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount
        return acc
      }, {})
      
      setCategoryData(Object.entries(categoryTotals).map(([name, value]) => ({ name, value })))
      
      // Monthly trends
      const monthlyTotals = data.reduce((acc, expense) => {
        const month = new Date(expense.date).toLocaleDateString('en-US', { month: 'short' })
        acc[month] = (acc[month] || 0) + expense.amount
        return acc
      }, {})
      
      setMonthlyData(Object.entries(monthlyTotals).map(([month, amount]) => ({ month, amount })))
      
      // Total spend
      setTotalSpend(data.reduce((sum, expense) => sum + expense.amount, 0))
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-lg font-medium mb-4">📈 Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Line type="monotone" dataKey="amount" stroke="#374151" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <div className="text-2xl font-bold">Rs.{totalSpend.toLocaleString()}</div>
        <div className="text-gray-600">Total Spend</div>
      </div>
    </div>
  )
}