"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Lock, User, Phone, Briefcase, MapPin, ArrowLeft, Eye, EyeOff, ArrowRight, ShieldCheck, Zap, Star } from "lucide-react"

interface FormData {
  name: string
  email: string
  phone: string
  location: string
  password: string
  confirmPassword: string
  role: "worker" | "client"
}

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    location: "",
    password: "",
    confirmPassword: "",
    role: "worker",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [preSelectedRole, setPreSelectedRole] = useState<string | null>(null)

  // Read role from URL query parameter
  useEffect(() => {
    const roleParam = searchParams.get("role")
    if (roleParam === "worker" || roleParam === "client") {
      setFormData(prev => ({ ...prev, role: roleParam }))
      setPreSelectedRole(roleParam)
    }
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "phone") {
      // Strip non-digits and limit to 10 characters (numeric-only phone)
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData(prev => ({ ...prev, phone: digitsOnly }))
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (role: "worker" | "client") => {
    setFormData(prev => ({ ...prev, role }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!agreedToTerms) {
      setError("Please accept the Terms & Conditions to continue")
      return
    }

    // Validate phone: must be exactly 10 digits (no letters)
    if (!/^[0-9]{10}$/.test(formData.phone)) {
      setError("Phone number must be 10 digits (e.g. 0712345678)")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          phone: formData.phone,
          location: formData.location,
          role: formData.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Signup failed")
        setLoading(false)
        return
      }

      console.log("[v0] Signup successful:", data)
      router.push("/signup-success")
    } catch (err) {
      console.error("[v0] Signup error:", err)
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#f8fafc] via-[#fdf6ed] to-[#f6f7fb] relative overflow-hidden">
      {/* Abstract background shapes */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#fff7ed] rounded-full opacity-70 blur-2xl" style={{ zIndex: 0 }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#fef9c3] rounded-full opacity-60 blur-2xl" style={{ zIndex: 0 }} />
      <div className="absolute bottom-10 left-0 w-32 h-32 bg-[#fef3c7] rounded-full opacity-50 blur-xl" style={{ zIndex: 0 }} />

      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#1e3a8a] hover:text-[#0f172a] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
        </div>

        <Card className="p-8 bg-white border-0 shadow-xl" style={{ borderRadius: '28px', boxShadow: '0 8px 32px rgba(251,191,36,0.08), 0 1.5px 8px rgba(16,24,40,0.04)' }}>
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#fde68a] rounded-2xl flex items-center justify-center mb-2">
              <span className="text-white font-bold text-2xl drop-shadow">L</span>
            </div>
            <span className="font-bold text-2xl text-slate-900 tracking-tight">LocalFix Kenya</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">Create Your Account</h1>
          <p className="text-slate-500 text-center mb-6 text-base">Join LocalFix Kenya and get started</p>

          {error && (
            <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selector */}
            <div>
              <div className="flex bg-[#f8fafc] rounded-full p-1 mb-2 border border-[#f3f4f6]">
                {["worker", "client"].map(roleOption => (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => {
                      handleRoleChange(roleOption as "worker" | "client")
                      setPreSelectedRole(null)
                    }}
                    className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:z-10 ${
                      formData.role === roleOption
                        ? "bg-gradient-to-r from-[#fbbf24] to-[#fde68a] text-slate-900 shadow-md"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                    style={formData.role === roleOption ? { boxShadow: '0 2px 8px rgba(251,191,36,0.10)' } : {}}
                  >
                    {roleOption === "worker" ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                    {roleOption === "worker" ? "Worker" : "Client"}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <InputField
              label="Full Name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              icon={<User className="w-5 h-5 text-[#cbd5e1]" />}
            />

            {/* Email */}
            <InputField
              label="Email Address"
              name="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              icon={<Mail className="w-5 h-5 text-[#cbd5e1]" />}
            />

            {/* Phone */}
            <InputField
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="07XX XXX XXX"
              value={formData.phone}
              onChange={handleChange}
              icon={<Phone className="w-5 h-5 text-[#cbd5e1]" />}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]{10}", maxLength: 10 }}
            />

            {/* Location / County */}
            <InputField
              label="Location / County"
              name="location"
              type="text"
              placeholder="e.g., Meru, Nairobi, Kisumu"
              value={formData.location}
              onChange={handleChange}
              icon={<MapPin className="w-5 h-5 text-[#cbd5e1]" />}
            />

            {/* Password */}
            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              icon={<Lock className="w-5 h-5 text-[#cbd5e1]" />}
            />

            {/* Confirm Password */}
            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              icon={<Lock className="w-5 h-5 text-[#cbd5e1]" />}
            />

            <div className="flex items-start gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-[#fbbf24] focus:ring-[#fbbf24] rounded border-gray-300"
                  required
                />
                <span>
                  I agree to the <Link href="/terms" className="text-[#fbbf24] hover:text-[#f59e0b] font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-[#fbbf24] hover:text-[#f59e0b] font-medium">Privacy Policy</Link>
                </span>
              </label>
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] shadow-lg hover:from-[#f59e0b] hover:to-[#fbbf24] transition-all">
              {loading ? "Creating account..." : <><span>Create Account</span> <ArrowRight className="w-5 h-5" /></>}
            </button>

            {/* Social Signup */}
            <div className="flex flex-col gap-2 mt-2">
              <button type="button" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 bg-white text-slate-700 font-medium shadow-sm hover:bg-gray-50 transition-all">
                <img src="/google-icon.svg" alt="Google" className="w-5 h-5" /> Sign up with Google
              </button>
              <button type="button" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-[#1877f3] bg-[#1877f3] text-white font-medium shadow-sm hover:bg-[#145db2] transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg> Sign up with Facebook
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-[#fbbf24] font-medium hover:text-[#f59e0b]">Log in</Link>
          </p>

          {/* Feature highlights */}
          <div className="flex justify-between items-center mt-8 gap-2 text-xs text-slate-500">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-[#fbbf24]" />
              <span>Trusted Professionals</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="w-5 h-5 text-[#fbbf24]" />
              <span>Quick & Reliable</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Star className="w-5 h-5 text-[#fbbf24]" />
              <span>Quality Guaranteed</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            By continuing, notifications may be sent to you.
          </p>
        </Card>
      </div>
    </div>
  )
}

// Reusable InputField component
interface InputFieldProps {
  label: string
  name: string
  type: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: React.ReactNode
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

function InputField({ label, name, type, placeholder, value, onChange, icon, inputProps }: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = name === "password" || name === "confirmPassword"
  const mergedClass = `${icon ? "pl-10" : ""} ${isPassword ? "pr-10" : ""} ${inputProps?.className ?? ""}`.trim()

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-3">{icon}</div>}
        <Input
          type={isPassword && showPassword ? "text" : type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...inputProps}
          className={mergedClass}
          required
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
