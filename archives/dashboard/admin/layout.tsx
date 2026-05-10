"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Package,
  Star,
  BarChart3,
  AlertCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
} from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    // Check if user is admin (could fetch from session)
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/debug/auth-config")
        const data = await res.json()
        if (data.session.authenticated) {
          setUserRole(data.session.user)
        } else {
          router.push("/login")
        }
      } catch (e) {
        // silent
      }
    }
    checkAuth()

    // Check if browser history has previous entries
    if (typeof window !== "undefined") {
      // Enable back button if there's history (simplified check)
      setCanGoBack(window.history.length > 1)
    }
  }, [router])

  const menuItems = [
    {
      label: "Dashboard",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Users",
      href: "/dashboard/admin/users",
      icon: Users,
    },
    {
      label: "Jobs",
      href: "/dashboard/admin/jobs",
      icon: Briefcase,
    },
    {
      label: "Applications",
      href: "/dashboard/admin/applications",
      icon: FileText,
    },
    {
      label: "Services",
      href: "/dashboard/admin/services",
      icon: Package,
    },
    {
      label: "Reviews & Ratings",
      href: "/dashboard/admin/reviews",
      icon: Star,
    },
    {
      label: "Analytics",
      href: "/dashboard/admin/analytics",
      icon: BarChart3,
    },
    {
      label: "Reports",
      href: "/dashboard/admin/reports",
      icon: AlertCircle,
    },
  ]

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const isActive = (href: string) => pathname === href || (href !== "/dashboard/admin" && pathname.startsWith(href))

  return (
    <div
      className="flex h-screen text-slate-100 relative"
      style={{
        backgroundColor: "#060b17",
        color: "#f8fafc",
        "--background": "#060b17",
        "--foreground": "#f8fafc",
        "--card": "#0f172a",
        "--card-foreground": "#f8fafc",
        "--popover": "#0f172a",
        "--popover-foreground": "#f8fafc",
        "--muted": "#111827",
        "--muted-foreground": "#cbd5e1",
        "--border": "#334155",
        "--input": "#1f2937",
        "--ring": "#38bdf8",
        "--primary": "#38bdf8",
        "--primary-foreground": "#0f172a",
        "--secondary": "#fb923c",
        "--secondary-foreground": "#ffffff",
        "--accent": "#f97316",
        "--accent-foreground": "#ffffff",
        "--destructive": "#ef4444",
        "--destructive-foreground": "#ffffff",
        "--sidebar": "#0f172a",
        "--sidebar-foreground": "#e2e8f0",
        "--sidebar-border": "#334155",
        "--sidebar-primary": "#38bdf8",
        "--sidebar-primary-foreground": "#ffffff",
        "--sidebar-accent": "#f97316",
        "--sidebar-accent-foreground": "#ffffff",
      } as React.CSSProperties}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 md:z-auto h-screen left-0 top-0 w-64 bg-slate-900/95 border-r border-slate-800 shadow-2xl shadow-slate-950/40 transition-all duration-300 flex flex-col overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="h-16 px-4 flex items-center border-b border-slate-800 bg-slate-950/90">
          {sidebarOpen && <h2 className="text-lg font-bold text-cyan-300">Admin</h2>}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors border border-transparent ${
                  active
                    ? "bg-gradient-to-r from-cyan-500/20 to-slate-900 border-cyan-500/30 text-cyan-200"
                    : "text-slate-200 hover:bg-slate-800 hover:text-white"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Bar */}
        <header className="h-16 bg-slate-900/95 border-b border-slate-800 px-6 flex items-center justify-between shadow-sm shadow-slate-950/20">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors border border-slate-700"
              >
                {sidebarOpen ? <X className="w-5 h-5 text-slate-100" /> : <Menu className="w-5 h-5 text-slate-100" />}
              </button>
              {canGoBack && pathname !== "/dashboard/admin" && (
                <button
                  onClick={() => router.back()}
                  className="p-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors ml-2 border border-slate-700"
                  title="Go back"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-100" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-sm text-slate-300 truncate max-w-[10rem]">
                {userRole && `Logged in as: ${userRole}`}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 transition-colors ml-2 border border-rose-500/20"
                title="Logout"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-slate-950">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
