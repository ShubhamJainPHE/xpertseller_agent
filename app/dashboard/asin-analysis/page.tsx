'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Eye,
  Star,
  DollarSign,
  BarChart3,
  Search,
  Package,
  AlertCircle,
  CheckCircle,
  Crown,
  Filter,
  Calendar,
  ExternalLink,
  ChevronDown
} from 'lucide-react'

// Mock ASIN data for dropdown
const availableAsins = [
  { asin: 'B08XYZ123', title: 'Wireless Bluetooth Headphones' },
  { asin: 'B09ABC456', title: 'Phone Case iPhone 14 Pro Max' },
  { asin: 'B07DEF789', title: 'USB-C Fast Charging Cable 6ft' },
  { asin: 'B06GHI012', title: 'Wireless Charging Pad 15W' }
]

// Comprehensive ASIN performance data
const asinPerformanceData = {
  'B08XYZ123': {
    asin: 'B08XYZ123',
    title: 'Wireless Bluetooth Headphones - Noise Cancelling Over Ear',
    sku: 'WH-BT-001',
    category: 'Electronics > Headphones & Earbuds',
    brand: 'Your Brand',
    image: '/api/placeholder/200/200',
    
    // Financial Performance
    currentPrice: 24.99,
    amazonFees: 3.75,
    netRevenue: 21.24,
    cogs: 8.50,
    profitPerUnit: 12.74,
    profitMargin: 51.0,
    
    // Sales Performance
    dailySales: 4.2,
    weeklySales: 29,
    monthlySales: 126,
    salesVelocity: 'stable',
    salesTrend: 2.1,
    
    // P&L Analysis (Monthly)
    totalRevenue: 2676.24,
    totalCogs: 1071.00,
    totalProfit: 1605.24,
    profitability: 'excellent',
    
    // Amazon Performance Metrics
    bsr: 15234,
    bsrChange: -2000,
    bsrCategory: 'Electronics',
    sessions: 2847,
    sessionsChange: 8.1,
    pageViews: 3421,
    pageViewsChange: 12.3,
    conversionRate: 12.3,
    conversionChange: -0.7,
    clickThroughRate: 0.85,
    ctrChange: 2.1,
    
    // Review Performance
    reviewRating: 4.3,
    reviewCount: 1247,
    reviewsChange: 23,
    reviewVelocity: 5.2,
    
    // Inventory Status
    inStock: 132,
    reserved: 13,
    daysOfInventory: 31,
    inventoryStatus: 'healthy',
    
    // Category Performance
    categoryRank: 15,
    categoryTotalProducts: 15420,
    marketShare: 0.81,
    competitivePosition: 'mid-tier',
    
    // Keyword Rankings
    keywordRankings: [
      { keyword: 'wireless headphones', rank: 15, searchVolume: 125000, clickShare: 2.3 },
      { keyword: 'bluetooth headphones', rank: 8, searchVolume: 89000, clickShare: 4.7 },
      { keyword: 'noise cancelling headphones', rank: 23, searchVolume: 67000, clickShare: 1.2 }
    ],
    
    // Historical Trends (30 days)
    salesHistory: [
      { date: '2025-01-01', sales: 3, revenue: 74.97, profit: 38.22 },
      { date: '2025-01-08', sales: 4, revenue: 99.96, profit: 50.96 },
      { date: '2025-01-15', sales: 5, revenue: 124.95, profit: 63.70 },
      { date: '2025-01-22', sales: 4, revenue: 99.96, profit: 50.96 },
      { date: '2025-01-29', sales: 6, revenue: 149.94, profit: 76.44 }
    ],
    
    // Competitive Analysis
    nearestCompetitors: [
      {
        asin: 'B08E8W123',
        brand: 'Sony',
        title: 'WH-1000XM4 Wireless Premium Noise Canceling',
        price: 348.00,
        rating: 4.4,
        reviews: 89247,
        bsr: 1,
        marketPosition: 'premium leader'
      },
      {
        asin: 'B07Q9123A',
        brand: 'Bose',
        title: 'QuietComfort 35 II Wireless Bluetooth',
        price: 299.00,
        rating: 4.3,
        reviews: 67891,
        bsr: 2,
        marketPosition: 'premium alternative'
      },
      {
        asin: 'B09ABC789',
        brand: 'Anker',
        title: 'SoundCore Life Q30 Hybrid Active Noise Cancelling',
        price: 79.99,
        rating: 4.4,
        reviews: 34521,
        bsr: 18456,
        marketPosition: 'mid-range competitor'
      }
    ]
  }
}

const ASINSelector = ({ selectedAsin, onSelect }: { selectedAsin: string, onSelect: (asin: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedProduct = availableAsins.find(p => p.asin === selectedAsin)
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-white"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          {selectedProduct ? selectedProduct.title : 'Select ASIN'}
        </div>
        <ChevronDown className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {availableAsins.map(product => (
            <button
              key={product.asin}
              onClick={() => {
                onSelect(product.asin)
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-medium text-sm">{product.title}</div>
              <div className="text-xs text-gray-500">ASIN: {product.asin}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ProfitabilityOverview = ({ data }: { data: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4 text-center">
        <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-green-800">${data.profitPerUnit}</div>
        <div className="text-sm text-green-700">Profit per Unit</div>
        <div className="text-xs text-green-600 mt-1">{data.profitMargin}% margin</div>
      </CardContent>
    </Card>
    
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4 text-center">
        <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-blue-800">${data.totalProfit.toFixed(0)}</div>
        <div className="text-sm text-blue-700">Monthly Profit</div>
        <div className="text-xs text-blue-600 mt-1">{data.monthlySales} units sold</div>
      </CardContent>
    </Card>
    
    <Card className="border-purple-200 bg-purple-50">
      <CardContent className="p-4 text-center">
        <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-purple-800">#{data.bsr.toLocaleString()}</div>
        <div className="text-sm text-purple-700">Best Seller Rank</div>
        <div className={`text-xs flex items-center justify-center gap-1 mt-1 ${
          data.bsrChange < 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {data.bsrChange < 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(data.bsrChange).toLocaleString()}
        </div>
      </CardContent>
    </Card>
    
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4 text-center">
        <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-yellow-800">{data.reviewRating} ★</div>
        <div className="text-sm text-yellow-700">{data.reviewCount.toLocaleString()} reviews</div>
        <div className="text-xs text-yellow-600 mt-1">+{data.reviewsChange} this week</div>
      </CardContent>
    </Card>
  </div>
)

const DetailedPnL = ({ data }: { data: any }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <DollarSign className="w-5 h-5" />
        Profit & Loss Analysis (Monthly)
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Financial Breakdown</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Gross Revenue</span>
              <span className="font-semibold text-gray-800">${(data.currentPrice * data.monthlySales).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Amazon Fees</span>
              <span className="font-semibold text-red-600">-${(data.amazonFees * data.monthlySales).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Net Revenue</span>
              <span className="font-semibold text-blue-600">${data.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Cost of Goods (COGS)</span>
              <span className="font-semibold text-orange-600">-${data.totalCogs.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-gray-200">
              <span className="font-semibold text-gray-800">Net Profit</span>
              <span className="font-bold text-green-600 text-lg">${data.totalProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Key Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{data.profitMargin.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Profit Margin</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{data.conversionRate}%</div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{data.sessions.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Monthly Sessions</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{data.daysOfInventory}</div>
              <div className="text-sm text-gray-600">Days of Stock</div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const KeywordPerformance = ({ keywords }: { keywords: any[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Search className="w-5 h-5" />
        Keyword Performance
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {keywords.map((keyword, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-800">"{keyword.keyword}"</h4>
                <div className="text-sm text-gray-600">
                  {keyword.searchVolume.toLocaleString()} monthly searches
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  keyword.rank <= 10 ? 'text-green-600' :
                  keyword.rank <= 20 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  Rank #{keyword.rank}
                </div>
                <div className="text-xs text-gray-500">Current position</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-700 mb-1">Click Share</div>
                <div className="text-xl font-bold text-blue-800">{keyword.clickShare}%</div>
                <div className="text-xs text-blue-600">of total clicks</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-700 mb-1">Est. Monthly Revenue</div>
                <div className="text-xl font-bold text-green-800">
                  ${((keyword.searchVolume * keyword.clickShare / 100 * 0.123 * 24.99).toFixed(0))}
                </div>
                <div className="text-xs text-green-600">from this keyword</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const CompetitiveAnalysis = ({ competitors }: { competitors: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Crown className="w-5 h-5" />
        Competitive Analysis
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {competitors.map((competitor, index) => (
          <div key={competitor.asin} className="flex items-center justify-between p-4 rounded-lg border bg-white">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                competitor.bsr <= 3 ? 'bg-yellow-100 text-yellow-800' :
                competitor.bsr <= 10 ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {competitor.bsr}
              </div>
              <div>
                <div className="font-medium text-sm text-gray-800">
                  {competitor.title}
                </div>
                <div className="text-xs text-gray-600">
                  {competitor.brand} • ASIN: {competitor.asin}
                </div>
                <div className="text-xs text-purple-600 font-medium">
                  {competitor.marketPosition}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">${competitor.price}</div>
                <div className="text-xs text-gray-500">Price</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{competitor.rating} ★</div>
                <div className="text-xs text-gray-500">{competitor.reviews.toLocaleString()}</div>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />
                Analyze
              </Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export default function ASINAnalysisPage() {
  const [selectedAsin, setSelectedAsin] = useState('B08XYZ123')
  const data = asinPerformanceData[selectedAsin as keyof typeof asinPerformanceData]
  
  if (!data) {
    return <div className="p-6">No data available for selected ASIN</div>
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 ASIN Performance Analysis
          </h1>
          <p className="text-gray-600 mb-6">
            Deep dive into individual product performance, profitability, and competitive positioning
          </p>
          
          {/* ASIN Selector */}
          <div className="max-w-md">
            <ASINSelector selectedAsin={selectedAsin} onSelect={setSelectedAsin} />
          </div>
        </div>

        {/* Product Header */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-2">{data.title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">ASIN</div>
                    <div className="font-semibold">{data.asin}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">SKU</div>
                    <div className="font-semibold">{data.sku}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Category</div>
                    <div className="font-semibold">{data.category}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Current Price</div>
                    <div className="font-semibold text-green-600">${data.currentPrice}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Overview */}
        <ProfitabilityOverview data={data} />

        {/* Detailed P&L */}
        <DetailedPnL data={data} />

        {/* Keyword Performance */}
        <KeywordPerformance keywords={data.keywordRankings} />

        {/* Competitive Analysis */}
        <CompetitiveAnalysis competitors={data.nearestCompetitors} />

        {/* Data Sources */}
        <div className="mt-8 p-4 bg-white rounded-lg border text-center">
          <p className="text-sm text-gray-600">
            📊 Data from Amazon SP-API, Brand Analytics, and Business Reports
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Financial data updated daily • Competitive data updated weekly • Keyword rankings from Brand Analytics
          </p>
        </div>
      </div>
    </div>
  )
}