"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

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
          // User is logged in, redirect to dashboard
          router.replace('/dashboard');
        } else {
          // User is not logged in, redirect to auth page
          router.replace('/auth');
        }
      } catch (error) {
        // Error checking session, redirect to auth page
        router.replace('/auth');
      }
    };

    checkSession();
  }, [router]);

  // Show loading screen while checking session
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="flex items-center justify-center space-x-3">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        <p className="text-white text-lg">Redirecting...</p>
      </div>
    </div>
  );
}