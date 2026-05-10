"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function ServicesPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // User is logged in, redirect to dashboard
          router.replace('/dashboard/client')
        } else {
          // User not logged in, redirect to login
          router.replace('/auth/login')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        // Fallback to login
        router.replace('/auth/login')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
