const DEFAULT_PERMISSIONS = [
  'super-admin',
  'groups-view',
  'group-view',
  'groups-edit',
  'groups-delete',
  'groups-add',
  'group-delete',
  'group-add',
  'user-view',
  'users-view',
  'users-edit',
  'user-edit',
  'user-delete',
  'user-add',
  'ticket-view',
  'tickets-view',
  'tickets-edit',
  'ticket-edit',
  'ticket-delete'
];

function createConfig() {
  return {
    port: Number(process.env.USER_SERVICE_PORT || 3001),
    serviceName: 'user-service',
    jwtSecret: process.env.USER_SERVICE_JWT_SECRET || 'dev-only-secret-change-me',
    jwtTtlSeconds: Number(process.env.USER_SERVICE_JWT_TTL_SECONDS || 60 * 60 * 8),
    storageMode: process.env.USER_SERVICE_STORAGE || 'memory',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
    defaultPermissions: DEFAULT_PERMISSIONS
  };
}

module.exports = { createConfig };
