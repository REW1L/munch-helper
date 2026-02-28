# Character Management

Service responsible for managing characters in rooms, including creating, updating, and deleting characters. Each character is associated with a user and a room, and has attributes such as name, avatar, level, power, class, etc.

# Database Schema
```mermaid
erDiagram
    CHARACTER {
        string Id PK "NOT NULL"
        string RoomID "NOT NULL"
        string UserID "NULL"
        string Name "NOT NULL"
        int Avatar
        int Level
        int Power
        string Class
        string Race
        string Gender
        datetime CreatedAt "NOT NULL"
        datetime UpdatedAt "NOT NULL"
    }
```

# API Endpoints

**Global initial Path**: `/characters`

**Type**: `HTTP`

## Get Characters

**Description**: Get all characters in a room

**Path**: `/characters?roomId=<RoomId>`

**Type**: `HTTP`

**Method**: `GET`

**Input**: None

**Output**:

- `characters` : Array of Characters in a Room
    - `Id`: Character Id
    - `Name`: Character Name
    - `Avatar`: Character Avatar
    - `Level`: Current level
    - `Power`: Current Power
    - `Class`: String representation of an Array of current classes
    - `Race`: String representation of an Array of current races
    - `Gender`: String representation of an Array of current genders

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Character Management
    participant Database

    Client ->>+ Character Management: GET /characters?roomId={roomId}
    Character Management ->>+ Database: Get Characters for RoomID
    Database -->>- Character Management: Characters
    Character Management -->>- Client: 200 OK with Characters
```

## Create a Character

**Description**: Create a character in a room

**Path**: `/characters` 

**Type**: `HTTP`

**Method**: `PUT`

**Input**:

- `RoomID`: Room ID to create a character in
- `UserID`: User ID to associate the character with
- `Name`: Name for the new character
- `Avatar`: Avatar for the new character

**Output**:

- `Id`: Character Id
- `Name`: Character Name
- `Avatar`: Character Avatar
- `Level`: Default level
- `Power`: Default Power
- `Class`: String representation of an Array of default classes
- `Race`: String representation of an Array of default races
- `Gender`: String representation of an Array of default genders

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Character Management
    participant Database
    participant Notifications Message Broker

    Client ->>+ Character Management: PUT /characters
    Character Management ->>+ Database: Create default Character for RoomID and UserID
    Database -->>- Character Management: OK
    Character Management ->>+ Notifications Message Broker: Publish Character Created Event
    Notifications Message Broker -->>- Character Management: OK
    Character Management -->>- Client: 200 OK with Character created
```

## Update a Character

**Description**: Update any parameters of a character in a room

**Path**: `/characters/<CharacterId>` 

**Type**: `HTTP`

**Method**: `PATCH`

**Input**:

- `Name`: (Optional) Character Name
- `Avatar`: (Optional) Character Avatar
- `Level`: (Optional) New Level
- `Power`: (Optional) Default Power
- `Class`: (Optional) String representation of an Array of default classes
- `Race`: (Optional) String representation of an Array of default races
- `Gender`: (Optional) String representation of an Array of default genders

**Output**:

- `Id`: Character Id
- `Name`: Character Name
- `Avatar`: Character Avatar
- `Level`: New Level
- `Power`: Default Power
- `Class`: String representation of an Array of default classes
- `Race`: String representation of an Array of default races
- `Gender`: String representation of an Array of default genders
- `CreatedAt`: Character creation timestamp
- `UpdatedAt`: Character last update timestamp

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Character Management
    participant Database
    participant Notifications Message Broker

    Client ->>+ Character Management: PATCH /characters/{characterId}
    Character Management ->>+ Database: Update Character
    Database -->>- Character Management: OK
    Character Management ->>+ Notifications Message Broker: Publish Character Updated Event
    Notifications Message Broker -->>- Character Management: OK
    Character Management -->>- Client: 200 OK with Character updated
```

## Delete a Character

**Description**: Delete a character in a room

**Path**: `/characters/<CharacterId>` 

**Type**: `HTTP`

**Method**: `DELETE`

**Input**: None

**Output**: `200 OK`

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Character Management
    participant Database
    participant Notifications Message Broker

    Client ->>+ Character Management: DELETE /characters/{characterId}
    Character Management ->>+ Database: Delete Character
    Database -->>- Character Management: OK
    Character Management ->>+ Notifications Message Broker: Publish Character Deleted Event
    Notifications Message Broker -->>- Character Management: OK
    Character Management -->>- Client: 200 OK
```
