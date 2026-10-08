const response = http.get(`${API_URL}/characters?roomId=${ROOM_ID}`);
if (response.status !== 200) throw new Error(`Could not list room characters: ${response.status}`);
const character = json(response.body).items.find((item) => item.name.startsWith('E2E Created'));
if (!character) throw new Error('Could not find the character created by the flow');

const update = http.request(`${API_URL}/characters/${character.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ class: '["Warrior"]' }),
  headers: { 'Content-Type': 'application/json' },
});
if (update.status !== 200) throw new Error(`Could not set Warrior class: ${update.status}`);
output.warriorCharacterId = character.id;
