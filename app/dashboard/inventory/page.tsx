'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react'

// Mock inventory data from FBA Inventory API
const inventoryData = [
  {
    asin: 'B08XYZ123',
    sku: 'WH-BT-001',
    title: 'Wireless Bluetooth Headphones',
    fnSku: 'X001ABC123',
    totalQuantity: 145,
    inStockQuantity: 132,
    reservedQuantity: 13,
    unfulfillableQuantity: 0,
    dailyVelocity: 4.2,
    daysOfInventory: 31,
    status: 'healthy',
    lastUpdated: '2025-01-29T10:30:00Z',
    trend: 'stable',
    monthlyVelocity: 126
  },
  {
    asin: 'B09ABC456', 
    sku: 'PC-IP-14PM',
    title: 'Phone Case iPhone 14 Pro Max',
    fnSku: 'X002DEF456',
    totalQuantity: 23,
    inStockQuantity: 18,
    reservedQuantity: 5,
    unfulfillableQuantity: 0,
    dailyVelocity: 2.8,
    daysOfInventory: 6,
    status: 'critical',
    lastUpdated: '2025-01-29T10:30:00Z',
    trend: 'declining',
    monthlyVelocity: 84
  },
  {
    asin: 'B07DEF789',
    sku: 'UC-CABLE-6FT', 
    title: 'USB-C Fast Charging Cable 6ft',
    fnSku: 'X003GHI789',
    totalQuantity: 890,
    inStockQuantity: 867,
    reservedQuantity: 23,
    unfulfillableQuantity: 0,
    dailyVelocity: 8.5,
    daysOfInventory: 102,
    status: 'overstocked',
    lastUpdated: '2025-01-29T10:30:00Z',
    trend: 'increasing',
    monthlyVelocity: 255
  },
  {
    asin: 'B06GHI012',
    sku: 'WC-QI-15W',
    title: 'Wireless Charging Pad 15W',
    fnSku: 'X004JKL012',
    totalQuantity: 67,
    inStockQuantity: 61,
    reservedQuantity: 6,
    unfulfillableQuantity: 0,
    dailyVelocity: 3.1,
    daysOfInventory: 20,
    status: 'warning',
    lastUpdated: '2025-01-29T10:30:00Z',
    trend: 'stable',
    monthlyVelocity: 93
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'healthy': return 'bg-green-100 text-green-800 border-green-200'
    case 'overstocked': return 'bg-blue-100 text-blue-800 border-blue-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'critical': return <AlertTriangle className="w-4 h-4" />
    case 'warning': return <Clock className="w-4 h-4" />
    case 'healthy': return <CheckCircle className="w-4 h-4" />
    case 'overstocked': return <Package className="w-4 h-4" />
    default: return <Package className="w-4 h-4" />
  }
}

const InventoryCard = ({ item }: { item: typeof inventoryData[0] }) => {
  const utilizationRate = ((item.totalQuantity - item.inStockQuantity) / item.totalQuantity) * 100
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-2">
              {item.title}
            </h3>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>ASIN: {item.asin}</span>
              <span>SKU: {item.sku}</span>
              <span>FN-SKU: {item.fnSku}</span>
            </div>
          </div>
          <Badge className={getStatusColor(item.status)}>
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize">{item.status}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Inventory Numbers */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{item.inStockQuantity}</div>
            <div className="text-xs text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{item.reservedQuantity}</div>
            <div className="text-xs text-gray-600">Reserved</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-600">{item.totalQuantity}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              item.daysOfInventory <= 7 ? 'text-red-600' :
              item.daysOfInventory <= 21 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {item.daysOfInventory}
            </div>
            <div className="text-xs text-gray-600">Days Left</div>
          </div>
        </div>

        {/* Velocity Analysis */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Sales Velocity</span>
            <div className="flex items-center gap-1 text-xs">
              {item.trend === 'increasing' && <TrendingUp className="w-3 h-3 text-green-500" />}
              {item.trend === 'declining' && <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={
                item.trend === 'increasing' ? 'text-green-600' :
                item.trend === 'declining' ? 'text-red-600' :
                'text-gray-600'
              }>
                {item.trend}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Daily Rate</div>
              <div className="font-semibold">{item.dailyVelocity} units/day</div>
            </div>
            <div>
              <div className="text-gray-600">Monthly Rate</div>
              <div className="font-semibold">{item.monthlyVelocity} units/month</div>
            </div>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Inventory Utilization</span>
            <span className="text-sm font-medium">{utilizationRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${utilizationRate}%` }}
            ></div>
          </div>
        </div>

        {/* Status Message */}
        <div className={`text-xs p-2 rounded ${
          item.status === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' :
          item.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
          item.status === 'healthy' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {item.status === 'critical' && '🚨 Critical: Stock will run out in less than 7 days'}
          {item.status === 'warning' && '⚠️ Warning: Stock getting low, monitor closely'}
          {item.status === 'healthy' && '✅ Healthy: Inventory levels are optimal'}
          {item.status === 'overstocked' && '📦 Overstocked: Consider reducing reorder quantity'}
        </div>
      </CardContent>
    </Card>
  )
}

const InventorySummary = () => {
  const critical = inventoryData.filter(item => item.status === 'critical').length
  const warning = inventoryData.filter(item => item.status === 'warning').length
  const healthy = inventoryData.filter(item => item.status === 'healthy').length
  const overstocked = inventoryData.filter(item => item.status === 'overstocked').length
  
  const totalValue = inventoryData.reduce((sum, item) => sum + (item.inStockQuantity * 15), 0) // Assuming avg $15 value
  const avgDaysLeft = inventoryData.reduce((sum, item) => sum + item.daysOfInventory, 0) / inventoryData.length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{critical}</div>
          <div className="text-sm text-red-700">Critical</div>
          <div className="text-xs text-red-600 mt-1">Need immediate attention</div>
        </CardContent>
      </Card>
      
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{warning}</div>
          <div className="text-sm text-yellow-700">Warning</div>
          <div className="text-xs text-yellow-600 mt-1">Monitor closely</div>
        </CardContent>
      </Card>
      
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{healthy}</div>
          <div className="text-sm text-green-700">Healthy</div>
          <div className="text-xs text-green-600 mt-1">Optimal levels</div>
        </CardContent>
      </Card>
      
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{overstocked}</div>
          <div className="text-sm text-blue-700">Overstocked</div>
          <div className="text-xs text-blue-600 mt-1">Reduce next order</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InventoryDashboard() {
  const [sortBy, setSortBy] = useState('daysOfInventory')
  const [filterStatus, setFilterStatus] = useState('all')
  
  const filteredData = inventoryData
    .filter(item => filterStatus === 'all' || item.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'daysOfInventory') return a.daysOfInventory - b.daysOfInventory
      if (sortBy === 'velocity') return b.dailyVelocity - a.dailyVelocity
      if (sortBy === 'stock') return b.inStockQuantity - a.inStockQuantity
      return 0
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📦 Inventory Intelligence
          </h1>
          <p className="text-gray-600 mb-4">
            Real-time inventory levels and sales velocity from Amazon FBA
          </p>
          
          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warning Only</option>
                <option value="healthy">Healthy Only</option>
                <option value="overstocked">Overstocked Only</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="daysOfInventory">Days Left (Low to High)</option>
                <option value="velocity">Sales Velocity (High to Low)</option>
                <option value="stock">Stock Level (High to Low)</option>
              </select>
            </div>
            
            <div className="ml-auto text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <InventorySummary />

        {/* Key Insights */}
        <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
              💡 Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="font-semibold text-gray-800 mb-1">Fastest Moving</div>
                <div className="text-blue-700">USB-C Cable: 8.5 units/day</div>
                <div className="text-xs text-gray-600">Consider increasing stock levels</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="font-semibold text-gray-800 mb-1">Most Critical</div>
                <div className="text-red-600">Phone Case: 6 days left</div>
                <div className="text-xs text-gray-600">Immediate restocking needed</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="font-semibold text-gray-800 mb-1">Overstocked Item</div>
                <div className="text-blue-600">USB-C Cable: 102 days</div>
                <div className="text-xs text-gray-600">Reduce next order quantity</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredData.map(item => (
            <InventoryCard key={item.asin} item={item} />
          ))}
        </div>

        {/* Data Source Info */}
        <div className="mt-8 p-4 bg-white rounded-lg border text-center">
          <p className="text-sm text-gray-600">
            📊 Data automatically synced from Amazon FBA Inventory API • Updated every 15 minutes
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Velocity calculations based on last 30 days of sales data • Reserves include customer orders and removals in progress
          </p>
        </div>
      </div>
    </div>
  )
}