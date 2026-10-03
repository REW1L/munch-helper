// English is the source-of-truth catalog. Every other locale file mirrors this
// object's shape via `satisfies TranslationResource`. Keys are stable, semantic
// identifiers grouped by feature area.

const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    create: 'Create',
    join: 'Join',
    change: 'Change',
    retry: 'Retry',
    delete: 'Delete',
    select: 'Select',
    back: 'Back',
  },
  language: {
    label: 'Language',
    selectTitle: 'Language',
  },
  landing: {
    title: 'Munch Helper',
    subtitle: 'Your companion for board games like Munchkin',
    description:
      'Create game rooms with your friends, manage characters in games, and forget about remembering and recalculating stats.',
    privacy: 'Privacy',
    support: 'Support',
    rooms: 'Rooms',
    joinBeta: 'Join Closed Beta',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  rooms: {
    screenTitle: 'Games',
    classic: 'Classic',
    create: 'Create',
    join: 'Join',
    rules: 'Rules',
    roomsHistory: 'Rooms history',
  },
  gameRules: {
    screenTitle: 'Munchkin Classic Rules',
    title: 'Munchkin Classic Rules',
    description:
      'Munchkin Classic is a competitive card game in which adventurers explore a playful dungeon, collect powerful gear, interfere with rivals, and race to Level 10.',
    summaryNotice:
      'This is an original summary, not a replacement for the official rulebook. Card text and the official rules are authoritative when details or disputes arise.',
    goalTitle: 'Goal and victory',
    goalBody:
      'Everyone begins at Level 1, and victory goes to whoever reaches Level 10 before everyone else. The winning level normally comes from defeating a monster, unless a card explicitly provides another way to win.',
    setupTitle: 'Setup',
    setupBody:
      'Separate the Door and Treasure decks, shuffle both, and give each player four cards from each deck. Players may put one Race, one Class, and any legal Items into play before the first turn.',
    turnTitle: 'Turn sequence',
    turnBody:
      'Start by revealing a Door card and resolving its monster, curse, or other effect. If no combat occurred, either fight a monster from your hand or draw another Door card face down. End the turn with no more than five cards in hand, giving excess cards to the lowest-Level player or discarding them when required.',
    charactersTitle: 'Characters and cards',
    charactersBody:
      'Your character is defined by Level, Race, Class, and the Items you carry. Cards on the table are public and active; cards in your hand are not. You normally have at most one Race and one Class, and your Level cannot fall below 1.',
    combatTitle: 'Combat',
    combatBody:
      'Add your Level and legal bonuses to find your combat strength, then compare it with the monster and its bonuses. You must finish higher to win; a tie favors the monster. A defeated monster usually grants the Levels and Treasure printed on its card after the fight is settled.',
    itemsTitle: 'Items and trading',
    itemsBody:
      'Carried Small Items have no quantity limit, but a character normally carries only one Big Item, and only correctly equipped Items add bonuses. Items already in play may be traded outside combat. During your own turn and outside combat, Items worth at least 1,000 Gold Pieces may be discarded for a Level, but not for the winning Level.',
    helpTitle: 'Asking for help',
    helpBody:
      'If you cannot win alone, ask one other player to join the fight and negotiate what they receive. The helper adds combat strength and shares monster effects, while other players may still alter the fight with legal cards. The main player normally receives the Levels.',
    escapeTitle: 'Running away and death',
    escapeBody:
      'If the players cannot win, each participant attempts to escape from each monster separately; a roll of 5 or more usually succeeds. Failure applies that monster’s Bad Stuff. Death removes your hand and most cards in play for others to loot, while your Level, Race, Class, and continuing Curses remain.',
    cursesTitle: 'Curses',
    cursesBody:
      'A Curse revealed face up affects the player who drew it immediately. A Curse drawn face down goes into your hand and can be played later as its text allows. Some effects end at once, while others remain in play as reminders.',
    priorityTitle: 'Cards and general rules',
    priorityBody:
      'Specific card instructions normally take precedence over this general summary. Some fundamental limits and exceptions are defined only in the official rulebook, so consult it whenever a card interaction is unclear.',
    sourceIntro: 'Source and complete rules',
    sourceLabel: 'Official Munchkin Classic rulebook (PDF)',
    sourceA11y: 'Open the official Munchkin Classic rulebook PDF',
  },
  support: {
    screenTitle: 'Support',
    title: 'Support',
    description:
      'Need help with Munch Helper rooms, characters, battles, or room history? Contact me without creating an account and include a short description of the issue, the room code if relevant, and what you expected to happen.',
    contactEmail: 'Contact Email',
    emailA11y: 'Email support at {{email}}',
  },
  profile: {
    changeAvatar: 'Change Avatar',
    nickname: 'Nickname:',
    enterNickname: 'Enter nickname',
    selectAvatar: 'Select',
  },
  roomCreate: {
    title: 'Create a room for {{game}}?',
    yes: 'YEP',
    no: 'NO',
  },
  roomJoin: {
    title: 'Join a room for {{game}}?',
    placeholder: 'Enter the room name',
  },
  shop: {
    title: 'Shop',
    coins: '{{amount}} coins',
    buy: 'Buy',
    quit: 'Quit shop',
  },
  character: {
    newCharacter: 'New character',
    name: 'Name:',
    color: 'Color:',
    selectColor: 'Select Color',
    gender: 'Gender:',
    male: 'Male',
    female: 'Female',
    level: 'Level:',
    power: 'Power:',
    classLabel: 'Class:',
    race: 'Race:',
    deleteCharacter: 'Delete Character',
    deletingCharacter: 'Deleting Character...',
    deleteConfirmTitle: 'Delete character?',
    deleteConfirmMessage: 'This action cannot be undone.',
  },
  room: {
    loadingRoom: 'Loading game room...',
    unableToConnect: 'Unable to connect to room service',
    connectionLostRetry: 'Connection lost · Retry',
    connectionLostA11y: 'Connection lost. Tap to retry',
    battle: 'Battle',
    log: 'Log',
    undo: 'Undo',
    openBattleA11y: 'Open battle',
    openRoomHistoryA11y: 'Open room history',
    defaultBattleName: 'Battle {{time}}',
    loadingCharacters: 'Loading characters...',
    createCharacter: 'Create a character',
    changeCharacterA11y: 'Change',
    tapToEditStats: 'Tap to edit stats',
    characterCardA11y: '{{name}}, Level {{level}}, Power {{power}}',
    errorUpdateStats: 'Failed to update character stats',
    errorUndoStats: 'Failed to undo character stats',
    errorStartBattle: 'Failed to start battle',
    errorStartBattleRetry: 'Could not start the battle. Please try again.',
    errorCreateCharacter: 'Failed to create character',
    errorUpdateCharacter: 'Failed to update character',
    errorDeleteCharacter: 'Failed to delete character',
  },
  banner: {
    battleInProgress: 'Battle in progress',
    battleInProgressA11y: 'Battle in progress. Tap to view.',
    viewBattle: 'View Battle →',
    reconnecting: 'Reconnecting…',
  },
  quickEdit: {
    title: 'Quick Edit',
    level: 'Level',
    power: 'Power',
    editMore: 'Edit more…',
    save: 'Save',
    saving: 'Saving…',
  },
  battle: {
    loading: 'Loading battle',
    noActiveBattle: 'No active battle',
    playerSide: 'Player Side',
    monsterSide: 'Monster Side',
    even: 'Even',
    playersAhead: 'Players ahead',
    monstersAhead: 'Monsters ahead',
    save: 'Save',
    saving: 'Saving',
    playersWin: 'Players Win',
    monstersWin: 'Monsters Win',
    conclude: 'Conclude',
    concluding: 'Concluding...',
    saveBeforeConcluding: 'Save your changes before concluding',
    discard: 'Discard',
    discarding: 'Discarding...',
    discardConfirmTitle: 'Discard battle?',
    discardConfirmMessage: "This battle will be discarded and removed from the room. This can't be undone.",
    keepBattle: 'Keep battle',
    battleNotActive: 'Battle is not active',
    errorSave: 'Failed to save battle',
    errorConclude: 'Failed to conclude battle',
    errorDiscard: 'Failed to discard battle',
    battleNameA11y: 'Battle name',
    saveBattleA11y: 'Save battle',
    concludeBattleA11y: 'Conclude battle',
    playersWinA11y: 'Players Win',
    monstersWinA11y: 'Monsters Win',
    discardBattleA11y: 'Discard battle',
    dropRemovedCharacterA11y: 'Drop removed character from draft',
    addCharacterA11y: 'Add selected character',
    openAddMonsterA11y: 'Open add monster dialog',
    cancelAddMonsterA11y: 'Cancel add monster',
    monsterNameA11y: 'Monster name',
    monsterLevelA11y: 'Monster level',
    saveMonsterA11y: 'Save monster',
  },
  battleResult: {
    playersWin: 'Players Win',
    monsterWins: 'Monster Wins',
    concluded: 'Concluded',
  },
  battleHistory: {
    closeA11y: 'Close battle history',
    removedCharacter: 'Removed character',
    unknownMonster: 'Unknown monster',
  },
  roomLayout: {
    battle: 'Battle',
    history: 'History',
    backToRoomA11y: 'Back to room',
  },
  log: {
    loadingHistory: 'Loading history',
    loadingMore: 'Loading more history',
    noEvents: 'No events recorded yet.',
    retryRoomHistoryA11y: 'Retry loading room history',
    retryOlderHistoryA11y: 'Retry loading older history',
  },
  errorBoundary: {
    title: 'Something went wrong',
    message: 'Unexpected application error.',
  },
} as const;

// Widen every leaf from its English string literal to `string` so other locales
// can `satisfies TranslationResource` with their own translated values while
// still being required to provide exactly the same key set (no missing, no extra).
export type TranslationResource = {
  [Namespace in keyof typeof en]: {
    [Key in keyof (typeof en)[Namespace]]: string;
  };
};

export default en;
