import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Confirmando tu pago — MorfApp',
  description: 'Estamos confirmando tu suscripción a MorfApp.',
};

export default function AltaPendientePage() {
  return (
    <div className="min-h-screen bg-surface-bright text-on-surface font-body flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">⏳</div>
        <h1 className="font-headline text-3xl font-bold mb-4">¡Ya casi está!</h1>
        <p className="text-on-surface-variant mb-2">
          Estamos confirmando tu pago con Mercado Pago. Esto puede tardar unos segundos.
        </p>
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
    </div>
  );
}
