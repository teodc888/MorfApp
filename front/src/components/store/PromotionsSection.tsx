import type { Promotion } from '@/types/store'
import { PromoCardClient } from './PromoCardClient'

type Props = {
  promotions: Promotion[]
}

export function PromotionsSection({ promotions }: Props) {
  return (
    <section id="promotions" className="scroll-mt-32 mb-10">
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 pb-3 border-b border-zinc-200 text-zinc-900">
        <span>🎁</span>
        <span>Promociones</span>
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {promotions
          .filter(promo => promo.price > 0 && promo.products.length > 0)
          .map(promo => (
            <PromoCardClient key={promo.id} promo={promo} />
          ))}
      </div>
    </section>
  )
}
