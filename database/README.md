# Summit Database Schema

## Overview

This directory contains the database schema definitions for the Summit application. The schema defines the table structure, indexes, and relationships.

**Note:** Database connections have been removed from the application codebase. This schema is kept for reference only.

## Schema Files

- `schema.sql` - Main database schema (base tables)
- `complete_schema.sql` - Complete schema with all features
- `migration_add_*.sql` - Individual migration files for specific features

## Tables

### 1. `users`
User accounts and profiles.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `email` (TEXT, Unique, Not Null) - User email address
- `name` (TEXT) - User's display name
- `avatar_url` (TEXT) - URL to user's avatar image
- `password_hash` (TEXT) - Hashed password (for local auth)
- `company` (TEXT) - Company name (informational only)
- `job_title` (TEXT) - Job title (informational only)
- `phone` (TEXT) - Phone number (informational only)
- `created_at` (TIMESTAMP) - Account creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_users_email` - Index on email for fast lookups

### 2. `meetings`
Scheduled meetings with optional recurrence.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `title` (TEXT, Not Null) - Meeting title
- `description` (TEXT) - Meeting description
- `start_time` (TIMESTAMP, Not Null) - Meeting start time
- `end_time` (TIMESTAMP, Not Null) - Meeting end time
- `room_id` (TEXT, Unique, Not Null) - LiveKit room identifier
- `created_by` (UUID, Foreign Key → users.id) - Meeting creator
- `recurrence` (JSONB) - Recurrence rules: `{enabled: boolean, days_of_week: [0-6]}`
  - Example: `{"enabled": true, "days_of_week": [1, 3, 5]}` for Mon, Wed, Fri
- `created_at` (TIMESTAMP) - Meeting creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_meetings_created_by` - Index on creator
- `idx_meetings_start_time` - Index on start time for queries
- `idx_meetings_room_id` - Index on room_id for lookups

### 3. `meeting_participants`
Many-to-many relationship between meetings and users.

**Columns:**
- `meeting_id` (UUID, Foreign Key → meetings.id) - Meeting reference
- `user_id` (UUID, Foreign Key → users.id) - User reference
- `status` (TEXT, Default: 'pending') - Participation status: 'pending', 'accepted', 'declined'
- `created_at` (TIMESTAMP) - Participation creation timestamp

**Indexes:**
- `idx_meeting_participants_meeting_id` - Index on meeting_id
- `idx_meeting_participants_user_id` - Index on user_id

### 4. `meeting_invitations`
Meeting invitations with acceptance status.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `meeting_id` (UUID, Foreign Key → meetings.id) - Meeting reference
- `inviter_id` (UUID, Foreign Key → users.id) - User who sent the invitation
- `invitee_id` (UUID, Foreign Key → users.id) - User who received the invitation
- `status` (TEXT, Default: 'pending') - Invitation status: 'pending', 'accepted', 'declined'
- `created_at` (TIMESTAMP) - Invitation creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_meeting_invitations_meeting_id` - Index on meeting_id
- `idx_meeting_invitations_invitee_id` - Index on invitee_id
- `idx_meeting_invitations_status` - Index on status

### 5. `attachments`
File attachment metadata.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `user_id` (UUID, Foreign Key → users.id) - User who uploaded the file
- `file_name` (TEXT, Not Null) - Original file name
- `file_path` (TEXT, Not Null) - Storage path
- `file_size` (BIGINT, Not Null) - File size in bytes
- `mime_type` (TEXT) - MIME type
- `chat_id` (TEXT) - For chat attachments (if using persistent storage)
- `meeting_id` (UUID, Foreign Key → meetings.id) - Meeting reference (optional)
- `created_at` (TIMESTAMP) - Upload timestamp

**Indexes:**
- `idx_attachments_user_id` - Index on user_id
- `idx_attachments_chat_id` - Index on chat_id
- `idx_attachments_meeting_id` - Index on meeting_id

### 6. `chat_requests`
Chat requests (friend request-like system).

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `requester_id` (UUID, Foreign Key → users.id) - User who sent the request
- `requestee_id` (UUID, Foreign Key → users.id) - User who received the request
- `status` (TEXT, Default: 'pending') - Request status: 'pending', 'accepted', 'declined'
- `meeting_id` (UUID, Foreign Key → meetings.id) - Meeting reference (optional)
- `meeting_title` (TEXT) - Store meeting title for display in request
- `created_at` (TIMESTAMP) - Request creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_chat_requests_requester_id` - Index on requester_id
- `idx_chat_requests_requestee_id` - Index on requestee_id
- `idx_chat_requests_status` - Index on status

### 7. `chats`
Persistent chat records for both direct and group chats.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `name` (TEXT) - Chat name (for group chats)
- `type` (TEXT, Default: 'direct') - Chat type: 'direct' or 'group'
- `created_by` (UUID, Foreign Key → users.id) - Chat creator
- `created_at` (TIMESTAMP) - Chat creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp
- `last_message` (TEXT) - Last message preview
- `last_message_at` (TIMESTAMP) - Last message timestamp

**Indexes:**
- `idx_chats_type` - Index on type
- `idx_chats_created_by` - Index on created_by
- `idx_chats_updated_at` - Index on updated_at

### 8. `chat_participants`
Many-to-many relationship between chats and users.

**Columns:**
- `chat_id` (UUID, Foreign Key → chats.id) - Chat reference
- `user_id` (UUID, Foreign Key → users.id) - User reference
- `joined_at` (TIMESTAMP) - Join timestamp

**Indexes:**
- `idx_chat_participants_chat_id` - Index on chat_id
- `idx_chat_participants_user_id` - Index on user_id

### 9. `messages`
Chat messages.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `chat_id` (UUID, Foreign Key → chats.id) - Chat reference
- `sender_id` (UUID, Foreign Key → users.id) - Message sender
- `content` (TEXT, Not Null) - Message content
- `type` (TEXT, Default: 'text') - Message type: 'text', 'file', 'image', etc.
- `file_name` (TEXT) - File name (for file messages)
- `file_url` (TEXT) - File URL (for file messages)
- `file_size` (BIGINT) - File size (for file messages)
- `mime_type` (TEXT) - MIME type (for file messages)
- `created_at` (TIMESTAMP) - Message creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp
- `deleted_at` (TIMESTAMP) - Soft delete timestamp

**Indexes:**
- `idx_messages_chat_id` - Index on chat_id
- `idx_messages_sender_id` - Index on sender_id
- `idx_messages_created_at` - Index on created_at

### 10. `message_reads`
Read receipts for chat messages.

**Columns:**
- `message_id` (TEXT, Primary Key) - Message identifier
- `user_id` (UUID, Foreign Key → users.id) - User who read the message
- `read_at` (TIMESTAMP) - Read timestamp

**Indexes:**
- `idx_message_reads_user_id` - Index on user_id
- `idx_message_reads_read_at` - Index on read_at

### 11. `presence`
User online/offline presence status.

**Columns:**
- `user_id` (UUID, Primary Key, Foreign Key → users.id) - User reference
- `status` (TEXT, Default: 'offline') - Presence status: 'online', 'offline', 'away'
- `last_seen` (TIMESTAMP) - Last seen timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_presence_status` - Index on status
- `idx_presence_last_seen` - Index on last_seen

## Triggers

Automatic `updated_at` timestamp updates:
- `update_users_updated_at` - Updates `users.updated_at` on row update
- `update_meetings_updated_at` - Updates `meetings.updated_at` on row update
- `update_meeting_invitations_updated_at` - Updates `meeting_invitations.updated_at` on row update
- `update_chat_requests_updated_at` - Updates `chat_requests.updated_at` on row update
- `update_chats_updated_at` - Updates `chats.updated_at` on row update
- `update_presence_updated_at` - Updates `presence.updated_at` on row update

## Notes

- All UUIDs are auto-generated using `uuid_generate_v4()`
- Foreign keys use `ON DELETE CASCADE` to maintain referential integrity
- The `recurrence` field in `meetings` uses JSONB for flexible recurrence rules
- The `company`, `job_title`, and `phone` fields in `users` are informational only (not used for multi-tenancy)
- All table and column names use lowercase snake_case naming convention
- The database uses UTC timestamps (`TIMESTAMP WITH TIME ZONE`)
