import { getMenu, getTenant, getPromotions } from '@/lib/api'
import { CategorySection } from '@/components/store/CategorySection'
import { PromotionsSection } from '@/components/store/PromotionsSection'
import { StoreShell } from '@/components/store/StoreShell'

type Props = {
  params: Promise<{ tenant: string }>
}

export default async function TenantPage({ params }: Props) {
  const { tenant: slug } = await params

  type StoreData = {
    categories: Awaited<ReturnType<typeof getMenu>>
    tenant: Awaited<ReturnType<typeof getTenant>>
    promotions: Awaited<ReturnType<typeof getPromotions>>
  }

  let data: StoreData | null = null
  try {
    const [categories, tenant, promotions] = await Promise.all([getMenu(slug), getTenant(slug), getPromotions(slug)])
    data = { categories, tenant, promotions }
  } catch {
    // data permanece null
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="text-zinc-500">No pudimos cargar el menú.</p>
      </div>
    )
  }

  const sorted = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const sortedPromos = [...data.promotions].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <StoreShell tenant={data.tenant} categories={sorted}>
      {sortedPromos.length > 0 && <PromotionsSection promotions={sortedPromos} />}
      {sorted.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
    </StoreShell>
  )
}
