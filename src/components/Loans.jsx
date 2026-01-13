import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { supabase } from '../supabase'
import DateRangePicker, { getDateRange } from './ui/DateRangePicker'

const Loans = forwardRef(({ currentGroup, user }, ref) => {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [dateRange, setDateRange] = useState({ type: 'all', start: null, end: null })
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
      } else if (filterType === 'received') {
        filtered = filtered.filter(loan => loan.amount < 0)
      }
    }

    // Date Filter
    if (dateRange.type !== 'all') {
      const { start, end } = dateRange.type === 'custom'
        ? { start: new Date(dateRange.start), end: new Date(dateRange.end) }
        : getDateRange(dateRange.type)

      if (start && end) {
        if (dateRange.type !== 'custom') {
          end.setHours(23, 59, 59, 999)
        }

        filtered = filtered.filter(loan => {
          const loanDate = new Date(loan.date)
          return loanDate >= start && loanDate <= end
        })
      }
    }

    setFilteredData(filtered)
  }, [data, searchTerm, filterType, dateRange])

  const handleEdit = (loan) => {
    setEditingId(loan.id)
    setEditForm(loan)
    setShowEditModal(true)
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('expenses').update(editForm).eq('id', editingId)
      if (error) throw error
      setEditingId(null)
      setShowEditModal(false)
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
    <div className="card p-4 bg-white dark:bg-paper-100 border-paper-200 dark:border-paper-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="font-semibold text-xl tracking-tight text-ink-900"> Loan Management</h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 sm:block hidden">Income and Expenses</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DateRangePicker value={dateRange} onChange={setDateRange} className="flex-1 sm:w-48" />
          <button onClick={fetchLoans} disabled={loading} className="px-3 py-2 text-xs bg-gray-100 dark:bg-paper-200 hover:bg-gray-200 dark:hover:bg-paper-300 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards - Horizontal scroll on mobile */}
      <div className="flex md:grid md:grid-cols-3 gap-3 mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 md:p-4 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm relative overflow-hidden min-w-[170px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="relative z-10">
            <div className="text-[10px] md:text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wide mb-1">Total Lent</div>
            <div className="text-lg md:text-2xl font-bold text-green-900 dark:text-green-200">Rs.{loanGiven.toLocaleString()}</div>
            <div className="text-[10px] md:text-xs text-green-700 dark:text-green-400 mt-1">To others ({data.filter(l => l.amount > 0).length} txns)</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 text-green-900 dark:text-green-500">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 md:p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm relative overflow-hidden min-w-[170px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="relative z-10">
            <div className="text-[10px] md:text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wide mb-1">Borrowed</div>
            <div className="text-lg md:text-2xl font-bold text-orange-900 dark:text-orange-200">Rs.{loanReceived.toLocaleString()}</div>
            <div className="text-[10px] md:text-xs text-orange-700 dark:text-orange-400 mt-1">From others ({data.filter(l => l.amount < 0).length} txns)</div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 text-orange-900 dark:text-orange-500">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>

        <div className={`p-3 md:p-4 rounded-xl border shadow-sm relative overflow-hidden min-w-[170px] md:min-w-0 flex-shrink-0 md:flex-shrink ${netLoan >= 0
            ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 dark:from-green-900/20 dark:to-emerald-900/30 dark:border-green-800/50'
            : 'bg-gradient-to-br from-red-50 to-orange-100 border-red-200 dark:from-red-900/20 dark:to-orange-900/30 dark:border-red-800/50'
          }`}>
          <div className="relative z-10">
            <div className={`text-[10px] md:text-xs font-semibold uppercase tracking-wide mb-1 ${netLoan >= 0
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
              }`}>Net Position</div>
            <div className={`text-lg md:text-2xl font-bold ${netLoan >= 0
                ? 'text-green-900 dark:text-green-100'
                : 'text-red-900 dark:text-red-100'
              }`}>
              Rs.{Math.abs(netLoan).toLocaleString()}
            </div>
            <div className={`text-[10px] md:text-xs font-medium mt-1 ${netLoan >= 0
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400'
              }`}>
              {netLoan >= 0 ? '✨ Others owe you' : '⚠️ You owe'}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.73 2.13-1.65 0-1.22-1.28-1.57-3.04-1.93-2.26-.47-4.14-1.29-4.14-3.56 0-1.84 1.37-2.92 3.82-3.32V4h2.67v1.89c1.4.31 2.54 1.25 2.76 3.01h-2c-.17-.9-1.07-1.54-1.99-1.54-1.12 0-1.77.67-1.77 1.48 0 1.13 1.27 1.47 2.89 1.83 2.45.54 4.29 1.35 4.29 3.65 0 1.96-1.56 3.12-3.57 3.48z" /></svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search loans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-paper-50 dark:bg-paper-200 border-none rounded-2xl focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-ink-900"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 text-sm bg-paper-50 dark:bg-paper-200 border-none rounded-2xl focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 outline-none font-medium text-gray-700 dark:text-gray-200 sm:w-40"
        >
          <option value="all">All Loans</option>
          <option value="given">Loans Given</option>
          <option value="received">Loans Taken</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-paper-100 dark:border-paper-300/50">
        <table className="w-full text-sm text-left min-w-[700px]">
          <thead>
            <tr className="bg-paper-50/50 dark:bg-paper-200/50 border-b border-paper-100 dark:border-paper-300/50">
              <th className="p-4 font-semibold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider">Date</th>
              <th className="p-4 font-semibold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider">Type</th>
              <th className="p-4 font-semibold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider">Amount</th>
              <th className="p-4 font-semibold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider">Person</th>
              <th className="p-4 font-semibold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider">Remarks</th>
              <th className="p-4 font-semibold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider">Added by</th>
              <th className="p-4 font-semibold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-100 dark:divide-paper-300/30">
            {loading && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">Loading loans...</td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && data.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-2"></span>
                    <p className="text-sm">No loan transactions yet.</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && data.length > 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">No matching loans found.</td>
              </tr>
            )}
            {!loading && filteredData.map((loan) => (
              <tr key={loan.id} className="hover:bg-paper-50/50 dark:hover:bg-paper-300/20 transition-colors">
                <td className="p-4 text-gray-600 dark:text-gray-300 text-sm whitespace-nowrap">{new Date(loan.date).toLocaleDateString()}</td>
                <td className="p-4">
                  {(() => {
                    const item = (loan.item || '').toLowerCase()
                    let type = 'LOAN'
                    let bgClass = 'bg-gray-100 text-gray-700 border border-gray-200'

                    if (item.includes('lent') || item.includes('gave') || item.includes('loan given')) {
                      type = 'LENT'
                      bgClass = 'bg-green-100 text-green-700 border border-green-200'
                    } else if (item.includes('borrowed') || item.includes('loan taken') || item.includes('took')) {
                      type = 'BORROWED'
                      bgClass = 'bg-orange-100 text-orange-700 border border-orange-200'
                    } else if (item.includes('received') || item.includes('repayment') || item.includes('got')) {
                      type = 'RECEIVED'
                      bgClass = 'bg-blue-100 text-blue-700 border border-blue-200'
                    } else if (item.includes('paid')) {
                      type = 'PAID'
                      bgClass = 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/30'
                    } else if (loan.amount > 0) {
                      type = 'LENT'
                      bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/30'
                    } else {
                      type = 'BORROWED'
                      bgClass = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/30'
                    }

                    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${bgClass}`}>{type}</span>
                  })()}
                </td>
                <td className={`p-4 font-bold text-sm ${loan.amount > 0 ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                  Rs.{Math.abs(loan.amount || 0).toLocaleString()}
                </td>
                <td className="p-4 font-medium text-gray-900 dark:text-gray-100 text-sm">{loan.paid_by || '-'}</td>
                <td className="p-4 text-gray-700 dark:text-gray-300 text-sm max-w-[200px] truncate" title={loan.remarks}>{loan.remarks || '-'}</td>
                <td className="p-4 text-gray-500 text-xs">
                  {(() => {
                    const userId = loan.user_id
                    if (userId && userProfiles[userId]) {
                      const profile = userProfiles[userId]
                      return profile.full_name || profile.email?.split('@')[0] || 'Unknown'
                    }
                    return loan.added_by || loan.user_name || 'Unknown'
                  })()}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleEdit(loan)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Edit</button>
                    <button onClick={() => handleDelete(loan.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-paper-50 dark:bg-paper-200/50 border-t border-paper-100 dark:border-paper-300/50 font-medium">
              <td className="p-4 text-gray-900 dark:text-gray-100" colSpan="2">Total Lent</td>
              <td className="p-4 text-green-700 dark:text-green-400 font-bold">Rs.{loanGiven.toLocaleString()}</td>
              <td className="p-4" colSpan="4"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-paper-100 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-ink-900">Edit Loan</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date || ''}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-paper-50 dark:bg-paper-200 border border-paper-200 dark:border-paper-300 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 outline-none text-ink-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  value={Math.abs(editForm.amount || 0)}
                  onChange={(e) => setEditForm({ ...editForm, amount: editForm.amount > 0 ? Math.abs(e.target.value) : -Math.abs(e.target.value) })}
                  className="w-full px-4 py-2.5 text-sm bg-paper-50 dark:bg-paper-200 border border-paper-200 dark:border-paper-300 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 outline-none text-ink-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Person</label>
                <input
                  type="text"
                  value={editForm.paid_by || ''}
                  onChange={(e) => setEditForm({ ...editForm, paid_by: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-paper-50 dark:bg-paper-200 border border-paper-200 dark:border-paper-300 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 outline-none text-ink-900"
                  placeholder="Person name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <textarea
                  value={editForm.remarks || ''}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-paper-50 dark:bg-paper-200 border border-paper-200 dark:border-paper-300 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 outline-none resize-none text-ink-900"
                  rows={3}
                  placeholder="Add notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-paper-100 dark:bg-paper-300 rounded-xl hover:bg-paper-200 dark:hover:bg-paper-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-black dark:bg-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default Loans