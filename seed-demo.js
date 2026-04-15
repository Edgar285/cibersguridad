/**
 * seed-demo.js
 * Prepara los datos demo para la presentación:
 *   - 3 usuarios con permisos distintos
 *   - 2 grupos con los 3 usuarios como miembros
 *   - 1 ticket asignado a cada usuario en cada grupo (6 tickets)
 *
 * Uso: node seed-demo.js
 * Requiere que todos los servicios estén corriendo.
 */

const http = require('http');

const GW   = 'http://localhost:3000';   // API Gateway
const USER = 'http://localhost:3001';   // user-service directo (para admin crear usuarios)

// ─── credenciales del super-admin ────────────────────────────────────────────
const SUPER_EMAIL    = 'super@erp.com';
const SUPER_PASSWORD = 'Super123!';

// ─── usuarios demo ───────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    username: 'ana.garcia',
    email: 'ana.garcia@erp.com',
    password: 'Demo123!',
    fullName: 'Ana García',
    label: 'Gerente (todos los permisos)',
    permissions: [
      'groups:view','groups:add','groups:edit','groups:delete','groups:manage',
      'tickets:view','tickets:add','tickets:edit','tickets:delete','tickets:move',
      'users:view','users:add','users:edit','users:delete','users:manage'
    ]
  },
  {
    username: 'carlos.lopez',
    email: 'carlos.lopez@erp.com',
    password: 'Demo123!',
    fullName: 'Carlos López',
    label: 'Soporte (tickets + grupos lectura)',
    permissions: [
      'groups:view',
      'tickets:view','tickets:add','tickets:edit','tickets:move',
      'users:view'
    ]
  },
  {
    username: 'maria.rodriguez',
    email: 'maria.rodriguez@erp.com',
    password: 'Demo123!',
    fullName: 'María Rodríguez',
    label: 'Lector (solo visualizar)',
    permissions: [
      'groups:view',
      'tickets:view',
      'users:view'
    ]
  }
];

// ─── grupos demo ─────────────────────────────────────────────────────────────
const DEMO_GROUPS = [
  { nombre: 'Desarrollo Frontend', descripcion: 'Equipo encargado del frontend de la plataforma', nivel: 'Medio', estado: 'activo' },
  { nombre: 'Soporte Técnico',     descripcion: 'Atención de incidencias y soporte a usuarios',  nivel: 'Alto',  estado: 'activo' }
];

// ─── tickets demo (1 por usuario por grupo) ───────────────────────────────────
// Se generan dinámicamente con los IDs de usuarios y grupos creados.
function buildTickets(groups, users) {
  const [g1, g2] = groups;
  const [ana, carlos, maria] = users;
  return [
    // Grupo 1 — Desarrollo Frontend
    { groupId: g1.id, assignedTo: ana.id,    author: ana.email,    title: 'Implementar diseño responsivo',          description: 'Adaptar todas las vistas para dispositivos móviles.', priority: 'alto',   status: 'in_progress' },
    { groupId: g1.id, assignedTo: carlos.id, author: carlos.email, title: 'Corregir bug en formulario de login',    description: 'El formulario no valida el campo email correctamente.', priority: 'critico', status: 'pending'     },
    { groupId: g1.id, assignedTo: maria.id,  author: maria.email,  title: 'Revisar documentación de la API',        description: 'Actualizar Swagger con los nuevos endpoints agregados.', priority: 'medio',  status: 'review'      },
    // Grupo 2 — Soporte Técnico
    { groupId: g2.id, assignedTo: ana.id,    author: ana.email,    title: 'Supervisar incidencias del servidor',    description: 'Monitoreo de métricas y alertas durante el fin de semana.', priority: 'alto',   status: 'pending' },
    { groupId: g2.id, assignedTo: carlos.id, author: carlos.email, title: 'Atender solicitud de usuario #1042',     description: 'El usuario reporta que no puede restablecer su contraseña.', priority: 'alto',   status: 'in_progress' },
    { groupId: g2.id, assignedTo: maria.id,  author: maria.email,  title: 'Registrar reporte de errores del día',   description: 'Compilar los logs de error del día en el sistema de tickets.', priority: 'bajo',   status: 'done' }
  ];
}

// ─── utilidades HTTP ─────────────────────────────────────────────────────────
function req(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? JSON.stringify(body) : undefined;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const r = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers },
      res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
          catch { resolve({ status: res.statusCode, body: d }); }
        });
      }
    );
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const get    = (url, token)       => req('GET',    url, null, token);
const post   = (url, body, token) => req('POST',   url, body, token);
const del    = (url, token)       => req('DELETE', url, null, token);
const put    = (url, body, token) => req('PUT',    url, body, token);

function ok(label, r) {
  if (r.status >= 200 && r.status < 300) {
    console.log(`  ✓ ${label} [${r.status}]`);
    return true;
  } else {
    const msg = r.body?.data?.message || r.body?.message || JSON.stringify(r.body).slice(0, 120);
    console.log(`  ✗ ${label} [${r.status}] — ${msg}`);
    return false;
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n══════════════════════════════════════════');
  console.log('  ERP Demo Seed — Preparando presentación');
  console.log('══════════════════════════════════════════\n');

  // 1. Login como super admin
  console.log('1. Iniciando sesión como super admin...');
  const loginRes = await post(`${GW}/api/v1/users/auth/login`, { userOrEmail: SUPER_EMAIL, password: SUPER_PASSWORD });
  if (!ok('Login super admin', loginRes)) {
    console.error('\n  Asegúrate de que todos los servicios estén corriendo y vuelve a intentarlo.');
    process.exit(1);
  }
  const superToken = loginRes.body.data.token;

  // 2. Obtener lista actual de tickets y eliminarlos
  console.log('\n2. Limpiando tickets existentes...');
  const ticketsRes = await get(`${GW}/api/v1/tickets`, superToken);
  const oldTickets = ticketsRes.body?.data?.tickets || [];
  if (oldTickets.length === 0) {
    console.log('  (no había tickets)');
  }
  for (const t of oldTickets) {
    const r = await del(`${GW}/api/v1/tickets/${t.id}`, superToken);
    ok(`Eliminar ticket "${t.title}"`, r);
  }

  // 3. Obtener lista actual de grupos y eliminarlos
  console.log('\n3. Limpiando grupos existentes...');
  const groupsRes = await get(`${GW}/api/v1/groups`, superToken);
  const oldGroups = groupsRes.body?.data?.groups || [];
  if (oldGroups.length === 0) {
    console.log('  (no había grupos)');
  }
  for (const g of oldGroups) {
    const r = await del(`${GW}/api/v1/groups/${g.id}`, superToken);
    ok(`Eliminar grupo "${g.nombre}"`, r);
  }

  // 4. Crear o reutilizar usuarios demo
  console.log('\n4. Creando usuarios demo...');
  const createdUsers = [];

  // Obtener lista de usuarios existentes
  const usersRes = await get(`${USER}/api/v1/users/admin/users`, superToken);
  const existingUsers = usersRes.body?.data?.users || [];

  for (const u of DEMO_USERS) {
    let existing = existingUsers.find(e => e.email === u.email);
    if (existing) {
      console.log(`  ~ Usuario "${u.fullName}" ya existe, reutilizando`);
      createdUsers.push({ id: existing.id, email: u.email });
    } else {
      const r = await post(`${USER}/api/v1/users/admin/users`, {
        username: u.username,
        email: u.email,
        password: u.password,
        fullName: u.fullName,
        permissions: u.permissions
      }, superToken);
      if (ok(`Crear usuario "${u.fullName}" (${u.label})`, r)) {
        createdUsers.push({ id: r.body.data.user.id, email: u.email });
      } else {
        process.exit(1);
      }
    }
  }

  // 5. Crear grupos demo
  console.log('\n5. Creando grupos demo...');
  const createdGroups = [];
  for (const g of DEMO_GROUPS) {
    const r = await post(`${GW}/api/v1/groups`, g, superToken);
    if (ok(`Crear grupo "${g.nombre}"`, r)) {
      createdGroups.push(r.body.data.group);
    } else {
      process.exit(1);
    }
  }

  // 6. Agregar los 3 usuarios como miembros a cada grupo
  console.log('\n6. Agregando miembros a los grupos...');
  const memberPerms = {
    [createdUsers[0].id]: ['groups:view','groups:edit','tickets:view','tickets:add','tickets:edit','tickets:delete','tickets:move'],
    [createdUsers[1].id]: ['groups:view','tickets:view','tickets:add','tickets:edit','tickets:move'],
    [createdUsers[2].id]: ['groups:view','tickets:view']
  };
  for (const group of createdGroups) {
    for (const user of createdUsers) {
      const r = await put(
        `${GW}/api/v1/groups/${group.id}/members/${user.id}`,
        { permissions: memberPerms[user.id] },
        superToken
      );
      ok(`Agregar ${user.email} → "${group.nombre}"`, r);
    }
  }

  // 7. Crear tickets demo (1 por usuario por grupo)
  console.log('\n7. Creando tickets demo...');
  const tickets = buildTickets(createdGroups, createdUsers.map((u, i) => ({ id: u.id, email: u.email })));
  for (const t of tickets) {
    const r = await post(`${GW}/api/v1/tickets`, t, superToken);
    ok(`Ticket "${t.title}"`, r);
  }

  // 8. Resumen final
  console.log('\n══════════════════════════════════════════');
  console.log('  ¡Datos demo listos para la presentación!');
  console.log('══════════════════════════════════════════');
  console.log('\n  Usuarios creados:');
  console.log(`    1. Ana García      — ana.garcia@erp.com    / Demo123! (Gerente)`);
  console.log(`    2. Carlos López    — carlos.lopez@erp.com  / Demo123! (Soporte)`);
  console.log(`    3. María Rodríguez — maria.rodriguez@erp.com / Demo123! (Lector)`);
  console.log('\n  Grupos:');
  console.log(`    1. Desarrollo Frontend`);
  console.log(`    2. Soporte Técnico`);
  console.log('\n  Tickets: 6 creados (1 por usuario por grupo)');
  console.log('\n  Super admin: super@erp.com / Super123!\n');
})();
