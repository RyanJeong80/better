import type { Metadata, Viewport } from 'next'
import { Josefin_Sans, Zen_Kaku_Gothic_New, ZCOOL_XiaoWei } from 'next/font/google'

import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { DeepLinkHandler } from '@/components/auth/deep-link-handler'
import './globals.css'

const josefinSans = Josefin_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-josefin',
  display: 'swap',
})

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-zen-kaku',
  display: 'swap',
  preload: false,
})

const zcoolXiaoWei = ZCOOL_XiaoWei({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-zcool',
  display: 'swap',
  preload: false,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#EDE4DA',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Touched — 어떤 게 더 나아?',
  description: '두 장의 사진을 올리고 사람들의 선택을 받아보세요',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Touched',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${josefinSans.variable} ${zenKaku.variable} ${zcoolXiaoWei.variable}`}>
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Touched" />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DeepLinkHandler />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
