import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { supabase } from '../supabase'

const Table = forwardRef(({ expenses, onExpenseUpdate, currentGroup, user }, ref) => {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [userProfiles, setUserProfiles] = useState({})

  const fetchUserProfiles = async (expenses) => {
    try {
      // Get unique user_ids from expenses
      const userIds = [...new Set(expenses.map(exp => exp.user_id).filter(Boolean))]
      
      if (userIds.length === 0) {
        return
      }

      // Fetch user profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (error) {
        return
      }

      // Create profiles map
      const profilesMap = {}
      profiles?.forEach(profile => {
        profilesMap[profile.id] = profile
      })
      
      setUserProfiles(profilesMap)
    } catch (error) {
      // Error handled silently
    }
  }



  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('expenses').select('*')
      
      if (currentGroup) {
        query = query.eq('group_id', currentGroup.id)
      } else {
        query = query.eq('user_id', user?.id).is('group_id', null)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) {
        setData([])
      } else {
        // Filter out income and loan transactions (they have separate pages)
        const expenseData = (data || []).filter(expense => 
          expense.amount > 0 && 
          expense.category?.toLowerCase() !== 'income' &&
          expense.category?.toLowerCase() !== 'loan'
        )
        setData(expenseData)
        await fetchUserProfiles(expenseData)
      }
    } catch (error) {
      setData([])
    }
    setLoading(false)
  }, [currentGroup, user])

  useImperativeHandle(ref, () => ({
    refresh: fetchExpenses
  }))

  useEffect(() => {
    fetchExpenses()
  }, [currentGroup, user, fetchExpenses])

  useEffect(() => {
    let filtered = data
    
    if (searchTerm) {
      filtered = filtered.filter(exp => 
        exp.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.added_by?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(exp => exp.category?.toLowerCase() === categoryFilter.toLowerCase())
    }
    
    setFilteredData(filtered)
  }, [data, searchTerm, categoryFilter])

  const handleEdit = (expense) => {
    setEditingId(expense.id)
    setEditForm(expense)
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('expenses').update(editForm).eq('id', editingId)
      if (error) throw error
      setEditingId(null)
      fetchExpenses()
    } catch (error) {
      // Error handled silently
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      fetchExpenses()
    } catch (error) {
      // Error handled silently
    }
  }

  const categories = ['all', ...data.reduce((acc, exp) => {
    if (exp.category && !acc.includes(exp.category)) acc.push(exp.category)
    return acc
  }, [])]

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">💸 Expenses Only</h2>
        <button onClick={fetchExpenses} disabled={loading} className="text-xs text-gray-500 hover:text-black disabled:opacity-50">
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 input-field text-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field text-xs w-32"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All' : cat}</option>
          ))}
        </select>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-2 font-medium text-gray-700">Date</th>
              <th className="text-left p-2 font-medium text-gray-700">Item</th>
              <th className="text-left p-2 font-medium text-gray-700">Category</th>
              <th className="text-left p-2 font-medium text-gray-700">Amount</th>
              <th className="text-left p-2 font-medium text-gray-700">Remarks</th>
              <th className="text-left p-2 font-medium text-gray-700">Added by</th>
              <th className="text-left p-2 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="p-4 text-center text-xs text-gray-500">Loading...</td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && data.length === 0 && (
              <tr>
                <td colSpan="7" className="p-4 text-center text-xs text-gray-400">No expenses yet</td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && data.length > 0 && (
              <tr>
                <td colSpan="7" className="p-4 text-center text-xs text-gray-400">No matching expenses</td>
              </tr>
            )}
            {!loading && filteredData.map((expense) => (
              <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                {editingId === expense.id ? (
                  <>
                    <td className="p-2"><input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.item || ''} onChange={(e) => setEditForm({...editForm, item: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input type="number" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.remarks} onChange={(e) => setEditForm({...editForm, remarks: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"></td>
                    <td className="p-2">
                      <button onClick={handleSave} className="text-green-600 hover:text-black mr-2">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-black">✗</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-gray-600">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="p-2 font-medium">{expense.item || '-'}</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-gray-100 text-gray-700">{expense.category}</span></td>
                    <td className="p-2 font-semibold">{expense.amount === 0 ? <span className="text-red-600">-</span> : `Rs.${expense.amount}`}</td>
                    <td className="p-2 text-gray-500">{expense.remarks}</td>
                    <td className="p-2 text-gray-500">
                      {(() => {
                        const userId = expense.user_id
                        if (userId && userProfiles[userId]) {
                          const profile = userProfiles[userId]
                          return profile.full_name || profile.email?.split('@')[0] || 'Unknown User'
                        }
                        return expense.added_by || expense.user_name || 'Unknown User'
                      })()}
                    </td>
                    <td className="p-2">
                      <button onClick={() => handleEdit(expense)} className="text-gray-600 hover:text-black mr-2">✏️</button>
                      <button onClick={() => handleDelete(expense.id)} className="text-gray-600 hover:text-black">🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="p-2" colSpan="3"><span className="font-semibold">Total</span></td>
              <td className="p-2"><span className="font-bold">Rs.{filteredData.reduce((sum, exp) => sum + (exp.amount || 0), 0)}</span></td>
              <td className="p-2" colSpan="3"><span className="text-xs text-gray-500">{filteredData.length} of {data.length}</span></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
})

export default Table