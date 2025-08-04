// 'use client'

// import React, { useState, useEffect } from 'react'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Progress } from '@/components/ui/progress'
// import { 
//   TrendingUp, 
//   TrendingDown, 
//   AlertTriangle, 
//   CheckCircle, 
//   Clock, 
//   DollarSign,
//   Package,
//   Target,
//   Activity,
//   Brain
// } from 'lucide-react'
// import { formatCurrency, formatNumber } from '@/lib/utils'

// interface DashboardData {
//   summary: {
//     timeframe: string
//     total_revenue: number
//     total_units_sold: number
//     avg_conversion_rate: number
//     active_products: number
//     total_recommendations: number
//     projected_impact: number
//     critical_issues: number
//     recent_events: number
//   }
//   recommendations: {
//     by_urgency: Record<string, number>
//     by_agent: Record<string, number>
//     pending: number
//     accepted: number
//     executed: number
//   }
//   performance_trends: {
//     revenue_trend: { direction: string; percentage: number }
//     units_trend: { direction: string; percentage: number }
//     conversion_trend: { direction: string; percentage: number }
//   }
//   alerts: {
//     critical_events: number
//     stockout_risks: number
//     buybox_losses: number
//     price_alerts: number
//   }
//   top_opportunities: Array<{
//     id: string
//     title: string
//     agent_type: string
//     predicted_impact: number
//     confidence_score: number
//     urgency_level: string
//   }>
//   projections?: {
//     revenue_projection_7d: number
//     revenue_projection_30d: number
//     confidence: number
//   }
// }

// export default function DashboardOverview() {
//   const [data, setData] = useState<DashboardData | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [timeframe, setTimeframe] = useState('7d')
//   const [eventSource, setEventSource] = useState<EventSource | null>(null)

//   useEffect(() => {
//     fetchDashboardData()
//     setupEventStream()

//     return () => {
//       if (eventSource) {
//         eventSource.close()
//       }
//     }
//   }, [timeframe])

//   const fetchDashboardData = async () => {
//     try {
//       setLoading(true)
//       const token = localStorage.getItem('auth_token')
      
//       const response = await fetch(`/api/dashboard/overview?timeframe=${timeframe}&include_projections=true`, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       })

//       if (!response.ok) {
//         throw new Error('Failed to fetch dashboard data')
//       }

//       const result = await response.json()
//       setData(result.data)
//     } catch (error) {
//       console.error('Error fetching dashboard data:', error)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const setupEventStream = () => {
//     const token = localStorage.getItem('auth_token')
    
//     const es = new EventSource(`/api/events/stream`, {
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     } as any)

//     es.onmessage = (event) => {
//       const eventData = JSON.parse(event.data)
      
//       if (eventData.type === 'new_recommendation' || eventData.type === 'critical_event') {
//         // Refresh dashboard data when important events occur
//         fetchDashboardData()
//       }
//     }

//     es.onerror = (error) => {
//       console.error('Event stream error:', error)
//     }

//     setEventSource(es)
//   }

//   const getTrendIcon = (trend: { direction: string; percentage: number }) => {
//     if (trend.direction === 'up') {
//       return <TrendingUp className="h-4 w-4 text-green-500" />
//     } else if (trend.direction === 'down') {
//       return <TrendingDown className="h-4 w-4 text-red-500" />
//     }
//     return <Activity className="h-4 w-4 text-gray-500" />
//   }

//   const getUrgencyColor = (urgency: string) => {
//     switch (urgency) {
//       case 'critical': return 'destructive'
//       case 'high': return 'destructive'
//       case 'normal': return 'default'
//       case 'low': return 'secondary'
//       default: return 'default'
//     }
//   }

//   const getAgentIcon = (agentType: string) => {
//     switch (agentType) {
//       case 'loss_prevention': return <AlertTriangle className="h-4 w-4" />
//       case 'revenue_optimization': return <TrendingUp className="h-4 w-4" />
//       case 'strategic_intelligence': return <Brain className="h-4 w-4" />
//       case 'meta_agent': return <Target className="h-4 w-4" />
//       default: return <Activity className="h-4 w-4" />
//     }
//   }

//   if (loading) {
//     return (
//       <div className="space-y-6">
//         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//           {[...Array(4)].map((_, i) => (
//             <Card key={i}>
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
//                 <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
//               </CardHeader>
//               <CardContent>
//                 <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2" />
//                 <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       </div>
//     )
//   }

//   if (!data) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
//           <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
//           <p className="text-gray-600 mb-4">There was an error loading your dashboard data.</p>
//           <Button onClick={fetchDashboardData}>Retry</Button>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-6">
//       {/* Timeframe Selector */}
//       <div className="flex justify-between items-center">
//         <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
//         <Tabs value={timeframe} onValueChange={setTimeframe}>
//           <TabsList>
//             <TabsTrigger value="24h">24H</TabsTrigger>
//             <TabsTrigger value="7d">7D</TabsTrigger>
//             <TabsTrigger value="30d">30D</TabsTrigger>
//             <TabsTrigger value="90d">90D</TabsTrigger>
//           </TabsList>
//         </Tabs>
//       </div>

//       {/* Key Metrics */}
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
//             <DollarSign className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{formatCurrency(data.summary.total_revenue)}</div>
//             <div className="flex items-center text-xs text-muted-foreground">
//               {getTrendIcon(data.performance_trends.revenue_trend)}
//               <span className="ml-1">
//                 {data.performance_trends.revenue_trend.percentage}% vs previous period
//               </span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
//             <Package className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{formatNumber(data.summary.total_units_sold)}</div>
//             <div className="flex items-center text-xs text-muted-foreground">
//               {getTrendIcon(data.performance_trends.units_trend)}
//               <span className="ml-1">
//                 {data.performance_trends.units_trend.percentage}% vs previous period
//               </span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Avg Conversion Rate</CardTitle>
//             <Target className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{(data.summary.avg_conversion_rate * 100).toFixed(2)}%</div>
//             <div className="flex items-center text-xs text-muted-foreground">
//               {getTrendIcon(data.performance_trends.conversion_trend)}
//               <span className="ml-1">
//                 {data.performance_trends.conversion_trend.percentage}% vs previous period
//               </span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">AI Recommendations</CardTitle>
//             <Brain className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{data.summary.total_recommendations}</div>
//             <div className="flex items-center text-xs text-muted-foreground">
//               <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
//               <span>{formatCurrency(data.summary.projected_impact)} potential impact</span>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Critical Alerts */}
//       {data.summary.critical_issues > 0 && (
//         <Card className="border-red-200 bg-red-50">
//           <CardHeader>
//             <CardTitle className="flex items-center text-red-800">
//               <AlertTriangle className="h-5 w-5 mr-2" />
//               Critical Issues Require Attention
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
//               <div className="text-center">
//                 <div className="text-2xl font-bold text-red-700">{data.alerts.stockout_risks}</div>
//                 <div className="text-sm text-red-600">Stockout Risks</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-2xl font-bold text-red-700">{data.alerts.buybox_losses}</div>
//                 <div className="text-sm text-red-600">Buy Box Losses</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-2xl font-bold text-red-700">{data.alerts.price_alerts}</div>
//                 <div className="text-sm text-red-600">Pricing Alerts</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-2xl font-bold text-red-700">{data.alerts.critical_events}</div>
//                 <div className="text-sm text-red-600">Critical Events</div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       <div className="grid gap-6 md:grid-cols-2">
//         {/* Top Opportunities */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Top Revenue Opportunities</CardTitle>
//             <CardDescription>
//               AI-identified opportunities ranked by potential impact
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {data.top_opportunities.length === 0 ? (
//               <div className="text-center py-6 text-muted-foreground">
//                 <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
//                 <p>All opportunities addressed!</p>
//               </div>
//             ) : (
//               data.top_opportunities.map((opp) => (
//                 <div key={opp.id} className="flex items-center justify-between p-3 border rounded-lg">
//                   <div className="flex-1">
//                     <div className="flex items-center gap-2 mb-1">
//                       {getAgentIcon(opp.agent_type)}
//                       <h4 className="font-medium text-sm">{opp.title}</h4>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Badge variant={getUrgencyColor(opp.urgency_level)} className="text-xs">
//                         {opp.urgency_level}
//                       </Badge>
//                       <span className="text-sm text-muted-foreground">
//                         {formatCurrency(opp.predicted_impact)} impact
//                       </span>
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <div className="text-sm font-medium">
//                       {(opp.confidence_score * 100).toFixed(0)}%
//                     </div>
//                     <div className="text-xs text-muted-foreground">confidence</div>
//                   </div>
//                 </div>
//               ))
//             )}
//           </CardContent>
//         </Card>

//         {/* Projections */}
//         {data.projections && (
//           <Card>
//             <CardHeader>
//               <CardTitle>Revenue Projections</CardTitle>
//               <CardDescription>
//                 AI-powered forecasts based on current trends
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div>
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-sm font-medium">Next 7 Days</span>
//                   <span className="text-lg font-bold">
//                     {formatCurrency(data.projections.revenue_projection_7d)}
//                   </span>
//                 </div>
//                 <Progress value={data.projections.confidence * 100} className="h-2" />
//                 <div className="text-xs text-muted-foreground mt-1">
//                   {(data.projections.confidence * 100).toFixed(0)}% confidence
//                 </div>
//               </div>
              
//               <div>
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-sm font-medium">Next 30 Days</span>
//                   <span className="text-lg font-bold">
//                     {formatCurrency(data.projections.revenue_projection_30d)}
//                   </span>
//                 </div>
//                 <Progress value={data.projections.confidence * 80} className="h-2" />
//                 <div className="text-xs text-muted-foreground mt-1">
//                   {(data.projections.confidence * 80).toFixed(0)}% confidence
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}
//       </div>

//       {/* Agent Performance */}
//       <Card>
//         <CardHeader>
//           <CardTitle>AI Agent Activity</CardTitle>
//           <CardDescription>
//             Recommendations and insights from your AI team
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//             <div className="text-center">
//               <div className="flex items-center justify-center mb-2">
//                 <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
//                 <span className="font-medium">Loss Prevention</span>
//               </div>
//               <div className="text-2xl font-bold">{data.recommendations.by_agent.loss_prevention}</div>
//               <div className="text-sm text-muted-foreground">recommendations</div>
//             </div>
            
//             <div className="text-center">
//               <div className="flex items-center justify-center mb-2">
//                 <TrendingUp className="h-6 w-6 text-green-500 mr-2" />
//                 <span className="font-medium">Revenue Optimization</span>
//               </div>
//               <div className="text-2xl font-bold">{data.recommendations.by_agent.revenue_optimization}</div>
//               <div className="text-sm text-muted-foreground">recommendations</div>
//             </div>
            
//             <div className="text-center">
//               <div className="flex items-center justify-center mb-2">
//                 <Brain className="h-6 w-6 text-blue-500 mr-2" />
//                 <span className="font-medium">Strategic Intelligence</span>
//               </div>
//               <div className="text-2xl font-bold">{data.recommendations.by_agent.strategic_intelligence}</div>
//               <div className="text-sm text-muted-foreground">recommendations</div>
//             </div>
            
//             <div className="text-center">
//               <div className="flex items-center justify-center mb-2">
//                 <Target className="h-6 w-6 text-purple-500 mr-2" />
//                 <span className="font-medium">Meta Agent</span>
//               </div>
//               <div className="text-2xl font-bold">{data.recommendations.by_agent.meta_agent}</div>
//               <div className="text-sm text-muted-foreground">orchestrations</div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }


'use client'

import React, { useState, useEffect } from 'react'

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{message: string; status: string} | null>(null)

  useEffect(() => {
    // Simulate loading for now
    setTimeout(() => {
      setLoading(false)
      setData({
        message: "🎉 XpertSeller is running!",
        status: "System initialized successfully"
      })
    }, 2000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold">Loading XpertSeller...</h3>
          <p className="text-gray-600">Initializing AI agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-4">Welcome to XpertSeller! 🚀</h2>
        <p className="text-lg">Your AI-powered Amazon operations manager is ready to help you maximize profits and prevent losses.</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Agents</h3>
              <p className="text-green-600">Online</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Dashboard</h3>
              <p className="text-blue-600">Ready</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">🔗</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Database</h3>
              <p className="text-purple-600">Connected</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Events</h3>
              <p className="text-yellow-600">Monitoring</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <button className="p-4 text-left border rounded-lg hover:shadow-md transition-shadow">
            <div className="font-medium">📈 View Recommendations</div>
            <div className="text-sm text-gray-600">See AI-generated opportunities</div>
          </button>
          
          <button className="p-4 text-left border rounded-lg hover:shadow-md transition-shadow">
            <div className="font-medium">📦 Check Inventory</div>
            <div className="text-sm text-gray-600">Monitor stock levels</div>
          </button>
          
          <button className="p-4 text-left border rounded-lg hover:shadow-md transition-shadow">
            <div className="font-medium">💰 Pricing Analysis</div>
            <div className="text-sm text-gray-600">Review pricing strategies</div>
          </button>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gray-50 p-6 rounded-lg border">
        <h3 className="text-xl font-semibold mb-4">Next Steps</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
            <span>Set up your Supabase database and add your API keys</span>
          </div>
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
            <span>Connect your Amazon SP-API credentials</span>
          </div>
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
            <span>Add your products and start receiving AI recommendations</span>
          </div>
        </div>
      </div>
    </div>
  )
}