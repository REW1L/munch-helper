# Integration Architecture

Generated: 2026-03-19T22:50:33Z

## Cross-Part Integrations

| From | To | Type | Details |
| --- | --- | --- | --- |
| Frontend | Backend HTTP APIs | REST over HTTPS/HTTP | User, room, and character flows go through the shared edge URL |
| Frontend | Backend notifications | WebSocket | `RoomWebSocketClient` connects with `roomId` and `userId` query params |
| Room service | Character service | Internal HTTP | Room creation/join flow initializes or coordinates character-side data |
| Character service | Notifications service | Event bus | Redis channel locally, SNS topic in AWS |
| Infrastructure | Backend stack | CloudFormation output lookup | Pulumi reads API and WebSocket origin URLs from backend stack outputs |

## End-to-End Room Update Flow

1. A client creates, updates, or deletes a character through the backend edge.
2. `character-service` persists the change.
3. `character-service` publishes a room event.
4. `room-notifications-service` receives the event:
   - local mode through Redis subscription
   - cloud mode through SNS-triggered Lambda invocation
5. The notification service pushes the event to active room subscribers.
6. The frontend updates in-room state through WebSocket listeners and query refreshes.

## Edge Composition

- Local: Nginx is the single visible entry point.
- Cloud: CloudFront fronts static assets, `/api/*`, and `/ws*`.

## Integration Risks

- The repo contains both local and cloud notification paths, so changes to event names or payload schemas must stay aligned across client, publisher, and notification consumer code.
- Because the infrastructure stack reads backend outputs from a named CloudFormation stack, deployment order matters.
