import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { supabase } from '../supabase'

const Loans = forwardRef(({ currentGroup, user }, ref) => {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [userProfiles, setUserProfiles] = useState({})

  const fetchUserProfiles = async (loans) => {
    try {
      const userIds = [...new Set(loans.map(loan => loan.user_id).filter(Boolean))]
      if (userIds.length === 0) return

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (error) return

      const profilesMap = {}
      profiles?.forEach(profile => {
        profilesMap[profile.id] = profile
      })
      
      setUserProfiles(profilesMap)
    } catch (error) {
      // Error handled silently
    }
  }

  const fetchLoans = useCallback(async () => {
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
        // Filter only loan transactions
        const loanData = (data || []).filter(transaction => 
          transaction.category?.toLowerCase() === 'loan'
        )
        setData(loanData)
        await fetchUserProfiles(loanData)
      }
    } catch (error) {
      setData([])
    }
    setLoading(false)
  }, [currentGroup, user])

  useImperativeHandle(ref, () => ({
    refresh: fetchLoans
  }))

  useEffect(() => {
    fetchLoans()
  }, [currentGroup, user, fetchLoans])

  useEffect(() => {
    let filtered = data
    
    if (searchTerm) {
      filtered = filtered.filter(loan => 
        loan.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.added_by?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filterType !== 'all') {
      if (filterType === 'given') {
        filtered = filtered.filter(loan => loan.amount > 0)
      } else if (filterType === 'received') {
        filtered = filtered.filter(loan => loan.amount < 0)
      }
    }
    
    setFilteredData(filtered)
  }, [data, searchTerm, filterType])

  const handleEdit = (loan) => {
    setEditingId(loan.id)
    setEditForm(loan)
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('expenses').update(editForm).eq('id', editingId)
      if (error) throw error
      setEditingId(null)
      fetchLoans()
    } catch (error) {
      // Error handled silently
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      fetchLoans()
    } catch (error) {
      // Error handled silently
    }
  }

  const loanGiven = filteredData.filter(loan => loan.amount > 0).reduce((sum, loan) => sum + loan.amount, 0)
  const loanReceived = filteredData.filter(loan => loan.amount < 0).reduce((sum, loan) => sum + Math.abs(loan.amount), 0)
  const netLoan = loanGiven - loanReceived

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">🤝 Loan Management</h2>
        <button onClick={fetchLoans} disabled={loading} className="text-xs text-gray-500 hover:text-black disabled:opacity-50">
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-800">💸 Loans Given</div>
          <div className="text-lg font-bold text-black">Rs.{loanGiven.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{data.filter(l => l.amount > 0).length} transactions</div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-800">💰 Loans Received Back</div>
          <div className="text-lg font-bold text-black">Rs.{loanReceived.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{data.filter(l => l.amount < 0).length} transactions</div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-800">📊 Net Outstanding</div>
          <div className="text-lg font-bold text-black">
            Rs.{Math.abs(netLoan).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">{netLoan >= 0 ? 'Owed to you' : 'You owe'}</div>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search loans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 input-field text-xs"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-field text-xs w-32"
        >
          <option value="all">All Loans</option>
          <option value="given">Loans Given</option>
          <option value="received">Repayments</option>
        </select>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-2 font-medium text-gray-700">Date</th>
              <th className="text-left p-2 font-medium text-gray-700">Type</th>
              <th className="text-left p-2 font-medium text-gray-700">Amount</th>
              <th className="text-left p-2 font-medium text-gray-700">Person</th>
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
                <td colSpan="7" className="p-4 text-center text-xs text-gray-400">No loan transactions yet</td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && data.length > 0 && (
              <tr>
                <td colSpan="7" className="p-4 text-center text-xs text-gray-400">No matching loans</td>
              </tr>
            )}
            {!loading && filteredData.map((loan) => (
              <tr key={loan.id} className="border-b border-gray-100 hover:bg-gray-50">
                {editingId === loan.id ? (
                  <>
                    <td className="p-2"><input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.item || ''} onChange={(e) => setEditForm({...editForm, item: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input type="number" value={Math.abs(editForm.amount)} onChange={(e) => setEditForm({...editForm, amount: editForm.amount > 0 ? Math.abs(e.target.value) : -Math.abs(e.target.value)})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.paid_by || ''} onChange={(e) => setEditForm({...editForm, paid_by: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"><input value={editForm.remarks} onChange={(e) => setEditForm({...editForm, remarks: e.target.value})} className="input-field text-xs" /></td>
                    <td className="p-2"></td>
                    <td className="p-2">
                      <button onClick={handleSave} className="text-green-600 hover:text-black mr-2">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-black">✗</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-gray-600">{new Date(loan.date).toLocaleDateString()}</td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
                        {loan.amount > 0 ? '💸 Given' : '💰 Received'}
                      </span>
                    </td>
                    <td className="p-2 font-semibold text-black">
                      Rs.{Math.abs(loan.amount || 0)}
                    </td>
                    <td className="p-2 font-medium">{loan.paid_by || '-'}</td>
                    <td className="p-2 text-gray-500">{loan.remarks}</td>
                    <td className="p-2 text-gray-500">
                      {(() => {
                        const userId = loan.user_id
                        if (userId && userProfiles[userId]) {
                          const profile = userProfiles[userId]
                          return profile.full_name || profile.email?.split('@')[0] || 'Unknown User'
                        }
                        return loan.added_by || loan.user_name || 'Unknown User'
                      })()}
                    </td>
                    <td className="p-2">
                      <button onClick={() => handleEdit(loan)} className="text-gray-600 hover:text-black mr-2">✏️</button>
                      <button onClick={() => handleDelete(loan.id)} className="text-gray-600 hover:text-black">🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="p-2" colSpan="2"><span className="font-semibold text-gray-700">Net Outstanding</span></td>
              <td className="p-2">
                <span className="font-bold text-black">
                  Rs.{Math.abs(netLoan)}
                </span>
              </td>
              <td className="p-2" colSpan="4">
                <span className="text-xs text-gray-500">
                  {filteredData.length} of {data.length} • {netLoan >= 0 ? 'Money owed to you' : 'Money you owe'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
})

export default Loans