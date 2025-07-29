'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Clock } from 'lucide-react'

interface RefreshButtonProps {
  onRefresh: () => void
  isLoading: boolean
  lastUpdated?: Date
}

export default function RefreshButton({ onRefresh, isLoading, lastUpdated }: RefreshButtonProps) {
  const formatLastUpdated = (date?: Date) => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <span>Updated {formatLastUpdated(lastUpdated)}</span>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="bg-white border-gray-200 hover:bg-gray-50"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  )
}