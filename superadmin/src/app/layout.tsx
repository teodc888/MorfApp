import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import AppShell from '@/components/AppShell'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'MorfApp - SuperAdmin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { fontSize: 14 },
            duration: 4000,
          }}
        />
      </body>
    </html>
  )
}
