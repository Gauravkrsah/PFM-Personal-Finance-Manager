import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { supabase } from '../supabase'

const Income = forwardRef(({ currentGroup, user }, ref) => {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [userProfiles, setUserProfiles] = useState({})

  const fetchUserProfiles = async (incomes) => {
    try {
      const userIds = [...new Set(incomes.map(inc => inc.user_id).filter(Boolean))]
      
      if (userIds.length === 0) {
        return
      }

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (error) {
        return
      }

      const profilesMap = {}
      profiles?.forEach(profile => {
        profilesMap[profile.id] = profile
      })
      
      setUserProfiles(profilesMap)
    } catch (error) {
      // Error handled silently
    }
  }

  const fetchIncomes = useCallback(async () => {
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
        // Filter income transactions (negative amounts OR Income category)
        const incomeData = (data || []).filter(transaction => 
          (transaction.amount < 0 && transaction.category?.toLowerCase() === 'income') ||
          (transaction.category?.toLowerCase() === 'income')
        )
        setData(incomeData)
        await fetchUserProfiles(incomeData)
      }
    } catch (error) {
      setData([])
    }
    setLoading(false)
  }, [currentGroup, user])

  useImperativeHandle(ref, () => ({
    refresh: fetchIncomes
  }))

  useEffect(() => {
    fetchIncomes()
  }, [currentGroup, user, fetchIncomes])

  useEffect(() => {
    let filtered = data
    
    if (searchTerm) {
      filtered = filtered.filter(inc => 
        inc.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.added_by?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredData(filtered)
  }, [data, searchTerm])

  const handleEdit = (income) => {
    setEditingId(income.id)
    setEditForm(income)
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('expenses').update(editForm).eq('id', editingId)
      if (error) throw error
      setEditingId(null)
      fetchIncomes()
    } catch (error) {
      // Error handled silently
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      fetchIncomes()
    } catch (error) {
      // Error handled silently
    }
  }

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">💰 Income Only</h2>
        <button onClick={fetchIncomes} disabled={loading} className="text-xs text-gray-500 hover:text-black disabled:opacity-50">
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search income..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 input-field text-xs"
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-2 font-medium text-gray-700">Date</th>
              <th className="text-left p-2 font-medium text-gray-700">Source</th>
              <th className="text-left p-2 font-medium text-gray-700">Type</th>
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
                <td colSpan="7" className="p-4 text-center text-xs text-gray-400">No income recorded yet</td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && data.length > 0 && (
              <tr>
                <td colSpan="7" className="p-4 text-center text-xs text-gray-400">No matching income</td>
              </tr>
            )}
            {!loading && filteredData.map((income) => (
              <tr key={income.id} className="border-b border-gray-100 hover:bg-gray-50">
                {editingId === income.id ? (
                  <>
                    <td className="p-2"><input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.item || ''} onChange={(e) => setEditForm({...editForm, item: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input type="number" value={Math.abs(editForm.amount)} onChange={(e) => setEditForm({...editForm, amount: -Math.abs(e.target.value)})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.remarks} onChange={(e) => setEditForm({...editForm, remarks: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"></td>
                    <td className="p-2">
                      <button onClick={handleSave} className="text-green-600 hover:text-black mr-2">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-black">✗</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-gray-600">{new Date(income.date).toLocaleDateString()}</td>
                    <td className="p-2 font-medium">{income.item || '-'}</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-gray-100 text-gray-700">{income.category}</span></td>
                    <td className="p-2 font-semibold text-black">Rs.{Math.abs(income.amount || 0)}</td>
                    <td className="p-2 text-gray-500">{income.remarks}</td>
                    <td className="p-2 text-gray-500">
                      {(() => {
                        const userId = income.user_id
                        if (userId && userProfiles[userId]) {
                          const profile = userProfiles[userId]
                          return profile.full_name || profile.email?.split('@')[0] || 'Unknown User'
                        }
                        return income.added_by || income.user_name || 'Unknown User'
                      })()}
                    </td>
                    <td className="p-2">
                      <button onClick={() => handleEdit(income)} className="text-gray-600 hover:text-black mr-2">✏️</button>
                      <button onClick={() => handleDelete(income.id)} className="text-gray-600 hover:text-black">🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="p-2" colSpan="3"><span className="font-semibold text-gray-700">Total Income</span></td>
              <td className="p-2"><span className="font-bold text-black">Rs.{filteredData.reduce((sum, inc) => sum + Math.abs(inc.amount || 0), 0)}</span></td>
              <td className="p-2" colSpan="3"><span className="text-xs text-gray-500">{filteredData.length} of {data.length}</span></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
})

export default Income