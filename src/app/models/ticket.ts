export type TicketStatus = 'pending' | 'in_progress' | 'review' | 'done' | 'blocked';

export type TicketPriority =
  | '至尊'
  | '紧急'
  | '高'
  | '中'
  | '低'
  | '很低'
  | '观察';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  dueDate?: string;
  assignedTo?: string;
  groupId: string;
  author: string;
}

export interface TicketInput {
  title: string;
  description: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  dueDate?: string;
  assignedTo?: string;
}
