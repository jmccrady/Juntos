import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Juntos',
  description: 'Neighbors helping neighbors get where they need to go safely.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
