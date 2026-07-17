const response = http.post(`${API_URL}/characters`, {
  body: JSON.stringify({
    roomId: ROOM_ID,
    userId: ACTOR_B_USER_ID,
    name: 'Actor B',
    avatarId: 1,
    color: '#3366CC',
    level: 1,
    power: 0,
    class: '[]',
    race: '["Human"]',
    gender: '["male"]',
  }),
  headers: { 'Content-Type': 'application/json' },
});
if (response.status !== 201) throw new Error(`Actor B create failed: ${response.status}`);
output.actorBCharacterId = json(response.body).id;
