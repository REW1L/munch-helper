const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8080';
const suffix = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const userId = `e2e-a-${suffix}`;
const response = await fetch(`${apiUrl}/rooms`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ roomTypeId: 'munchkin', userId, userName: 'E2E Actor A', avatarId: 0 }),
});
if (!response.ok) throw new Error(`Could not prepare E2E room: ${response.status} ${await response.text()}`);
const { roomId } = await response.json();
console.log(`export ROOM_ID=${roomId}`);
console.log(`export USER_ID=${userId}`);
console.log(`export ACTOR_B_USER_ID=e2e-b-${suffix}`);
