'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface OnboardingData {
  email: string
  amazonSellerId: string
  marketplaceIds: string[]
  spApiCredentials: {
    clientId: string
    clientSecret: string
    refreshToken: string
  }
  businessContext: {
    businessName: string
    primaryCategory: string
    averageOrderValue: number
    monthlyOrders: number
  }
  preferences: {
    riskTolerance: number
    autoExecuteThreshold: number
    notificationChannels: string[]
    workingHours: { start: string; end: string; timezone: string }
    maxDailySpend: number
    marginFloors: Record<string, number>
  }
  monthlyProfitTarget: number
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    email: '',
    amazonSellerId: '',
    marketplaceIds: ['ATVPDKIKX0DER'], // US marketplace default
    spApiCredentials: {
      clientId: '',
      clientSecret: '',
      refreshToken: ''
    },
    businessContext: {
      businessName: '',
      primaryCategory: '',
      averageOrderValue: 0,
      monthlyOrders: 0
    },
    preferences: {
      riskTolerance: 0.5,
      autoExecuteThreshold: 0.8,
      notificationChannels: ['email', 'dashboard'],
      workingHours: { start: '09:00', end: '18:00', timezone: 'UTC' },
      maxDailySpend: 1000,
      marginFloors: {}
    },
    monthlyProfitTarget: 0
  })

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const updateOnboardingData = (path: string, value: any) => {
    setOnboardingData(prev => {
      const keys = path.split('.')
      const newData = { ...prev }
      let current: any = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!onboardingData.email) newErrors.email = 'Email is required'
        if (!onboardingData.amazonSellerId) newErrors.amazonSellerId = 'Amazon Seller ID is required'
        break
      case 2:
        if (!onboardingData.spApiCredentials.clientId) newErrors.clientId = 'Client ID is required'
        if (!onboardingData.spApiCredentials.clientSecret) newErrors.clientSecret = 'Client Secret is required'
        if (!onboardingData.spApiCredentials.refreshToken) newErrors.refreshToken = 'Refresh Token is required'
        break
      case 3:
        if (!onboardingData.businessContext.businessName) newErrors.businessName = 'Business name is required'
        if (!onboardingData.businessContext.primaryCategory) newErrors.primaryCategory = 'Primary category is required'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      })

      if (response.ok) {
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        const error = await response.json()
        setErrors({ submit: error.message || 'Failed to complete onboarding' })
      }
    } catch (error) {
      setErrors({ submit: 'Failed to complete onboarding' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to XpertSeller</h1>
          <p className="text-gray-600">Let's set up your AI-powered Amazon business assistant</p>
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Account Information'}
              {currentStep === 2 && 'Amazon SP-API Credentials'}
              {currentStep === 3 && 'Business Details'}
              {currentStep === 4 && 'Preferences & Goals'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Basic information about your Amazon seller account'}
              {currentStep === 2 && 'Your SP-API credentials for data access'}
              {currentStep === 3 && 'Tell us about your business'}
              {currentStep === 4 && 'Configure your AI assistant preferences'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Step 1: Account Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={onboardingData.email}
                    onChange={(e) => updateOnboardingData('email', e.target.value)}
                    placeholder="your@email.com"
                  />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="amazonSellerId">Amazon Seller ID</Label>
                  <Input
                    id="amazonSellerId"
                    value={onboardingData.amazonSellerId}
                    onChange={(e) => updateOnboardingData('amazonSellerId', e.target.value)}
                    placeholder="A1XXXXXXXXXX"
                  />
                  {errors.amazonSellerId && <p className="text-sm text-red-600 mt-1">{errors.amazonSellerId}</p>}
                  <p className="text-sm text-gray-500 mt-1">
                    Find this in your Amazon Seller Central under Settings → Account Info
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: SP-API Credentials */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-800">SP-API Setup Required</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        You'll need to register your application in Amazon's Developer Console to get these credentials.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={onboardingData.spApiCredentials.clientId}
                    onChange={(e) => updateOnboardingData('spApiCredentials.clientId', e.target.value)}
                    placeholder="amzn1.application-oa2-client..."
                  />
                  {errors.clientId && <p className="text-sm text-red-600 mt-1">{errors.clientId}</p>}
                </div>

                <div>
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={onboardingData.spApiCredentials.clientSecret}
                    onChange={(e) => updateOnboardingData('spApiCredentials.clientSecret', e.target.value)}
                    placeholder="Client secret from Developer Console"
                  />
                  {errors.clientSecret && <p className="text-sm text-red-600 mt-1">{errors.clientSecret}</p>}
                </div>

                <div>
                  <Label htmlFor="refreshToken">Refresh Token</Label>
                  <Input
                    id="refreshToken"
                    type="password"
                    value={onboardingData.spApiCredentials.refreshToken}
                    onChange={(e) => updateOnboardingData('spApiCredentials.refreshToken', e.target.value)}
                    placeholder="Refresh token from authorization flow"
                  />
                  {errors.refreshToken && <p className="text-sm text-red-600 mt-1">{errors.refreshToken}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Business Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={onboardingData.businessContext.businessName}
                    onChange={(e) => updateOnboardingData('businessContext.businessName', e.target.value)}
                    placeholder="Your business name"
                  />
                  {errors.businessName && <p className="text-sm text-red-600 mt-1">{errors.businessName}</p>}
                </div>

                <div>
                  <Label htmlFor="primaryCategory">Primary Product Category</Label>
                  <Input
                    id="primaryCategory"
                    value={onboardingData.businessContext.primaryCategory}
                    onChange={(e) => updateOnboardingData('businessContext.primaryCategory', e.target.value)}
                    placeholder="e.g., Electronics, Home & Garden, etc."
                  />
                  {errors.primaryCategory && <p className="text-sm text-red-600 mt-1">{errors.primaryCategory}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="averageOrderValue">Average Order Value ($)</Label>
                    <Input
                      id="averageOrderValue"
                      type="number"
                      value={onboardingData.businessContext.averageOrderValue}
                      onChange={(e) => updateOnboardingData('businessContext.averageOrderValue', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="monthlyOrders">Monthly Orders</Label>
                    <Input
                      id="monthlyOrders"
                      type="number"
                      value={onboardingData.businessContext.monthlyOrders}
                      onChange={(e) => updateOnboardingData('businessContext.monthlyOrders', parseInt(e.target.value) || 0)}
                      placeholder="100"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="monthlyProfitTarget">Monthly Profit Target ($)</Label>
                  <Input
                    id="monthlyProfitTarget"
                    type="number"
                    value={onboardingData.monthlyProfitTarget}
                    onChange={(e) => updateOnboardingData('monthlyProfitTarget', parseFloat(e.target.value) || 0)}
                    placeholder="5000"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Preferences */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label>Risk Tolerance</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={onboardingData.preferences.riskTolerance}
                    onChange={(e) => updateOnboardingData('preferences.riskTolerance', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Conservative</span>
                    <span>Moderate</span>
                    <span>Aggressive</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Current: {onboardingData.preferences.riskTolerance === 0 ? 'Conservative' : 
                              onboardingData.preferences.riskTolerance <= 0.5 ? 'Moderate' : 'Aggressive'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxDailySpend">Maximum Daily Spend ($)</Label>
                  <Input
                    id="maxDailySpend"
                    type="number"
                    value={onboardingData.preferences.maxDailySpend}
                    onChange={(e) => updateOnboardingData('preferences.maxDailySpend', parseFloat(e.target.value) || 0)}
                    placeholder="1000"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum amount the AI can spend on automated actions per day
                  </p>
                </div>

                <div>
                  <Label>Auto-Execute Threshold</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={onboardingData.preferences.autoExecuteThreshold}
                    onChange={(e) => updateOnboardingData('preferences.autoExecuteThreshold', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    AI will auto-execute recommendations with {Math.round(onboardingData.preferences.autoExecuteThreshold * 100)}%+ confidence
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workingStart">Working Hours Start</Label>
                    <Input
                      id="workingStart"
                      type="time"
                      value={onboardingData.preferences.workingHours.start}
                      onChange={(e) => updateOnboardingData('preferences.workingHours.start', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="workingEnd">Working Hours End</Label>
                    <Input
                      id="workingEnd"
                      type="time"
                      value={onboardingData.preferences.workingHours.end}
                      onChange={(e) => updateOnboardingData('preferences.workingHours.end', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? 'Setting up...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}