import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/providers/auth-provider'
import { MotionProvider } from '@/providers/motion-provider'
import { NavigationBar } from '@/components/navigation-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  weight: '400',
  subsets: ['latin'],
})

const SOCIAL_DESCRIPTION
  = 'Answer would-you-rather questions, explore your RIASEC profile, and get AI-powered career recommendations.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Career Quest',
    template: '%s | Career Quest',
  },
  description:
    'Discover careers that fit you. Answer would-you-rather questions, explore your RIASEC profile, and get AI-powered career recommendations.',
  applicationName: 'Career Quest',
  openGraph: {
    type: 'website',
    siteName: 'Career Quest',
    title: 'Career Quest — Find careers that fit who you are',
    description: SOCIAL_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Career Quest — Find careers that fit who you are',
    description: SOCIAL_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem
          themes={['light', 'dark']}
        >
          <AuthProvider>
            <MotionProvider>
              <NavigationBar />
              <main id="main-content" className="pt-20">{children}</main>
              <Toaster />
            </MotionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
