import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTenant } from '@/lib/api'
import type { TenantPublic } from '@/types/store'
import { StoreProviders } from '@/components/store/StoreProviders'

type Props = {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant: slug } = await params
  try {
    const tenant = await getTenant(slug)
    return {
      title: tenant.name,
      icons: tenant.branding.logoUrl
        ? { icon: tenant.branding.logoUrl }
        : undefined,
    }
  } catch {
    return { title: 'MorfApp' }
  }
}

export default async function TenantLayout({ children, params }: Props) {
  const { tenant: slug } = await params

  let tenant: TenantPublic
  try {
    tenant = await getTenant(slug)
  } catch {
    return notFound()
  }

  const colorPrimary = tenant.branding?.colorPrimary ?? '#e8390e'
  const colorAccent = tenant.branding?.colorAccent ?? '#25d366'
  const hexToRgb = (hex: string) => {
    const c = (hex ?? '#000000').replace('#', '')
    return `${parseInt(c.slice(0, 2) || '0', 16)} ${parseInt(c.slice(2, 4) || '0', 16)} ${parseInt(c.slice(4, 6) || '0', 16)}`
  }

  const themeScript = `
    document.documentElement.style.setProperty('--color-primary','${colorPrimary}');
    document.documentElement.style.setProperty('--color-accent','${colorAccent}');
    document.documentElement.style.setProperty('--color-primary-rgb','${hexToRgb(colorPrimary)}');
    document.documentElement.style.setProperty('--color-accent-rgb','${hexToRgb(colorAccent)}');
  `.trim()

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <StoreProviders tenant={tenant}>{children}</StoreProviders>
    </>
  )
}
