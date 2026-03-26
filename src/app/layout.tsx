import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'WorkloadIQ — Gestion de charge',
  description: 'Suivi intelligent de charge d\'équipe — Sprint planning, Eisenhower, Analytics',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="bg-bg text-slate-200 antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
