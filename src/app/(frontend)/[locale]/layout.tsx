import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { Playfair_Display } from 'next/font/google'
import { Inter } from 'next/font/google'
//import { GeistMono } from 'geist/font/mono'
//import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { AdminProvider } from '@/contexts/AdminContext'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { OrganizationStructuredData } from '@/components/StructuredData/OrganizationStructuredData'

import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'

const FairPlay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '700'],
  display: 'swap',
})

const InterVar = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout(props: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const params = await props.params
  const { locale } = params

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()
  const { isEnabled } = await draftMode()

  return (
    <html className={cn(FairPlay.variable, InterVar.variable)} lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <OrganizationStructuredData />
          <Providers>
            <AdminProvider>
              <AdminBar
                adminBarProps={{
                  preview: isEnabled,
                }}
              />
              <Header />
              {props.children}
              <Footer />
            </AdminProvider>
          </Providers>
          <Analytics />
          <SpeedInsights />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  icons: {
    icon: '/favicon.ico?v=2',
  },
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: 'În Pridvor',
  },
}
