export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        {/* Main Hero Section */}
        <div className="mb-16 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            About LocalFix Kenya
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            We're revolutionizing how Kenyans connect with local service providers. Our mission is to
            make quality services accessible, affordable, and convenient for everyone.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-lg text-gray-700 mb-4">
            At LocalFix Kenya, we believe that access to reliable, professional services should be
            available to everyone, everywhere. We're building the most trusted platform connecting
            clients with vetted local service providers across Kenya.
          </p>
        </section>

        {/* Vision Section */}
        <section className="mb-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
          <p className="text-lg text-gray-700 mb-4">
            To become Kenya's most trusted marketplace for local services, empowering both clients
            and service providers to achieve their goals through seamless, transparent, and
            secure transactions.
          </p>
        </section>

        {/* Values Section */}
        <section className="mb-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trust & Safety</h3>
              <p className="text-gray-700">
                We verify all service providers and maintain the highest security standards to
                protect our users.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quality</h3>
              <p className="text-gray-700">
                We connect you with the best local professionals in your area, ensuring excellent
                service every time.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transparency</h3>
              <p className="text-gray-700">
                Clear pricing, honest reviews, and transparent communication are at the heart of
                what we do.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-700">
                We're committed to supporting local businesses and building stronger communities
                across Kenya.
              </p>
            </div>
          </div>
        </section>

        {/* Service Coverage */}
        <section className="mb-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Service Coverage</h2>
          <p className="text-lg text-gray-700 mb-6">
            LocalFix Kenya operates in major cities and towns across Kenya, including:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["Nairobi", "Mombasa", "Kisumu", "Eldoret", "Nyeri", "And more..."].map((city) => (
              <div key={city} className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="font-semibold text-gray-900">{city}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 text-white py-12 px-6 rounded-lg max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-6">
            Whether you're looking for services or want to provide them, join the LocalFix Kenya
            community today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100">
              Sign Up Now
            </a>
            <a href="/services" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">
              Browse Services
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
