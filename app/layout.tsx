import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, M_PLUS_Rounded_1c, Noto_Sans_SC } from 'next/font/google'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ['400', '500', '700', '800'],
  subsets: ['latin'],
  variable: '--font-m-plus',
  display: 'swap',
  preload: false,
})

const notoSansSC = Noto_Sans_SC({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-noto-sc',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Better — 어떤 게 더 나아?',
  description: '두 장의 사진을 올리고 사람들의 선택을 받아보세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${plusJakarta.variable} ${mPlusRounded.variable} ${notoSansSC.variable}`}>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable.css"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
