'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProfitTrendChart, ProductPerformanceChart, HourlyOrdersChart } from '@/components/charts/ProfitChart'
import { 
  Calendar,
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  Clock, 
  Target,
  Zap,
  Shield,
  Activity,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Flame,
  Crown,
  Timer,
  Rocket
} from 'lucide-react'

// Mock data that looks realistic
const mockData = {
  financialPulse: {
    netProfit24h: 347,
    profitChange: 23,
    revenue24h: 1234,
    amazonFees: 247,
    cogs: 640,
    profitMargin: 28.1,
    monthlyProjection: 10500,
    cashFlowWarning: 12
  },
  
  sellerScore: {
    total: 847,
    change: 12,
    breakdown: {
      profitHealth: 92,
      inventoryManagement: 78,
      competitivePosition: 85,
      customerSatisfaction: 91,
      growthMomentum: 73
    },
    rank: "Top 15%",
    nextLevel: 5
  },

  urgentActions: [
    {
      id: 1,
      type: 'critical',
      title: 'Stockout Alert: Wireless Headphones',
      description: 'Only 12 units left, will run out tomorrow',
      impact: '$1,200/day lost sales',
      actions: ['Rush Order $2,400', 'Price Surge to $35', 'Turn Off Ads'],
      timeLeft: '18 hours'
    },
    {
      id: 2,
      type: 'urgent',
      title: 'Competitor Price Drop: Phone Case',
      description: 'TechGadgetPro dropped to $18.99 (vs your $24.99)',
      impact: 'Losing 40% of sales',
      actions: ['Match Price', 'Bundle Offer', 'Check Reviews'],
      timeLeft: 'Act now'
    },
    {
      id: 3,
      type: 'important',
      title: 'Negative Review Response',
      description: '1-star review on main product needs response',
      impact: 'BSR could drop 2000 positions',
      actions: ['Contact Customer', 'Update Listing', 'Get More Reviews'],
      timeLeft: '2 hours'
    }
  ],

  rankingRadar: [
    {
      product: 'Wireless Headphones',
      currentRank: 15234,
      change: -5000,
      cause: 'Competitor "HeadphoneKing" dropped to $19.99',
      threat: 'high',
      buyBoxLoss: 23
    },
    {
      product: 'Phone Case',
      currentRank: 45678,
      change: -12000,
      cause: 'New competitor entered with 50% off launch',
      threat: 'critical',
      buyBoxLoss: 67
    },
    {
      product: 'Car Charger',
      currentRank: 8934,
      change: 2400,
      cause: 'Competitor went out of stock',
      threat: 'opportunity',
      buyBoxLoss: -15
    }
  ],

  todayVsYesterday: {
    revenue: { today: 1234, yesterday: 1098, change: 12.4 },
    orders: { today: 45, yesterday: 41, change: 9.8 },
    aov: { today: 27.42, yesterday: 26.78, change: 2.4 },
    profit: { today: 347, yesterday: 289, change: 20.1 },
    sessions: { today: 2847, yesterday: 2634, change: 8.1 }
  }
}

const DateRangePicker = () => (
  <div className="flex items-center gap-2 mb-6">
    <Calendar className="w-5 h-5 text-gray-600" />
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="bg-blue-500 text-white border-blue-500">
        Today
      </Button>
      <Button variant="outline" size="sm">Yesterday</Button>
      <Button variant="outline" size="sm">Last 7d</Button>
      <Button variant="outline" size="sm">Last 30d</Button>
      <Button variant="outline" size="sm" className="border-dashed">
        <Filter className="w-4 h-4 mr-1" />
        Custom Range
      </Button>
    </div>
    <div className="ml-4 text-sm text-gray-600">
      Comparing: <span className="font-semibold">Today</span> vs <span className="font-semibold">Yesterday</span>
    </div>
  </div>
)

const FinancialPulse = ({ data }: { data: typeof mockData.financialPulse }) => (
  <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl font-bold text-green-800 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Financial Pulse - Last 24 Hours
        </CardTitle>
        <Badge className="bg-green-100 text-green-800 border-green-300">
          PROFITABLE
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-3xl font-bold text-green-700 mb-2">
            ${data.netProfit24h}
            <span className="text-lg font-normal text-green-600 ml-2">
              ▲ +${data.profitChange} vs yesterday
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-semibold">${data.revenue24h}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amazon Fees:</span>
              <span className="text-red-600">-${data.amazonFees}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">COGS:</span>
              <span className="text-red-600">-${data.cogs}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Profit Margin:</span>
              <span className="font-bold text-green-600">{data.profitMargin}% ▲</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-sm text-gray-600">Monthly Projection</div>
            <div className="text-2xl font-bold text-green-700">
              ${data.monthlyProjection.toLocaleString()}
            </div>
            <div className="text-xs text-green-600">🎯 On track for target</div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold text-sm">Cash Flow Warning</span>
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              Reorder needed in {data.cashFlowWarning} days
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const SellerScore = ({ data }: { data: typeof mockData.sellerScore }) => (
  <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
    <CardHeader className="pb-3">
      <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
        <Crown className="w-6 h-6" />
        Seller Score
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between mb-4">
        <div className="text-4xl font-bold text-purple-700">
          {data.total}
          <span className="text-lg font-normal text-purple-600 ml-2">
            ▲ +{data.change} today
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm text-purple-600">🏆 {data.rank} of sellers</div>
          <div className="text-xs text-purple-500">{data.nextLevel} points to Elite status</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Object.entries(data.breakdown).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
              value >= 90 ? 'bg-green-100 text-green-700' :
              value >= 80 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              <span className="font-bold text-sm">{value}</span>
            </div>
            <div className="text-xs text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const UrgentActions = ({ actions }: { actions: typeof mockData.urgentActions }) => (
  <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
    <CardHeader className="pb-3">
      <CardTitle className="text-xl font-bold text-red-800 flex items-center gap-2">
        <Flame className="w-6 h-6" />
        Urgent Actions ({actions.length})
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {actions.map((action, index) => (
          <div key={action.id} className={`p-4 rounded-lg border-l-4 ${
            action.type === 'critical' ? 'bg-red-100 border-red-500' :
            action.type === 'urgent' ? 'bg-orange-100 border-orange-500' :
            'bg-yellow-100 border-yellow-500'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">{action.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{action.description}</p>
              </div>
              <div className="text-right">
                <Badge className={`text-xs ${
                  action.type === 'critical' ? 'bg-red-500 text-white' :
                  action.type === 'urgent' ? 'bg-orange-500 text-white' :
                  'bg-yellow-500 text-white'
                }`}>
                  {action.timeLeft}
                </Badge>
              </div>
            </div>
            
            <div className="text-xs font-semibold text-red-700 mb-3">
              💰 Impact: {action.impact}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {action.actions.map((actionBtn, idx) => (
                <Button 
                  key={idx} 
                  size="sm" 
                  className="text-xs h-7 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {actionBtn}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const TodayPerformance = ({ data }: { data: typeof mockData.todayVsYesterday }) => (
  <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
    <CardHeader className="pb-3">
      <CardTitle className="text-xl font-bold text-blue-800 flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Today vs Yesterday
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(data).map(([key, values]) => (
          <div key={key} className="text-center">
            <div className="text-2xl font-bold text-blue-700">
              ${key === 'aov' ? values.today.toFixed(2) : values.today.toLocaleString()}
            </div>
            <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${
              values.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {values.change > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              {Math.abs(values.change)}%
            </div>
            <div className="text-xs text-gray-600 capitalize mt-1">
              {key === 'aov' ? 'Avg Order Value' : key}
            </div>
            <div className="text-xs text-gray-500">
              vs ${key === 'aov' ? values.yesterday.toFixed(2) : values.yesterday.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const RankingRadar = ({ data }: { data: typeof mockData.rankingRadar }) => (
  <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
    <CardHeader className="pb-3">
      <CardTitle className="text-xl font-bold text-orange-800 flex items-center gap-2">
        <Target className="w-6 h-6" />
        Ranking Radar - Products at Risk
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {data.map((product, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-bold text-gray-800">{product.product}</h4>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Rank:</span>
                    <span className="font-semibold ml-1">#{product.currentRank.toLocaleString()}</span>
                    <span className={`ml-2 font-semibold ${
                      product.change < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {product.change > 0 ? '▲' : '▼'} {Math.abs(product.change).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Buy Box:</span>
                    <span className={`font-semibold ml-1 ${
                      product.buyBoxLoss > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {product.buyBoxLoss > 0 ? '-' : '+'}{Math.abs(product.buyBoxLoss)}%
                    </span>
                  </div>
                </div>
              </div>
              <Badge className={`${
                product.threat === 'critical' ? 'bg-red-500 text-white' :
                product.threat === 'high' ? 'bg-orange-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                {product.threat.toUpperCase()}
              </Badge>
            </div>
            
            <div className="text-sm text-gray-700 mb-3">
              <span className="font-semibold">Cause:</span> {product.cause}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" className="text-xs bg-blue-500 hover:bg-blue-600 text-white">
                Quick Fix
              </Button>
              <Button size="sm" variant="outline" className="text-xs">
                Investigate
              </Button>
              <Button size="sm" variant="outline" className="text-xs">
                Monitor
              </Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const QuickWins = () => (
  <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-teal-50">
    <CardHeader className="pb-3">
      <CardTitle className="text-xl font-bold text-green-800 flex items-center gap-2">
        <Rocket className="w-6 h-6" />
        Quick Wins (High Impact, Low Effort)
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Reprice 3 Products</h4>
            <Badge className="bg-green-100 text-green-800 text-xs">+$127/day</Badge>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Competitors raised prices. Safe to increase 8-12%.
          </p>
          <Button size="sm" className="w-full text-xs bg-green-500 hover:bg-green-600">
            Auto-Reprice
          </Button>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Reply to 2 Messages</h4>
            <Badge className="bg-blue-100 text-blue-800 text-xs">5 min</Badge>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Customer questions affect conversion rate.
          </p>
          <Button size="sm" className="w-full text-xs bg-blue-500 hover:bg-blue-600">
            Quick Reply
          </Button>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Update Low-Stock Alert</h4>
            <Badge className="bg-purple-100 text-purple-800 text-xs">2 min</Badge>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Set reorder point for seasonal products.
          </p>
          <Button size="sm" className="w-full text-xs bg-purple-500 hover:bg-purple-600">
            Set Alert
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function CommandCenterDashboard() {
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const refreshData = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setLastUpdated(new Date())
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ⚡ Command Center Dashboard
            </h1>
            <p className="text-gray-600">
              Your Amazon seller mission control - make money, avoid problems, dominate competition
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={refreshData}
              variant="outline" 
              size="sm" 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker />

        {/* Top Priority Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <FinancialPulse data={mockData.financialPulse} />
          <SellerScore data={mockData.sellerScore} />
        </div>

        {/* Critical Actions */}
        <div className="mb-8">
          <UrgentActions actions={mockData.urgentActions} />
        </div>

        {/* Performance Overview */}
        <div className="mb-8">
          <TodayPerformance data={mockData.todayVsYesterday} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Profit & Revenue Trend (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProfitTrendChart />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Today's Order Pattern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyOrdersChart />
              <div className="mt-3 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Peak: 6-9 PM (18 orders)</span>
                  <span>Low: 3-6 AM (1-3 orders)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Performance */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top 5 Products by Profit (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductPerformanceChart />
              <div className="mt-4 grid grid-cols-5 gap-2 text-xs text-gray-600">
                <div className="text-center">
                  <div className="w-3 h-3 bg-green-500 rounded mx-auto mb-1"></div>
                  <div>Leading</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mx-auto mb-1"></div>
                  <div>Strong</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded mx-auto mb-1"></div>
                  <div>Average</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-red-500 rounded mx-auto mb-1"></div>
                  <div>Weak</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-purple-500 rounded mx-auto mb-1"></div>
                  <div>New</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RankingRadar data={mockData.rankingRadar} />
          <QuickWins />
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg text-center">
          <p className="text-sm text-gray-700 font-medium">
            🧠 AI-Powered Intelligence • 🔄 Real-time Updates • 💰 Profit-First Design
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This dashboard analyzes 1,247 data points to give you the most important insights first.
          </p>
        </div>
      </div>
    </div>
  )
}