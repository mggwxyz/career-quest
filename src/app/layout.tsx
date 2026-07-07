import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'
import { AuthProvider } from '@/providers/auth-provider'
import { MotionProvider } from '@/providers/motion-provider'
import { GuestMergeOnLogin } from '@/components/guest-merge-on-login'
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
        suppressHydrationWarning
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
          <NuqsAdapter>
            <AuthProvider>
              <GuestMergeOnLogin />
              <MotionProvider>
                <NavigationBar />
                <main id="main-content" className="min-h-screen pt-20">{children}</main>
                <footer className="mt-16 border-t border-border/50 px-6 py-6 text-center text-xs text-muted-foreground">
                  <p className="mb-3">
                    <a
                      href="https://services.onetcenter.org/"
                      title="This site incorporates information from O*NET Web Services. Click to learn more."
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://www.onetcenter.org/image/link/onet-in-it.svg"
                        alt="O*NET in-it"
                        width={130}
                        height={60}
                        style={{ border: 'none' }}
                        className="inline-block"
                      />
                    </a>
                  </p>
                  <p>
                    This site incorporates information from
                    {' '}
                    <a
                      href="https://services.onetcenter.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      O*NET Web Services
                    </a>
                    {' '}
                    by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET® is a trademark of USDOL/ETA.
                  </p>
                </footer>
                <Toaster />
              </MotionProvider>
            </AuthProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  )
}
