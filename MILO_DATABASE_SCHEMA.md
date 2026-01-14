# Milo Database Schema

**Project**: Jira-type Project Management Application  
**Database**: PostgreSQL (Supabase)  
**Source**: https://github.com/Icokruger999/milo

---

## Overview

Milo is a Jira-type project management application with support for:
- Projects and project management
- Tasks/Issues with assignments, labels, and comments
- Teams and team members
- Products and roadmaps
- Incident management (ITSM-style)
- Document/wiki pages (Flakes)

---

## Tables and Columns

### 1. **Users** (User accounts and authentication)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Auto-incrementing user ID |
| `Name` | VARCHAR(100) | NOT NULL | User's display name |
| `Email` | VARCHAR(255) | NOT NULL, UNIQUE | User email (unique) |
| `PasswordHash` | BYTEA | NOT NULL | Hashed password |
| `PasswordSalt` | BYTEA | NOT NULL | Password salt |
| `RequiresPasswordChange` | BOOLEAN | DEFAULT FALSE | Flag for forced password change |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| `IsActive` | BOOLEAN | DEFAULT TRUE | Account active status |

**Indexes:**
- `IX_Users_Email` (UNIQUE) - Fast email lookups

---

### 2. **Products** (Product catalog)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Product ID |
| `Name` | VARCHAR(100) | NOT NULL | Product name |
| `Description` | VARCHAR(500) | | Product description |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `IX_Products_Name` - Fast name lookups

---

### 3. **Projects** (Project workspaces)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Project ID |
| `Name` | VARCHAR(255) | NOT NULL | Project name |
| `Description` | VARCHAR(1000) | | Project description |
| `Key` | VARCHAR(50) | | Project key (e.g., "PROJ") |
| `Status` | VARCHAR(50) | NOT NULL | Project status (Active, Archived, etc.) |
| `OwnerId` | INTEGER | NOT NULL, FK → Users.Id | Project owner |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `UpdatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Foreign Keys:**
- `FK_Projects_Users_OwnerId` → `Users(Id)` ON DELETE RESTRICT

**Indexes:**
- `IX_Projects_Key` - Fast key lookups
- `IX_Projects_Name` - Fast name lookups
- `IX_Projects_OwnerId` - Owner filtering
- `IX_Projects_Status` - Status filtering
- `IX_Projects_CreatedAt` - Date sorting
- `IX_Projects_Status_CreatedAt` - Common filter pattern
- `IX_Projects_OwnerId_Status` - Owner + status filtering
- `IX_Projects_Status_Name` - Status + name sorting

---

### 4. **ProjectMembers** (Many-to-many: Projects ↔ Users)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Membership ID |
| `ProjectId` | INTEGER | NOT NULL, FK → Projects.Id | Project reference |
| `UserId` | INTEGER | NOT NULL, FK → Users.Id | User reference |
| `Role` | VARCHAR(50) | NOT NULL | Member role (e.g., Admin, Member) |
| `JoinedAt` | TIMESTAMPTZ | DEFAULT NOW() | Join timestamp |

**Foreign Keys:**
- `FK_ProjectMembers_Projects_ProjectId` → `Projects(Id)` ON DELETE CASCADE
- `FK_ProjectMembers_Users_UserId` → `Users(Id)` ON DELETE CASCADE

**Indexes:**
- `IX_ProjectMembers_ProjectId` - Project filtering
- `IX_ProjectMembers_UserId` - User filtering
- `IX_ProjectMembers_ProjectId_UserId` (UNIQUE) - Prevent duplicate memberships

---

### 5. **ProjectInvitations** (Project invitation system)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Invitation ID |
| `ProjectId` | INTEGER | NOT NULL, FK → Projects.Id | Project reference |
| `Email` | VARCHAR(255) | NOT NULL | Invitee email |
| `Name` | VARCHAR(255) | | Invitee name |
| `Status` | VARCHAR(50) | NOT NULL | Invitation status (Pending, Accepted, Declined) |
| `Token` | VARCHAR(100) | NOT NULL, UNIQUE | Invitation token |
| `InvitedById` | INTEGER | NOT NULL, FK → Users.Id | User who sent invitation |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `AcceptedAt` | TIMESTAMPTZ | | Acceptance timestamp |
| `ExpiresAt` | TIMESTAMPTZ | | Expiration timestamp |

**Foreign Keys:**
- `FK_ProjectInvitations_Projects_ProjectId` → `Projects(Id)` ON DELETE CASCADE
- `FK_ProjectInvitations_Users_InvitedById` → `Users(Id)` ON DELETE RESTRICT

**Indexes:**
- `IX_ProjectInvitations_Email` - Email lookups
- `IX_ProjectInvitations_ProjectId` - Project filtering
- `IX_ProjectInvitations_Token` (UNIQUE) - Token validation
- `IX_ProjectInvitations_InvitedById` - Inviter filtering

---

### 6. **Tasks** (Issues/Tasks/Jira tickets)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Task ID |
| `Title` | VARCHAR(500) | NOT NULL | Task title |
| `Description` | VARCHAR(2000) | | Task description |
| `Status` | VARCHAR(50) | NOT NULL | Task status (To Do, In Progress, Done, etc.) |
| `Label` | VARCHAR(50) | | Task label/category |
| `TaskId` | VARCHAR(20) | | Human-readable task ID (e.g., "PROJ-123") |
| `AssigneeId` | INTEGER | FK → Users.Id | Assigned user |
| `CreatorId` | INTEGER | FK → Users.Id | Task creator |
| `ProductId` | INTEGER | FK → Products.Id | Associated product |
| `ProjectId` | INTEGER | FK → Projects.Id | Associated project |
| `Priority` | INTEGER | DEFAULT 0 | Priority level (0 = lowest) |
| `DueDate` | TIMESTAMPTZ | | Due date |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `UpdatedAt` | TIMESTAMPTZ | | Last update timestamp |
| `IsDeleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| `ParentTaskId` | INTEGER | FK → Tasks.Id | Parent task (for subtasks) |

**Foreign Keys:**
- `FK_Tasks_Users_AssigneeId` → `Users(Id)` ON DELETE SET NULL
- `FK_Tasks_Users_CreatorId` → `Users(Id)` ON DELETE SET NULL
- `FK_Tasks_Products_ProductId` → `Products(Id)` ON DELETE SET NULL
- `FK_Tasks_Projects_ProjectId` → `Projects(Id)` ON DELETE SET NULL
- `FK_Tasks_Tasks_ParentTaskId` → `Tasks(Id)` ON DELETE SET NULL

**Indexes:**
- `IX_Tasks_TaskId` - Human-readable ID lookup
- `IX_Tasks_Status` - Status filtering
- `IX_Tasks_AssigneeId` - Assignee filtering
- `IX_Tasks_CreatorId` - Creator filtering
- `IX_Tasks_ProductId` - Product filtering
- `IX_Tasks_ProjectId` - Project filtering (most common)
- `IX_Tasks_ParentTaskId` - Subtask relationships
- `IX_Tasks_CreatedAt` - Date sorting
- `IX_Tasks_ProjectId_Status` - Common filter: project + status
- `IX_Tasks_ProjectId_CreatedAt` - Project + date sorting
- `IX_Tasks_Status_ProjectId_CreatedAt` - Board view queries
- `IX_Tasks_AssigneeId_Status` - Assignee workload
- `IX_Tasks_ProjectId_AssigneeId_Status` - Project + assignee filtering

---

### 7. **TaskComments** (Comments on tasks)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Comment ID |
| `TaskId` | INTEGER | NOT NULL, FK → Tasks.Id | Task reference |
| `Text` | VARCHAR(2000) | NOT NULL | Comment text |
| `AuthorId` | INTEGER | NOT NULL, FK → Users.Id | Comment author |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `UpdatedAt` | TIMESTAMPTZ | | Last update timestamp |
| `IsDeleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Foreign Keys:**
- `FK_TaskComments_Tasks_TaskId` → `Tasks(Id)` ON DELETE CASCADE
- `FK_TaskComments_Users_AuthorId` → `Users(Id)` ON DELETE RESTRICT

**Indexes:**
- `IX_TaskComments_TaskId` - Task filtering
- `IX_TaskComments_AuthorId` - Author filtering

---

### 8. **TaskLinks** (Task relationships/links)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Link ID |
| `SourceTaskId` | INTEGER | NOT NULL, FK → Tasks.Id | Source task |
| `TargetTaskId` | INTEGER | NOT NULL, FK → Tasks.Id | Target task |
| `LinkType` | VARCHAR(50) | DEFAULT 'relates' | Link type (relates, blocks, duplicates, etc.) |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Foreign Keys:**
- `FK_TaskLinks_Tasks_SourceTaskId` → `Tasks(Id)` ON DELETE CASCADE
- `FK_TaskLinks_Tasks_TargetTaskId` → `Tasks(Id)` ON DELETE CASCADE

**Indexes:**
- `IX_TaskLinks_SourceTaskId` - Source task filtering
- `IX_TaskLinks_TargetTaskId` - Target task filtering
- `IX_TaskLinks_SourceTaskId_TargetTaskId` - Bidirectional lookup

---

### 9. **Labels** (Task labels/tags)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Label ID |
| `Name` | VARCHAR(100) | NOT NULL | Label name |
| `Color` | VARCHAR(7) | | Hex color code (e.g., "#FF0000") |
| `Description` | VARCHAR(500) | | Label description |
| `ProjectId` | INTEGER | FK → Projects.Id | Associated project |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `UpdatedAt` | TIMESTAMPTZ | | Last update timestamp |
| `IsDeleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Foreign Keys:**
- `FK_Labels_Projects_ProjectId` → `Projects(Id)` ON DELETE CASCADE

**Indexes:**
- `IX_Labels_Name` - Name lookups
- `IX_Labels_ProjectId` - Project filtering

---

### 10. **RoadmapItems** (Product roadmap items)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Roadmap item ID |
| `Title` | VARCHAR(200) | NOT NULL | Item title |
| `Description` | VARCHAR(1000) | | Item description |
| `StartDate` | TIMESTAMPTZ | NOT NULL | Start date |
| `EndDate` | TIMESTAMPTZ | NOT NULL | End date |
| `Status` | VARCHAR(50) | NOT NULL | Item status |
| `ProductId` | INTEGER | NOT NULL, FK → Products.Id | Associated product |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Foreign Keys:**
- `FK_RoadmapItems_Products_ProductId` → `Products(Id)` ON DELETE CASCADE

**Indexes:**
- `IX_RoadmapItems_ProductId` - Product filtering
- `IX_RoadmapItems_Status` - Status filtering

---

### 11. **TimelineEvents** (Product timeline events)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Event ID |
| `Title` | VARCHAR(200) | NOT NULL | Event title |
| `Description` | VARCHAR(1000) | | Event description |
| `EventDate` | TIMESTAMPTZ | NOT NULL | Event date |
| `EventType` | VARCHAR(50) | NOT NULL | Event type (Release, Milestone, etc.) |
| `ProductId` | INTEGER | NOT NULL, FK → Products.Id | Associated product |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Foreign Keys:**
- `FK_TimelineEvents_Products_ProductId` → `Products(Id)` ON DELETE CASCADE

**Indexes:**
- `IX_TimelineEvents_ProductId` - Product filtering
- `IX_TimelineEvents_EventDate` - Date sorting

---

### 12. **Flakes** (Document/wiki pages)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Flake ID |
| `Title` | VARCHAR(500) | NOT NULL | Document title |
| `Content` | VARCHAR(10000) | | Document content (markdown/HTML) |
| `ProjectId` | INTEGER | FK → Projects.Id | Associated project |
| `AuthorId` | INTEGER | FK → Users.Id | Document author |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `UpdatedAt` | TIMESTAMPTZ | | Last update timestamp |
| `IsDeleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Foreign Keys:**
- `FK_Flakes_Projects_ProjectId` → `Projects(Id)` ON DELETE CASCADE
- `FK_Flakes_Users_AuthorId` → `Users(Id)` ON DELETE SET NULL

**Indexes:**
- `IX_Flakes_ProjectId` - Project filtering
- `IX_Flakes_AuthorId` - Author filtering

---

### 13. **Teams** (Team/organization groups)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Team ID |
| `Name` | VARCHAR(200) | NOT NULL | Team name |
| `Description` | VARCHAR(1000) | | Team description |
| `Avatar` | VARCHAR(50) | | Avatar identifier |
| `ProjectId` | INTEGER | FK → Projects.Id | Associated project |
| `CreatedById` | INTEGER | NOT NULL, FK → Users.Id | Team creator |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `UpdatedAt` | TIMESTAMPTZ | | Last update timestamp |
| `IsDeleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Foreign Keys:**
- `FK_Teams_Projects_ProjectId` → `Projects(Id)` ON DELETE SET NULL
- `FK_Teams_Users_CreatedById` → `Users(Id)` ON DELETE RESTRICT

**Indexes:**
- `IX_Teams_Name` - Name lookups
- `IX_Teams_ProjectId` - Project filtering
- `IX_Teams_CreatedById` - Creator filtering

---

### 14. **TeamMembers** (Many-to-many: Teams ↔ Users)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Membership ID |
| `TeamId` | INTEGER | NOT NULL, FK → Teams.Id | Team reference |
| `UserId` | INTEGER | NOT NULL, FK → Users.Id | User reference |
| `Title` | VARCHAR(100) | | Member title/role name |
| `Role` | VARCHAR(50) | DEFAULT 'member' | Member role (leader, member, etc.) |
| `JoinedAt` | TIMESTAMPTZ | DEFAULT NOW() | Join timestamp |
| `IsActive` | BOOLEAN | DEFAULT TRUE | Active status |

**Foreign Keys:**
- `FK_TeamMembers_Teams_TeamId` → `Teams(Id)` ON DELETE CASCADE
- `FK_TeamMembers_Users_UserId` → `Users(Id)` ON DELETE CASCADE

**Indexes:**
- `IX_TeamMembers_TeamId` - Team filtering
- `IX_TeamMembers_UserId` - User filtering
- `IX_TeamMembers_TeamId_UserId` (UNIQUE) - Prevent duplicate memberships

---

### 15. **Incidents** (ITSM incident management - **PascalCase table**)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Incident ID |
| `IncidentNumber` | VARCHAR(50) | NOT NULL, UNIQUE | Human-readable incident number |
| `Subject` | VARCHAR(200) | NOT NULL | Incident subject |
| `Description` | TEXT | | Incident description |
| `RequesterId` | INTEGER | FK → incident_requesters.id | Requester reference |
| `AgentId` | INTEGER | FK → incident_assignees.id | Assigned agent |
| `GroupId` | INTEGER | FK → incident_groups.id | Assigned group |
| `Department` | VARCHAR(100) | | Department |
| `Status` | VARCHAR(50) | DEFAULT 'New' | Incident status |
| `Priority` | VARCHAR(50) | DEFAULT 'Low' | Priority (Low, Medium, High, Critical) |
| `Urgency` | VARCHAR(50) | | Urgency level |
| `Impact` | VARCHAR(50) | | Impact level |
| `Source` | VARCHAR(50) | | Incident source |
| `Category` | VARCHAR(100) | | Category |
| `SubCategory` | VARCHAR(100) | | Subcategory |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `UpdatedAt` | TIMESTAMPTZ | | Last update timestamp |
| `ResolvedAt` | TIMESTAMPTZ | | Resolution timestamp |
| `ClosedAt` | TIMESTAMPTZ | | Closure timestamp |
| `PlannedStartDate` | TIMESTAMPTZ | | Planned start date |
| `PlannedEndDate` | TIMESTAMPTZ | | Planned end date |
| `PlannedEffort` | VARCHAR(50) | | Planned effort |
| `FirstResponseDue` | TIMESTAMPTZ | | First response due date |
| `ResolutionDue` | TIMESTAMPTZ | | Resolution due date |
| `FirstResponseAt` | TIMESTAMPTZ | | First response timestamp |
| `Tags` | VARCHAR(500) | | Tags (comma-separated) |
| `AssociatedAssets` | TEXT | | Associated assets |
| `ProjectId` | INTEGER | FK → Projects.Id | Associated project |
| `Attachments` | TEXT | | Attachment references |
| `Resolution` | TEXT | | Resolution notes |

**Foreign Keys:**
- `FK_Incidents_incident_requesters_RequesterId` → `incident_requesters(id)` ON DELETE RESTRICT
- `FK_Incidents_incident_assignees_AgentId` → `incident_assignees(id)` ON DELETE SET NULL
- `FK_Incidents_incident_groups_GroupId` → `incident_groups(id)` ON DELETE SET NULL
- `FK_Incidents_Projects_ProjectId` → `Projects(Id)` ON DELETE SET NULL

**Indexes:**
- `IX_Incidents_IncidentNumber` (UNIQUE) - Incident number lookup
- `IX_Incidents_Status` - Status filtering
- `IX_Incidents_Priority` - Priority filtering
- `IX_Incidents_CreatedAt` - Date sorting
- `IX_Incidents_ProjectId` - Project filtering
- `IX_Incidents_RequesterId` - Requester filtering
- `IX_Incidents_AgentId` - Agent filtering
- `IX_Incidents_GroupId` - Group filtering
- `IX_Incidents_ProjectId_Status` - Common filter pattern
- `IX_Incidents_ProjectId_CreatedAt` - Project + date sorting
- `IX_Incidents_Status_Priority` - Status + priority filtering
- `IX_Incidents_RequesterId_CreatedAt` - Requester history
- `IX_Incidents_AgentId_Status` - Agent workload
- `IX_Incidents_ProjectId_Status_CreatedAt` - Complex filtering

---

### 16. **incident_requesters** (Incident requesters - **snake_case table**)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Requester ID |
| `name` | VARCHAR(255) | NOT NULL | Requester name |
| `email` | VARCHAR(255) | NOT NULL | Requester email |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | | Last update timestamp |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active status |

**Indexes:**
- `IX_incident_requesters_email` - Email lookups
- `IX_incident_requesters_is_active` - Active filtering

---

### 17. **incident_assignees** (Incident assignees - **snake_case table**)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Assignee ID |
| `name` | VARCHAR(255) | NOT NULL | Assignee name |
| `email` | VARCHAR(255) | NOT NULL | Assignee email |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | | Last update timestamp |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active status |

**Indexes:**
- `IX_incident_assignees_email` - Email lookups
- `IX_incident_assignees_is_active` - Active filtering

---

### 18. **incident_groups** (Incident groups - **snake_case table**)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Group ID |
| `name` | VARCHAR(255) | NOT NULL | Group name |
| `description` | TEXT | | Group description |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | | Last update timestamp |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active status |

**Indexes:**
- `IX_incident_groups_name` - Name lookups
- `IX_incident_groups_is_active` - Active filtering

---

### 19. **ReportRecipients** (Report email recipients)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | SERIAL | PRIMARY KEY | Recipient ID |
| `Email` | VARCHAR(200) | NOT NULL | Recipient email |
| `Name` | VARCHAR(100) | NOT NULL | Recipient name |
| `ReportType` | VARCHAR(50) | DEFAULT 'DailyIncidents' | Report type |
| `IsActive` | BOOLEAN | DEFAULT TRUE | Active status |
| `CreatedAt` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `LastSentAt` | TIMESTAMPTZ | | Last sent timestamp |
| `ProjectId` | INTEGER | FK → Projects.Id | Associated project |

**Foreign Keys:**
- `FK_ReportRecipients_Projects_ProjectId` → `Projects(Id)` ON DELETE SET NULL

**Indexes:**
- `IX_ReportRecipients_Email` - Email lookups
- `IX_ReportRecipients_ProjectId` - Project filtering
- `IX_ReportRecipients_IsActive` - Active filtering

---

### 20. **__EFMigrationsHistory** (Entity Framework migration tracking)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `MigrationId` | VARCHAR(150) | PRIMARY KEY | Migration identifier |
| `ProductVersion` | VARCHAR(32) | NOT NULL | EF Core version |

**Note:** This table is managed by Entity Framework Core and tracks which migrations have been applied.

---

## Key Relationships

### Project Hierarchy
- **Projects** → **ProjectMembers** → **Users**
- **Projects** → **ProjectInvitations** → **Users**
- **Projects** → **Tasks**
- **Projects** → **Labels**
- **Projects** → **Teams**
- **Projects** → **Flakes**
- **Projects** → **Incidents**

### Task Hierarchy
- **Tasks** → **Tasks** (Parent/Child via `ParentTaskId`)
- **Tasks** → **TaskLinks** → **Tasks** (Task relationships)
- **Tasks** → **TaskComments** → **Users**

### Product Hierarchy
- **Products** → **Tasks**
- **Products** → **RoadmapItems**
- **Products** → **TimelineEvents**

### Team Hierarchy
- **Teams** → **TeamMembers** → **Users**

### Incident Hierarchy
- **Incidents** → **incident_requesters**
- **Incidents** → **incident_assignees**
- **Incidents** → **incident_groups**
- **Incidents** → **Projects**

---

## Naming Conventions

- **PascalCase tables**: Most tables use PascalCase (e.g., `Users`, `Projects`, `Tasks`)
- **snake_case tables**: Incident-related tables use snake_case (e.g., `incident_requesters`, `incident_assignees`, `incident_groups`)
- **Column naming**: Matches table naming convention (PascalCase for PascalCase tables, snake_case for snake_case tables)
- **Index naming**: `IX_TableName_ColumnName` or `IX_TableName_Column1_Column2` for composite indexes

---

## Database Setup

The schema is designed for **PostgreSQL** (specifically **Supabase**). 

To create the tables:
1. Use Entity Framework Core migrations (recommended)
2. Or run the `create-all-tables.sql` script directly in Supabase SQL Editor

**Note:** If running SQL directly, Entity Framework won't track migrations, so it may attempt to run migrations again on API startup.

