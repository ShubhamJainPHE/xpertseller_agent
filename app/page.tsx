import DashboardOverview from '@/components/dashboard/DashboardOverview'

export default function HomePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">🤖 XpertSeller Dashboard</h1>
      <DashboardOverview />
    </div>
  )
}