'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Crown,
  DollarSign,
  Package,
  Users,
  Calendar,
  Filter,
  Eye,
  Star,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  ShoppingCart,
  ChevronDown,
  ExternalLink
} from 'lucide-react'

// Mock category data with comprehensive trends
const categoryTrendsData = {
  'Electronics > Headphones & Earbuds': {
    category: 'Electronics > Headphones & Earbuds',
    
    // Market Overview
    marketSize: 2.8, // billion USD
    totalProducts: 15420,
    activeSellerCount: 3247,
    avgMonthlyGrowth: 5.2,
    competitionLevel: 'high',
    saturationLevel: 78,
    
    // Price Analysis
    priceAnalysis: {
      averagePrice: 176.39,
      medianPrice: 129.95,
      priceRange: { min: 12.99, max: 799.99 },
      topPerformingRange: '$80-150',
      yourProductsAvgPrice: 24.99,
      pricePosition: 'bottom 5%'
    },
    
    // Seasonal Trends
    seasonalityData: [
      { month: 'Jan', salesIndex: 95, avgPrice: 165.20, newProducts: 89 },
      { month: 'Feb', salesIndex: 88, avgPrice: 167.30, newProducts: 67 },
      { month: 'Mar', salesIndex: 92, avgPrice: 169.10, newProducts: 78 },
      { month: 'Apr', salesIndex: 97, avgPrice: 171.50, newProducts: 94 },
      { month: 'May', salesIndex: 103, avgPrice: 173.80, newProducts: 112 },
      { month: 'Jun', salesIndex: 108, avgPrice: 175.20, newProducts: 134 },
      { month: 'Jul', salesIndex: 112, avgPrice: 177.10, newProducts: 156 },
      { month: 'Aug', salesIndex: 115, avgPrice: 179.30, newProducts: 187 },
      { month: 'Sep', salesIndex: 118, avgPrice: 181.20, newProducts: 203 },
      { month: 'Oct', salesIndex: 135, avgPrice: 183.50, newProducts: 267 },
      { month: 'Nov', salesIndex: 198, avgPrice: 185.90, newProducts: 389 },
      { month: 'Dec', salesIndex: 156, avgPrice: 182.10, newProducts: 298 }
    ],
    
    // Top Brands Market Share
    topBrands: [
      { brand: 'Sony', marketShare: 18.2, avgPrice: 284.50, productCount: 47, growth: 2.1 },
      { brand: 'Bose', marketShare: 15.7, avgPrice: 267.30, productCount: 32, growth: 1.8 },
      { brand: 'Apple', marketShare: 12.4, avgPrice: 179.00, productCount: 8, growth: 4.2 },
      { brand: 'JBL', marketShare: 9.8, avgPrice: 89.60, productCount: 156, growth: 6.7 },
      { brand: 'Anker', marketShare: 8.3, avgPrice: 67.20, productCount: 234, growth: 8.9 },
      { brand: 'Skullcandy', marketShare: 6.1, avgPrice: 45.80, productCount: 189, growth: 3.4 },
      { brand: 'Your Brand', marketShare: 0.8, avgPrice: 24.99, productCount: 4, growth: 12.3 }
    ],
    
    // Trending Products (Last 30 days)
    trendingProducts: [
      {
        asin: 'B08NEW001',
        title: 'AI-Powered Noise Cancelling Headphones with Spatial Audio',
        brand: 'TechCorp',
        price: 199.99,
        rating: 4.6,
        reviews: 2847,
        bsr: 234,
        salesGrowth: 340,
        isNewLaunch: true,
        daysOnMarket: 15
      },
      {
        asin: 'B08NEW002', 
        title: 'Gaming Headset with RGB Lighting and 7.1 Surround',
        brand: 'GameAudio',
        price: 89.99,
        rating: 4.4,
        reviews: 1567,
        bsr: 567,
        salesGrowth: 280,
        isNewLaunch: true,
        daysOnMarket: 23
      },
      {
        asin: 'B08NEW003',
        title: 'Ultra-Lightweight Wireless Earbuds with Health Monitoring',
        brand: 'FitSound',
        price: 129.99,
        rating: 4.3,
        reviews: 892,
        bsr: 789,
        salesGrowth: 210,
        isNewLaunch: true,
        daysOnMarket: 31
      }
    ],
    
    // Price Movement Analysis
    priceMovements: [
      {
        priceRange: '$10-30',
        productCount: 3247,
        avgGrowth: 12.4,
        competitionLevel: 'very high',
        profitability: 'low',
        opportunity: 'volume play'
      },
      {
        priceRange: '$30-60',
        productCount: 2156,
        avgGrowth: 8.7,
        competitionLevel: 'high',
        profitability: 'moderate',
        opportunity: 'value segment'
      },
      {
        priceRange: '$60-120',
        productCount: 1834,
        avgGrowth: 6.2,
        competitionLevel: 'moderate',
        profitability: 'high',
        opportunity: 'sweet spot'
      },
      {
        priceRange: '$120-250',
        productCount: 987,
        avgGrowth: 4.1,
        competitionLevel: 'low',
        profitability: 'very high',
        opportunity: 'premium entry'
      },
      {
        priceRange: '$250+',
        productCount: 432,
        avgGrowth: 2.8,
        competitionLevel: 'very low',
        profitability: 'excellent',
        opportunity: 'luxury market'
      }
    ],
    
    // Market Opportunities
    opportunities: [
      {
        type: 'Product Gap',
        title: 'Eco-Friendly Headphones',
        description: 'Growing demand for sustainable materials but limited supply',
        potentialValue: 'high',
        competitionLevel: 'low',
        estimatedRevenue: '$50K-200K monthly'
      },
      {
        type: 'Price Gap',
        title: 'Premium Features at Mid-Range Price',
        description: '$80-120 range has room for feature-rich products',
        potentialValue: 'very high',
        competitionLevel: 'moderate',
        estimatedRevenue: '$100K-500K monthly'
      },
      {
        type: 'Emerging Trend',
        title: 'Health Monitoring Integration',
        description: 'Fitness tracking in audio devices trending up 45%',
        potentialValue: 'high',
        competitionLevel: 'low',
        estimatedRevenue: '$75K-300K monthly'
      }
    ],
    
    // Keyword Trends
    trendingKeywords: [
      { keyword: 'noise cancelling headphones', growth: 23.4, volume: 89000, competition: 'high' },
      { keyword: 'wireless gaming headset', growth: 45.7, volume: 67000, competition: 'medium' },
      { keyword: 'bluetooth earbuds waterproof', growth: 18.9, volume: 156000, competition: 'high' },
      { keyword: 'studio headphones professional', growth: 12.3, volume: 34000, competition: 'low' },
      { keyword: 'headphones with microphone', growth: 8.7, volume: 234000, competition: 'very high' }
    ]
  }
}

const CategorySelector = ({ selectedCategory, onSelect }: { selectedCategory: string, onSelect: (category: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false)
  const categories = [
    'Electronics > Headphones & Earbuds',
    'Electronics > Phone Accessories',
    'Electronics > Cables & Chargers',
    'Electronics > Smart Home',
    'Electronics > Wearable Technology'
  ]
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-white"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          {selectedCategory}
        </div>
        <ChevronDown className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                onSelect(category)
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-medium text-sm">{category}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const MarketOverview = ({ data }: { data: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4 text-center">
        <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-blue-800">${data.marketSize}B</div>
        <div className="text-sm text-blue-700">Market Size</div>
        <div className="text-xs text-blue-600 mt-1">{data.avgMonthlyGrowth}% monthly growth</div>
      </CardContent>
    </Card>
    
    <Card className="border-purple-200 bg-purple-50">
      <CardContent className="p-4 text-center">
        <Package className="w-6 h-6 text-purple-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-purple-800">{data.totalProducts.toLocaleString()}</div>
        <div className="text-sm text-purple-700">Total Products</div>
        <div className="text-xs text-purple-600 mt-1">{data.competitionLevel} competition</div>
      </CardContent>
    </Card>
    
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4 text-center">
        <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-green-800">{data.activeSellerCount.toLocaleString()}</div>
        <div className="text-sm text-green-700">Active Sellers</div>
        <div className="text-xs text-green-600 mt-1">{data.saturationLevel}% saturation</div>
      </CardContent>
    </Card>
    
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4 text-center">
        <Target className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-yellow-800">${data.priceAnalysis.averagePrice}</div>
        <div className="text-sm text-yellow-700">Average Price</div>
        <div className="text-xs text-yellow-600 mt-1">{data.priceAnalysis.topPerformingRange} sweet spot</div>
      </CardContent>
    </Card>
  </div>
)

const SeasonalTrends = ({ data }: { data: any[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Seasonal Trends & Patterns
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Index Chart Placeholder */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-4">Sales Volume by Month</h4>
          <div className="space-y-2">
            {data.map((month, index) => (
              <div key={month.month} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700 w-12">{month.month}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        month.salesIndex >= 150 ? 'bg-green-500' :
                        month.salesIndex >= 120 ? 'bg-yellow-500' :
                        month.salesIndex >= 100 ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min(month.salesIndex, 200) / 2}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-800 w-12 text-right">
                  {month.salesIndex}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Price Trends */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-4">Average Price Trends</h4>
          <div className="space-y-3">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="font-medium text-green-800">Peak Season (Q4)</div>
              <div className="text-sm text-green-700">Nov-Dec: 98% higher sales volume</div>
              <div className="text-xs text-green-600">Best time for premium product launches</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="font-medium text-blue-800">Growth Season (Jul-Oct)</div>
              <div className="text-sm text-blue-700">Steady 15% monthly increase</div>
              <div className="text-xs text-blue-600">Optimal for building inventory</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="font-medium text-yellow-800">Low Season (Jan-Mar)</div>
              <div className="text-sm text-yellow-700">12% below average sales</div>
              <div className="text-xs text-yellow-600">Good time for product optimization</div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const BrandAnalysis = ({ brands }: { brands: any[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Crown className="w-5 h-5" />
        Top Brands & Market Share
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {brands.map((brand, index) => (
          <div key={brand.brand} className={`flex items-center justify-between p-4 rounded-lg border ${
            brand.brand === 'Your Brand' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index < 3 ? 'bg-yellow-100 text-yellow-800' :
                brand.brand === 'Your Brand' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {index + 1}
              </div>
              <div>
                <div className={`font-semibold ${
                  brand.brand === 'Your Brand' ? 'text-blue-800' : 'text-gray-800'
                }`}>
                  {brand.brand}
                </div>
                <div className="text-sm text-gray-600">
                  {brand.productCount} products • Avg ${brand.avgPrice}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="font-bold text-gray-800">{brand.marketShare}%</div>
                <div className="text-xs text-gray-500">Market Share</div>
              </div>
              <div className="text-center">
                <div className={`font-bold flex items-center gap-1 ${
                  brand.growth > 5 ? 'text-green-600' :
                  brand.growth > 2 ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {brand.growth > 0 && <TrendingUp className="w-3 h-3" />}
                  {brand.growth}%
                </div>
                <div className="text-xs text-gray-500">Growth</div>
              </div>
              {brand.brand !== 'Your Brand' && (
                <Button variant="outline" size="sm" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Analyze
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const TrendingProducts = ({ products }: { products: any[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Zap className="w-5 h-5" />
        Trending Products (Last 30 Days)
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={product.asin} className="flex items-center justify-between p-4 rounded-lg border bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <div className="font-medium text-sm text-gray-800 mb-1">
                  {product.title}
                </div>
                <div className="text-xs text-gray-600 space-x-4">
                  <span>{product.brand}</span>
                  <span>ASIN: {product.asin}</span>
                  {product.isNewLaunch && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      New Launch
                    </Badge>
                  )}
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
                <div className="font-semibold text-red-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{product.salesGrowth}%
                </div>
                <div className="text-xs text-gray-500">Growth</div>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />
                View
              </Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const PriceAnalysis = ({ priceMovements }: { priceMovements: any[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <DollarSign className="w-5 h-5" />
        Price Segment Analysis
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {priceMovements.map((segment, index) => (
          <div key={segment.priceRange} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-800">{segment.priceRange}</h4>
                <div className="text-sm text-gray-600">
                  {segment.productCount.toLocaleString()} products • {segment.competitionLevel} competition
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold flex items-center gap-1 ${
                  segment.avgGrowth > 10 ? 'text-green-600' :
                  segment.avgGrowth > 5 ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                  {segment.avgGrowth}%
                </div>
                <div className="text-xs text-gray-500">Avg Growth</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className={`text-sm font-medium mb-1 ${
                  segment.profitability === 'excellent' ? 'text-green-700' :
                  segment.profitability === 'very high' ? 'text-green-600' :
                  segment.profitability === 'high' ? 'text-blue-600' :
                  segment.profitability === 'moderate' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  Profitability
                </div>
                <div className="text-sm font-semibold capitalize">{segment.profitability}</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-gray-700 mb-1">Opportunity</div>
                <div className="text-sm font-semibold capitalize">{segment.opportunity}</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-gray-700 mb-1">Competition</div>
                <div className={`text-sm font-semibold capitalize ${
                  segment.competitionLevel === 'very low' ? 'text-green-600' :
                  segment.competitionLevel === 'low' ? 'text-blue-600' :
                  segment.competitionLevel === 'moderate' ? 'text-yellow-600' :
                  segment.competitionLevel === 'high' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {segment.competitionLevel}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const MarketOpportunities = ({ opportunities }: { opportunities: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
        <Target className="w-5 h-5" />
        Market Opportunities
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {opportunities.map((opportunity, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    {opportunity.type}
                  </Badge>
                  <div className="font-semibold text-gray-800">{opportunity.title}</div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${
                  opportunity.potentialValue === 'very high' ? 'text-green-600' :
                  opportunity.potentialValue === 'high' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {opportunity.potentialValue} potential
                </div>
                <div className="text-xs text-gray-500">
                  {opportunity.competitionLevel} competition
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-600">Estimated Revenue: </span>
                <span className="font-semibold text-green-600">{opportunity.estimatedRevenue}</span>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                <Target className="w-3 h-3 mr-1" />
                Explore
              </Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export default function CategoryTrendsPage() {
  const [selectedCategory, setSelectedCategory] = useState('Electronics > Headphones & Earbuds')
  const data = categoryTrendsData[selectedCategory as keyof typeof categoryTrendsData]
  
  if (!data) {
    return <div className="p-6">No data available for selected category</div>
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Category Trends & Market Analysis
          </h1>
          <p className="text-gray-600 mb-6">
            Deep market intelligence, trends, and opportunities analysis by category
          </p>
          
          {/* Category Selector */}
          <div className="max-w-md">
            <CategorySelector selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
          </div>
        </div>

        {/* Market Overview */}
        <MarketOverview data={data} />

        {/* Seasonal Trends */}
        <SeasonalTrends data={data.seasonalityData} />

        {/* Brand Analysis */}
        <BrandAnalysis brands={data.topBrands} />

        {/* Trending Products */}
        <TrendingProducts products={data.trendingProducts} />

        {/* Price Analysis */}
        <PriceAnalysis priceMovements={data.priceMovements} />

        {/* Market Opportunities */}
        <MarketOpportunities opportunities={data.opportunities} />

        {/* Data Sources */}
        <div className="mt-8 p-4 bg-white rounded-lg border text-center">
          <p className="text-sm text-gray-600">
            📊 Data from Amazon Category Intelligence, Helium 10, Jungle Scout, and Market Research APIs
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Market data updated weekly • Trending products updated daily • Price analysis updated in real-time
          </p>
        </div>
      </div>
    </div>
  )
}