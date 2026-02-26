# Room Notifications

**Description**: Subscribe to a room updates

**Path**: `/rooms/<RoomTypeId>/<RoomId>` 

**Type**: `WebSocket`

# Connect

**Description**: Joins a Room and Creates a WebSocket connection

**Path**: `/` 

**Method**: WebSocket

**Inputs**: `UserID`

**Outputs**: `200 OK`

# Send Message

## Character Created

**Event structure**:

```json
{
	"event": "character_created"
	"event_body": {
		"characterId": string
	}
}
```

## Character Updated

**Event structure**:

```json
{
	"event": "character_updated"
	"event_body": {
		"characterId": string
	}
}
```

## Character Deleted

```json
{
	"event": "character_deleted"
	"event_body": {
		"characterId": string
	}
}
```

# Disconnect

**Description**: Close a WebSocket connection

**Path**: `/` 

**Method**: WebSocket

**Inputs**: None

**Outputs**: `200 OK`