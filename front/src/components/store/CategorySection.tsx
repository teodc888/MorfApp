import type { Category } from '@/types/store'
import { ProductCardClient } from './ProductCardClient'
import { STITCH } from '@/lib/stitch-theme'

type Props = {
  category: Category
}

export function CategorySection({ category }: Props) {
  return (
    <section id={`category-${category.id}`} className="scroll-mt-32 mb-10">
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4 pb-3" style={{ borderBottom: `1px solid ${STITCH.border}`, color: STITCH.text }}>
        <span>{category.emoji}</span>
        <span>{category.name}</span>
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {category.products.map((product) => (
          <ProductCardClient key={product.id} product={product} categoryEmoji={category.emoji} />
        ))}
      </div>
    </section>
  )
}
