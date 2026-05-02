import { getMenu, getTenant, getPromotions } from '@/lib/api'
import { CategorySection } from '@/components/store/CategorySection'
import { PromotionsSection } from '@/components/store/PromotionsSection'
import { StoreShell } from '@/components/store/StoreShell'

type Props = {
  params: Promise<{ tenant: string }>
}

export default async function TenantPage({ params }: Props) {
  const { tenant: slug } = await params

  try {
    const [categories, tenant, promotions] = await Promise.all([getMenu(slug), getTenant(slug), getPromotions(slug)])
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const sortedPromos = [...promotions].sort((a, b) => a.sortOrder - b.sortOrder)

    return (
      <StoreShell tenant={tenant} categories={sorted}>
        {sortedPromos.length > 0 && <PromotionsSection promotions={sortedPromos} />}
        {sorted.map((cat) => (
          <CategorySection key={cat.id} category={cat} />
        ))}
      </StoreShell>
    )
  } catch {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="text-zinc-500">No pudimos cargar el menú.</p>
      </div>
    )
  }
}
