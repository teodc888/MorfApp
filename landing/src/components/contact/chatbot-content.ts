import { WHATSAPP_URL } from './chatbot-content.constants';
export { DEMO_URL, WHATSAPP_URL } from './chatbot-content.constants';
import { pricingIntents } from './chatbot-intents-pricing';
import { productIntents } from './chatbot-intents-product';
import { supportIntents } from './chatbot-intents-support';
import { includesAnyKeyword, normalizeText } from './chatbot-content.utils';
import type { ChatIntent, ResolvedReply } from './chatbot-content.types';

export type QuickActionId = 'planes' | 'funciones' | 'demo' | 'whatsapp' | 'otra-duda';

export const quickActions: Array<{ id: QuickActionId; label: string }> = [
  { id: 'planes', label: 'Ver planes' },
  { id: 'funciones', label: 'Qué incluye' },
  { id: 'demo', label: 'Ver demo' },
  { id: 'otra-duda', label: 'Tengo otra duda' },
  { id: 'whatsapp', label: 'Hablar por WhatsApp' },
];

export const assistantIntro =
  'Hola, soy el asistente de MorfApp. Te puedo contar cómo funciona, qué incluye el plan actual y llevarte a la demo.';

const generalFallback: ResolvedReply = {
  type: 'whatsapp',
  text: 'No quiero inventarte una respuesta. Si querés, te paso con una persona del equipo por WhatsApp.',
  href: WHATSAPP_URL,
};

export const cannedReplies = {
  planes:
    'Hoy podés empezar con el plan Básico por $20.000 al mes, con primer mes gratis. Cargás tu tarjeta al empezar, pero no se cobra nada hasta que termine el mes. Incluye 1 local, productos ilimitados, pedidos por WhatsApp, carrito con modificadores, delivery/takeaway y subdominio incluido.',
  funciones:
    'MorfApp te permite recibir pedidos por WhatsApp, personalizar tu marca, gestionar menú y precios, configurar horarios, activar delivery o retiro y sumar modificadores en los productos.',
  demo: 'Si querés verlo funcionando, podés entrar directo a la demo actual desde acá.',
  otraDuda:
    'Decime tu duda y te respondo con lo que tenga disponible. Si el tema necesita una respuesta más específica, te paso con una persona del equipo.',
  whatsapp:
    'Prefiero pasarte con una persona del equipo para darte una respuesta exacta. Desde acá podés escribirnos por WhatsApp.',
} as const;

const chatbotIntents: ChatIntent[] = [...pricingIntents, ...productIntents, ...supportIntents];

export function resolveUserMessage(input: string): ResolvedReply {
  const normalized = normalizeText(input);

  if (!normalized) {
    return {
      type: 'message',
      text: 'Podés preguntarme por planes, funciones, demo o cualquier duda general sobre MorfApp.',
    };
  }

  for (const intent of chatbotIntents) {
    if (includesAnyKeyword(normalized, intent.keywords)) {
      return intent.reply;
    }
  }

  return generalFallback;
}
