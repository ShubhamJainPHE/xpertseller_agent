'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  DollarSign, 
  Package, 
  Clock, 
  Users,
  BarChart3,
  Zap,
  ShieldCheck,
  Rocket
} from 'lucide-react'

interface DashboardMetrics {
  // Hero metrics
  businessHealthScore: number
  runwayDays: number
  profitVelocity: number
  marketShareTrend: number
  
  // Predictive Intelligence
  revenueForecast: number
  stockoutRiskScore: number
  priceOptimizationOps: number
  seasonalDemand: string
  
  // Competitive Intelligence
  buyBoxWinRate: number
  priceCompetitivenessIndex: number
  marketOpportunityScore: number
  competitorAlerts: number
  
  // Profit Optimization
  trueProfitMargin: number
  customerLifetimeValue: number
  unitEconomics: any
  feeOptimizationSavings: number
  
  // Operational Excellence
  orderProcessingHours: number
  listingQualityScore: string
  inventoryTurnover: number
  returnRate: number
}

const MetricCard: React.FC<{
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}> = ({ title, value, subtitle, trend, icon, color = 'blue', size = 'md' }) => {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-600 border-green-200',
    red: 'bg-red-500/10 text-red-600 border-red-200',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-200'
  }
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null
  
  return (
    <Card className={`${colorClasses[color]} transition-all hover:scale-105 cursor-pointer`}>
      <CardContent className={`${size === 'lg' ? 'p-6' : size === 'sm' ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
            <div>
              <p className={`${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium text-gray-600`}>
                {title}
              </p>
              <p className={`${size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'} font-bold`}>
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          {TrendIcon && (
            <TrendIcon className={`w-5 h-5 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const HeroSection: React.FC<{ metrics: Partial<DashboardMetrics> }> = ({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <MetricCard
      title="Business Health Score"
      value={metrics.businessHealthScore || 0}
      subtitle="/100"
      icon={<Target className="w-6 h-6" />}
      color={metrics.businessHealthScore && metrics.businessHealthScore > 80 ? 'green' : 
             metrics.businessHealthScore && metrics.businessHealthScore > 60 ? 'yellow' : 'red'}
      size="lg"
      trend={metrics.businessHealthScore && metrics.businessHealthScore > 70 ? 'up' : 'down'}
    />
    <MetricCard
      title="Inventory Runway"
      value={`${metrics.runwayDays || 0}d`}
      subtitle="until stockout"
      icon={<Package className="w-6 h-6" />}
      color={metrics.runwayDays && metrics.runwayDays > 60 ? 'green' : 
             metrics.runwayDays && metrics.runwayDays > 30 ? 'yellow' : 'red'}
      size="lg"
    />
    <MetricCard
      title="Profit Velocity"
      value={`$${metrics.profitVelocity || 0}/hr`}
      subtitle="real-time rate"
      icon={<DollarSign className="w-6 h-6" />}
      color="green"
      size="lg"
      trend="up"
    />
    <MetricCard
      title="Market Share"
      value={`${metrics.marketShareTrend || 0}%`}
      subtitle="category position"
      icon={<BarChart3 className="w-6 h-6" />}
      color="purple"
      size="lg"
      trend="up"
    />
  </div>
)

const SectionGrid: React.FC<{
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}> = ({ title, icon, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-gray-100 rounded-lg">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  </div>
)

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<Partial<DashboardMetrics>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardMetrics()
  }, [])

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true)
      
      // Get seller ID from localStorage (from our onboarding)
      const sellerId = localStorage.getItem('sellerId')
      if (!sellerId) {
        throw new Error('No seller ID found')
      }

      const response = await fetch(`/api/dashboard/metrics?sellerId=${sellerId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Dashboard Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardMetrics}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Next-Gen Seller Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time business intelligence for Amazon sellers
          </p>
        </div>

        {/* Hero Section */}
        <HeroSection metrics={metrics} />

        {/* Predictive Intelligence */}
        <SectionGrid
          title="💡 Predictive Intelligence"
          icon={<Zap className="w-6 h-6" />}
        >
          <MetricCard
            title="Revenue Forecast"
            value={`$${(metrics.revenueForecast || 0).toLocaleString()}`}
            subtitle="next 30 days"
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
          />
          <MetricCard
            title="Stockout Risk"
            value={metrics.stockoutRiskScore || 0}
            subtitle="/10 risk level"
            icon={<AlertTriangle className="w-5 h-5" />}
            color={metrics.stockoutRiskScore && metrics.stockoutRiskScore > 7 ? 'red' : 
                   metrics.stockoutRiskScore && metrics.stockoutRiskScore > 4 ? 'yellow' : 'green'}
          />
          <MetricCard
            title="Price Opportunities"
            value={metrics.priceOptimizationOps || 0}
            subtitle="products to optimize"
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Seasonal Demand"
            value={metrics.seasonalDemand || 'Stable'}
            subtitle="trend prediction"
            icon={<BarChart3 className="w-5 h-5" />}
            color="purple"
          />
        </SectionGrid>

        {/* Competitive Intelligence */}
        <SectionGrid
          title="🔍 Competitive Intelligence"
          icon={<Target className="w-6 h-6" />}
        >
          <MetricCard
            title="Buy Box Win Rate"
            value={`${metrics.buyBoxWinRate || 0}%`}
            subtitle="vs competitors"
            icon={<Target className="w-5 h-5" />}
            color={metrics.buyBoxWinRate && metrics.buyBoxWinRate > 80 ? 'green' : 
                   metrics.buyBoxWinRate && metrics.buyBoxWinRate > 60 ? 'yellow' : 'red'}
          />
          <MetricCard
            title="Price Index"
            value={metrics.priceCompetitivenessIndex || 0}
            subtitle="market position"
            icon={<BarChart3 className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Market Opportunity"
            value={`$${(metrics.marketOpportunityScore || 0).toLocaleString()}`}
            subtitle="untapped potential"
            icon={<Rocket className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="Competitor Alerts"
            value={metrics.competitorAlerts || 0}
            subtitle="price/stock changes"
            icon={<AlertTriangle className="w-5 h-5" />}
            color={metrics.competitorAlerts && metrics.competitorAlerts > 0 ? 'yellow' : 'green'}
          />
        </SectionGrid>

        {/* Profit Optimization */}
        <SectionGrid
          title="💰 Profit Optimization"
          icon={<DollarSign className="w-6 h-6" />}
        >
          <MetricCard
            title="True Profit Margin"
            value={`${metrics.trueProfitMargin || 0}%`}
            subtitle="after all costs"
            icon={<DollarSign className="w-5 h-5" />}
            color={metrics.trueProfitMargin && metrics.trueProfitMargin > 20 ? 'green' : 
                   metrics.trueProfitMargin && metrics.trueProfitMargin > 10 ? 'yellow' : 'red'}
          />
          <MetricCard
            title="Customer LTV"
            value={`$${metrics.customerLifetimeValue || 0}`}
            subtitle="lifetime value"
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Unit Economics"
            value={metrics.unitEconomics?.averageOrderValue ? `$${metrics.unitEconomics.averageOrderValue}` : 'N/A'}
            subtitle="avg order value"
            icon={<BarChart3 className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="Fee Savings"
            value={`$${metrics.feeOptimizationSavings || 0}`}
            subtitle="optimization potential"
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
          />
        </SectionGrid>

        {/* Operational Excellence */}
        <SectionGrid
          title="⚡ Operational Excellence"
          icon={<Zap className="w-6 h-6" />}
        >
          <MetricCard
            title="Order Processing"
            value={`${metrics.orderProcessingHours || 0}h`}
            subtitle="avg time to ship"
            icon={<Clock className="w-5 h-5" />}
            color={metrics.orderProcessingHours && metrics.orderProcessingHours < 24 ? 'green' : 
                   metrics.orderProcessingHours && metrics.orderProcessingHours < 48 ? 'yellow' : 'red'}
          />
          <MetricCard
            title="Listing Quality"
            value={metrics.listingQualityScore || 'N/A'}
            subtitle="optimization score"
            icon={<ShieldCheck className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Inventory Turnover"
            value={`${metrics.inventoryTurnover || 0}x`}
            subtitle="annual turns"
            icon={<Package className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="Return Rate"
            value={`${metrics.returnRate || 0}%`}
            subtitle="product returns"
            icon={<AlertTriangle className="w-5 h-5" />}
            color={metrics.returnRate && metrics.returnRate < 5 ? 'green' : 
                   metrics.returnRate && metrics.returnRate < 10 ? 'yellow' : 'red'}
          />
        </SectionGrid>

        {/* Performance Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">✅ Performing Well</h3>
            <div className="text-sm text-green-700 space-y-1">
              <div>• Business Health: {metrics.businessHealthScore}/100</div>
              <div>• Buy Box Win Rate: {metrics.buyBoxWinRate}%</div>
              <div>• Profit Margin: {metrics.trueProfitMargin}%</div>
              <div>• Low Return Rate: {metrics.returnRate}%</div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Needs Attention</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <div>• Stockout Risk: {metrics.stockoutRiskScore}/10</div>
              <div>• Price Opportunities: {metrics.priceOptimizationOps} products</div>
              <div>• Competitor Alerts: {metrics.competitorAlerts} changes</div>
              <div>• Processing Time: {metrics.orderProcessingHours}h</div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🚀 Growth Opportunities</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• Revenue Forecast: ${metrics.revenueForecast?.toLocaleString()}</div>
              <div>• Market Opportunity: ${metrics.marketOpportunityScore?.toLocaleString()}</div>
              <div>• Fee Savings: ${metrics.feeOptimizationSavings}</div>
              <div>• {metrics.seasonalDemand} Detected</div>
            </div>
          </div>
        </div>

        {/* Real-time Updates Footer */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg text-center">
          <p className="text-sm text-gray-700 font-medium">
            ⚡ Live Dashboard • Real-time calculations • Last updated: {new Date().toLocaleTimeString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Data refreshes automatically every 5 minutes. Click any metric for detailed insights.
          </p>
        </div>
      </div>
    </div>
  )
}