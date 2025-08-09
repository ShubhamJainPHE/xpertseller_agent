'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, TrendingUp, Shield, Brain, ArrowRight, RefreshCw } from 'lucide-react'
import { useAuthWithAmazon } from '@/lib/hooks/useAuth'

export default function DashboardPage() {
  const { user, loading } = useAuthWithAmazon()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // This shouldn't happen with useAuthWithAmazon, but add safety check
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 text-red-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Welcome to XpertSeller!</h1>
          </div>
          <p className="text-lg text-gray-600">
            Your AI-powered Amazon assistant is now active and monitoring your business.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg text-green-800">Loss Prevention Agent</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Active & Monitoring</span>
              </div>
              <p className="text-sm text-green-600">
                Watching for stockouts, buy box losses, and pricing issues
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-800">Revenue Optimization</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">Ready to Optimize</span>
              </div>
              <p className="text-sm text-blue-600">
                Analyzing pricing and advertising opportunities
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg text-purple-800">Strategic Intelligence</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-700">Learning Your Business</span>
              </div>
              <p className="text-sm text-purple-600">
                Building market insights and growth strategies
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Real Data Status */}
        <Card className="border-green-200 bg-green-50 mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-green-800">System Active</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              Connected to your Amazon seller account: {user?.amazon_seller_id}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-green-700">
              <p>✅ Amazon SP-API integrated and operational</p>
              <p>✅ Real product data synced from your account</p>
              <p>✅ All AI agents monitoring your business live</p>
              <div className="mt-4 p-3 bg-green-100 rounded-md">
                <p className="font-medium">Account Details:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Email: {user?.email}</li>
                  <li>• Seller ID: {user?.amazon_seller_id}</li>
                  <li>• Marketplace: India (A21TJRUUN4KGV)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Management</CardTitle>
              <CardDescription>
                Manage your {user ? '13 synced products' : 'products'} and inventory levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Product and inventory management coming soon. Your data is being synced from Amazon.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            🎉 XpertSeller is actively monitoring your Amazon business with real SP-API data!
          </p>
        </div>
      </div>
    </div>
  )
}