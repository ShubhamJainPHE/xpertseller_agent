'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Download,
  Info
} from 'lucide-react'

interface ChartDataPoint {
  date: string
  value: number
  label: string
  metadata?: {
    orders?: number
    sessions?: number
    conversionRate?: number
  }
}

interface InteractiveChartProps {
  title: string
  data: ChartDataPoint[]
  metric: string
  color?: string
  showTrend?: boolean
  drillDownEnabled?: boolean
  onDrillDown?: (dataPoint: ChartDataPoint) => void
}

export default function InteractiveChart({
  title,
  data,
  metric,
  color = 'blue',
  showTrend = true,
  drillDownEnabled = false,
  onDrillDown
}: InteractiveChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'bar' | 'line' | 'area'>('bar')

  // Calculate chart dimensions
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const valueRange = maxValue - minValue

  // Calculate trend
  const trend = data.length > 1 ? 
    ((data[data.length - 1].value - data[0].value) / data[0].value) * 100 : 0

  const handlePointClick = (point: ChartDataPoint) => {
    setSelectedPoint(point)
    if (drillDownEnabled && onDrillDown) {
      onDrillDown(point)
    }
  }

  const formatValue = (value: number) => {
    if (metric.includes('$')) {
      return `$${value.toLocaleString()}`
    }
    if (metric.includes('%')) {
      return `${value.toFixed(1)}%`
    }
    return value.toLocaleString()
  }

  const getColorClass = (baseColor: string, shade: number = 500) => {
    const colorMap: Record<string, string> = {
      blue: `bg-blue-${shade}`,
      green: `bg-green-${shade}`,
      purple: `bg-purple-${shade}`,
      orange: `bg-orange-${shade}`,
      red: `bg-red-${shade}`
    }
    return colorMap[baseColor] || colorMap.blue
  }

  return (
    <Card className={`transition-all duration-300 ${isExpanded ? 'col-span-2 row-span-2' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {title}
            </CardTitle>
            {showTrend && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-gray-500">vs previous period</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {drillDownEnabled && (
              <Badge variant="secondary" className="text-xs">
                <ZoomIn className="w-3 h-3 mr-1" />
                Click to drill down
              </Badge>
            )}
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'bar' ? 'line' : 'bar')}
                className="h-8 w-8 p-0"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ZoomOut className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Chart Area */}
        <div className="relative">
          <div className={`h-${isExpanded ? '80' : '48'} flex items-end justify-between gap-1 bg-gray-50 rounded-lg p-4`}>
            {data.map((point, index) => {
              const height = valueRange > 0 ? ((point.value - minValue) / valueRange) * 100 : 50
              const isSelected = selectedPoint?.date === point.date
              
              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center cursor-pointer group"
                  onClick={() => handlePointClick(point)}
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 bg-gray-800 text-white text-xs px-2 py-1 rounded z-10">
                    <div className="font-medium">{formatValue(point.value)}</div>
                    <div className="text-gray-300">{point.label}</div>
                    {point.metadata && (
                      <div className="text-gray-300 text-xs mt-1">
                        {point.metadata.orders && `${point.metadata.orders} orders`}
                        {point.metadata.sessions && ` • ${point.metadata.sessions} sessions`}
                      </div>
                    )}
                  </div>
                  
                  {/* Bar */}
                  <div
                    className={`w-full transition-all duration-200 rounded-t ${
                      isSelected 
                        ? `${getColorClass(color, 600)} shadow-lg transform scale-105`
                        : `${getColorClass(color, 400)} group-hover:${getColorClass(color, 500)}`
                    }`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                  ></div>
                  
                  {/* Date Label */}
                  <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-center">
                    {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-12">
            <span>{formatValue(maxValue)}</span>
            <span>{formatValue((maxValue + minValue) / 2)}</span>
            <span>{formatValue(minValue)}</span>
          </div>
        </div>

        {/* Selected Point Details */}
        {selectedPoint && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-800">
                Selected: {selectedPoint.label}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPoint(null)}
                className="h-6 w-6 p-0 text-blue-600"
              >
                ×
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-blue-600 font-medium">{metric}</div>
                <div className="text-blue-800 font-bold">{formatValue(selectedPoint.value)}</div>
              </div>
              
              {selectedPoint.metadata?.orders && (
                <div>
                  <div className="text-blue-600 font-medium">Orders</div>
                  <div className="text-blue-800 font-bold">{selectedPoint.metadata.orders}</div>
                </div>
              )}
              
              {selectedPoint.metadata?.sessions && (
                <div>
                  <div className="text-blue-600 font-medium">Sessions</div>
                  <div className="text-blue-800 font-bold">{selectedPoint.metadata.sessions.toLocaleString()}</div>
                </div>
              )}
              
              {selectedPoint.metadata?.conversionRate && (
                <div>
                  <div className="text-blue-600 font-medium">Conversion</div>
                  <div className="text-blue-800 font-bold">{selectedPoint.metadata.conversionRate.toFixed(1)}%</div>
                </div>
              )}
            </div>
            
            {drillDownEnabled && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onDrillDown?.(selectedPoint)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ZoomIn className="w-3 h-3 mr-1" />
                  Drill Down
                </Button>
                <span className="text-xs text-blue-600">
                  View detailed breakdown for this data point
                </span>
              </div>
            )}
          </div>
        )}

        {/* Chart Statistics */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-500">Average</div>
              <div className="font-semibold text-gray-800">
                {formatValue(data.reduce((sum, d) => sum + d.value, 0) / data.length)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Peak</div>
              <div className="font-semibold text-green-600">{formatValue(maxValue)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Low</div>
              <div className="font-semibold text-red-600">{formatValue(minValue)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}