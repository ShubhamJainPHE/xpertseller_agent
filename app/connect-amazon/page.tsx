"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { useAuth } from '@/lib/hooks/useAuth'

export default function ConnectAmazonPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { user, loading: authLoading } = useAuth()
  
  useEffect(() => {
    setIsCheckingAuth(authLoading)
  }, [authLoading])

  const connectAmazon = async () => {
    setConnecting(true);
    setError('');
    
    try {
      if (!user?.id) {
        throw new Error('User session invalid. Please login again.');
      }
      
      // Call the Amazon connect API with sellerId
      const connectResponse = await fetch('/api/auth/amazon/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ sellerId: user.id })
      });
      
      const connectData = await connectResponse.json();
      
      if (!connectResponse.ok || !connectData.success) {
        throw new Error(connectData.error || 'Failed to initiate Amazon connection');
      }
      
      // Redirect to Amazon OAuth URL
      window.location.href = connectData.authUrl;
      
    } catch (error: any) {
      console.error('Amazon connection failed:', error);
      setError(error.message || 'Failed to initiate Amazon connection. Please try again.');
      setConnecting(false);
    }
  };

  const handleRetry = () => {
    setError('');
    connectAmazon();
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-white text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative text-center max-w-lg w-full">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-white mb-2">XpertSeller</h1>
        <p className="text-blue-200 mb-8">AI-Powered Amazon Seller Intelligence</p>

        {/* Connect Amazon Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.045 18.02c.072-.116.187-.18.32-.18.096 0 .186.036.269.11 6.755 5.193 17.85 5.193 24.606 0 .083-.074.173-.11.269-.11.133 0 .248.064.32.18.096.146.096.31 0 .457-7.4 5.69-19.284 5.69-26.684 0-.096-.147-.096-.31 0-.457zm2.817-2.035c.085-.128.224-.194.375-.194.117 0 .224.043.32.13 4.548 3.51 11.723 3.51 16.272 0 .096-.087.203-.13.32-.13.15 0 .29.066.374.194.117.175.096.39-.043.543-5.088 3.92-13.143 3.92-18.232 0-.138-.154-.16-.368-.043-.543zm3.434-2.392c.096-.147.25-.22.41-.22.134 0 .25.05.354.15 2.735 2.112 7.735 2.112 10.47 0 .104-.1.22-.15.354-.15.16 0 .314.073.41.22.117.196.096.44-.064.616-3.274 2.527-8.59 2.527-11.864 0-.16-.176-.18-.42-.064-.616z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Amazon Account</h2>
            <p className="text-blue-200 leading-relaxed">
              Connect your Amazon Seller Central account to unlock AI-powered insights and automation for your business.
            </p>
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">What we'll access:</p>
                <ul className="space-y-1 text-blue-300">
                  <li>• Product catalog and inventory</li>
                  <li>• Sales performance data</li>
                  <li>• Advertising campaign metrics</li>
                  <li>• Order and fulfillment information</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-200 text-sm font-medium">Connection Failed</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="mt-3 w-full py-2 bg-red-600/20 border border-red-500/30 text-red-200 font-medium rounded-lg hover:bg-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          )}

          <button
            onClick={connectAmazon}
            disabled={connecting}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3"
          >
            {connecting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Connect Amazon Account</span>
                <ExternalLink className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-xs text-blue-300 mt-4 leading-relaxed">
            🔒 This will redirect you to Amazon for secure authorization. Your login credentials are never shared with XpertSeller.
          </p>
        </div>

        {/* Security Notice */}
        <div className="text-center text-xs text-blue-300">
          <p>🔒 Enterprise-grade security • SOC 2 Type II compliant</p>
        </div>
      </div>
    </div>
  );
}