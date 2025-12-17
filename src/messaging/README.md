# Unified Messaging System API Documentation

## Overview

The Unified Messaging System provides a centralized approach to managing conversations (threads) and messages across multiple communication channels. Core-MS serves as the single source of truth for all messaging data, while Channel-MS adapters handle channel-specific communication via NATS events.

## Architecture

```
┌─────────────┐    NATS Events    ┌──────────────┐    WhatsApp API    ┌─────────────┐
│   Core-MS   │ ◄────────────────► │ Channel-MS   │ ◄─────────────────► │ WhatsApp    │
│             │                    │ (WhatsApp)   │                    │ Cloud API   │
│ - Threads   │                    │              │                    │             │
│ - Messages  │                    │ - Adapters   │                    │             │
│ - HTTP APIs │                    │ - NATS Pub   │                    │             │
└─────────────┘                    └──────────────┘                    └─────────────┘
```

## NATS Event Contracts

### Core-MS Publishes (Outbound)
- `core.messages.send` - Send outbound messages to channels

### Channel-MS Publishes (Inbound)
- `channel.whatsapp.message.received` - Incoming messages from WhatsApp
- `channel.whatsapp.message.status` - Message status updates from WhatsApp
- `channel.whatsapp.thread.created` - New thread creation events

## Data Models

### Thread Schema
```typescript
{
  threadId: string;           // Unique thread identifier
  companyId: string;          // Company ID
  type: 'dm' | 'feed_comment'; // Thread type
  status: 'active' | 'closed' | 'archived'; // Thread status
  channelType: string;        // Channel type (whatsapp_cloud, email, etc.)
  connectionId: string;       // Connection ID
  externalUserId: string;     // External user ID (phone number, email)
  internalUserId?: string;    // Internal user handling the thread
  subject?: string;           // Thread subject
  tags?: string[];           // Thread tags
  priority?: number;         // Priority (1-5)
  lastMessageAt?: Date;      // Last message timestamp
  closedAt?: Date;           // Thread closed timestamp
  archivedAt?: Date;         // Thread archived timestamp
  feedPostId?: string;       // Feed post ID (for comments)
  parentCommentId?: string;  // Parent comment ID (for nested comments)
  metadata?: Record<string, any>; // Additional metadata
}
```

### Message Schema
```typescript
{
  messageId: string;          // Unique message identifier
  threadId: string;           // Associated thread ID
  companyId: string;          // Company ID
  direction: 'inbound' | 'outbound'; // Message direction
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'template' | 'interactive' | 'system';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'; // Message status
  channelType: string;        // Channel type
  connectionId: string;       // Connection ID
  fromId: string;            // Sender ID
  toId: string;              // Recipient ID
  fromName?: string;         // Sender name
  toName?: string;           // Recipient name
  text?: string;             // Message text content
  mediaUrl?: string;         // Media URL
  mediaType?: string;        // Media MIME type
  mediaCaption?: string;     // Media caption
  fileName?: string;         // File name
  fileSize?: number;         // File size in bytes
  externalMessageId?: string; // External message ID from channel
  replyToMessageId?: string; // ID of message being replied to
  templateName?: string;     // Template name
  templateLanguage?: string; // Template language
  templateParameters?: Record<string, any>; // Template parameters
  interactiveData?: Record<string, any>; // Interactive message data
  latitude?: number;         // Location latitude
  longitude?: number;        // Location longitude
  locationName?: string;     // Location name
  locationAddress?: string;  // Location address
  contactData?: Record<string, any>; // Contact data
  sentAt?: Date;             // Sent timestamp
  deliveredAt?: Date;        // Delivered timestamp
  readAt?: Date;             // Read timestamp
  failedAt?: Date;           // Failed timestamp
  errorMessage?: string;     // Error message
  metadata?: Record<string, any>; // Additional metadata
  rawPayload?: Record<string, any>; // Original channel payload
}
```

## HTTP API Endpoints

### Threads API

#### POST /api/v1/core/threads
Create a new thread.

**Request Body:**
```json
{
  "companyId": "company-123",
  "type": "dm",
  "channelType": "whatsapp_cloud",
  "connectionId": "conn-456",
  "externalUserId": "5493515551234",
  "subject": "Customer Inquiry",
  "tags": ["support", "urgent"],
  "priority": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "threadId": "thread-789",
    "companyId": "company-123",
    "type": "dm",
    "status": "active",
    "channelType": "whatsapp_cloud",
    "connectionId": "conn-456",
    "externalUserId": "5493515551234",
    "subject": "Customer Inquiry",
    "tags": ["support", "urgent"],
    "priority": 3,
    "lastMessageAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/v1/core/threads
List threads for a company with filtering and pagination.

**Query Parameters:**
- `companyId` (required): Company ID
- `status`: Filter by thread status (active, closed, archived)
- `channelType`: Filter by channel type
- `connectionId`: Filter by connection ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sortBy`: Sort field (default: lastMessageAt)
- `sortOrder`: Sort order (asc, desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "threadId": "thread-789",
      "companyId": "company-123",
      "type": "dm",
      "status": "active",
      "channelType": "whatsapp_cloud",
      "connectionId": "conn-456",
      "externalUserId": "5493515551234",
      "lastMessageAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### GET /api/v1/core/threads/:threadId
Get a specific thread by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "threadId": "thread-789",
    "companyId": "company-123",
    "type": "dm",
    "status": "active",
    "channelType": "whatsapp_cloud",
    "connectionId": "conn-456",
    "externalUserId": "5493515551234",
    "subject": "Customer Inquiry",
    "tags": ["support", "urgent"],
    "priority": 3,
    "lastMessageAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### PUT /api/v1/core/threads/:threadId/close
Close a thread.

**Request Body:**
```json
{
  "internalUserId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "threadId": "thread-789",
    "status": "closed",
    "closedAt": "2024-01-15T11:00:00.000Z",
    "internalUserId": "user-123"
  }
}
```

#### PUT /api/v1/core/threads/:threadId/archive
Archive a thread.

**Response:**
```json
{
  "success": true,
  "data": {
    "threadId": "thread-789",
    "status": "archived",
    "archivedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

#### PUT /api/v1/core/threads/:threadId/assign
Assign thread to internal user.

**Request Body:**
```json
{
  "internalUserId": "user-123"
}
```

#### PUT /api/v1/core/threads/:threadId/tags
Add tags to thread.

**Request Body:**
```json
{
  "tags": ["vip", "priority"]
}
```

#### PUT /api/v1/core/threads/:threadId/tags/remove
Remove tags from thread.

**Request Body:**
```json
{
  "tags": ["urgent"]
}
```

### Messages API

#### POST /api/v1/core/messages
Create a new message.

**Request Body:**
```json
{
  "threadId": "thread-789",
  "companyId": "company-123",
  "direction": "outbound",
  "type": "text",
  "channelType": "whatsapp_cloud",
  "connectionId": "conn-456",
  "fromId": "business-phone",
  "toId": "5493515551234",
  "text": "Hello! How can I help you today?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg-123",
    "threadId": "thread-789",
    "companyId": "company-123",
    "direction": "outbound",
    "type": "text",
    "status": "pending",
    "channelType": "whatsapp_cloud",
    "connectionId": "conn-456",
    "fromId": "business-phone",
    "toId": "5493515551234",
    "text": "Hello! How can I help you today?",
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
}
```

#### GET /api/v1/core/messages
List messages for a company with filtering and pagination.

**Query Parameters:**
- `companyId` (required): Company ID
- `threadId`: Filter by thread ID
- `status`: Filter by message status
- `direction`: Filter by message direction (inbound, outbound)
- `channelType`: Filter by channel type
- `connectionId`: Filter by connection ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc, desc, default: desc)

#### GET /api/v1/core/messages/thread/:threadId
Get messages for a specific thread.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `sortOrder`: Sort order (asc, desc, default: asc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "messageId": "msg-123",
      "threadId": "thread-789",
      "direction": "inbound",
      "type": "text",
      "status": "delivered",
      "fromId": "5493515551234",
      "toId": "business-phone",
      "text": "Hi, I need help with my order",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "messageId": "msg-124",
      "threadId": "thread-789",
      "direction": "outbound",
      "type": "text",
      "status": "sent",
      "fromId": "business-phone",
      "toId": "5493515551234",
      "text": "Hello! How can I help you today?",
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

#### GET /api/v1/core/messages/:messageId
Get a specific message by ID.

#### PUT /api/v1/core/messages/:messageId/status
Update message status.

**Request Body:**
```json
{
  "status": "delivered",
  "externalMessageId": "wamid.abc123",
  "timestamp": "2024-01-15T10:36:00.000Z"
}
```

#### POST /api/v1/core/messages/thread/:threadId/reply
Reply to a thread (send outbound message).

**Request Body:**
```json
{
  "companyId": "company-123",
  "channelType": "whatsapp_cloud",
  "connectionId": "conn-456",
  "fromId": "business-phone",
  "toId": "5493515551234",
  "text": "Thank you for contacting us. Let me help you with that.",
  "replyToMessageId": "msg-123"
}
```

#### GET /api/v1/core/messages/stats/:companyId
Get message statistics for a company.

**Query Parameters:**
- `days`: Number of days to include (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byDirection": [
      {
        "direction": "inbound",
        "status": "delivered",
        "channelType": "whatsapp_cloud",
        "count": 75
      },
      {
        "direction": "outbound",
        "status": "sent",
        "channelType": "whatsapp_cloud",
        "count": 70
      },
      {
        "direction": "outbound",
        "status": "failed",
        "channelType": "whatsapp_cloud",
        "count": 5
      }
    ]
  }
}
```

## Message Types and Examples

### Text Message
```json
{
  "type": "text",
  "text": "Hello! How can I help you today?"
}
```

### Image Message
```json
{
  "type": "image",
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "image/jpeg",
  "mediaCaption": "Product image"
}
```

### Template Message
```json
{
  "type": "template",
  "templateName": "welcome_message",
  "templateLanguage": "en",
  "templateParameters": {
    "name": "John Doe",
    "company": "Acme Corp"
  }
}
```

### Location Message
```json
{
  "type": "location",
  "latitude": -31.4201,
  "longitude": -64.1888,
  "locationName": "Córdoba, Argentina",
  "locationAddress": "Córdoba, Córdoba Province, Argentina"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Integration Examples

### Sending a WhatsApp Message

1. **Create or get thread:**
```bash
curl -X GET "http://localhost:3000/api/v1/core/threads?companyId=company-123&externalUserId=5493515551234"
```

2. **Send message:**
```bash
curl -X POST "http://localhost:3000/api/v1/core/messages/thread/thread-789/reply" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "company-123",
    "channelType": "whatsapp_cloud",
    "connectionId": "conn-456",
    "fromId": "business-phone",
    "toId": "5493515551234",
    "text": "Thank you for your message!"
  }'
```

### Handling Incoming Messages

Incoming messages are automatically processed via NATS events:

1. WhatsApp webhook → Channel-MS
2. Channel-MS processes and publishes `channel.whatsapp.message.received`
3. Core-MS receives event and creates/updates thread and message
4. Message is stored in MongoDB with proper indexing

### Message Status Updates

Status updates flow automatically:

1. WhatsApp status webhook → Channel-MS
2. Channel-MS publishes `channel.whatsapp.message.status`
3. Core-MS updates message status and timestamps

## Performance Considerations

- **Indexing**: All schemas include proper MongoDB indexes for performance
- **Pagination**: All list endpoints support pagination to handle large datasets
- **Async Processing**: NATS events are processed asynchronously
- **Error Handling**: Comprehensive error handling with proper logging

## Security

- JWT authentication (when auth guard is enabled)
- Input validation using class-validator
- Secure NATS communication
- Proper error handling without exposing sensitive data
