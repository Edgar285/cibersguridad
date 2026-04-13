const { randomUUID } = require('crypto');

function createMemoryGroupRepository() {
  const groups = new Map();
  // Map<groupId, Map<userId, Permission[]>>
  const memberPerms = new Map();

  return {
    findAll() {
      return [...groups.values()];
    },

    findById(id) {
      return groups.get(id) ?? null;
    },

    create(data) {
      const group = {
        id: randomUUID(),
        nombre: data.nombre,
        descripcion: data.descripcion ?? '',
        nivel: data.nivel ?? '',
        actor: data.actor ?? '',
        integrantes: data.integrantes ?? 0,
        tickets: data.tickets ?? 0,
        estado: data.estado ?? 'success',
        createdAt: new Date().toISOString()
      };
      groups.set(group.id, group);
      memberPerms.set(group.id, new Map());
      return group;
    },

    update(id, changes) {
      const existing = groups.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...changes };
      groups.set(id, updated);
      return updated;
    },

    delete(id) {
      memberPerms.delete(id);
      return groups.delete(id);
    },

    // ── Miembros y permisos ──────────────────────────────────────

    getMembers(groupId) {
      const map = memberPerms.get(groupId);
      if (!map) return [];
      return [...map.entries()].map(([userId, perms]) => ({ userId, permissions: perms }));
    },

    getMemberPermissions(groupId, userId) {
      return memberPerms.get(groupId)?.get(userId) ?? [];
    },

    setMemberPermissions(groupId, userId, permissions) {
      if (!memberPerms.has(groupId)) memberPerms.set(groupId, new Map());
      memberPerms.get(groupId).set(userId, permissions);
    },

    removeMember(groupId, userId) {
      return memberPerms.get(groupId)?.delete(userId) ?? false;
    }
  };
}

module.exports = { createMemoryGroupRepository };
