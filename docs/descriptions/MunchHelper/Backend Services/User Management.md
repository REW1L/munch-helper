# User Management

Service responsible for managing Users in the system, including creating and updating User profiles.

# Database Schema
```mermaid
erDiagram
    USER {
        string Id PK "NOT NULL"
        string Name "NOT NULL"
        int AvatarID
        datetime CreatedAt "NOT NULL"
        datetime UpdatedAt "NOT NULL"
    }
```

# API Endpoints

**Global initial Path**: `/users` 

**Type**: `HTTP`

## Create User

**Description**: Creates a User with random parameters, and returns a User structure

**Path**: `/users` 

**Method**: `POST`

**Inputs**: None

**Outputs**:

- `ID`: unique id of the user
- `Name`: nickname of a user
- `AvatarID`: id of an avatar

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant User Management
    participant Database

    Client ->>+ User Management: POST /users
    User Management ->>+ Database: Create User
    Database -->>- User Management: User Created
    User Management -->>- Client: 200 OK with User
```

## Get User

**Description**: Gets a User by UserID, and returns a User structure

**Path**: `/users/<UserId>`

**Method**: `GET`

**Inputs**: None

**Outputs**:

- `ID`: unique id of the user
- `Name`: nickname of a user
- `AvatarID`: id of an avatar

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant User Management
    participant Database

    Client ->>+ User Management: GET /users/{UserId}
    User Management ->>+ Database: Get User
    Database -->>- User Management: User Retrieved
    User Management -->>- Client: 200 OK with User
```

## Update User

**Description**: Updates User profile with new parameters, and returns a User structure

**Path**: `/users/<UserId>`

**Method**: `POST`

**Inputs**:

- `ID`: User ID of the User to update
- `Name` (can be `null`): User name to update
- `AvatarID` (can be `null`): User Avatar to update

**Outputs**:

- `ID`: unique id of the user
- `Name`: nickname of a user
- `AvatarID`: id of an avatar

**Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant User Management
    participant Database

    Client ->>+ User Management: POST /users/{UserId}
    User Management ->>+ Database: Update User
    Database -->>- User Management: User Updated
    User Management -->>- Client: 200 OK with User
```