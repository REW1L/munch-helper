# Backend Services

# Services

[User Management](Backend%20Services/User%20Management.md)

[Room Management](Backend%20Services/Room%20Management.md)

[Room Notifications](Backend%20Services/Room%20Notifications.md)

[Character Management](Backend%20Services/Character%20Management.md)

# Interservice Flows

## Create Room Flow
```mermaid
sequenceDiagram
    participant Client
    participant Room Management
    participant Notification Service
    participant Character Management

    Client ->>+ Room Management: /rooms/{roomTypeId}/create
    Room Management -->>- Client: 200 OK with RoomID

    Client ->>+ Character Management: Get Room Characters
    Character Management -->>- Client: Room Characters

    Client ->> Notification Service: /rooms/{roomTypeId}/{roomId}/subscribe
    Notification Service -->> Client: 101 Switching Protocols (WebSocket Established)
```

## Join Room Flow
```mermaid
sequenceDiagram
    participant Client
    participant Room Management
    participant Notification Service
    participant Character Management

    Client ->>+ Room Management: /rooms/{roomTypeId}/{roomId}/join
    Room Management -->>- Client: 200 OK

    Client ->>+ Character Management: Get Room Characters
    Character Management -->>- Client: Room Characters

    Client ->> Notification Service: /rooms/{roomTypeId}/{roomId}/subscribe
    Notification Service -->> Client: 101 Switching Protocols (WebSocket Established)
```
