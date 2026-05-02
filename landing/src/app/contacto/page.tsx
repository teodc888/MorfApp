import type { Metadata } from 'next';
import { ContactChatPage } from '@/components/contact/ContactChatPage';

export const metadata: Metadata = {
  title: 'Contactar a MorfApp',
  description: 'Resolvé tus dudas sobre MorfApp, conocé los planes y accedé a la demo.',
};

export default function ContactPage() {
  return <ContactChatPage />;
}
