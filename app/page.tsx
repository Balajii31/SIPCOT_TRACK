import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #003366 0%, #004d99 60%, #002244 100%)' }}>
      {/* Header Bar */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 px-8 py-3 flex items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 relative rounded-full bg-white p-1 shadow-lg flex-none">
            <Image
              src="/tn_emblem.png"
              alt="Government of Tamil Nadu Emblem"
              width={56}
              height={56}
              className="rounded-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-white/70 text-xs font-medium tracking-widest uppercase">Government of Tamil Nadu</p>
            <h1 className="text-white font-extrabold text-xl leading-tight tracking-wide">SIPCOT TRACK</h1>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Large Emblem */}
        <div className="mb-8 relative">
          <div className="w-28 h-28 rounded-full bg-white p-2 shadow-2xl mx-auto ring-4 ring-[#FF9900]/40">
            <Image
              src="/tn_emblem.png"
              alt="Tamil Nadu Government Emblem"
              width={112}
              height={112}
              className="rounded-full object-contain"
              priority
            />
          </div>
        </div>

        <div className="mb-4">
          <span className="inline-block bg-[#FF9900]/20 text-[#FF9900] text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase border border-[#FF9900]/40">
            Industrial Data Reporting & Analytics Portal
          </span>
        </div>

        <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-2 leading-tight tracking-tight">
          SIPCOT <span style={{ color: '#FF9900' }}>TRACK</span>
        </h2>
        <p className="text-white/60 text-sm uppercase tracking-widest font-medium mb-4">
          State Industries Promotion Corporation of Tamil Nadu
        </p>
        <p className="text-white/70 text-lg md:text-xl max-w-2xl mb-16 leading-relaxed">
          A unified, transparent platform for industrial allottees to submit performance data and for SIPCOT officials to monitor, verify, and act.
        </p>

        {/* Entry Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
          {/* Industry Portal */}
          <Link href="/allottee/update" className="group">
            <div className="bg-white rounded-2xl p-8 text-left shadow-2xl border-2 border-transparent group-hover:border-[#FF9900] transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(255,153,0,0.3)]">
              <div className="w-14 h-14 rounded-xl bg-[#003366] flex items-center justify-center mb-5 group-hover:bg-[#FF9900] transition-colors duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#003366] mb-2">Industry Portal</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Submit monthly performance data including investment, employment, utilities, and CSR activities.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[#003366] font-semibold text-sm group-hover:text-[#FF9900] transition-colors">
                Enter Portal
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Admin Portal */}
          <Link href="/admin/dashboard" className="group">
            <div className="bg-white rounded-2xl p-8 text-left shadow-2xl border-2 border-transparent group-hover:border-[#FF9900] transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(255,153,0,0.3)]">
              <div className="w-14 h-14 rounded-xl bg-[#003366] flex items-center justify-center mb-5 group-hover:bg-[#FF9900] transition-colors duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#003366] mb-2">SIPCOT Admin</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Monitor park-wise performance on an interactive map, review submissions, and manage verifications.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[#003366] font-semibold text-sm group-hover:text-[#FF9900] transition-colors">
                Enter Admin Panel
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-5 text-center">
        <p className="text-white/40 text-xs">
          © {new Date().getFullYear()} SIPCOT TRACK — State Industries Promotion Corporation of Tamil Nadu Ltd. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
