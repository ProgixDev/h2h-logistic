export interface ConversationPreview {
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

const PREVIEWS: Record<string, { seller: ConversationPreview; buyer: ConversationPreview }> = {
  'mission-a1': {
    seller: { lastMessage: 'Le colis est prêt, à tout à l\'heure !', timestamp: '14:32', unreadCount: 2 },
    buyer: { lastMessage: 'Super, merci beaucoup !', timestamp: '14:40', unreadCount: 0 },
  },
  'mission-a2': {
    seller: { lastMessage: 'Je suis en place au hub.', timestamp: '17:05', unreadCount: 1 },
    buyer: { lastMessage: 'Parfait, j\'arrive dans 10 min.', timestamp: '16:58', unreadCount: 0 },
  },
};

const DEFAULT_PREVIEW_SELLER: ConversationPreview = {
  lastMessage: 'Bonjour, ravi de vous rencontrer au hub.',
  timestamp: '—',
  unreadCount: 0,
};

const DEFAULT_PREVIEW_BUYER: ConversationPreview = {
  lastMessage: 'Je vous confirme ma présence à l\'heure.',
  timestamp: '—',
  unreadCount: 0,
};

export function getConversationPreview(missionId: string, role: 'seller' | 'buyer'): ConversationPreview {
  const entry = PREVIEWS[missionId];
  if (entry) return entry[role];
  return role === 'seller' ? DEFAULT_PREVIEW_SELLER : DEFAULT_PREVIEW_BUYER;
}
