// src/app/admin/layout.tsx
import AdminSidebarClient from '@/components/Admin/AdminSidebarClient'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminSidebarClient />
      
      {/* lg:ml-64 creates room for the desktop sidebar.
        pb-24 ensures the mobile bottom nav doesn't overlap the content.
      */}
      <main className="lg:ml-64 pb-24 lg:pb-8 min-h-screen pt-4 px-4 lg:p-10 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}