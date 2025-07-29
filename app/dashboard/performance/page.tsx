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
  Filter,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Crown,
  Zap
} from 'lucide-react'

// Mock performance data from SP-API Brand Analytics
const performanceData = [
  {
    asin: 'B08XYZ123',
    title: 'Wireless Bluetooth Headphones',
    category: 'Electronics > Headphones & Earbuds',
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
    organicRank: {
      'wireless headphones': 15,
      'bluetooth headphones': 8,
      'noise cancelling headphones': 23
    },
    reviewRating: 4.3,
    reviewCount: 1247,
    reviewsChange: 23
  }
]

// Mock category intelligence data (scraped/estimated)
const categoryData = {
  category: 'Electronics > Headphones & Earbuds',
  totalProducts: 15420,
  topProducts: [
    {
      rank: 1,
      asin: 'B08E8W123',
      title: 'Sony WH-1000XM4 Wireless Premium Noise Canceling',
      price: 348.00,
      rating: 4.4,
      reviews: 89247,
      bsr: 1,
      brand: 'Sony',
      isYourProduct: false
    },
    {
      rank: 2, 
      asin: 'B07Q9123A',
      title: 'Bose QuietComfort 35 II Wireless Bluetooth',
      price: 299.00,
      rating: 4.3,
      reviews: 67891,
      bsr: 2,
      brand: 'Bose',
      isYourProduct: false
    },
    {
      rank: 15,
      asin: 'B08XYZ123',
      title: 'Wireless Bluetooth Headphones - Your Product',
      price: 24.99,
      rating: 4.3,
      reviews: 1247,
      bsr: 15234,
      brand: 'Your Brand',
      isYourProduct: true
    },
    {
      rank: 18,
      asin: 'B09ABC789',
      title: 'SoundCore Life Q30 Hybrid Active Noise Cancelling',
      price: 79.99,
      rating: 4.4,
      reviews: 34521,
      bsr: 18456,
      brand: 'Anker',
      isYourProduct: false
    },
    {
      rank: 22,
      asin: 'B08DEF456',
      title: 'JBL Tune 760NC Wireless Over-Ear Headphones',
      price: 129.95,
      rating: 4.2,
      reviews: 12890,
      bsr: 22103,
      brand: 'JBL',
      isYourProduct: false
    }
  ],
  priceAnalysis: {
    averagePrice: 176.39,
    medianPrice: 129.95,
    yourPrice: 24.99,
    pricePosition: 'bottom 5%',
    competitiveOpportunity: 'Significant underpricing vs market'
  },
  trends: {
    avgMonthlyGrowth: 5.2,
    newEntrants: 47,
    topPerformingPriceRange: '$80-150',
    seasonalityFactor: 1.3
  }
}

// Mock keyword performance from Brand Analytics
const keywordData = [
  {
    keyword: 'wireless headphones',
    searchVolume: 125000,
    yourRank: 15,
    clickShare: 2.3,
    conversionShare: 3.1,
    competitorRanks: [
      { brand: 'Sony', rank: 1 },
      { brand: 'Bose', rank: 2 },
      { brand: 'Apple', rank: 3 }
    ]
  },
  {
    keyword: 'bluetooth headphones',
    searchVolume: 89000,
    yourRank: 8,
    clickShare: 4.7,
    conversionShare: 5.2,
    competitorRanks: [
      { brand: 'JBL', rank: 1 },
      { brand: 'Anker', rank: 3 },
      { brand: 'Skullcandy', rank: 5 }
    ]
  },
  {
    keyword: 'noise cancelling headphones',
    searchVolume: 67000,
    yourRank: 23,
    clickShare: 1.2,
    conversionShare: 0.8,
    competitorRanks: [
      { brand: 'Sony', rank: 1 },
      { brand: 'Bose', rank: 2 },
      { brand: 'Anker', rank: 4 }
    ]
  }
]

const PerformanceOverview = ({ data }: { data: typeof performanceData[0] }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-blue-700">Best Seller Rank</div>
          <BarChart3 className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-blue-800">
          #{data.bsr.toLocaleString()}
        </div>
        <div className={`text-sm flex items-center gap-1 ${
          data.bsrChange < 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          {data.bsrChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          {Math.abs(data.bsrChange).toLocaleString()} vs last week
        </div>
      </CardContent>
    </Card>

    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-green-700">Sessions</div>
          <Eye className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-2xl font-bold text-green-800">
          {data.sessions.toLocaleString()}
        </div>
        <div className={`text-sm flex items-center gap-1 ${
          data.sessionsChange > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {data.sessionsChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(data.sessionsChange)}% vs yesterday
        </div>
      </CardContent>
    </Card>

    <Card className="border-purple-200 bg-purple-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-purple-700">Conversion Rate</div>
          <Target className="w-4 h-4 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-purple-800">
          {data.conversionRate}%
        </div>
        <div className={`text-sm flex items-center gap-1 ${
          data.conversionChange > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {data.conversionChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(data.conversionChange)}% vs last week
        </div>
      </CardContent>
    </Card>

    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-yellow-700">Reviews</div>
          <Star className="w-4 h-4 text-yellow-500" />
        </div>
        <div className="text-2xl font-bold text-yellow-800">
          {data.reviewRating} ★
        </div>
        <div className="text-sm text-yellow-700">
          {data.reviewCount.toLocaleString()} reviews (+{data.reviewsChange})
        </div>
      </CardContent>
    </Card>
  </div>
)

const CategoryIntelligence = ({ data }: { data: typeof categoryData }) => (
  <Card className="mb-8">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Crown className="w-5 h-5" />
        Category: {data.category}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-800">{data.totalProducts.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Products</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-800">${data.priceAnalysis.averagePrice}</div>
          <div className="text-sm text-blue-600">Average Price</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-800">{data.trends.avgMonthlyGrowth}%</div>
          <div className="text-sm text-green-600">Monthly Growth</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-800">{data.trends.newEntrants}</div>
          <div className="text-sm text-purple-600">New Entrants (30d)</div>
        </div>
      </div>

      {/* Top Products in Category */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          🏆 Top Products in Category
        </h4>
        <div className="space-y-3">
          {data.topProducts.map((product, index) => (
            <div key={product.asin} className={`flex items-center justify-between p-3 rounded-lg border ${
              product.isYourProduct ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  product.rank <= 3 ? 'bg-yellow-100 text-yellow-800' :
                  product.rank <= 10 ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {product.rank}
                </div>
                <div className="flex-1">
                  <div className={`font-medium text-sm ${
                    product.isYourProduct ? 'text-blue-800' : 'text-gray-800'
                  }`}>
                    {product.title}
                  </div>
                  <div className="text-xs text-gray-600">
                    {product.brand} • ASIN: {product.asin}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-green-600">${product.price}</div>
                  <div className="text-xs text-gray-500">Price</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-yellow-600">{product.rating} ★</div>
                  <div className="text-xs text-gray-500">{product.reviews.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-600">#{product.bsr.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">BSR</div>
                </div>
                {!product.isYourProduct && (
                  <Button variant="outline" size="sm" className="text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
)

const KeywordPerformance = ({ data }: { data: typeof keywordData }) => (
  <Card className="mb-8">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Search className="w-5 h-5" />
        Keyword Performance (Brand Analytics)
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {data.map((keyword, index) => (
          <div key={keyword.keyword} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-800">"{keyword.keyword}"</h4>
                <div className="text-sm text-gray-600">
                  {keyword.searchVolume.toLocaleString()} monthly searches
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  keyword.yourRank <= 10 ? 'text-green-600' :
                  keyword.yourRank <= 20 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  Rank #{keyword.yourRank}
                </div>
                <div className="text-xs text-gray-500">Your position</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-700 mb-1">Click Share</div>
                <div className="text-xl font-bold text-blue-800">{keyword.clickShare}%</div>
                <div className="text-xs text-blue-600">of total clicks</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-700 mb-1">Conversion Share</div>
                <div className="text-xl font-bold text-green-800">{keyword.conversionShare}%</div>
                <div className="text-xs text-green-600">of total conversions</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-1">Top Competitors</div>
                <div className="space-y-1">
                  {keyword.competitorRanks.slice(0, 3).map((comp, idx) => (
                    <div key={idx} className="text-xs flex justify-between">
                      <span>{comp.brand}</span>
                      <span className="font-medium">#{comp.rank}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Opportunities */}
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              {keyword.yourRank > 20 && (
                <div className="text-yellow-800">
                  🎯 <strong>Opportunity:</strong> High search volume but low ranking. Consider increasing PPC bid or optimizing listing.
                </div>
              )}
              {keyword.clickShare < keyword.conversionShare && (
                <div className="text-green-800">
                  ✅ <strong>Strength:</strong> Higher conversion share than click share indicates strong product-market fit.
                </div>
              )}
              {keyword.clickShare > keyword.conversionShare && (
                <div className="text-red-800">
                  ⚠️ <strong>Issue:</strong> Getting clicks but low conversions. Check listing quality and price competitiveness.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export default function PerformanceDashboard() {
  const [selectedProduct, setSelectedProduct] = useState(performanceData[0])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📈 Performance & Market Intelligence
          </h1>
          <p className="text-gray-600 mb-4">
            Track your performance vs competitors using Amazon's Brand Analytics and market data
          </p>
        </div>

        {/* Performance Overview */}
        <PerformanceOverview data={selectedProduct} />

        {/* Category Intelligence */}
        <CategoryIntelligence data={categoryData} />

        {/* Keyword Performance */}
        <KeywordPerformance data={keywordData} />

        {/* Market Insights */}
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Market Insights & Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">🎯 Immediate Opportunities</h4>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="font-medium text-sm text-gray-800">Price Optimization</div>
                    <div className="text-xs text-gray-600 mt-1">
                      You're priced 85% below market average. Consider gradual price increases.
                    </div>
                    <div className="text-xs text-green-600 font-medium mt-1">
                      Potential: +$45/unit profit
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="font-medium text-sm text-gray-800">Keyword Expansion</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Strong performance on "bluetooth headphones" - expand to related terms.
                    </div>
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      Target: "wireless earbuds", "gaming headphones"
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">📊 Market Trends</h4>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="font-medium text-sm text-gray-800">Seasonal Pattern</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Category grows 30% during Q4. Current inventory may be insufficient.
                    </div>
                    <div className="text-xs text-yellow-600 font-medium mt-1">
                      Action: Plan Q4 inventory surge
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="font-medium text-sm text-gray-800">New Competitors</div>
                    <div className="text-xs text-gray-600 mt-1">
                      47 new products launched this month. Monitor for aggressive pricing.
                    </div>
                    <div className="text-xs text-red-600 font-medium mt-1">
                      Risk: Increased competition pressure
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <div className="mt-8 p-4 bg-white rounded-lg border text-center">
          <p className="text-sm text-gray-600">
            📊 Data from Amazon Brand Analytics, SP-API Performance Reports, and Market Intelligence
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Performance metrics updated daily • Category data updated weekly • Keyword data from Amazon's Brand Analytics (requires Brand Registry)
          </p>
        </div>
      </div>
    </div>
  )
}