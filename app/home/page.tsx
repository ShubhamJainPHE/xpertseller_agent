'use client'

import { useSecureAuth } from '@/lib/hooks/useSecureAuth'
import { useState, useEffect } from 'react'
import { DashboardMetrics } from '@/lib/dashboard/calculations'

export default function HomePage() {
  const { isLoading, isAuthenticated, seller, logout } = useSecureAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  // Fetch dashboard metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!seller?.id) return
      
      try {
        setMetricsLoading(true)
        setMetricsError(null)
        
        const response = await fetch(`/api/dashboard/metrics?sellerId=${seller.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch metrics')
        }
        
        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error)
        setMetricsError(error instanceof Error ? error.message : 'Failed to load dashboard')
      } finally {
        setMetricsLoading(false)
      }
    }

    if (isAuthenticated && seller) {
      fetchMetrics()
    }
  }, [isAuthenticated, seller])

  const handleLogout = async () => {
    await logout()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !seller) {
    return null // useSecureAuth handles redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="px-4 py-6 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome to XpertSeller
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Logged in as: {seller.email}
                  {metrics?.connected && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🔗 Amazon Connected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (seller?.id) {
                      setMetricsLoading(true)
                      setMetricsError(null)
                      fetch(`/api/dashboard/metrics?sellerId=${seller.id}`)
                        .then(res => res.json())
                        .then(data => setMetrics(data))
                        .catch(err => setMetricsError(err.message))
                        .finally(() => setMetricsLoading(false))
                    }
                  }}
                  disabled={metricsLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <span>{metricsLoading ? '🔄' : '🔄'}</span>
                  <span>{metricsLoading ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8">
          {/* Welcome Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Welcome back! 👋
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  Here's your Amazon seller performance overview. Connect your store to see real-time insights and AI-powered recommendations.
                </p>
              </div>
              <div className="mt-4 flex items-center space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ⚡ AI-Powered
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🔒 Secure
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  📊 Real-time
                </span>
              </div>
            </div>
          </div>

          {/* Error State */}
          {metricsError && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Dashboard Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{metricsError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hero Metrics - Top 4 */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue (30d)</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metricsLoading ? (
                          <div className="animate-pulse h-6 bg-gray-200 rounded w-20"></div>
                        ) : metrics?.connected ? (
                          formatCurrency(metrics.totalRevenue)
                        ) : (
                          'Connect Store'
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📦</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metricsLoading ? (
                          <div className="animate-pulse h-6 bg-gray-200 rounded w-16"></div>
                        ) : metrics?.connected ? (
                          formatNumber(metrics.totalOrders)
                        ) : (
                          '--'
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Products</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metricsLoading ? (
                          <div className="animate-pulse h-6 bg-gray-200 rounded w-12"></div>
                        ) : metrics?.connected ? (
                          formatNumber(metrics.activeProducts)
                        ) : (
                          '--'
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⭐</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Rating</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metricsLoading ? (
                          <div className="animate-pulse h-6 bg-gray-200 rounded w-12"></div>
                        ) : metrics?.connected ? (
                          metrics.averageRating > 0 ? `${metrics.averageRating} ⭐` : '--'
                        ) : (
                          '--'
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Extended Metrics Grid - 16 More Key Metrics */}
          {metrics?.connected && !metricsLoading && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Profit Metrics */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">💎</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Net Profit</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.totalProfit)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-teal-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">📊</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Profit Margin</dt>
                          <dd className="text-lg font-medium text-gray-900">{metrics.profitMargin.toFixed(1)}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advertising Metrics */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">📢</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">ROAS</dt>
                          <dd className="text-lg font-medium text-gray-900">{metrics.roas.toFixed(2)}x</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">🎯</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">ACoS</dt>
                          <dd className="text-lg font-medium text-gray-900">{metrics.acos.toFixed(1)}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">🏆</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Buy Box Win Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{metrics.buyBoxWinRate.toFixed(1)}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">🔄</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{metrics.conversionRate.toFixed(2)}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Metrics */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-cyan-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">📦</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Inventory Value</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.inventoryValue)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">⚠️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Products</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatNumber(metrics.lowStockProducts)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Intelligence */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-violet-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">👁️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Sessions</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatNumber(metrics.sessionCount)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-rose-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">📈</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Units</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatNumber(metrics.totalUnits)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-lime-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">💸</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Ad Spend</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.adSpend)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">🌱</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Organic Sales</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.organicSales)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Section */}
          {metrics?.connected && !metricsLoading && metrics.urgentRecommendations > 0 && (
            <div className="mt-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">🤖</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-blue-900">
                      AI Intelligence Alert
                    </h3>
                    <p className="text-blue-700">
                      You have <strong>{metrics.urgentRecommendations}</strong> high-priority recommendations that could improve your performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Performance Insights */}
          {metrics?.connected && !metricsLoading && (metrics.topSellingProduct || metrics.worstPerformer) && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Performance</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {metrics.topSellingProduct && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">🏆</span>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-green-900">Top Performer</h4>
                        <p className="text-sm text-green-700 mt-1">{metrics.topSellingProduct}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.worstPerformer && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">📈</span>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-yellow-900">Needs Attention</h4>
                        <p className="text-sm text-yellow-700 mt-1">{metrics.worstPerformer}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Dashboard
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          View Analytics
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📦</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Inventory
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          Manage Products
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⚙️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Settings
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          Configure
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}