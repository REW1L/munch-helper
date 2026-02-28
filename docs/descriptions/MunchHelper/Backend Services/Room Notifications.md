# Room Notifications

Room Notifications Service is responsible for sending real-time notifications to clients subscribed to a room.

# Flow
```mermaid
sequenceDiagram
		participant Client
		participant Room Notifications
		participant Message Broker
		participant Character Management

		Client ->> Room Notifications: Connect (WebSocket)
		Room Notifications ->> Client: 101 Switching Protocols (WebSocket Established)

		Character Management ->> Message Broker: Character Created Event
		Message Broker -->> Room Notifications: Character Created Event
		Room Notifications -->> Client: Character Created Event

		Character Management ->> Message Broker: Character Updated Event
		Message Broker -->> Room Notifications: Character Updated Event
		Room Notifications -->> Client: Character Updated Event

		Character Management ->> Message Broker: Character Deleted Event
		Message Broker -->> Room Notifications: Character Deleted Event
		Room Notifications -->> Client: Character Deleted Event

		Client ->> Room Notifications: Disconnect (WebSocket)
		Room Notifications ->> Client: 200 OK
```

# API Endpoints

**Global initial Path**: `/rooms/<RoomId>`

**Type**: `WebSocket`

## Connect

**Description**: Creates a WebSocket connection

**Path**: `/rooms/<RoomId>`

**Method**: WebSocket

**Inputs**: `UserID`

**Outputs**: `101 Switching Protocols` (WebSocket Established)

# Disconnect

**Description**: Close a WebSocket connection

**Path**: `/rooms/<RoomId>`

**Method**: WebSocket

**Inputs**: None

**Outputs**: `200 OK`

# Notifications Events

## Character Created

**Event structure**:

```json
{
	"event": "character_created",
	"event_body": {
		"characterId": "string"
	}
}
```

## Character Updated

**Event structure**:

```json
{
	"event": "character_updated",
	"event_body": {
		"characterId": "string"
	}
}
```

## Character Deleted

**Event structure**:

```json
{
	"event": "character_deleted",
	"event_body": {
		"characterId": "string"
	}
}
```
