import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { resolveUserMessage } from './chatbot-content';

describe('resolveUserMessage', () => {
  it('responde sobre el plan Básico cuando preguntan por precio', () => {
    const result = resolveUserMessage('¿cuánto cuesta el plan básico?');

    assert.equal(result.type, 'message');
    if (result.type !== 'message') return;
    assert.match(result.text, /\$20\.000/i);
    assert.match(result.text, /primer mes gratis/i);
  });

  it('responde sobre dominio propio cuando preguntan por Pro', () => {
    const result = resolveUserMessage('¿tienen dominio propio?');

    assert.equal(result.type, 'message');
    if (result.type !== 'message') return;
    assert.match(result.text, /dominio propio/i);
  });

  it('responde sobre estadísticas cuando preguntan por métricas', () => {
    const result = resolveUserMessage('¿qué estadísticas de pedidos tienen?');

    assert.equal(result.type, 'message');
    if (result.type !== 'message') return;
    assert.match(result.text, /estad[ií]sticas de pedidos/i);
  });

  it('deriva a WhatsApp ante soporte técnico específico', () => {
    const result = resolveUserMessage('¿tienen integración con mi sistema de stock?');

    assert.equal(result.type, 'whatsapp');
  });
});
