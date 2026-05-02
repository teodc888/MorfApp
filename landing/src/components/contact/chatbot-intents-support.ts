import { WHATSAPP_URL } from './chatbot-content.constants';
import type { ChatIntent } from './chatbot-content.types';

export const supportIntents: ChatIntent[] = [
  {
    id: 'contact-handoff',
    keywords: ['integracion', 'integración', 'descuento', 'descuentos', 'soporte', 'postventa', 'api', 'tecnico', 'técnico', 'stock'],
    reply: {
      type: 'whatsapp',
      text: 'En eso prefiero pasarte con una persona del equipo para darte una respuesta exacta.',
      href: WHATSAPP_URL,
    },
  },
];
