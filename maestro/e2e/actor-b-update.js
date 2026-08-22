const response = http.request(`${API_URL}/characters/${ACTOR_B_CHARACTER_ID}`, {
  method: 'PATCH',
  body: JSON.stringify({ name: 'Actor B Updated', level: 2 }),
  headers: { 'Content-Type': 'application/json' },
});
if (response.status !== 200) throw new Error(`Actor B update failed: ${response.status}`);
