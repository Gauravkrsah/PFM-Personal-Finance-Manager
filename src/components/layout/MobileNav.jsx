import React from 'react'

const mobileNavItems = [
    { id: 'expenses', label: 'Expenses', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'income', label: 'Income', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'loans', label: 'Loans', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
]

export default function MobileNav({ activeTab, setActiveTab }) {
    return (
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
    )
}
