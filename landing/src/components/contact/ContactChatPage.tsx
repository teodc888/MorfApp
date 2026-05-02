'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Nav } from '@/components/landing/Nav';
import { DEMO_URL, WHATSAPP_URL } from './chatbot-content.constants';
import { assistantIntro, cannedReplies, quickActions, resolveUserMessage, type QuickActionId } from './chatbot-content';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  cta?: { label: string; href: string };
};

function ChatBubble({ message }: { message: Message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={[
          'chat-bubble max-w-[88%] rounded-3xl px-5 py-4 shadow-sm',
          isAssistant ? 'bg-surface-bright text-on-surface border border-outline-variant/60' : 'bg-primary text-on-primary',
        ].join(' ')}
      >
        <p className="text-[15px] leading-7">{message.text}</p>
        {message.cta ? (
          <a
            href={message.cta.href}
            target="_blank"
            rel="noreferrer"
            className={[
              'mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-bold transition-colors',
              isAssistant ? 'bg-primary text-on-primary hover:bg-surface-tint' : 'bg-surface-bright text-primary hover:bg-surface-container-low',
            ].join(' ')}
          >
            {message.cta.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function QuickChips({ onSelect }: { onSelect: (id: QuickActionId) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {quickActions
        .filter((action) => action.id !== 'whatsapp')
        .map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onSelect(action.id)}
          className="rounded-full border border-outline-variant bg-surface-bright px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function assistantMessage(text: string, cta?: Message['cta']): Message {
  return { id: crypto.randomUUID(), role: 'assistant', text, cta };
}

export function ContactChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    assistantMessage(assistantIntro),
    assistantMessage('Podés elegir una opción rápida o escribir tu consulta abajo.'),
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function appendMessages(nextMessages: Message[]) {
    setMessages((current) => [...current, ...nextMessages]);
  }

  function handleQuickAction(actionId: QuickActionId) {
    const label = quickActions.find((action) => action.id === actionId)?.label ?? 'Consulta';
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: label };

    if (actionId === 'planes') {
      appendMessages([userMessage, assistantMessage(cannedReplies.planes)]);
      return;
    }

    if (actionId === 'funciones') {
      appendMessages([userMessage, assistantMessage(cannedReplies.funciones)]);
      return;
    }

    if (actionId === 'demo') {
      appendMessages([
        userMessage,
        assistantMessage(cannedReplies.demo, { label: 'Abrir demo', href: DEMO_URL }),
      ]);
      return;
    }

    if (actionId === 'whatsapp') {
      appendMessages([
        userMessage,
        assistantMessage(cannedReplies.whatsapp, { label: 'Ir a WhatsApp', href: WHATSAPP_URL }),
      ]);
      return;
    }

    appendMessages([userMessage, assistantMessage(cannedReplies.otraDuda)]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    const resolved = resolveUserMessage(trimmed);

    if (resolved.type === 'message') {
      appendMessages([userMessage, assistantMessage(resolved.text)]);
    }

    if (resolved.type === 'demo') {
      appendMessages([userMessage, assistantMessage(resolved.text, { label: 'Abrir demo', href: resolved.href })]);
    }

    if (resolved.type === 'whatsapp') {
      appendMessages([userMessage, assistantMessage(resolved.text, { label: 'Ir a WhatsApp', href: resolved.href })]);
    }

    setInput('');
  }

  return (
    <main className="bg-surface-bright text-on-surface font-body h-screen overflow-hidden">
      <Nav />
      <section className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden px-6 pt-24 pb-6">
        <div className="max-w-3xl shrink-0 mb-6">
          <span className="inline-flex items-center rounded-full border border-outline-variant bg-primary-fixed px-4 py-2 font-body text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Asistente MorfApp
          </span>
          <h1 className="mt-4 font-headline text-4xl md:text-5xl font-bold leading-tight text-on-surface">Hablemos de tu local</h1>
          <p className="mt-3 text-base md:text-lg leading-relaxed text-on-surface-variant">
            Puedo ayudarte con planes, funciones, dudas frecuentes y mostrarte la demo. Si tu consulta necesita una respuesta más puntual, te paso directo con nuestro equipo.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low shadow-[0_8px_40px_rgba(58,48,42,0.08)]">
          <style>{`
            @keyframes chatBubbleIn {
              from { opacity: 0; transform: translateY(10px) scale(.985); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .chat-bubble {
              animation: chatBubbleIn .22s ease-out both;
            }
          `}</style>
          <div className="border-b border-outline-variant/70 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-on-primary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  forum
                </span>
              </div>
              <div>
                <p className="font-headline text-2xl font-bold text-on-surface">Asistente MorfApp</p>
                <p className="text-sm text-on-surface-variant">Breve, claro y listo para ayudarte</p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-5">
            <QuickChips onSelect={handleQuickAction} />

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-outline-variant/60 pt-5 sm:flex-row">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Escribí tu consulta..."
                className="min-w-0 flex-1 rounded-2xl border border-outline-variant bg-surface-bright px-4 py-3 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/80 focus:border-primary"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 font-bold text-on-primary transition-colors hover:bg-surface-tint"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
