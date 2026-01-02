
export interface Expense {
  id: string;
  amount: number;
  category: string;
  sub_category?: string;
  description: string;
  timestamp: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image' | 'audio';
  dataUrl?: string;
}

export enum ViewMode {
  CHAT = 'CHAT',
  DASHBOARD = 'DASHBOARD'
}
