'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'morfapp.app';

type TenantSummary = {
  name: string;
  slug: string;
  emojiIcon: string;
  colorPrimary: string;
};

function AltaPendienteContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [summary, setSummary] = useState<TenantSummary | null>(null);

  useEffect(() => {
    if (!ref) return;
    fetch(`${API_URL}/api/public/tenants/${ref}/summary`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setSummary)
      .catch(() => {
        // Sin resumen, se muestra el mensaje genérico igual.
      });
  }, [ref]);

  return (
    <div className="max-w-md text-center">
      <div className="mb-6 text-6xl">{summary?.emojiIcon ?? '⏳'}</div>
      <h1 className="font-headline text-3xl font-bold mb-4">
        {summary ? `¡Ya casi está, ${summary.name}!` : '¡Ya casi está!'}
      </h1>
      <p className="text-on-surface-variant mb-2">
        Estamos confirmando tu pago con Mercado Pago. Esto puede tardar unos segundos.
      </p>
      {summary && (
        <p className="mb-2">
          Tu tienda va a estar en{' '}
          <strong style={{ color: summary.colorPrimary }}>
            {summary.slug}.{ROOT_DOMAIN}
          </strong>
        </p>
      )}
      <p className="text-on-surface-variant mb-8">
        En cuanto se confirme, te va a llegar un email con el link para configurar tu
        contraseña y empezar a armar tu menú. Si en un rato no te llegó nada, revisá spam
        o escribinos.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center bg-primary text-on-primary px-6 py-3 rounded font-medium hover:opacity-90 transition-opacity"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

export default function AltaPendientePage() {
  return (
    <div className="min-h-screen bg-surface-bright text-on-surface font-body flex items-center justify-center px-6">
      <Suspense fallback={<div className="text-6xl">⏳</div>}>
        <AltaPendienteContent />
      </Suspense>
    </div>
  );
}
