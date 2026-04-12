export type TicketStatus = 'pending' | 'in_progress' | 'review' | 'done' | 'blocked';

export type TicketPriority =
  | 'supremo'
  | 'critico'
  | 'alto'
  | 'medio'
  | 'bajo'
  | 'muy_bajo'
  | 'observacion';

export interface TicketComment {
  id: string;
  author: string;
  message: string;
  at: string;
}

export interface TicketHistoryEntry {
  id: string;
  field: 'status' | 'priority' | 'assignedTo' | 'dueDate' | 'title' | 'description';
  from?: string;
  to?: string;
  at: string;
  author?: string;
}

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
  comments: TicketComment[];
  history: TicketHistoryEntry[];
}

export interface TicketInput {
  title: string;
  description: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  dueDate?: string;
  assignedTo?: string;
}
