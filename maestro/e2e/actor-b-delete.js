const response = http.delete(`${API_URL}/characters/${ACTOR_B_CHARACTER_ID}`);
if (response.status !== 204) throw new Error(`Actor B delete failed: ${response.status}`);
