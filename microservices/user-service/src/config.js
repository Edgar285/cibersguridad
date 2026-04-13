const DEFAULT_PERMISSIONS = [
  'super-admin',
  'groups:view',
  'groups:add',
  'groups:edit',
  'groups:delete',
  'groups:manage',
  'users:view',
  'users:add',
  'users:edit',
  'users:delete',
  'users:manage',
  'tickets:view',
  'tickets:add',
  'tickets:edit',
  'tickets:delete',
  'tickets:move'
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
