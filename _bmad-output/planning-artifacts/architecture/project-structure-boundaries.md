# Project Structure & Boundaries

## New Backend Services

```
backend/
├── battle-service/                          NEW — scaffold from character-service
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── .env.example                         BATTLE_MONGO_URI, NOTIFICATIONS_TOPIC_ARN,
│   │                                        LOG_TOPIC_ARN, NOTIFICATIONS_REDIS_CHANNEL,
│   │                                        LOG_REDIS_CHANNEL, REDIS_URL, PORT
│   └── src/
│       ├── app.ts                           Express app factory
│       ├── index.ts                         Local server entry
│       ├── lambda.ts                        API Gateway Lambda entry
│       ├── service.ts
│       ├── service.test.ts
│       ├── publisher.ts                     publishToAll + publishToAllChannels helpers;
│       │                                    battle_* events to both topics/channels
│       ├── publisher.test.ts
│       ├── models/
│       │   ├── Battle.ts                    Mongoose schema — BonusItem + MonsterItem embedded
│       │   └── Battle.test.ts
│       └── routes/
│           ├── battles.ts                   Express router — all battle endpoints
│           └── battles.test.ts
│
└── log-service/                             NEW — scaffold from room-notifications-service
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── .env.example                         LOG_MONGO_URI, LOG_TOPIC_ARN,
    │                                        LOG_REDIS_CHANNEL, REDIS_URL, PORT
    └── src/
        ├── app.ts                           Express read API factory
        ├── index.ts                         Local entry — Promise.all([startSubscriber(),
        │                                    startHttpServer()]) — runs both concurrently
        ├── lambda-read.ts                   HTTP API Gateway Lambda entry (logReader)
        ├── subscriber.ts                    SNS-triggered Lambda entry (logWriter) — SNSEvent → void
        ├── subscriber.test.ts
        ├── models/
        │   ├── LogEvent.ts                  Mongoose schema
        │   └── LogEvent.test.ts
        └── routes/
            ├── logs.ts                      Express router — GET /logs
            └── logs.test.ts
```

## Modified Backend Services

```
backend/
├── character-service/
│   └── src/
│       └── publisher.ts                     MODIFIED — behavior change (not purely additive):
│                                            single-channel Redis → dual-channel; add
│                                            publishToAllChannels helper; add LOG_TOPIC_ARN
│                                            SNS publish. Requires publisher.test.ts update.
│
└── room-notifications-service/
    └── src/
        └── subscriber.ts                    MODIFIED — add battle_* SNS/Redis subscriptions
                                             for WebSocket fanout (battle_started,
                                             battle_updated, battle_concluded, battle_discarded)
```

## Infrastructure Changes

### `backend/sam/template.yaml` — MODIFIED

Additions to the single shared SAM template:

```yaml
# New SNS Topic
LogEventsTopic:                            # owned by log-service (subscriber)
  Type: AWS::SNS::Topic

# New Lambda Functions
BattleServiceFunction:
  CodeUri: ../battle-service
  Handler: lambda.handler
  Events: HttpApi → /battles/{proxy+} (ALL methods)
  Environment: BATTLE_MONGO_URI, NOTIFICATIONS_TOPIC_ARN (=RoomNotificationsTopic),
               LOG_TOPIC_ARN (=LogEventsTopic), ROUTE_PREFIX
  IAM: sns:Publish on RoomNotificationsTopic + LogEventsTopic

LogWriterFunction:                         # logWriter — SNS-triggered
  CodeUri: ../log-service
  Handler: subscriber.handler
  Events: SNS → LogEventsTopic
  Environment: LOG_MONGO_URI

LogReaderFunction:                         # logReader — HTTP
  CodeUri: ../log-service
  Handler: lambda-read.handler
  Events: HttpApi → /logs/{proxy+} (ALL methods)
  Environment: LOG_MONGO_URI, ROUTE_PREFIX

# Extend CharacterServiceFunction IAM:
#   add sns:Publish on LogEventsTopic (additive to existing RoomNotificationsTopic)
```

### `backend/sam/events/` — NEW test event files

```
backend/sam/events/
  battle-post-battles.json               NEW — HttpApi POST /battles event
  battle-post-conclude.json              NEW — HttpApi POST /battles/:id/conclude event
  battle-patch-battle.json               NEW — HttpApi PATCH /battles/:id event
  log-get-logs.json                      NEW — HttpApi GET /logs?roomId=X event
  log-sns-event.json                     NEW — SNS envelope format (reference
                                               room-notifications-service existing pattern)
```

**Note:** `log-sns-event.json` must use the AWS SNS message envelope schema — reference the existing SNS event format used by `room-notifications-service` tests, not a raw payload.

### `backend/docker-compose.local.yml` — MODIFIED

```yaml
# Add services:
battle-service:
  build: ./battle-service
  ports: ["8086:8086"]
  environment:
    BATTLE_MONGO_URI: mongodb://mongo-battle:27017/munch_battle_service
    NOTIFICATIONS_REDIS_CHANNEL: room_notifications    # existing channel
    LOG_REDIS_CHANNEL: log_events                         # new channel
    REDIS_URL: redis://redis:6379
    PORT: 8086
  depends_on: [mongo-battle, redis]

log-service:
  build: ./log-service
  ports: ["8087:8087"]
  environment:
    LOG_MONGO_URI: mongodb://mongo-log:27017/munch_log_service
    LOG_REDIS_CHANNEL: log_events
    REDIS_URL: redis://redis:6379
    PORT: 8087
  depends_on: [mongo-log, redis]

mongo-battle:
  image: mongo
  ports: ["27024:27017"]

mongo-log:
  image: mongo
  ports: ["27025:27017"]
```

### `backend/nginx/nginx.conf` — MODIFIED

```nginx
# Add upstreams:
upstream battle_service  { server battle-service:8086; }
upstream log_service     { server log-service:8087; }

# Add location blocks:
location /battles { proxy_pass http://battle_service; }
location /logs    { proxy_pass http://log_service; }
```

## New Frontend Files

```
frontend/
├── api/
│   ├── battles.ts                           NEW — apiRequest wrappers for battle-service
│   └── logs.ts                              NEW — apiRequest wrappers for log-service
│
├── hooks/
│   ├── useRoomBattle.ts                     NEW — HTTP-on-mount + WS subscription
│   ├── useBattleActions.ts                  NEW — start/patch/conclude/discard mutations
│   └── useRoomLogs.ts                       NEW — paginated log query with cursor state
│
└── app/munchkin/
    ├── [roomNumber].tsx                     DELETED — migrated to directory route
    └── [roomNumber]/
        ├── index.tsx                        MIGRATED from [roomNumber].tsx
        │                                    ⚠️ HARD PREREQUISITE — atomic commit before
        │                                    any Battle View or Log View work begins
        ├── (battle)/
        │   └── index.tsx                    NEW — Battle View (Expo Router modal group)
        └── log.tsx                          NEW — Log View
```

## Architectural Boundaries

### Service Communication (no synchronous inter-service HTTP calls)

```
Frontend
  │
  ├── GET/POST/PATCH/DELETE /battles  ──→  battle-service
  ├── GET /logs                       ──→  log-service (logReader)
  ├── GET/POST/PATCH/DELETE /characters──→ character-service  (unchanged)
  └── WS /ws                          ──→  room-notifications-service (unchanged)

battle-service
  ├──→ RoomNotificationsTopic (SNS) / room_notifications (Redis)
  └──→ LogEventsTopic (SNS)           / log_events (Redis)

character-service  [MODIFIED]
  ├──→ RoomNotificationsTopic (SNS) / room_notifications (Redis)  [existing]
  └──→ LogEventsTopic (SNS)           / log_events (Redis)             [NEW]

room-notifications-service  [MODIFIED]
  ←── RoomNotificationsTopic (SNS) / room_notifications (Redis)  [existing]
  ←── battle_* events on same channel                                  [NEW subscription]
  └──→ WebSocket broadcast to room clients

log-service (logWriter)
  ←── LogEventsTopic (SNS) / log_events (Redis)
  └──→ logEvents MongoDB collection
```

### Data Ownership

| Collection | Owner | No other service reads or writes |
|---|---|---|
| `battles` | `battle-service` | ✅ |
| `logEvents` | `log-service` | ✅ |
| `characters` | `character-service` | ✅ (unchanged) |
| `rooms` | `room-service` | ✅ (unchanged) |

## Requirements → Structure Mapping

| FR Range | Capability | Primary Files |
|---|---|---|
| FR20–28 | Battle Management | `backend/battle-service/src/`, `frontend/api/battles.ts`, `frontend/hooks/useBattle*.ts`, `app/munchkin/[roomNumber]/(battle)/index.tsx` |
| FR29–34 | Session History & Logs | `backend/log-service/src/`, `frontend/api/logs.ts`, `frontend/hooks/useRoomLogs.ts`, `app/munchkin/[roomNumber]/log.tsx` |
| FR1–19 | Room/Character/Realtime stabilisation | Existing services + `[roomNumber]/index.tsx` Room View enhancements |
| FR35–48 | Release readiness / cross-cutting | Coverage gate (all services), AppTheme migration, cross-platform parity |
