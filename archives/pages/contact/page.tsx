import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, MapPin, Phone, Clock } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-[#f97316] flex items-center justify-center text-white font-bold">L</div>
                <div>
                  <p className="font-bold text-lg text-slate-900">LocalFixKenya</p>
                  <p className="text-xs text-slate-500">Find. Book. Relax.</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="h-11 px-4 text-slate-700 border-slate-300">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button className="h-11 bg-[#f97316] hover:bg-[#ea580c] text-white">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900">Contact Us</h1>
          <p className="mt-4 text-lg text-slate-600">Have questions? We'd love to hear from you.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send us a message</h2>
            <form className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <Input placeholder="John" className="h-12 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <Input placeholder="Doe" className="h-12 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <Input type="email" placeholder="john@example.com" className="h-12 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <Input type="tel" placeholder="+254 700 000 000" className="h-12 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <Textarea placeholder="How can we help you?" className="min-h-[150px] rounded-xl" />
              </div>
              <Button className="w-full h-12 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold">
                Send Message
              </Button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-[#1e3a8a]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Our Office</p>
                    <p className="text-slate-600">Nairobi, Kenya</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] flex items-center justify-center">
                    <Phone className="h-6 w-6 text-[#f97316]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Phone</p>
                    <p className="text-slate-600">0741597088</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#eefdf6] flex items-center justify-center">
                    <Mail className="h-6 w-6 text-[#16a34a]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Email</p>
                    <p className="text-slate-600">noreply@localfixkenya.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#fef3c7] flex items-center justify-center">
                    <Clock className="h-6 w-6 text-[#d97706]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Working Hours</p>
                    <p className="text-slate-600">Mon - Sat: 8:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1e3a8a] rounded-3xl p-8 text-white">
              <h3 className="text-xl font-bold mb-4">Become a Partner</h3>
              <p className="text-slate-200 mb-6">
                Interested in joining our network of professionals? Sign up today and start receiving job requests.
              </p>
              <Link href="/signup">
                <Button className="bg-[#f97316] hover:bg-[#ea580c] text-white">
                  Become a Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}