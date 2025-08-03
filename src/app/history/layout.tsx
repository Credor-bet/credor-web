import { DashboardNav } from '@/components/layout/dashboard-nav'

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <DashboardNav />
      <main className="md:ml-64">
        {children}
      </main>
    </>
  )
} 