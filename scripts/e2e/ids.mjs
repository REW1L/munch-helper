import { randomUUID } from 'node:crypto';

const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
console.log(`ROOM_ID=e2e-${suffix}`);
console.log(`USER_ID=e2e-a-${suffix}`);
console.log(`ACTOR_B_USER_ID=e2e-b-${suffix}`);
