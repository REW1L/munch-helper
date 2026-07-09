const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

const battleFixtures = {
  concluded: {
    name: 'Fallen Gate',
    result: 'players_win',
    monster: { id: 'monster-fallen-gate', name: 'Goblin Accountant', level: 12 },
  },
  active: {
    name: 'Dungeon Door',
    monster: { id: 'monster-ancient-squid', name: 'Ancient Squid', level: 26 },
  },
};

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
  {
    name: 'Thorn Vale',
    avatarId: 5,
    color: '#A56CC1',
    level: 7,
    power: 16,
    class: ['Ranger'],
    race: ['Halfling'],
    gender: ['female'],
  },
];

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
    body: JSON.stringify({
      name: member.name,
      avatarId: member.avatarId,
    }),
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

async function startBattle(roomId, name) {
  return requestJson('/battles', {
    method: 'POST',
    body: JSON.stringify({ roomId, name }),
  });
}

async function updateBattle(battleId, payload) {
  return requestJson(`/battles/${encodeURIComponent(battleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function concludeBattle(battleId, result) {
  return requestJson(`/battles/${encodeURIComponent(battleId)}/conclude`, {
    method: 'POST',
    body: JSON.stringify({ result }),
  });
}

async function waitForSeededLog(roomId, battleName, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const logs = await requestJson(`/logs?roomId=${encodeURIComponent(roomId)}`);
    if (Array.isArray(logs) && logs.some((entry) => entry?.summary?.includes(battleName))) {
      return logs;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Seeded log entry for ${battleName} did not appear.`);
}

async function seedBattleStory(roomId, characters) {
  const participantIds = characters.slice(0, 3).map((character) => character.id);

  const battleToConclude = await startBattle(roomId, battleFixtures.concluded.name);
  const populatedConcludedBattle = await updateBattle(battleToConclude.id, {
    playerSide: {
      characterIds: participantIds,
      bonuses: [{ id: 'bonus-fallen-gate-help', value: 5 }],
    },
    monsterSide: {
      monsters: [battleFixtures.concluded.monster],
      bonuses: [],
    },
  });
  const concludedBattle = await concludeBattle(populatedConcludedBattle.id, battleFixtures.concluded.result);
  const logs = await waitForSeededLog(roomId, battleFixtures.concluded.name);

  const activeBattle = await startBattle(roomId, battleFixtures.active.name);
  const populatedActiveBattle = await updateBattle(activeBattle.id, {
    playerSide: {
      characterIds: participantIds,
      bonuses: [{ id: 'bonus-dungeon-door-teamwork', value: 2 }],
    },
    monsterSide: {
      monsters: [battleFixtures.active.monster],
      bonuses: [{ id: 'bonus-ancient-squid-rage', value: 3 }],
    },
  });
  const activeLogs = await waitForSeededLog(roomId, battleFixtures.active.name);

  const activeBattleCheck = await requestJson(`/battles?roomId=${encodeURIComponent(roomId)}&status=active`);
  if (!activeBattleCheck || activeBattleCheck.id !== populatedActiveBattle.id) {
    throw new Error('Seeded active battle did not survive verification.');
  }

  return {
    activeBattle: populatedActiveBattle,
    concludedBattle,
    logCount: Math.max(logs.length, activeLogs.length),
  };
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
    {
      role: 'owner',
      userId: ownerUser.id,
      characterId: createdRoom.characterId,
      ...owner,
    },
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
    const updatedCharacter = await updateCharacter(member.characterId, member);
    characters.push({
      id: updatedCharacter.id,
      userId: member.userId,
      name: updatedCharacter.name,
      avatarId: updatedCharacter.avatarId,
      color: updatedCharacter.color,
      level: updatedCharacter.level,
      power: updatedCharacter.power,
    });
  }

  const battleStory = await seedBattleStory(createdRoom.roomId, characters);

  return {
    roomId: createdRoom.roomId,
    seededUsers: seededMembers.map((member) => ({
      id: member.userId,
      name: member.name,
      avatarId: member.avatarId,
    })),
    characters,
    battleStory,
  };
}

try {
  const result = await seedRoom();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
