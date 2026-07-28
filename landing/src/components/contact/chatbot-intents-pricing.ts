import { DEMO_URL } from './chatbot-content.constants';
import type { ChatIntent } from './chatbot-content.types';

export const pricingIntents: ChatIntent[] = [
  {
    id: 'pricing-pro',
    keywords: ['plan pro', 'dominio propio', 'estadisticas', 'estadísticas', 'branding avanzado', 'soporte prioritario'],
    reply: {
      type: 'message',
      text: 'El plan Pro cuesta $45.000 al mes. Incluye dominio propio, estadísticas de pedidos, branding avanzado y soporte prioritario.',
    },
  },
  {
    id: 'pricing-business',
    keywords: ['plan negocio', 'negocio', 'cadenas', 'franquicias', 'multiples locales', 'múltiples locales'],
    reply: {
      type: 'message',
      text: 'El plan Negocio cuesta $60.000 al mes y está pensado para cadenas y franquicias con múltiples locales.',
    },
  },
  {
    id: 'pricing-basic',
    keywords: ['plan basico', 'plan básico', 'precio', 'precios', 'cuesta', 'costo', 'vale', 'mensual', '$20.000'],
    reply: {
      type: 'message',
      text: 'Hoy podés empezar con el plan Básico por $20.000 al mes, con primer mes gratis. Cargás tu tarjeta al empezar, pero no se cobra nada hasta que termine el mes. Incluye 1 local, productos ilimitados, pedidos por WhatsApp, carrito con modificadores, delivery/takeaway y subdominio incluido.',
    },
  },
  {
    id: 'free-trial',
    keywords: ['prueba gratis', 'primer mes gratis', 'gratis', 'tarjeta'],
    reply: {
      type: 'message',
      text: 'Podés empezar con primer mes gratis. Cargás tu tarjeta al empezar, pero no se te cobra nada hasta que termine el mes.',
    },
  },
  {
    id: 'demo',
    keywords: ['demo', 'probar', 'ver demo', 'ejemplo'],
    reply: {
      type: 'demo',
      text: 'Si querés verlo funcionando, podés entrar directo a la demo actual desde acá.',
      href: DEMO_URL,
    },
  },
];
