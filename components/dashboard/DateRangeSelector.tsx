'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronDown } from 'lucide-react'

interface DateRange {
  label: string
  value: string
  days: number
  description: string
}

interface DateRangeSelectorProps {
  selectedRange: string
  onRangeChange: (range: string, days: number) => void
  isLoading?: boolean
}

const dateRanges: DateRange[] = [
  { label: 'Last 7 Days', value: '7d', days: 7, description: 'Recent performance' },
  { label: 'Last 14 Days', value: '14d', days: 14, description: 'Short-term trends' },
  { label: 'Last 30 Days', value: '30d', days: 30, description: 'Monthly overview' },
  { label: 'Last 60 Days', value: '60d', days: 60, description: 'Extended analysis' },
  { label: 'Last 90 Days', value: '90d', days: 90, description: 'Quarterly review' },
  { label: 'Last 6 Months', value: '180d', days: 180, description: 'Seasonal patterns' },
  { label: 'Last Year', value: '365d', days: 365, description: 'Annual performance' }
]

export default function DateRangeSelector({ selectedRange, onRangeChange, isLoading }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedRangeData = dateRanges.find(range => range.value === selectedRange) || dateRanges[2]

  const handleRangeSelect = (range: DateRange) => {
    onRangeChange(range.value, range.days)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="bg-white border-gray-200 hover:bg-gray-50 min-w-[180px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{selectedRangeData.label}</span>
          {isLoading && (
            <Badge variant="secondary" className="text-xs">
              Loading...
            </Badge>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
              Select Time Period
            </div>
            {dateRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => handleRangeSelect(range)}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                  selectedRange === range.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{range.label}</div>
                    <div className="text-xs text-gray-500">{range.description}</div>
                  </div>
                  {selectedRange === range.value && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* Footer with custom date option */}
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-gray-600 text-sm"
              disabled
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Custom Date Range
              </div>
              <div className="text-xs text-gray-400 ml-6">Coming soon</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}