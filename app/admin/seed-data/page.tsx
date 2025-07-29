'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Play, 
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Package,
  DollarSign,
  BarChart3,
  Users
} from 'lucide-react'

export default function SeedDataPage() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedingStatus, setSeedingStatus] = useState<string>('')
  const [seedResults, setSeedResults] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [isSettingUpTables, setIsSettingUpTables] = useState(false)
  const [setupResults, setSetupResults] = useState<any>(null)

  const handleSetupTables = async () => {
    setIsSettingUpTables(true)
    setError('')
    setSetupResults(null)

    try {
      const response = await fetch('/api/admin/setup-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      
      if (!response.ok) {
        setError(result.error || 'Failed to setup tables')
        setSetupResults(result)
      } else {
        setSetupResults(result)
      }

    } catch (err) {
      console.error('Setup error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsSettingUpTables(false)
    }
  }

  const handleSeedData = async () => {
    setIsSeeding(true)
    setSeedingStatus('Initializing data seeding...')
    setError('')
    setSeedResults(null)

    try {
      // Get seller ID from localStorage (assuming user is logged in)
      const sellerId = localStorage.getItem('sellerId')
      if (!sellerId) {
        throw new Error('No seller ID found. Please log in first.')
      }

      setSeedingStatus('Creating products and inventory data...')
      
      const response = await fetch('/api/data/seed-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sellerId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to seed data')
      }

      const result = await response.json()
      setSeedResults(result.data)
      setSeedingStatus('Data seeding completed successfully!')

    } catch (err) {
      console.error('Seeding error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setSeedingStatus('')
    } finally {
      setIsSeeding(false)
    }
  }

  const seedingSteps = [
    { name: 'Products', description: 'Create sample product catalog', icon: Package },
    { name: 'Sales Data', description: '30 days of realistic sales history', icon: DollarSign },
    { name: 'Financial Records', description: 'P&L and profit analysis data', icon: BarChart3 },
    { name: 'Market Intelligence', description: 'Competitor and market data', icon: Users },
    { name: 'Inventory', description: 'FBA inventory levels and metrics', icon: Database },
    { name: 'Recommendations', description: 'AI-generated action items', icon: CheckCircle }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Database Seeding
          </h1>
          <p className="text-gray-600">
            Populate your dashboard with realistic sample data to showcase the platform capabilities
          </p>
        </div>

        {/* Main Seeding Card */}
        <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Data Population Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Seeding Steps Preview */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">What will be created:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seedingSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <step.icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-800">{step.name}</div>
                        <div className="text-xs text-gray-600">{step.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="text-center space-y-4">
                <div>
                  <Button
                    onClick={handleSetupTables}
                    disabled={isSettingUpTables}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 mr-4"
                  >
                    {isSettingUpTables ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Setting Up Tables...
                      </>
                    ) : (
                      <>
                        <Database className="w-5 h-5 mr-2" />
                        Setup Database Tables
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  >
                    {isSeeding ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Seeding Data...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Populate Database
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-sm text-green-600">
                  ✅ Tables are ready - you can now populate with sample data
                </p>
              </div>

              {/* Status */}
              {seedingStatus && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{seedingStatus}</span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Error:</span>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Setup Results */}
              {setupResults && (
                <div className={`p-4 rounded-lg border ${
                  setupResults.success 
                    ? 'bg-green-100 border-green-200' 
                    : 'bg-yellow-100 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {setupResults.success ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-700" />
                        <span className="font-medium text-green-700">Database Setup Complete!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-700" />
                        <span className="font-medium text-yellow-700">Manual Setup Required</span>
                      </>
                    )}
                  </div>
                  
                  {setupResults.tablesCreated && (
                    <div className="text-sm mb-3">
                      <div className="font-medium text-gray-700 mb-2">Table Status:</div>
                      <ul className="space-y-1">
                        {setupResults.tablesCreated.map((table: string, index: number) => (
                          <li key={index} className="text-gray-600">• {table}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {setupResults.instructions && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-700 mb-2">Manual Setup Instructions:</div>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600">
                        {setupResults.instructions.map((instruction: string, index: number) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ol>
                      
                      {setupResults.sqlToRun && (
                        <div className="mt-3 p-2 bg-gray-800 rounded text-white text-xs font-mono overflow-x-auto">
                          <pre>{setupResults.sqlToRun}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Success Results */}
              {seedResults && (
                <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Seeding Completed Successfully!</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{seedResults.products}</div>
                      <div className="text-green-700">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{seedResults.salesRecords}</div>
                      <div className="text-green-700">Sales Records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{seedResults.financialRecords}</div>
                      <div className="text-green-700">Financial Records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{seedResults.marketRecords}</div>
                      <div className="text-green-700">Market Data</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{seedResults.inventoryRecords}</div>
                      <div className="text-green-700">Inventory Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{seedResults.recommendations}</div>
                      <div className="text-green-700">Recommendations</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-white rounded border">
                    <p className="text-sm text-gray-700">
                      ✅ Your dashboard is now populated with realistic data. 
                      Visit the <a href="/dashboard/command-center" className="text-blue-600 underline">Command Center</a> to see the results!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">📊 What Gets Created</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 5 sample products with realistic pricing and categories</li>
                <li>• 30 days of historical sales data with daily variations</li>
                <li>• Complete P&L breakdown with Amazon fees and COGS</li>
                <li>• Market intelligence data including BSR and competitors</li>
                <li>• FBA inventory levels with storage fees and metrics</li>
                <li>• AI-generated recommendations for optimization</li>
                <li>• Review analytics and keyword performance data</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">⚠️ Important Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• This creates <strong>sample data only</strong> - not real sales</li>
                <li>• Safe to run multiple times (will create additional records)</li>
                <li>• Data is designed to showcase dashboard capabilities</li>
                <li>• All financial numbers are realistic but fictitious</li>
                <li>• Perfect for demos, testing, and development</li>
                <li>• Can be cleared later when real SP-API data is integrated</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This tool helps you showcase the platform with realistic data while you work on SP-API integration.
            <br />
            Once real data flows in, you can remove or replace this sample data.
          </p>
        </div>
      </div>
    </div>
  )
}