const { randomUUID } = require('crypto');

/**
 * Repositorio en memoria para tickets.
 * En producción se reemplazaría por una BD real.
 */
function createMemoryTicketRepository() {
  const store = new Map();

  return {
    findAll() {
      return [...store.values()];
    },

    findByGroup(groupId) {
      return [...store.values()].filter(t => t.groupId === groupId);
    },

    findById(id) {
      return store.get(id) ?? null;
    },

    create(data) {
      const now = new Date().toISOString();
      const ticket = {
        id: randomUUID(),
        title: data.title,
        description: data.description ?? '',
        status: data.status ?? 'pending',
        priority: data.priority ?? 'medio',
        groupId: data.groupId,
        author: data.author,
        assignedTo: data.assignedTo ?? null,
        dueDate: data.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
        comments: [],
        history: [
          {
            id: randomUUID(),
            field: 'status',
            from: null,
            to: data.status ?? 'pending',
            at: now,
            author: data.author
          }
        ]
      };
      store.set(ticket.id, ticket);
      return ticket;
    },

    update(id, changes, actor) {
      const existing = store.get(id);
      if (!existing) return null;

      const now = new Date().toISOString();
      const history = [...existing.history];

      for (const [field, newVal] of Object.entries(changes)) {
        if (existing[field] !== newVal) {
          history.push({
            id: randomUUID(),
            field,
            from: existing[field],
            to: newVal,
            at: now,
            author: actor ?? 'system'
          });
        }
      }

      const updated = { ...existing, ...changes, updatedAt: now, history };
      store.set(id, updated);
      return updated;
    },

    delete(id) {
      return store.delete(id);
    },

    addComment(ticketId, comment) {
      const ticket = store.get(ticketId);
      if (!ticket) return null;
      const { randomUUID: uuid } = require('crypto');
      const newComment = {
        id: uuid(),
        author: comment.author,
        message: comment.message,
        at: new Date().toISOString()
      };
      const updated = { ...ticket, comments: [...ticket.comments, newComment] };
      store.set(ticketId, updated);
      return updated;
    }
  };
}

module.exports = { createMemoryTicketRepository };
