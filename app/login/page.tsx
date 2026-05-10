"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Lock, Chrome, Facebook, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      console.log("[v0] Login successful:", data)

      const authUser = data?.user ?? data?.session?.user

      if (!authUser) {
        console.warn("No authenticated user returned after sign in")
        setLoading(false)
        router.push("/dashboard")
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle()

      let resolvedRole: string | undefined = undefined

      if (profileError) {
        const makePrintable = (err: any) => {
          if (!err) return "Unknown error"
          if (typeof err === "string") return err
          if (err.message) return err.message
          try {
            const names = Object.getOwnPropertyNames(err)
            const data: Record<string, any> = {}
            names.forEach((n) => (data[n] = err[n]))
            return JSON.stringify(data)
          } catch (e) {
            return String(err)
          }
        }

        console.error("Error fetching profile:", makePrintable(profileError), profileError)

        try {
          const {
            data: { user: freshUser },
          } = await supabase.auth.getUser()
          if (freshUser) {
            const { data: secondTryData, error: secondTryError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", freshUser.id)
              .maybeSingle()

            if (!secondTryError && secondTryData) {
              console.log("User profile data (second try):", secondTryData)
              resolvedRole = secondTryData.role
            } else if (secondTryError) {
              console.warn("Second attempt to fetch profile failed:", makePrintable(secondTryError))
            }
          }
        } catch (e) {
          console.warn("Profile fallback attempt failed:", e)
        }

        if (!resolvedRole) {
          try {
            const resp = await fetch('/api/admin/profile', { credentials: 'include' })
            if (resp.ok) {
              const body = await resp.json()
              const role = body?.data?.role
              if (role) resolvedRole = role
            } else {
              console.warn('[v0] server-side profile fallback failed', await resp.text())
            }
          } catch (e) {
            console.warn('[v0] server-side profile fallback error', e)
          }
        }
      } else {
        console.log("User profile data:", profileData)
        resolvedRole = profileData?.role
      }

      setLoading(false)
      if (!resolvedRole) {
        router.push("/dashboard")
        return
      }
      if (resolvedRole === "client") {
        router.push("/dashboard/client")
      } else if (resolvedRole === "admin") {
        router.push("/dashboard/admin")
      } else {
        router.push("/dashboard/worker")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("[v0] Login error:", err)
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center px-4 pt-24 overflow-hidden bg-[#f8f8ff]">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-[#1e3a8a]">LocalFix Kenya</Link>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <Link href="/signup" className="hover:text-slate-900">Sign Up</Link>
            <Link href="/contact" className="hover:text-slate-900">Contact</Link>
          </div>
        </div>
      </header>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none">
        {/* Decorative background dots/circles can be added here if desired */}
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-2">
            {/* Logo icon, replace with your SVG or image if available */}
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-md border border-primary/20">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="18" fill="#fff"/>
                <path d="M18 8l2.5 2.5-7 7 2.5 2.5 7-7L28 18l-10 10-8-8 10-10z" fill="#FFB800"/>
                <circle cx="18" cy="18" r="17" stroke="#FFB800" strokeWidth="2"/>
              </svg>
            </span>
          </div>
          <div className="text-center">
            <span className="block text-lg font-bold text-[#222]">Local<span className="text-[#FFB800]">Fix</span></span>
            <span className="block text-xs tracking-widest text-[#222] font-semibold">KENYA</span>
          </div>
        </div>
        <Card className="p-8 bg-white/90 backdrop-blur-sm border border-primary/20 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your LocalFix Kenya account</p>
            <div className="w-10 h-1 mx-auto mt-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
          </div>
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-input/50 border-primary/30 focus:border-primary focus:ring-primary transition-all duration-300"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-input/50 border-primary/30 focus:border-primary focus:ring-primary transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="form-checkbox text-primary focus:ring-primary"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-primary hover:text-primary/80 text-sm font-medium">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transform transition-transform hover:scale-105" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">or continue with</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="flex items-center justify-center gap-2 w-full text-foreground hover:bg-primary/10 border-primary/30">
                <Chrome className="w-5 h-5" />
                Continue with Google
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2 w-full text-foreground hover:bg-primary/10 border-primary/30">
                <Facebook className="w-5 h-5" />
                Continue with Facebook
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              By continuing you accept the <Link href="/terms" className="text-primary hover:text-primary/80 font-medium">Terms &amp; Conditions</Link>.
            </p>
          </form>
          <div className="mt-6 space-y-4 text-center">
            <p className="text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:text-primary/80 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
        <div className="mt-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#f3f3fa] border border-primary/10">
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#fff"/><path d="M8 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6c-2.21 0-4 1.12-4 2.5V13h8v-.5C12 11.12 10.21 10 8 10z" fill="#7c3aed"/></svg>
            </span>
            <span>Your data is safe with us.</span>
          </div>
          <span>We never share your information.</span>
          <span>By continuing, notifications may be sent to you.</span>
        </div>
      </div>
    </div>
  )
}