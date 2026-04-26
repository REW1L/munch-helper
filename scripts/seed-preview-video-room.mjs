/**
 * Seeds a room with exactly 3 named characters for the preview video.
 * Outputs JSON: { roomId, seededUsers, characters }
 *
 * A 4th slot is left for the main user who joins via the app, and a 5th
 * player (Thorn Vale) is added later via runBackgroundUpdates in the video
 * script so the join animation is captured on screen.
 */

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

const cast = [
  {
    name: 'Rune Rider',
    avatarId: 0,
    color: '#C95B4F',
    level: 8,
    power: 19,
    class: ['Warrior'],
    race: ['Human'],
    gender: ['male'],
  },
  {
    name: 'Bardic Bryn',
    avatarId: 3,
    color: '#4D7BD8',
    level: 6,
    power: 14,
    class: ['Bard'],
    race: ['Elf'],
    gender: ['female'],
  },
  {
    name: 'Hexley Fox',
    avatarId: 7,
    color: '#4BA06B',
    level: 9,
    power: 21,
    class: ['Wizard'],
    race: ['Gnome'],
    gender: ['male'],
  },
];

// Thorn Vale joins via API *after* the main user joins (during recording)
export const lateJoiner = {
  name: 'Thorn Vale',
  avatarId: 5,
  color: '#A56CC1',
  level: 7,
  power: 16,
  class: ['Ranger'],
  race: ['Halfling'],
  gender: ['female'],
};

async function requestJson(path, init = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${init.method || 'GET'} ${path} failed with ${response.status}: ${body}`);
  }

  return response.json();
}

async function createUser(member) {
  return requestJson('/users', {
    method: 'POST',
    body: JSON.stringify({ name: member.name, avatarId: member.avatarId }),
  });
}

async function updateCharacter(characterId, member) {
  return requestJson(`/characters/${encodeURIComponent(characterId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: member.name,
      avatarId: member.avatarId,
      color: member.color,
      level: member.level,
      power: member.power,
      class: JSON.stringify(member.class),
      race: JSON.stringify(member.race),
      gender: JSON.stringify(member.gender),
    }),
  });
}

async function seedRoom() {
  const [owner, ...joiners] = cast;
  const ownerUser = await createUser(owner);
  const createdRoom = await requestJson('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      roomTypeId: 'munchkin',
      userId: ownerUser.id,
      userName: owner.name,
      avatarId: owner.avatarId,
    }),
  });

  const seededMembers = [
    { role: 'owner', userId: ownerUser.id, characterId: createdRoom.characterId, ...owner },
  ];

  for (const joiner of joiners) {
    const joinerUser = await createUser(joiner);
    const joinedRoom = await requestJson('/rooms/associations', {
      method: 'POST',
      body: JSON.stringify({
        roomId: createdRoom.roomId,
        userId: joinerUser.id,
        userName: joiner.name,
        avatarId: joiner.avatarId,
      }),
    });

    seededMembers.push({
      role: 'guest',
      userId: joinerUser.id,
      characterId: joinedRoom.characterId,
      ...joiner,
    });
  }

  const characters = [];
  for (const member of seededMembers) {
    const updated = await updateCharacter(member.characterId, member);
    characters.push({
      id: updated.id,
      userId: member.userId,
      name: updated.name,
      avatarId: updated.avatarId,
      color: updated.color,
      level: updated.level,
      power: updated.power,
    });
  }

  return {
    roomId: createdRoom.roomId,
    seededUsers: seededMembers.map((m) => ({ id: m.userId, name: m.name, avatarId: m.avatarId })),
    characters,
  };
}

try {
  const result = await seedRoom();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
