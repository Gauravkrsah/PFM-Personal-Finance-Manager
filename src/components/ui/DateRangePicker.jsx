import { useState, useEffect, useRef } from 'react'

export const getDateRange = (rangeType, customStart, customEnd) => {
    const end = new Date()
    const start = new Date()
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)

    switch (rangeType) {
        case '7':
            start.setDate(end.getDate() - 7)
            break
        case '30':
            start.setDate(end.getDate() - 30)
            break
        case '90':
            start.setDate(end.getDate() - 90)
            break
        case '365':
            start.setFullYear(end.getFullYear() - 1)
            break
        case 'custom':
            if (customStart) {
                const s = new Date(customStart)
                s.setHours(0, 0, 0, 0)
                start.setTime(s.getTime())
            }
            if (customEnd) {
                const e = new Date(customEnd)
                e.setHours(23, 59, 59, 999)
                end.setTime(e.getTime())
            }
            return { start, end, type: 'custom' }
        case 'all':
        default:
            return { start: null, end: null, type: 'all' }
    }

    return { start, end, type: rangeType }
}

export default function DateRangePicker({ value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false)
    const [rangeType, setRangeType] = useState(value?.type || 'all')
    const [customStart, setCustomStart] = useState(value?.customStart || '')
    const [customEnd, setCustomEnd] = useState(value?.customEnd || '')
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleRangeChange = (type) => {
        setRangeType(type)
        if (type !== 'custom') {
            const { start, end } = getDateRange(type)
            onChange({ type, start, end })
            setIsOpen(false)
        } else {
            // For custom, waiting for user to pick dates, don't close yet
        }
    }

    const applyCustomRange = () => {
        if (customStart && customEnd) {
            const { start, end } = getDateRange('custom', customStart, customEnd)
            onChange({ type: 'custom', start, end, customStart, customEnd })
            setIsOpen(false)
        }
    }

    const getLabel = () => {
        switch (value?.type) {
            case '7': return 'Last 7 days'
            case '30': return 'Last 30 days'
            case '90': return 'Last 90 days'
            case '365': return 'Last year'
            case 'all': return 'All time'
            case 'custom':
                if (value.start && value.end) {
                    return `${new Date(value.start).toLocaleDateString()} - ${new Date(value.end).toLocaleDateString()}`
                }
                return 'Custom Range'
            default: return 'All time'
        }
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-paper-200 border border-gray-300 dark:border-paper-300 rounded-lg hover:border-gray-400 dark:hover:border-paper-400 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all w-full justify-between min-w-[140px] text-gray-900 dark:text-gray-100"
            >
                <span className="truncate">{getLabel()}</span>
                <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-paper-200 rounded-xl shadow-xl border border-gray-100 dark:border-paper-300 z-50 overflow-hidden animate-fade-in">
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                        {['7', '30', '90', '365', 'all'].map((type) => (
                            <button
                                key={type}
                                onClick={() => handleRangeChange(type)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-paper-300 flex items-center justify-between ${rangeType === type && rangeType !== 'custom' ? 'bg-gray-50 dark:bg-paper-300/50 font-medium text-black dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                <span>
                                    {type === '7' && 'Last 7 days'}
                                    {type === '30' && 'Last 30 days'}
                                    {type === '90' && 'Last 90 days'}
                                    {type === '365' && 'Last year'}
                                    {type === 'all' && 'All time'}
                                </span>
                                {rangeType === type && rangeType !== 'custom' && <span className="text-black dark:text-white">✓</span>}
                            </button>
                        ))}

                        <div className="border-t border-gray-100 dark:border-paper-300 my-1"></div>

                        <button
                            onClick={() => setRangeType('custom')}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-paper-300 flex items-center justify-between ${rangeType === 'custom' ? 'bg-gray-50 dark:bg-paper-300/50 font-medium text-black dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}
                        >
                            <span>Custom Range</span>
                            {rangeType === 'custom' && <span className="text-black dark:text-white">✓</span>}
                        </button>

                        {rangeType === 'custom' && (
                            <div className="p-3 bg-gray-50/50 dark:bg-paper-300/20 border-t border-gray-100 dark:border-paper-300 space-y-2">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-paper-400 dark:bg-paper-100 dark:text-gray-100 rounded focus:border-black dark:focus:border-gray-500 focus:outline-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-paper-400 dark:bg-paper-100 dark:text-gray-100 rounded focus:border-black dark:focus:border-gray-500 focus:outline-none bg-white"
                                    />
                                </div>
                                <button
                                    onClick={applyCustomRange}
                                    disabled={!customStart || !customEnd}
                                    className="w-full px-3 py-2 text-xs bg-black dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium mt-2"
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
