import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';

const base = `http://localhost:${process.env.CONDUCTOR_PORT || 3010}`;
const tokens = new Map();
const results = [];
async function login(user) {
  const cookies = new Map();
  async function web(path, options = {}) {
    const response = await fetch(base + path, { ...options, redirect: 'manual', headers: { ...options.headers, Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } });
    for (const cookie of response.headers.getSetCookie()) {
      const [key, ...value] = cookie.split(';')[0].split('=');
      cookies.set(key, value.join('='));
    }
    return response;
  }
  const csrf = await (await web('/api/auth/csrf')).json();
  assert.ok(csrf.csrfToken, 'Servidor sin autenticación de desarrollo.');
  await web('/api/auth/callback/dev', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, user, callbackUrl: base }) });
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const response = await web('/api/auth/mobile/start?' + new URLSearchParams({ code_challenge: challenge, code_challenge_method: 'S256', state: 'mobile-qa' }));
  const location = response.headers.get('location');
  assert.ok(location?.startsWith('genwork://auth?code='), `No ingresó ${user}; ejecutá el entorno QA con DEV_AUTH.`);
  const code = new URL(location).searchParams.get('code');
  const exchange = await fetch(base + '/api/auth/mobile/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, codeVerifier: verifier, deviceName: 'QA comprobación móvil' }) });
  assert.equal(exchange.status, 200);
  const session = await exchange.json();
  tokens.set(user, session.token);
  const replay = await fetch(base + '/api/auth/mobile/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, codeVerifier: verifier }) });
  assert.equal(replay.status, 400, 'El código PKCE no debe poder reutilizarse.');
  results.push(`${user}: login PKCE y rechazo del código reutilizado`);
}
async function api(user, path, options = {}) {
  return fetch(base + path, { ...options, headers: { ...options.headers, Authorization: `Bearer ${tokens.get(user)}` } });
}
try {
  assert.equal((await (await fetch(base + '/api/auth/mobile/info')).json()).app, 'genwork');
  for (const user of ['admin', 'miembro', 'cliente', 'lector']) await login(user);
  for (const user of tokens.keys()) assert.equal((await api(user, '/api/me')).status, 200);
  const works = await (await api('cliente', '/api/portal/works')).json();
  assert.ok(Array.isArray(works) && works.length, 'Prepará los fixtures con mobile-dev.sh setup.');
  const detail = await (await api('cliente', `/api/portal/works/${works[0].id}`)).json();
  for (const field of ['code', 'groupId', 'attachments', 'nextcloudFolderPath', 'access', 'statusOptions']) assert.equal(field in detail, false, `Campo interno expuesto: ${field}`);
  for (const path of ['/api/works', '/api/board', '/api/admin/users']) assert.equal((await api('cliente', path)).status, 403);
  const all = await (await api('admin', '/api/works')).json();
  const other = all.find(w => !works.some(v => v.id === w.id));
  assert.ok(other, 'Falta el proyecto privado del fixture.');
  assert.equal((await api('cliente', `/api/portal/works/${other.id}`)).status, 404);
  assert.equal((await api('lector', '/api/board')).status, 200);
  assert.equal((await api('lector', '/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText: 'No debe crearse', workId: works[0].id }) })).status, 403);
  for (const path of [`/api/works/${works[0].id}/mcp-activity`, `/api/works/${works[0].id}/client-grants`]) assert.equal((await api('admin', path)).status, 200);
  results.push('Cliente: DTO restringido, rutas internas 403 y proyecto ajeno 404.');
  results.push('Lector: tablero 200 y creación de tareas 403.');
  results.push('Administrador: actividad MCP y acceso de clientes disponibles.');
} finally {
  for (const [user] of tokens) {
    await api(user, '/api/auth/mobile/logout', { method: 'POST' });
    assert.equal((await api(user, '/api/me')).status, 401, 'El token debe quedar revocado.');
  }
}
for (const result of results) console.log(result);
console.log('Sesiones temporales revocadas.');
