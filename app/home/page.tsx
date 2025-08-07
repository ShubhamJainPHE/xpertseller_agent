'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard - /home is deprecated in the new flow
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="flex items-center justify-center space-x-3">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        <p className="text-gray-600 text-lg">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}