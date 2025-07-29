'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, TrendingUp, Shield, Brain, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
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

        {/* Mock Data Notice */}
        <Card className="border-yellow-200 bg-yellow-50 mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg text-yellow-800">Demo Mode Active</CardTitle>
            </div>
            <CardDescription className="text-yellow-700">
              You're currently using the mock database for testing. Your onboarding data has been logged to the server console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-yellow-700">
              <p>✅ Your seller profile has been created</p>
              <p>✅ AI preferences have been configured</p>
              <p>✅ All three AI agents are ready to work</p>
              <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                <p className="font-medium">Next Steps:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Set up your real Supabase database to persist data</li>
                  <li>• Add your Amazon SP-API credentials for live data</li>
                  <li>• Configure notification channels (email, SMS, WhatsApp)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>View Your Setup</CardTitle>
              <CardDescription>
                Check the server console to see all the data you entered during onboarding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Server Console Logs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ready for Production?</CardTitle>
              <CardDescription>
                Set up your real database and SP-API integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Configure Real Database
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            🎉 Congratulations! XpertSeller is now protecting and optimizing your Amazon business.
          </p>
        </div>
      </div>
    </div>
  )
}