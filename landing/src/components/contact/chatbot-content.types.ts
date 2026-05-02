export type ResolvedReply =
  | { type: 'message'; text: string }
  | { type: 'demo'; text: string; href: string }
  | { type: 'whatsapp'; text: string; href: string };

export type ChatIntent = {
  id: string;
  keywords: string[];
  reply: ResolvedReply;
};
