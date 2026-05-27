import { CollapsibleNav } from '@/components/landing/CollapsibleNav';
import { BurgerScroll } from '@/components/landing/BurgerScroll';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { Testimonial } from '@/components/landing/Testimonial';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';
import { ScrollIndicator } from '@/components/landing/ScrollIndicator';
import { HeroToFeaturesTransition } from '@/components/landing/HeroToFeaturesTransition';

export const metadata = {
  title: 'MorfApp — Tu menú digital, listo en minutos',
  description: 'Creá tu menú digital para delivery y takeaway en minutos. Pedidos por WhatsApp, sin comisiones.',
};

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes float-badge-right { 0%, 100% { transform: translateY(0px) rotate(1deg); } 50% { transform: translateY(-6px) rotate(1deg); } }
        @keyframes float-badge-left { 0%, 100% { transform: translateY(0px) rotate(-1deg); } 50% { transform: translateY(-8px) rotate(-1deg); } }
        @keyframes pulse-green { 0%, 100% { box-shadow: 0 4px 16px rgba(37,211,102,.35); } 50% { box-shadow: 0 4px 28px rgba(37,211,102,.55); } }
        @keyframes blob-drift { 0%, 100% { transform: translate(24px, 32px) scale(1); } 50% { transform: translate(32px, 20px) scale(1.05); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
        .phone-float { animation: float 4s ease-in-out infinite; }
        .badge-right { animation: float-badge-right 3.5s ease-in-out infinite; animation-delay: .4s; }
        .badge-left { animation: float-badge-left 4.2s ease-in-out infinite; animation-delay: .8s; }
        .badge-whatsapp { animation: pulse-green 2.5s ease-in-out infinite; }
        .blob-anim { animation: blob-drift 8s ease-in-out infinite; }
        .hero-left { animation: fadeInLeft .8s ease both; }
        .hero-right { animation: fadeInRight .8s ease .2s both; }
        .hero-child-1 { animation: fadeInUp .7s ease .05s both; }
        .hero-child-2 { animation: fadeInUp .7s ease .15s both; }
        .hero-child-3 { animation: fadeInUp .7s ease .25s both; }
        .hero-child-4 { animation: fadeInUp .7s ease .35s both; }
        .hero-child-5 { animation: fadeInUp .7s ease .45s both; }
      `}</style>
      <main className="bg-surface-bright text-on-surface font-body antialiased min-h-screen">
        <ScrollIndicator />
        <CollapsibleNav />
        <div id="hero">
          <BurgerScroll />
        </div>
        <HeroToFeaturesTransition />
        <Features />
        <Pricing />
        <Testimonial />
        <CTA />
        <Footer />
      </main>
    </>
  );
}
