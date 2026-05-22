// src/app/admin/layout.tsx
import AdminSidebarClient from '@/components/Admin/AdminSidebarClient'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: '#f0ede8', fontFamily: 'system-ui, sans-serif' }}>
      <AdminSidebarClient />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 lg:ml-60 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}