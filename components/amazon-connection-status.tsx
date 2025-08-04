'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

export function AmazonConnectionStatus() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Amazon SP-API Connection</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
        </div>
        <CardDescription>
          Your Amazon Seller Central account is connected and syncing data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Sync:</span>
            <span className="text-gray-900">Just now</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Products Monitored:</span>
            <span className="text-gray-900">127 active listings</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Data Freshness:</span>
            <span className="text-green-600">Real-time</span>
          </div>
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full">
              View Connection Details
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}