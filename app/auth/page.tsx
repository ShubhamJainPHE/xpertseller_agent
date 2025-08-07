"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, RefreshCw, Mail, Lock } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          // User is logged in, redirect to dashboard
          router.replace('/dashboard');
        } else {
          // User is not logged in, show login form
          setIsChecking(false);
          setShowLogin(true);
        }
      } catch (error) {
        // Error checking session, show login form
        setIsChecking(false);
        setShowLogin(true);
      }
    };

    checkSession();
  }, [router]);

  const sendOTP = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ OTP sent successfully');
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email, otpCode: otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('🎉 OTP verification successful, redirecting...');
        // Redirect based on the response redirectTo field
        if (data.redirectTo) {
          router.push(data.redirectTo);
        } else {
          // Default fallback
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Invalid OTP code');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp('');
    setError('');
  };

  // Show loading screen while checking session or login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative text-center max-w-md w-full">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-white mb-2">XpertSeller</h1>
        <p className="text-blue-200 mb-8">AI-Powered Amazon Seller Intelligence</p>

        {isChecking ? (
          <>
            {/* Loading */}
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <p className="text-white text-lg">Checking authentication...</p>
            </div>
          </>
        ) : showLogin ? (
          <>
            {/* Login Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                {step === 'email' ? 'Welcome to XpertSeller' : 'Check your email'}
              </h2>
              <p className="text-blue-200 mb-6">
                {step === 'email' ? 'Enter your email to get started' : `We sent a 6-digit code to ${email}`}
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {step === 'email' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder="Enter your email"
                      disabled={loading}
                      onKeyPress={(e) => e.key === 'Enter' && sendOTP()}
                    />
                  </div>
                  <button
                    onClick={sendOTP}
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-center text-lg tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      disabled={loading}
                      onKeyPress={(e) => e.key === 'Enter' && verifyOTP()}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleBack}
                      disabled={loading}
                      className="flex-1 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      ← Change email
                    </button>
                    <button
                      onClick={verifyOTP}
                      disabled={loading}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Security Notice */}
        <div className="mt-8 text-center text-xs text-blue-300">
          <p>🔒 Secure login powered by enterprise-grade authentication</p>
        </div>
      </div>
    </div>
  );
}