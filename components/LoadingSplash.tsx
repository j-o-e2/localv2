"use client"

import { useEffect, useState } from "react"
import { MapPin } from "lucide-react"

export default function LoadingSplash() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => setIsVisible(false), 500)
    }

    if (document.readyState === "complete") {
      setIsVisible(false)
    }

    window.addEventListener("load", handleLoad)
    return () => window.removeEventListener("load", handleLoad)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="relative flex flex-col items-center gap-6 px-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="w-40 h-40 text-yellow-200 opacity-20" />
        </div>

        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center gap-2">
            <MapPin className="w-6 h-6 text-yellow-500" />
            <span className="text-3xl font-bold text-gray-900">Local</span>
            <span className="text-3xl font-bold text-yellow-500">Fix</span>
          </div>
          <p className="text-sm text-gray-600 mt-2 tracking-wider">KENYA</p>
        </div>

        <div className="relative z-10 flex gap-2 mt-4">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  )
}
