import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'SIPCOT TRACK — Government of Tamil Nadu',
  description: 'SIPCOT TRACK: Industrial Data Reporting & Analytics Portal for the Government of Tamil Nadu.',
  icons: {
    icon: '/tn_emblem.png',
    apple: '/tn_emblem.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#003366',
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '8px',
            },
            success: {
              iconTheme: { primary: '#FF9900', secondary: '#fff' },
            },
            error: {
              style: { background: '#C0392B' },
            },
          }}
        />
      </body>
    </html>
  )
}
