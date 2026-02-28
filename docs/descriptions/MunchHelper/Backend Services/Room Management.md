# Room Management

Room Management Service is responsible for creating and managing rooms in Munch Helper. It provides APIs for creating and joining rooms. Currently only `munchkin` room type should be supported.

# Database Schema
```mermaid
erDiagram
    ROOM {
        string Id PK "NOT NULL"
        string RoomTypeID FK "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }
    ROOM_TYPE {
        string Id PK "NOT NULL"
        string RoomTypeID FK "NOT NULL UNIQUE"
        string Name "NOT NULL"
        datetime CreatedAt "NOT NULL"
    }
    ROOM ||--|| ROOM_TYPE : has
```

# API Endpoints

**Global initial Path**: `/rooms` 

**Type**: `HTTP`

## Create Room

**Description**: Creates a Room of `RoomTypeID`, Initializes it with a User with `UserID` and Returns `RoomID`.

**Path**: `/rooms`

**Method**: `POST`

**Inputs**:

- UserID

**Outputs**:

- RoomID

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Room Management
    participant Database
    participant Character Management

    Client ->>+ Room Management: POST /rooms
    Room Management ->>+ Database: Create Room entry
    Database -->>- Room Management: OK
    Room Management ->>+ Character Management: POST /characters
    Character Management -->>- Room Management: 200 OK
    Room Management -->>- Client: 200 OK with RoomID
```

## Join Room

**Description**: Joins a Room of `RoomTypeID` and `RoomID` with a User with `UserID`.

**Path**: `/rooms/associations`

**Method**: `POST`

**Inputs**:

- UserID

**Outputs**:

- RoomID

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Room Management
    participant Database
    participant Character Management

    Client ->>+ Room Management: POST /rooms/associations
    Room Management ->>+ Database: Check Room exists
    Database -->>- Room Management: OK
    Room Management ->>+ Character Management: POST /characters
    Character Management -->>- Room Management: 200 OK
    Room Management -->>- Client: 200 OK with RoomID
```
