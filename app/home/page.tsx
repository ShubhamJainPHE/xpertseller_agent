"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingBag, 
  TrendingUp, 
  Shield, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
  BarChart3,
  Users,
  DollarSign,
  Settings,
  Bell,
  LogOut,
  Package,
  Search,
  Database
} from "lucide-react";

interface SellerInfo {
  name: string;
  businessName: string;
  geography: string;
  phoneNumber: string;
  email: string;
}

export default function HomePage() {
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [connectionTime, setConnectionTime] = useState<Date | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Load seller info from localStorage
    const storedInfo = localStorage.getItem('sellerInfo');
    const sellerId = localStorage.getItem('sellerId');
    
    if (storedInfo) {
      setSellerInfo(JSON.parse(storedInfo));
    }

    // Load connection status from database if we have a seller ID
    const loadConnectionStatus = async () => {
      if (sellerId) {
        try {
          const response = await fetch(`/api/sellers/${sellerId}/amazon-connection`);
          const data = await response.json();
          
          if (data.success) {
            setConnectionStatus(data.amazonConnected ? 'connected' : 'disconnected');
            if (data.connectionTime) {
              setConnectionTime(new Date(data.connectionTime));
            }
          }
        } catch (error) {
          console.error('Failed to load connection status:', error);
        }
      }
    };

    // Check URL parameters for OAuth callback status
    const urlParams = new URLSearchParams(window.location.search);
    const connectionParam = urlParams.get('connection');

    if (connectionParam === 'success') {
      const now = new Date();
      setConnectionStatus('connected');
      setConnectionTime(now);
      
      // Update database
      if (sellerId) {
        updateDatabaseConnectionStatus('connected', now);
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/home');
    } else if (connectionParam === 'failed') {
      setConnectionStatus('failed');
      
      // Update database
      if (sellerId) {
        updateDatabaseConnectionStatus('failed', null);
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/home');
    } else {
      // Load from database
      loadConnectionStatus();
    }
  }, []);

  const updateDatabaseConnectionStatus = async (status: string, connectionTime: Date | null) => {
    const sellerId = localStorage.getItem('sellerId');
    if (!sellerId) return;

    try {
      await fetch(`/api/sellers/${sellerId}/amazon-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          connectionTime: connectionTime?.toISOString()
        }),
      });
    } catch (error) {
      console.error('Failed to update connection status:', error);
    }
  };

  const handleConnectAmazon = async () => {
    setConnectionStatus('connecting');
    
    try {
      // Call our API to get the OAuth URL
      const response = await fetch('/api/auth/amazon/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Store the state for validation
        localStorage.setItem('oauthState', data.state);
        
        // Redirect to Amazon OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to initiate OAuth flow');
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('failed');
      localStorage.setItem('amazonConnectionStatus', 'failed');
    }
  };

  const handleRetryConnection = async () => {
    setConnectionStatus('disconnected');
    
    // Update database
    const sellerId = localStorage.getItem('sellerId');
    if (sellerId) {
      await updateDatabaseConnectionStatus('disconnected', null);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Clear local storage
      localStorage.removeItem('sellerId');
      localStorage.removeItem('sellerInfo');
      localStorage.removeItem('oauthState');
      
      // Redirect to login page
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if API call fails
      window.location.href = '/auth/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getTimeUntilRefresh = () => {
    if (!connectionTime) return null;
    
    const refreshTime = new Date(connectionTime.getTime() + 60 * 60 * 1000); // 60 minutes later
    const now = new Date();
    const timeDiff = refreshTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) return "Ready to refresh!";
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    return `${minutes} minutes remaining`;
  };

  if (!sellerInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <p className="text-white text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>
      
      <div className="relative">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">XpertSeller</h1>
                  <p className="text-sm text-blue-200">{sellerInfo.businessName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/dashboard/command-center'}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Command Center
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/dashboard/command-center-enhanced'}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Enhanced Center
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/dashboard/product-setup'}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Profit Setup
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/dashboard/inventory'}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Inventory
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/dashboard/performance'}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Performance
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/dashboard/asin-analysis'}
                >
                  <Search className="w-4 h-4 mr-2" />
                  ASIN Analysis
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/dashboard/category-trends'}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Category Trends
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Bell className="w-4 h-4 mr-2" />
                  Alerts
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/admin/seed-data'}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Seed Data
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-300 hover:bg-red-500/20 hover:text-red-200"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  title="Logout"
                >
                  {isLoggingOut ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome back, {sellerInfo.name}! 👋
            </h2>
            <p className="text-blue-200 text-lg">
              Ready to optimize your Amazon business in {sellerInfo.geography}?
            </p>
          </div>

          {/* Connection Status - Main Feature */}
          <Card className="mb-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardContent className="p-8">
              {connectionStatus === 'disconnected' && (
                <div className="text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Connect Your Amazon Seller Central
                  </h3>
                  <p className="text-blue-100 mb-8 text-lg leading-relaxed">
                    To unlock AI-powered insights, revenue optimization, and loss prevention for your business, 
                    we need to securely connect to your Amazon Seller Central account.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <BarChart3 className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">Real-time Analytics</h4>
                      <p className="text-blue-200 text-sm">Monitor sales, inventory, and performance metrics</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-6 h-6 text-purple-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">Automated Actions</h4>
                      <p className="text-blue-200 text-sm">AI takes action to optimize your listings</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-green-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">Profit Maximization</h4>
                      <p className="text-blue-200 text-sm">Smart pricing and advertising strategies</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleConnectAmazon}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Connect Amazon Account Securely
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  <p className="text-xs text-blue-300 mt-4">
                    🔒 Your data is encrypted and secure. We only access what's needed for optimization.
                  </p>
                </div>
              )}

              {connectionStatus === 'connecting' && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Connecting to Amazon Seller Central
                  </h3>
                  <p className="text-blue-100 mb-4">
                    Please complete the authorization on Amazon's secure login page...
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-blue-300">
                    <Clock className="w-4 h-4" />
                    <span>This usually takes 30-60 seconds</span>
                  </div>
                </div>
              )}

              {connectionStatus === 'connected' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    🎉 Successfully Connected!
                  </h3>
                  <p className="text-green-100 mb-6 text-lg">
                    Your Amazon Seller Central account is now connected. Our AI agents are analyzing your business data.
                  </p>
                  
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-6 border border-green-500/30 max-w-md mx-auto">
                    <div className="flex items-center justify-center mb-4">
                      <Clock className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-white font-semibold">Setup in Progress</span>
                    </div>
                    <p className="text-green-100 mb-3">
                      Time remaining: <span className="font-semibold">{getTimeUntilRefresh()}</span>
                    </p>
                    <p className="text-sm text-green-200">
                      We're analyzing your products, market trends, and competitor data to provide personalized recommendations.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="mt-6 border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>
                </div>
              )}

              {connectionStatus === 'failed' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Connection Failed
                  </h3>
                  <p className="text-red-100 mb-6">
                    We couldn't connect to your Amazon Seller Central account. This could be due to:
                  </p>
                  
                  <div className="bg-red-500/20 rounded-lg p-6 border border-red-500/30 max-w-md mx-auto mb-6">
                    <ul className="text-sm text-red-200 space-y-2 text-left">
                      <li>• Authorization was cancelled or timed out</li>
                      <li>• Network connectivity issues</li>
                      <li>• Amazon service temporarily unavailable</li>
                      <li>• Account permissions need adjustment</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={handleRetryConnection}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      Start Over
                    </Button>
                    <Button 
                      onClick={handleConnectAmazon}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Preview - Only show when not connected */}
          {connectionStatus !== 'connected' && (
            <div>
              <h3 className="text-xl font-bold text-white mb-6">What You'll Get After Connecting</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="text-white font-semibold mb-2">Loss Prevention</h4>
                    <p className="text-blue-200 text-sm mb-4">
                      AI monitoring for stockouts, buy box losses, and pricing issues with instant alerts.
                    </p>
                    <div className="text-xs text-blue-300 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Available after connection
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                    </div>
                    <h4 className="text-white font-semibold mb-2">Revenue Optimization</h4>
                    <p className="text-blue-200 text-sm mb-4">
                      Smart pricing and advertising recommendations to maximize your profits.
                    </p>
                    <div className="text-xs text-blue-300 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Available after connection
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                      <BarChart3 className="w-6 h-6 text-green-400" />
                    </div>
                    <h4 className="text-white font-semibold mb-2">Strategic Intelligence</h4>
                    <p className="text-blue-200 text-sm mb-4">
                      Market insights and growth opportunities powered by AI analysis.
                    </p>
                    <div className="text-xs text-blue-300 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Available after connection
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Stats Footer */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-white">10k+</div>
                <div className="text-sm text-blue-200">Active Sellers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">$50M+</div>
                <div className="text-sm text-blue-200">Revenue Optimized</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-blue-200">AI Monitoring</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-sm text-blue-200">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}