import type { ChatIntent } from './chatbot-content.types';

export const productIntents: ChatIntent[] = [
  {
    id: 'what-is',
    keywords: ['que es', 'qué es', 'morfapp', 'menu digital', 'menú digital'],
    reply: {
      type: 'message',
      text: 'MorfApp es una solución para tener tu menú digital listo en minutos y recibir pedidos por WhatsApp, sin comisiones y sin complicaciones.',
    },
  },
  {
    id: 'how-it-works',
    keywords: ['como funciona', 'cómo funciona', 'funciona', 'incluye', 'pedido', 'pedidos'],
    reply: {
      type: 'message',
      text: 'Mostrás tu menú online, el cliente arma el pedido y vos lo recibís por WhatsApp de forma clara y ordenada.',
    },
  },
  {
    id: 'commission',
    keywords: ['comision', 'comisiones'],
    reply: {
      type: 'message',
      text: 'No. MorfApp trabaja sin comisiones sobre tus pedidos.',
    },
  },
  {
    id: 'whatsapp-orders',
    keywords: ['whatsapp', 'pedido por whatsapp', 'pedidos por whatsapp'],
    reply: {
      type: 'message',
      text: 'Los pedidos llegan por WhatsApp, para que tengas contacto directo con tus clientes.',
    },
  },
  {
    id: 'delivery-takeaway',
    keywords: ['delivery', 'takeaway', 'retiro', 'retiro en local', 'ambas opciones'],
    reply: {
      type: 'message',
      text: 'Sí. MorfApp contempla delivery, takeaway o ambas opciones según cómo quieras vender.',
    },
  },
  {
    id: 'hours',
    keywords: ['horario', 'horarios', 'abierto', 'cerrado'],
    reply: {
      type: 'message',
      text: 'Podés configurar horarios para que el local se muestre abierto o cerrado automáticamente.',
    },
  },
  {
    id: 'menu-management',
    keywords: ['menu', 'menú', 'precios', 'producto', 'productos', 'categoria', 'categoría', 'agotado'],
    reply: {
      type: 'message',
      text: 'Podés actualizar precios, productos y categorías de forma simple, y gestionar cambios rápidos cuando algo no está disponible.',
    },
  },
  {
    id: 'brand-customization',
    keywords: ['colores', 'logo', 'banner', 'marca', 'branding', 'personalizar'],
    reply: {
      type: 'message',
      text: 'Sí. Podés personalizar colores, logo y banner para que el menú se vea alineado con tu local.',
    },
  },
  {
    id: 'modifiers',
    keywords: ['modificadores', 'extras', 'salsas', 'punto de coccion', 'punto de cocción', 'tamanio', 'tamaño'],
    reply: {
      type: 'message',
      text: 'Sí. Podés configurar modificadores, como extras, salsas o variantes para cada producto.',
    },
  },
];
