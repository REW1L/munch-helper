let battle = null;
for (let attempt = 0; attempt < 20; attempt += 1) {
  const response = http.get(`${API_URL}/battles?roomId=${ROOM_ID}&status=active`);
  if (response.status !== 200) throw new Error(`Could not load the active battle: ${response.status}`);
  battle = json(response.body);
  if (battle?.monsterSide?.monsters?.length) break;
}
if (!battle?.monsterSide?.monsters?.length) throw new Error('The flow did not add a monster');

const monsterSide = {
  ...battle.monsterSide,
  monsters: battle.monsterSide.monsters.map((monster, index) => index === 0 ? { ...monster, level: 1 } : monster),
};
const update = http.request(`${API_URL}/battles/${battle.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ monsterSide }),
  headers: { 'Content-Type': 'application/json' },
});
if (update.status !== 200) throw new Error(`Could not set the test monster level: ${update.status}`);
