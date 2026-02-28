# Backend Services

# Services

[User Management](Backend%20Services/User%20Management.md)

[Room Management](Backend%20Services/Room%20Management.md)

[Room Notifications](Backend%20Services/Room%20Notifications.md)

[Character Management](Backend%20Services/Character%20Management.md)

# Database Schemas

## Actual Database Schema
```mermaid
erDiagram
    USER {
        string Id PK "NOT NULL"
        string Name "NOT NULL"
        int AvatarID
        datetime CreatedAt "NOT NULL"
        datetime UpdatedAt "NOT NULL"
    }

    ROOM_TYPE {
        string Id PK "NOT NULL"
        string RoomTypeID "NOT NULL UNIQUE"
        string Name "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }

    ROOM {
        string Id PK "NOT NULL"
        string RoomTypeID FK "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }

    CHARACTER {
        string Id PK "NOT NULL"
        string RoomID FK "NOT NULL"
        string UserID FK "NULL"
        string Name "NOT NULL"
        int Avatar
        int Level
        int Power
        list Class
        list Race
        list Gender
        datetime CreatedAt "NOT NULL"
        datetime UpdatedAt "NOT NULL"
    }

    ROOM_TYPE ||--o{ ROOM : categorizes
    ROOM ||--o{ CHARACTER : contains
    USER ||--o{ CHARACTER : owns
```

## Proposed Database Schema
```mermaid
erDiagram
    ROOM_TYPE {
        string Id PK "NOT NULL"
        string Name "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }

    AVATAR {
        string Id PK "NOT NULL"
        string Path "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }

    ROOM {
        string Id PK "NOT NULL"
        string RoomTypeId FK "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }

    USER {
        string Id PK "NOT NULL"
        string Name "NOT NULL"
        string AvatarId FK "NOT NULL"
        datetime CreatedAt "NOT NULL"
        datetime UpdatedAt "NOT NULL"
    }

    ROOM_CHARACTER {
        string Id PK "NOT NULL"
        string RoomId FK "NOT NULL"
        string UserId FK "NULLABLE"
        string CharacterId FK "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }

    MUNCH_CHARACTER {
        string Id PK "NOT NULL"
        string Name "NOT NULL"
        string AvatarId FK "NOT NULL"
        int Level
        int Power
        string Class
        string Race
        string Gender
        datetime CreatedAt "NOT NULL"
        datetime UpdatedAt "NOT NULL"
    }

    ROOM_TYPE ||--o{ ROOM : has
    ROOM ||--o{ ROOM_CHARACTER : contains
    USER ||--o{ ROOM_CHARACTER : participates
    AVATAR ||--o{ USER : represents
    AVATAR ||--o{ MUNCH_CHARACTER : represents
    MUNCH_CHARACTER ||--o{ ROOM_CHARACTER : participates
```


# Flows

## Create Room Flow
```mermaid
sequenceDiagram
    participant Client
    participant Room Management
    participant Notification Service
    participant Character Management

    Client ->>+ Room Management: POST /rooms
    Room Management -->>- Client: 200 OK with RoomID

    Client ->>+ Character Management: GET /characters?roomId={roomId}
    Character Management -->>- Client: Room Characters

    Client ->> Notification Service: GET /rooms/{roomId}
    Notification Service -->> Client: 101 Switching Protocols (WebSocket Established)
```

## Join Room Flow
```mermaid
sequenceDiagram
    participant Client
    participant Room Management
    participant Notification Service
    participant Character Management

    Client ->>+ Room Management: POST /rooms/associations
    Room Management -->>- Client: 200 OK

    Client ->>+ Character Management: GET /characters?roomId={roomId}
    Character Management -->>- Client: Room Characters

    Client ->> Notification Service: GET /rooms/{roomId}
    Notification Service -->> Client: 101 Switching Protocols (WebSocket Established)
```
