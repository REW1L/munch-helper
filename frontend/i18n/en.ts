export type Messages = {
  common: {
    cancel: string;
    save: string;
    saving: string;
    select: string;
    done: string;
  };
  settings: {
    language: string;
  };
  profile: {
    changeAvatar: string;
    nickname: string;
    nicknamePlaceholder: string;
  };
  landing: {
    title: string;
    privacy: string;
    support: string;
    subtitle: string;
    description: string;
    rooms: string;
    appStore: string;
    appStoreBadge: string;
    googlePlay: string;
    googlePlayBadge: string;
    joinClosedBeta: string;
  };
  rooms: {
    title: string;
    munchClassic: string;
    create: string;
    join: string;
    history: string;
    changeProfile: string;
    coins: string;
    shop: string;
    copy: string;
    copied: string;
    copyRoomCode: string;
    copyRoomCodeValue: string;
    connectionLostRetry: string;
    connectionLostRetryAccessibility: string;
    openBattle: string;
    openHistory: string;
    battle: string;
    log: string;
    undo: string;
    startBattleRetry: string;
    startBattleFailed: string;
    createCharacterFailed: string;
    updateCharacterFailed: string;
    deleteCharacterFailed: string;
    updateStatsFailed: string;
    undoStatsFailed: string;
    backToRoom: string;
  };
  support: {
    title: string;
    description: string;
    contactEmail: string;
    emailSupportAt: string;
  };
  privacy: {
    title: string;
    effectiveDate: string;
    section1Title: string;
    section1Body: string;
    section2Title: string;
    section2Body: string;
    section3Title: string;
    section3Body: string;
    section4Title: string;
    section4Body: string;
    section5Title: string;
    section5Body: string;
    section6Title: string;
    section6Body: string;
    section7Title: string;
    section7Body: string;
    section8Title: string;
    section8Body: string;
    section9Title: string;
    section9Body: string;
    section10Title: string;
    section10Body: string;
    section11Title: string;
    section11Body: string;
    section12Title: string;
    section12Body: string;
    contact: string;
    contactText: string;
  };
  shop: {
    title: string;
    buy: string;
    coinsAmount: string;
    quit: string;
  };
  roomModal: {
    createTitle: string;
    joinTitle: string;
    roomNamePlaceholder: string;
    yes: string;
    no: string;
  };
  avatar: {
    select: string;
  };
  character: {
    new: string;
    color: string;
    name: string;
    gender: string;
    level: string;
    power: string;
    class: string;
    race: string;
    male: string;
    female: string;
    create: string;
    selectColor: string;
    deleteTitle: string;
    deleteMessage: string;
    delete: string;
    deleteCharacter: string;
    deletingCharacter: string;
    quickEdit: string;
    editMore: string;
    loading: string;
    createButton: string;
    statsAccessibility: string;
    editHint: string;
    levelAbbrev: string;
    strengthAbbrev: string;
  };
  error: {
    title: string;
    unexpected: string;
  };
  battle: {
    inProgress: string;
    inProgressAccessibility: string;
    viewBattle: string;
    loading: string;
    noActive: string;
    name: string;
    save: string;
    notActive: string;
    saveFailed: string;
    concludeFailed: string;
    discardFailed: string;
    even: string;
    playersAhead: string;
    monstersAhead: string;
    playerSide: string;
    monsterSide: string;
    characters: string;
    monsters: string;
    bonuses: string;
    powerValue: string;
    removedCharacter: string;
    removedCharacterAccessibility: string;
    dropRemovedCharacter: string;
    selectCharacter: string;
    noCharactersAvailable: string;
    addSelectedCharacter: string;
    levelValue: string;
    mainMonster: string;
    openAddMonster: string;
    addMonster: string;
    cancelAddMonster: string;
    monsterName: string;
    monsterLevel: string;
    saveMonster: string;
    removeName: string;
    removeBonus: string;
    addBonus: string;
    playersWin: string;
    monstersWin: string;
    monsterWins: string;
    conclude: string;
    concluding: string;
    concludeAccessibility: string;
    concludeDirtyHint: string;
    discard: string;
    discarding: string;
    discardAccessibility: string;
    discardTitle: string;
    discardMessage: string;
    keepBattle: string;
  };
  history: {
    title: string;
    loading: string;
    loadingMore: string;
    retry: string;
    retryOlder: string;
    retryRoom: string;
    empty: string;
    created: string;
    removed: string;
    started: string;
    concluded: string;
    discarded: string;
    logEntry: string;
    unknownCharacter: string;
    unknownMonster: string;
    none: string;
    emptyValue: string;
    fieldChanged: string;
    battleAccessibility: string;
    openBattleRecordHint: string;
    closeBattleHistory: string;
    noPlayerParticipants: string;
    noMonstersRecorded: string;
    levelPower: string;
  };
  network: {
    reconnecting: string;
  };
  user: {
    defaultName: string;
  };
};

export const en: Messages = {
  common: {
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving',
    select: '<Select>',
    done: 'Done',
  },
  settings: {
    language: 'Language',
  },
  profile: {
    changeAvatar: 'Change Avatar',
    nickname: 'Nickname:',
    nicknamePlaceholder: 'Enter nickname',
  },
  landing: {
    title: 'Munch Helper',
    privacy: 'Privacy',
    support: 'Support',
    subtitle: 'Your companion for board games like Munchkin',
    description: 'Create game rooms with your friends, manage characters in games, and forget about remembering and recalculating stats.',
    rooms: 'Rooms',
    appStore: 'App Store',
    appStoreBadge: 'App Store badge',
    googlePlay: 'Google Play',
    googlePlayBadge: 'Google Play badge',
    joinClosedBeta: 'Join Closed Beta',
  },
  rooms: {
    title: 'Games',
    munchClassic: 'Classic',
    create: 'Create',
    join: 'Join',
    history: 'Rooms history',
    changeProfile: 'Change',
    coins: 'coins',
    shop: 'Shop',
    copy: 'Copy',
    copied: 'Copied ✓',
    copyRoomCode: 'Copy room code',
    copyRoomCodeValue: 'Copy room code {{roomCode}}',
    connectionLostRetry: 'Connection lost · Retry',
    connectionLostRetryAccessibility: 'Connection lost. Tap to retry',
    openBattle: 'Open battle',
    openHistory: 'Open room history',
    battle: 'Battle',
    log: 'Log',
    undo: 'Undo',
    startBattleRetry: 'Could not start the battle. Please try again.',
    startBattleFailed: 'Failed to start battle',
    createCharacterFailed: 'Failed to create character',
    updateCharacterFailed: 'Failed to update character',
    deleteCharacterFailed: 'Failed to delete character',
    updateStatsFailed: 'Failed to update character stats',
    undoStatsFailed: 'Failed to undo character stats',
    backToRoom: 'Back to room',
  },
  support: {
    title: 'Support',
    description: 'Need help with Munch Helper rooms, characters, battles, or room history? Contact me without creating an account and include a short description of the issue, the room code if relevant, and what you expected to happen.',
    contactEmail: 'Contact Email',
    emailSupportAt: 'Email support at {{email}}',
  },
  privacy: {
    title: 'Privacy Policy',
    effectiveDate: 'Effective date: {{date}}',
    section1Title: '1. Overview',
    section1Body: 'Munch Helper is a companion app for tabletop games like Munchkin. It does not require sign-up, account creation, email, password, or any third-party identity provider. The app creates an anonymous player profile so you can enter rooms and play without a traditional account.',
    section2Title: '2. Information We Process',
    section2Body: 'The app processes the profile and gameplay information needed to run the game: your nickname, avatar selection from a fixed local image set, and a server-assigned user identifier. Character records can include name, avatar, color, level, power, class, race, and gender. Room, battle, and room history log records are also processed when those features are used.',
    section3Title: '3. Session Data',
    section3Body: 'To restore your session between launches, the app stores your user profile locally on your device with AsyncStorage under the user key. The profile is also stored server-side so you can rejoin rooms. Characters, battles, rooms, and room history are stored server-side to keep shared gameplay state available.',
    section4Title: '4. Room Participation',
    section4Body: 'When you join a room, your nickname, avatar, and character details become visible to other players in that same room. Room, battle, and room history log state is shared in real time with participants in the room so everyone sees the same gameplay state.',
    section5Title: '5. Server Communication',
    section5Body: 'The app sends and retrieves profile, room, character, battle, and log data through backend APIs and uses WebSocket connections for real-time updates between players in the same room.',
    section6Title: '6. Why Data Is Used',
    section6Body: 'Data is used only to operate core features: creating player profiles, creating and joining rooms, managing characters, running battles, showing room history, synchronizing shared game state, and maintaining a stable multiplayer experience.',
    section7Title: '7. Data Sharing',
    section7Body: 'Your profile and gameplay data is shared only with other participants in rooms you join so multiplayer features can function. Munch Helper does not sell data and does not include third-party advertising, analytics, or tracking SDKs.',
    section8Title: '8. Children',
    section8Body: 'Munch Helper is not directed to children and does not include children-directed features. If you believe a child has provided information through the app, contact support and request deletion assistance.',
    section9Title: '9. Security',
    section9Body: 'Reasonable technical measures are used to protect data in storage and transit. However, no method of transmission or storage can be guaranteed as completely secure.',
    section10Title: '10. Data Retention and Deletion',
    section10Body: 'Local profile data remains on your device until you clear app data or uninstall the app. Server-side data may be retained as needed to operate and maintain the service. You can contact support to request data deletion assistance.',
    section11Title: '11. International Use',
    section11Body: 'By using the app, you understand that data may be processed in infrastructure regions selected by the service operator.',
    section12Title: '12. Changes to This Policy',
    section12Body: 'This policy may be updated from time to time. Updates will be reflected by changing the effective date on this page.',
    contact: 'Contact',
    contactText: 'For privacy questions or requests, email: {{email}}',
  },
  shop: {
    title: 'Shop',
    buy: 'Buy',
    coinsAmount: '{{count}} coins',
    quit: 'Quit shop',
  },
  roomModal: {
    createTitle: 'Create a room for {{game}}?',
    joinTitle: 'Join a room for {{game}}?',
    roomNamePlaceholder: 'Enter the room name',
    yes: 'YEP',
    no: 'NO',
  },
  avatar: {
    select: 'Select',
  },
  character: {
    new: 'New character',
    color: 'Color:',
    name: 'Name:',
    gender: 'Gender:',
    level: 'Level:',
    power: 'Power:',
    class: 'Class:',
    race: 'Race:',
    male: 'Male',
    female: 'Female',
    create: 'Create',
    selectColor: 'Select Color',
    deleteTitle: 'Delete character?',
    deleteMessage: 'This action cannot be undone.',
    delete: 'Delete',
    deleteCharacter: 'Delete Character',
    deletingCharacter: 'Deleting Character...',
    quickEdit: 'Quick Edit',
    editMore: 'Edit more…',
    loading: 'Loading characters...',
    createButton: 'Create a character',
    statsAccessibility: '{{name}}, Level {{level}}, Power {{power}}',
    editHint: 'Tap to edit stats',
    levelAbbrev: '{{level}} lvl',
    strengthAbbrev: '{{power}} str',
  },
  error: {
    title: 'Something went wrong',
    unexpected: 'Unexpected application error.',
  },
  battle: {
    inProgress: 'Battle in progress',
    inProgressAccessibility: 'Battle in progress. Tap to view.',
    viewBattle: 'View Battle →',
    loading: 'Loading battle',
    noActive: 'No active battle',
    name: 'Battle name',
    save: 'Save battle',
    notActive: 'Battle is not active',
    saveFailed: 'Failed to save battle',
    concludeFailed: 'Failed to conclude battle',
    discardFailed: 'Failed to discard battle',
    even: 'Even',
    playersAhead: 'Players ahead',
    monstersAhead: 'Monsters ahead',
    playerSide: 'Player Side',
    monsterSide: 'Monster Side',
    characters: 'Characters',
    monsters: 'Monsters',
    bonuses: 'Bonuses',
    powerValue: 'Power {{value}}',
    removedCharacter: 'Removed character',
    removedCharacterAccessibility: '{{id}} - removed from room',
    dropRemovedCharacter: 'Drop removed character from draft',
    selectCharacter: 'Select {{name}}',
    noCharactersAvailable: 'No characters available',
    addSelectedCharacter: 'Add selected character',
    levelValue: 'Level {{level}}',
    mainMonster: 'Main',
    openAddMonster: 'Open add monster dialog',
    addMonster: 'Add monster',
    cancelAddMonster: 'Cancel add monster',
    monsterName: 'Monster name',
    monsterLevel: 'Monster level',
    saveMonster: 'Save monster',
    removeName: 'Remove {{name}}',
    removeBonus: 'Remove bonus {{value}}',
    addBonus: 'Add bonus {{value}}',
    playersWin: 'Players Win',
    monstersWin: 'Monsters Win',
    monsterWins: 'Monster Wins',
    conclude: 'Conclude',
    concluding: 'Concluding...',
    concludeAccessibility: 'Conclude battle',
    concludeDirtyHint: 'Save your changes before concluding',
    discard: 'Discard',
    discarding: 'Discarding...',
    discardAccessibility: 'Discard battle',
    discardTitle: 'Discard battle?',
    discardMessage: "This battle will be discarded and removed from the room. This can't be undone.",
    keepBattle: 'Keep battle',
  },
  history: {
    title: 'History',
    loading: 'Loading history',
    loadingMore: 'Loading more history',
    retry: 'Retry',
    retryOlder: 'Retry loading older history',
    retryRoom: 'Retry loading room history',
    empty: 'No events recorded yet.',
    created: 'created',
    removed: 'removed',
    started: 'started',
    concluded: 'Concluded',
    discarded: 'discarded',
    logEntry: 'Log entry',
    unknownCharacter: 'Unknown character',
    unknownMonster: 'Unknown monster',
    none: 'none',
    emptyValue: '<Empty>',
    fieldChanged: '{{field}} changed from {{prev}} to {{next}}',
    battleAccessibility: '{{prefix}}{{name}}, {{status}}, {{relativeTime}}.{{suffix}}',
    openBattleRecordHint: ' Double-tap to open battle record.',
    closeBattleHistory: 'Close battle history',
    noPlayerParticipants: 'No player participants',
    noMonstersRecorded: 'No monsters recorded',
    levelPower: 'Level {{level}} · Power {{power}}',
  },
  network: {
    reconnecting: 'Reconnecting…',
  },
  user: {
    defaultName: 'Player {{postfix}}',
  },
};
