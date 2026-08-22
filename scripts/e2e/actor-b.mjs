const [action, characterId] = process.argv.slice(2);
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8080';
const roomId = process.env.ROOM_ID;
const userId = process.env.ACTOR_B_USER_ID;

if (!action || !roomId || !userId) {
  throw new Error('Usage: ROOM_ID=... ACTOR_B_USER_ID=... node scripts/e2e/actor-b.mjs <create|update|delete> [characterId]');
}

const request = async (path, options) => {
  const response = await fetch(`${apiUrl}${path}`, { headers: { 'content-type': 'application/json' }, ...options });
  if (!response.ok) throw new Error(`${options.method} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
};

if (action === 'create') {
  const character = await request('/characters', { method: 'POST', body: JSON.stringify({ roomId, userId, name: 'Actor B', avatarId: 1, color: '#3366CC', level: 1, power: 0, class: '[]', race: '["Human"]', gender: '["male"]' }) });
  console.log(character.id);
} else if (action === 'update' && characterId) {
  await request(`/characters/${encodeURIComponent(characterId)}`, { method: 'PATCH', body: JSON.stringify({ name: 'Actor B Updated', level: 2 }) });
} else if (action === 'delete' && characterId) {
  await request(`/characters/${encodeURIComponent(characterId)}`, { method: 'DELETE' });
} else {
  throw new Error(`Unknown actor-B action: ${action}`);
}
