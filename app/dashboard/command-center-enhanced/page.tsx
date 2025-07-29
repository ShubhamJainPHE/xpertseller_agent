'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector'
import RefreshButton from '@/components/dashboard/RefreshButton'
import ProductFilter from '@/components/dashboard/ProductFilter'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Download,
  Eye,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface DashboardData {
  summary: {
    totalRevenue: number
    totalProfit: number
    totalOrders: number
    averageOrderValue: number
    profitMargin: number
    revenueChange: number
    profitChange: number
    ordersChange: number
  }
  products: Array<{
    id: string
    asin: string
    title: string
    category: string
    brand: string
    revenue: number
    profit: number
    units: number
    profitMargin: number
    trend: 'up' | 'down' | 'stable'
  }>
  urgentActions: Array<{
    id: string
    type: 'inventory' | 'pricing' | 'competition' | 'reviews'
    severity: 'critical' | 'high' | 'medium'
    title: string
    description: string
    asin?: string
    impact: number
  }>
}

export default function EnhancedCommandCenter() {
  const [dateRange, setDateRange] = useState('30d')
  const [rangeDays, setRangeDays] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [data, setData] = useState<DashboardData | null>(null)
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data for demonstration
  const mockData: DashboardData = {
    summary: {
      totalRevenue: 15420.50,
      totalProfit: 6234.20,
      totalOrders: 143,
      averageOrderValue: 107.84,
      profitMargin: 40.4,
      revenueChange: 12.5,
      profitChange: 18.3,
      ordersChange: -3.2
    },
    products: [
      {
        id: '1',
        asin: 'B08HEADPHONES',
        title: 'Wireless Bluetooth Headphones - Noise Cancelling',
        category: 'Electronics',
        brand: 'TechSound',
        revenue: 2340.50,
        profit: 945.20,
        units: 94,
        profitMargin: 40.4,
        trend: 'up'
      },
      {
        id: '2',
        asin: 'B08PHONECASE',
        title: 'Phone Case Compatible with iPhone 15 Pro Max',
        category: 'Electronics',
        brand: 'SafeGuard',
        revenue: 1890.30,
        profit: 756.12,
        units: 145,
        profitMargin: 40.0,
        trend: 'up'
      },
      {
        id: '3',
        asin: 'B08USBCABLE',
        title: 'USB-C Fast Charging Cable 6ft (2-Pack)',
        category: 'Electronics',
        brand: 'PowerLink',
        revenue: 987.60,
        profit: 345.66,
        units: 78,
        profitMargin: 35.0,
        trend: 'down'
      }
    ],
    urgentActions: [
      {
        id: '1',
        type: 'inventory',
        severity: 'critical',
        title: 'Low Stock Alert',
        description: 'Wireless Headphones will run out in 3 days',
        asin: 'B08HEADPHONES',
        impact: 1500
      },
      {
        id: '2',
        type: 'pricing',
        severity: 'high',
        title: 'Price Optimization',
        description: 'Competitor undercut by 15% on Phone Case',
        asin: 'B08PHONECASE',
        impact: 400
      },
      {
        id: '3',
        type: 'competition',
        severity: 'medium',
        title: 'New Competitor',
        description: 'New seller launched similar USB cable',
        asin: 'B08USBCABLE',
        impact: 200
      }
    ]
  }

  // Filter options based on data
  const categories = [
    { id: 'electronics', label: 'Electronics', count: 3 },
    { id: 'home', label: 'Home & Kitchen', count: 0 },
    { id: 'sports', label: 'Sports & Outdoors', count: 0 }
  ]

  const brands = [
    { id: 'techsound', label: 'TechSound', count: 1 },
    { id: 'safeguard', label: 'SafeGuard', count: 1 },
    { id: 'powerlink', label: 'PowerLink', count: 1 }
  ]

  useEffect(() => {
    fetchData()
  }, [dateRange, selectedCategories, selectedBrands, searchQuery])

  const fetchData = async () => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Apply filters to mock data
    let filteredProducts = mockData.products
    
    if (selectedCategories.length > 0) {
      filteredProducts = filteredProducts.filter(product => 
        selectedCategories.includes(product.category.toLowerCase())
      )
    }
    
    if (selectedBrands.length > 0) {
      filteredProducts = filteredProducts.filter(product =>
        selectedBrands.includes(product.brand.toLowerCase())
      )
    }
    
    if (searchQuery) {
      filteredProducts = filteredProducts.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.asin.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setData({
      ...mockData,
      products: filteredProducts
    })
    setLastUpdated(new Date())
    setIsLoading(false)
  }

  const handleDateRangeChange = (range: string, days: number) => {
    setDateRange(range)
    setRangeDays(days)
  }

  const handleRefresh = () => {
    fetchData()
  }

  const handleClearFilters = () => {
    setSelectedCategories([])
    setSelectedBrands([])
    setSearchQuery('')
  }

  const handleExport = () => {
    // TODO: Implement PDF export
    console.log('Exporting data...')
  }

  if (!data) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎯 Enhanced Command Center
              </h1>
              <p className="text-gray-600 mt-1">
                Advanced analytics with interactive filters and real-time insights
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleExport}
                className="bg-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              
              <RefreshButton
                onRefresh={handleRefresh}
                isLoading={isLoading}
                lastUpdated={lastUpdated}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <DateRangeSelector
              selectedRange={dateRange}
              onRangeChange={handleDateRangeChange}
              isLoading={isLoading}
            />
            
            <div className="text-sm text-gray-500">
              Analyzing {rangeDays} days of data • {data.products.length} products shown
            </div>
          </div>
        </div>

        {/* Filters */}
        <ProductFilter
          categories={categories}
          brands={brands}
          selectedCategories={selectedCategories}
          selectedBrands={selectedBrands}
          onCategoryChange={setSelectedCategories}
          onBrandChange={setSelectedBrands}
          onClearAll={handleClearFilters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-700 text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ${data.summary.totalRevenue.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {data.summary.revenueChange > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      data.summary.revenueChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(data.summary.revenueChange)}%
                    </span>
                    <span className="text-xs text-gray-600">vs last period</span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-700 text-sm font-medium">Total Profit</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${data.summary.totalProfit.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      {data.summary.profitChange}%
                    </span>
                    <span className="text-xs text-gray-600">vs last period</span>
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-700 text-sm font-medium">Total Orders</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {data.summary.totalOrders.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">
                      {Math.abs(data.summary.ordersChange)}%
                    </span>
                    <span className="text-xs text-gray-600">vs last period</span>
                  </div>
                </div>
                <ShoppingCart className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-700 text-sm font-medium">Profit Margin</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {data.summary.profitMargin}%
                  </p>
                  <div className="text-xs text-orange-600 mt-1">
                    AOV: ${data.summary.averageOrderValue}
                  </div>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Performance
              </div>
              <Badge variant="secondary">
                {data.products.length} products
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{product.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {product.asin}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {product.brand}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>Revenue: <strong className="text-gray-900">${product.revenue.toLocaleString()}</strong></span>
                      <span>Profit: <strong className="text-green-600">${product.profit.toLocaleString()}</strong></span>
                      <span>Units: <strong className="text-gray-900">{product.units}</strong></span>
                      <span>Margin: <strong className="text-blue-600">{product.profitMargin}%</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {product.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : product.trend === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                      )}
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Urgent Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.urgentActions.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    action.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    action.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                    'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{action.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                      {action.asin && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {action.asin}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${action.impact} impact
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        Take Action
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}