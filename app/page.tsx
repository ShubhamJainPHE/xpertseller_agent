"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, RefreshCw } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          // User is logged in, redirect to home
          router.replace('/home');
        } else {
          // User is not logged in, redirect to login
          router.replace('/auth/login');
        }
      } catch (error) {
        // Error checking session, redirect to login
        router.replace('/auth/login');
      }
    };

    checkSession();
  }, [router]);

  // Show loading screen while checking session
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative text-center">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-white mb-2">XpertSeller</h1>
        <p className="text-blue-200 mb-8">AI-Powered Amazon Seller Intelligence</p>

        {/* Loading */}
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-white text-lg">Checking authentication...</p>
        </div>

        {/* Security Notice */}
        <div className="mt-12 text-center text-xs text-blue-300">
          <p>🔒 Secure login powered by enterprise-grade authentication</p>
        </div>
      </div>
    </div>
  );
}