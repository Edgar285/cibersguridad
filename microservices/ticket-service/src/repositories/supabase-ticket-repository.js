const { randomUUID } = require('crypto');

function createSupabaseTicketRepository(config) {
  const baseUrl = config.supabaseUrl.replace(/\/+$/, '');
  const baseHeaders = {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    'Content-Type': 'application/json'
  };

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...options,
      headers: { ...baseHeaders, ...(options.headers || {}) }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  }

  const enc = encodeURIComponent;

  function mapComment(c) {
    return { id: c.id, author: c.author, message: c.message, at: c.at };
  }

  function mapHistory(h) {
    return { id: h.id, field: h.field, from: h.from_val, to: h.to_val, at: h.at, author: h.author };
  }

  function mapTicket(row, comments = [], history = []) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status,
      priority: row.priority,
      groupId: row.group_id,
      author: row.author,
      assignedTo: row.assigned_to || null,
      dueDate: row.due_date || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      comments: (comments || []).map(mapComment),
      history: (history || []).map(mapHistory)
    };
  }

  async function fetchWithRelations(id) {
    const rows = await request(`erp_tickets?id=eq.${enc(id)}&limit=1`);
    if (!rows || !rows[0]) return null;
    let comments = [];
    let history = [];
    try {
      comments = await request(`erp_ticket_comments?ticket_id=eq.${enc(id)}&order=id.asc`) || [];
    } catch { /* sin comentarios aún */ }
    try {
      history = await request(`erp_ticket_history?ticket_id=eq.${enc(id)}&order=id.asc`) || [];
    } catch { /* sin historial aún */ }
    return mapTicket(rows[0], comments, history);
  }

  return {
    async findAll() {
      const rows = await request('erp_tickets?select=*&order=created_at.desc');
      return (rows || []).map(r => mapTicket(r));
    },

    async findByGroup(groupId) {
      const rows = await request(`erp_tickets?group_id=eq.${enc(groupId)}&select=*&order=created_at.desc`);
      return (rows || []).map(r => mapTicket(r));
    },

    async findById(id) {
      return fetchWithRelations(id);
    },

    async create(data) {
      const rows = await request('erp_tickets', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([{
          title: data.title,
          description: data.description || '',
          status: data.status || 'pending',
          priority: data.priority || 'medio',
          group_id: data.groupId,
          author: data.author,
          assigned_to: data.assignedTo || null,
          due_date: data.dueDate || null
        }])
      });
      const ticketRow = rows[0];
      // Registro inicial en historial
      const initialStatus = data.status || 'pending';
      try {
        await request('erp_ticket_history', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify([{
            ticket_id: ticketRow.id,
            field: 'status',
            from_val: null,
            to_val: initialStatus,
            author: data.author
          }])
        });
      } catch { /* historial no crítico */ }
      // Construir respuesta directamente sin roundtrip extra a Supabase
      return mapTicket(ticketRow, [], [{
        id: randomUUID(),
        field: 'status',
        from_val: null,
        to_val: initialStatus,
        at: ticketRow.created_at,
        author: data.author
      }]);
    },

    async update(id, changes, actor) {
      const currentRows = await request(`erp_tickets?id=eq.${enc(id)}&limit=1`);
      if (!currentRows || !currentRows[0]) return null;
      const curr = currentRows[0];

      const fieldMap = {
        title:       'title',
        description: 'description',
        status:      'status',
        priority:    'priority',
        assignedTo:  'assigned_to',
        dueDate:     'due_date'
      };

      const dbChanges = {};
      const historyEntries = [];

      for (const [appField, dbField] of Object.entries(fieldMap)) {
        if (changes[appField] !== undefined) {
          const oldVal = curr[dbField];
          const newVal = changes[appField];
          if (oldVal !== newVal) {
            historyEntries.push({
              ticket_id: id,
              field: appField,
              from_val: oldVal != null ? String(oldVal) : null,
              to_val:   newVal != null ? String(newVal) : null,
              author: actor || 'system'
            });
          }
          dbChanges[dbField] = newVal;
        }
      }

      const ops = [];
      if (Object.keys(dbChanges).length > 0) {
        ops.push(request(`erp_tickets?id=eq.${enc(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(dbChanges)
        }));
      }
      if (historyEntries.length > 0) {
        ops.push(request('erp_ticket_history', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(historyEntries)
        }));
      }
      if (ops.length > 0) await Promise.all(ops);

      return fetchWithRelations(id);
    },

    async delete(id) {
      await request(`erp_tickets?id=eq.${enc(id)}`, { method: 'DELETE' });
      return true;
    },

    async addComment(ticketId, comment) {
      await request('erp_ticket_comments', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{
          ticket_id: ticketId,
          author: comment.author,
          message: comment.message
        }])
      });
      return fetchWithRelations(ticketId);
    }
  };
}

module.exports = { createSupabaseTicketRepository };
