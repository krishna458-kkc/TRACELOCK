import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { AppShell } from '@/components/tracelock/app-shell'
import { TracelockProvider } from '@/lib/store'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'TRACELOCK — Cryptographic Document Attribution',
    template: '%s · TRACELOCK',
  },
  description:
    'Cryptographic attribution and immutable decryption provenance for multi-recipient encrypted documents. Forensic watermarking, post-quantum signatures and an offline permissioned ledger.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#15191f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} bg-background`}>
      <body className="antialiased">
        <TracelockProvider>
          <AppShell>{children}</AppShell>
        </TracelockProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
