'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  DollarSign, 
  Calculator, 
  CheckCircle, 
  AlertTriangle,
  Edit,
  Save,
  Plus,
  TrendingUp,
  ArrowRight,
  PieChart
} from 'lucide-react'

// Mock product data from Amazon SP-API
const mockProducts = [
  {
    asin: 'B08XYZ123',
    title: 'Wireless Bluetooth Headphones - Noise Cancelling',
    sku: 'WH-BT-001',
    currentPrice: 24.99,
    amazonFees: 3.75,
    netRevenue: 21.24,
    monthlySales: 450,
    monthlyRevenue: 11249,
    category: 'Electronics > Headphones',
    image: '/api/placeholder/100/100',
    cogs: null, // User needs to input
    profitSetup: false
  },
  {
    asin: 'B09ABC456',
    title: 'Phone Case Compatible with iPhone 14 Pro Max',
    sku: 'PC-IP-14PM',
    currentPrice: 12.99,
    amazonFees: 1.95,
    netRevenue: 11.04,
    monthlySales: 890,
    monthlyRevenue: 11564,
    category: 'Electronics > Phone Accessories',
    image: '/api/placeholder/100/100',
    cogs: 3.20, // Already set up
    profitSetup: true
  },
  {
    asin: 'B07DEF789',
    title: 'USB-C Fast Charging Cable 6ft (2-Pack)',
    sku: 'UC-CABLE-6FT',
    currentPrice: 15.99,
    amazonFees: 2.40,
    netRevenue: 13.59,
    monthlySales: 320,
    monthlyRevenue: 5117,
    category: 'Electronics > Cables',
    image: '/api/placeholder/100/100',
    cogs: null,
    profitSetup: false
  }
]

interface Product {
  asin: string
  title: string
  sku: string
  currentPrice: number
  amazonFees: number
  netRevenue: number
  monthlySales: number
  monthlyRevenue: number
  category: string
  image: string
  cogs: number | null
  profitSetup: boolean
}

const ProductCard = ({ 
  product, 
  onSaveCOGS 
}: { 
  product: Product
  onSaveCOGS: (asin: string, cogs: number) => void 
}) => {
  const [isEditing, setIsEditing] = useState(!product.profitSetup)
  const [cogsInput, setCogsInput] = useState(product.cogs?.toString() || '')
  
  const handleSave = () => {
    const cogs = parseFloat(cogsInput)
    if (cogs > 0 && cogs < product.netRevenue) {
      onSaveCOGS(product.asin, cogs)
      setIsEditing(false)
    }
  }
  
  const profit = product.cogs ? product.netRevenue - product.cogs : null
  const profitMargin = profit ? (profit / product.currentPrice) * 100 : null
  const monthlyProfit = profit ? profit * product.monthlySales : null

  return (
    <Card className={`transition-all ${
      product.profitSetup 
        ? 'border-green-200 bg-green-50' 
        : 'border-yellow-200 bg-yellow-50'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-gray-800 leading-tight mb-1">
                {product.title}
              </h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>ASIN: {product.asin}</div>
                <div>SKU: {product.sku}</div>
                <div>Category: {product.category}</div>
              </div>
            </div>
          </div>
          <Badge className={product.profitSetup ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
            {product.profitSetup ? 'Complete' : 'Setup Needed'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Amazon Data */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Amazon Data (Auto-filled)
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Selling Price</div>
              <div className="font-semibold">${product.currentPrice}</div>
            </div>
            <div>
              <div className="text-gray-600">Amazon Fees</div>
              <div className="font-semibold text-red-600">-${product.amazonFees}</div>
            </div>
            <div>
              <div className="text-gray-600">Net Revenue</div>
              <div className="font-semibold text-blue-600">${product.netRevenue}</div>
            </div>
            <div>
              <div className="text-gray-600">Monthly Sales</div>
              <div className="font-semibold">{product.monthlySales} units</div>
            </div>
          </div>
        </div>

        {/* COGS Input */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Your Cost Information
          </h4>
          
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  Cost per Unit (COGS) *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="8.50"
                      value={cogsInput}
                      onChange={(e) => setCogsInput(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button 
                    onClick={handleSave}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!cogsInput || parseFloat(cogsInput) <= 0}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                💡 Include: Material cost + Shipping to Amazon + Any other direct costs
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Cost per Unit</div>
                <div className="font-semibold text-lg">${product.cogs}</div>
              </div>
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Profit Calculation */}
        {profit !== null && (
          <div className="bg-green-100 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-sm text-green-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Profit Analysis
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-green-700">Profit per Unit</div>
                <div className="font-bold text-green-800 text-lg">${profit.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-green-700">Profit Margin</div>
                <div className="font-bold text-green-800 text-lg">{profitMargin?.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-green-700">Monthly Profit</div>
                <div className="font-bold text-green-800 text-lg">${monthlyProfit?.toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProductSetupPage() {
  const [products, setProducts] = useState(mockProducts)
  const [setupComplete, setSetupComplete] = useState(0)

  useEffect(() => {
    const completed = products.filter(p => p.profitSetup).length
    setSetupComplete(completed)
  }, [products])

  const handleSaveCOGS = (asin: string, cogs: number) => {
    setProducts(prev => prev.map(p => 
      p.asin === asin 
        ? { ...p, cogs, profitSetup: true }
        : p
    ))
  }

  const totalMonthlyProfit = products
    .filter(p => p.cogs)
    .reduce((sum, p) => sum + ((p.netRevenue - p.cogs!) * p.monthlySales), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💰 Product Profitability Setup
          </h1>
          <p className="text-gray-600 mb-4">
            Add your cost information to unlock accurate profit tracking and insights
          </p>
          
          {/* Progress */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                <span className="text-sm text-gray-600">{setupComplete}/{products.length} products</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${(setupComplete / products.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {setupComplete === products.length && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Estimated Monthly Profit</div>
                <div className="text-2xl font-bold text-green-600">
                  ${totalMonthlyProfit.toFixed(0)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {products.map(product => (
            <ProductCard
              key={product.asin}
              product={product}
              onSaveCOGS={handleSaveCOGS}
            />
          ))}
        </div>

        {/* Next Steps */}
        {setupComplete === products.length && (
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Setup Complete!
                  </h3>
                  <p className="text-green-700 mb-4">
                    All products now have accurate profit tracking. Your dashboard will show real profit data.
                  </p>
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.location.href = '/dashboard/command-center'}
                >
                  View Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">
              💡 How to Calculate Your Cost per Unit (COGS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Include These Costs:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Product manufacturing cost
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Shipping to Amazon warehouse
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Packaging materials
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Quality inspection fees
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Import duties/taxes
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Don't Include:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Amazon fees (already calculated)
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    PPC advertising costs
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Your labor/overhead costs
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Returns/refunds
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}