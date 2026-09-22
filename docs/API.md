# Virtual Partners API Documentation

This document provides comprehensive documentation for all API routes in the Virtual Partners platform.

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [AI Characters](#ai-characters)
- [Chat System](#chat-system)
- [Templates](#templates)
- [AI Apps](#ai-apps)
- [Models](#models)
- [Decorations](#decorations)
- [Favorites & Likes](#favorites--likes)
- [User Media Gallery](#user-media-gallery)
- [Subscription & Credits](#subscription--credits)
- [Community Feed](#community-feed)
- [Jobs](#jobs)
- [ModelsLab Integration](#modelslab-integration)

---

## Authentication

All API endpoints require the `x-vp-user-id` header containing a valid UUID for user identification.

```
x-vp-user-id: 550e8400-e29b-41d4-a716-446655440000
```

Requests without a valid UUID in this header will receive a `401 Unauthorized` response.

---

## User Management

### GET /api/user
Get the current user's profile.

**Headers:**
- `x-vp-user-id`: Required

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "displayName": "Display Name",
    "bio": "User bio",
    "avatarUrl": "https://...",
    "bannerUrl": "https://...",
    "isVerified": false,
    "followersCount": 0,
    "followingCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/user
Update the current user's profile.

**Body:**
```json
{
  "username": "new_username",
  "displayName": "New Display Name",
  "bio": "Updated bio",
  "avatarUrl": "https://...",
  "bannerUrl": "https://..."
}
```

---

### POST /api/user/follow
Follow another user.

**Body:**
```json
{
  "targetUserId": "uuid"
}
```

### DELETE /api/user/follow
Unfollow a user.

**Body:**
```json
{
  "targetUserId": "uuid"
}
```

---

### POST /api/user/block
Block a user.

**Body:**
```json
{
  "targetUserId": "uuid"
}
```

### DELETE /api/user/block
Unblock a user.

**Body:**
```json
{
  "targetUserId": "uuid"
}
```

---

## AI Characters

### GET /api/characters
List AI characters with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | string | - | Filter by style (REALISTIC, ANIME, FANTASY, STYLIZED) |
| `gender` | string | - | Filter by gender (FEMALE, MALE, NON_BINARY) |
| `status` | string | `APPROVED` | Filter by status |
| `mine` | boolean | - | Only show user's own characters |
| `limit` | number | 20 | Items per page (max 100) |
| `cursor` | string | - | Pagination cursor |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Character Name",
      "description": "Description",
      "style": "REALISTIC",
      "gender": "FEMALE",
      "personality": "Friendly and caring",
      "favoriteCount": 100,
      "usageCount": 500,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "uuid",
  "hasMore": true
}
```

### POST /api/characters
Create a new AI character.

**Body:**
```json
{
  "name": "Character Name",
  "description": "Character description",
  "style": "REALISTIC",
  "gender": "FEMALE",
  "personality": "Personality traits",
  "firstMessage": "Hello! Nice to meet you!",
  "isPublic": true
}
```

### GET /api/characters/[id]
Get a single character by ID.

### PUT /api/characters/[id]
Update a character (owner only).

### DELETE /api/characters/[id]
Delete a character (owner only).

---

## Chat System

### GET /api/chat/threads
List user's chat threads (conversations).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `archived` | boolean | Filter by archived status |
| `pinned` | boolean | Filter by pinned status |
| `limit` | number | Items per page (default: 20) |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "characterId": "uuid",
      "characterName": "Character Name",
      "characterAvatarUrl": "https://...",
      "lastMessageAt": "2024-01-01T00:00:00.000Z",
      "lastMessagePreview": "Last message text...",
      "unreadCount": 5,
      "isPinned": false,
      "isArchived": false,
      "isMuted": false
    }
  ]
}
```

### POST /api/chat/threads
Create or get existing chat thread with a character.

**Body:**
```json
{
  "characterId": "uuid"
}
```

### GET /api/chat/threads/[id]
Get a thread with recent messages.

### PUT /api/chat/threads/[id]
Update thread settings (pin, archive, mute).

**Body:**
```json
{
  "isPinned": true,
  "isArchived": false,
  "isMuted": false
}
```

### DELETE /api/chat/threads/[id]
Delete a thread and all its messages.

---

### GET /api/chat/threads/[id]/messages
Get messages with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Messages per page (max 100) |
| `cursor` | string | - | Get messages before this message ID |

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "USER",
      "content": "Message text",
      "mediaUrl": null,
      "mediaType": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "uuid",
  "hasMore": true
}
```

### POST /api/chat/threads/[id]/messages
Send a new message.

**Body:**
```json
{
  "content": "Message text",
  "mediaUrl": "https://...",
  "mediaType": "IMAGE"
}
```

### DELETE /api/chat/threads/[id]/messages
Clear all messages in a thread (keeps the thread).

---

## Templates

### Style Templates

### GET /api/templates/style
List all style templates.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `limit` | number | Items per page |

### GET /api/templates/style/[slug]
Get a single style template by slug or ID.

---

### Video Templates

### GET /api/templates/video
List video templates.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type (IMAGE_TO_VIDEO, TEXT_TO_VIDEO) |
| `limit` | number | Items per page |

### GET /api/templates/video/[slug]
Get a single video template by slug or ID.

---

## AI Apps

### GET /api/apps
List all AI apps/tools.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `limit` | number | Items per page |

### GET /api/apps/[slug]
Get a single AI app by slug or ID.

---

## Models

### GET /api/models
List user-uploaded models.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `modelType` | string | Filter by type (CHECKPOINT, LORA, EMBEDDING) |
| `baseModel` | string | Filter by base model |
| `mine` | boolean | Only show user's own models |
| `limit` | number | Items per page |
| `cursor` | string | Pagination cursor |

### POST /api/models
Upload a new model.

**Body:**
```json
{
  "name": "Model Name",
  "description": "Model description",
  "modelType": "LORA",
  "baseModel": "SDXL_1_0",
  "modelUrl": "https://...",
  "thumbnailUrl": "https://...",
  "triggerWords": ["keyword1", "keyword2"],
  "isPublic": true
}
```

### GET /api/models/[id]
Get a single model by ID.

### PUT /api/models/[id]
Update a model (owner only).

### DELETE /api/models/[id]
Delete a model (owner only).

---

## Decorations

### GET /api/decorations
List available decorations.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type (AVATAR_FRAME, AVATAR_GLOW, AVATAR_EFFECT, BANNER) |
| `isPremium` | boolean | Filter by premium status |

### GET /api/decorations/[id]
Get a single decoration with ownership status.

---

### User Decorations

### GET /api/user/decorations
List decorations owned by the user.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type |
| `equipped` | boolean | Filter by equipped status |

### POST /api/user/decorations
Acquire (purchase) a decoration.

**Body:**
```json
{
  "decorationId": "uuid"
}
```

### PUT /api/user/decorations
Equip or unequip a decoration.

**Body:**
```json
{
  "decorationId": "uuid",
  "equip": true
}
```

---

## Favorites & Likes

### GET /api/favorites
Get user's favorites.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type |
| `limit` | number | Items per page |

**Valid Types:** `IMAGE`, `VIDEO`, `MODEL`, `CHARACTER`, `COMMUNITY_ITEM`, `AI_APP`, `STYLE_TEMPLATE`, `VIDEO_TEMPLATE`

### POST /api/favorites
Add item to favorites.

**Body:**
```json
{
  "type": "CHARACTER",
  "itemId": "uuid"
}
```

### DELETE /api/favorites
Remove from favorites.

**Body:**
```json
{
  "type": "CHARACTER",
  "itemId": "uuid"
}
```

---

### GET /api/likes
Get user's likes.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type |
| `limit` | number | Items per page |

**Valid Types:** `IMAGE`, `VIDEO`, `COMMUNITY_ITEM`, `COMMENT`

### POST /api/likes
Like an item.

**Body:**
```json
{
  "type": "COMMUNITY_ITEM",
  "itemId": "uuid"
}
```

### DELETE /api/likes
Unlike an item.

---

## User Media Gallery

### GET /api/user/media
List user's media gallery.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type (IMAGE, VIDEO) |
| `visibility` | string | Filter by visibility |
| `limit` | number | Items per page |
| `cursor` | string | Pagination cursor |

### POST /api/user/media
Add media to gallery.

**Body:**
```json
{
  "assetId": "uuid",
  "title": "My Image",
  "prompt": "A beautiful sunset",
  "visibility": "PUBLIC",
  "isPostedToCommunity": false
}
```

### GET /api/user/media/[id]
Get a single media item.

### PUT /api/user/media/[id]
Update media item.

**Body:**
```json
{
  "title": "Updated Title",
  "visibility": "PRIVATE",
  "isPostedToCommunity": true
}
```

### DELETE /api/user/media/[id]
Delete a media item.

---

## Subscription & Credits

### GET /api/subscription
Get current subscription details.

**Response:**
```json
{
  "subscription": {
    "id": "uuid",
    "plan": "PRO",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "monthlyCredits": 2000,
    "creditsUsed": 500,
    "creditsRemaining": 1500
  }
}
```

### POST /api/subscription
Create a new subscription.

**Body:**
```json
{
  "plan": "PRO",
  "stripeCustomerId": "cus_...",
  "stripeSubscriptionId": "sub_...",
  "stripePriceId": "price_..."
}
```

**Valid Plans:** `FREE`, `BASIC`, `PRO`, `PREMIUM`, `ENTERPRISE`

### PUT /api/subscription
Update subscription (upgrade/downgrade).

**Body:**
```json
{
  "plan": "PREMIUM",
  "resetCredits": true
}
```

### DELETE /api/subscription
Cancel subscription.

---

### Credits

### GET /api/subscription/credits
Get current credit balance.

**Response:**
```json
{
  "credits": {
    "plan": "PRO",
    "total": 2000,
    "used": 500,
    "remaining": 1500,
    "periodStart": "2024-01-01T00:00:00.000Z",
    "periodEnd": "2024-02-01T00:00:00.000Z"
  }
}
```

### POST /api/subscription/credits
Use credits for an operation.

**Body:**
```json
{
  "amount": 10,
  "operation": "image_generation"
}
```

**Response (Success):**
```json
{
  "success": true,
  "credits": {
    "used": 10,
    "total": 2000,
    "totalUsed": 510,
    "remaining": 1490
  }
}
```

**Response (Insufficient Credits):** `402 Payment Required`
```json
{
  "error": "Insufficient credits.",
  "required": 10,
  "available": 5,
  "plan": "FREE"
}
```

### PUT /api/subscription/credits
Add bonus credits (admin/promotional).

**Body:**
```json
{
  "amount": 100,
  "reason": "Promotional bonus"
}
```

---

## Community Feed

### GET /api/community/feed
Get community feed items.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `sort` | string | Sort by (LATEST, TRENDING, TOP) |
| `type` | string | Filter by type |
| `limit` | number | Items per page |
| `cursor` | string | Pagination cursor |

### GET /api/community/items/[itemId]
Get a single community item.

### GET /api/community/items/[itemId]/comments
Get comments on an item.

### POST /api/community/items/[itemId]/comments
Add a comment.

### GET /api/community/items/[itemId]/reactions
Get reactions on an item.

### POST /api/community/items/[itemId]/reactions
Add a reaction.

---

## Jobs

### GET /api/jobs
List user's generation jobs.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `jobType` | string | Filter by job type |
| `limit` | number | Items per page |

### POST /api/jobs
Create a new generation job.

**Body:**
```json
{
  "jobType": "IMAGE_GENERATION",
  "requestData": {
    "prompt": "A beautiful sunset",
    "model": "sdxl",
    "width": 1024,
    "height": 1024
  }
}
```

### GET /api/jobs/[id]
Get job status and result.

### GET /api/jobs/events
Server-Sent Events for real-time job updates.

---

## ModelsLab Integration

### Audio Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/modelslab/text-to-speech` | POST | Convert text to speech |
| `/api/modelslab/voice-cloning` | POST | Clone a voice |
| `/api/modelslab/voice-cover` | POST | Create voice cover |
| `/api/modelslab/music-gen` | POST | Generate music |
| `/api/modelslab/song-generator` | POST | Generate songs |
| `/api/modelslab/sfx` | POST | Generate sound effects |

### Voice Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/modelslab/voices` | GET | List available voices |
| `/api/modelslab/voice/list` | GET | List user's voices |
| `/api/modelslab/voice/upload` | POST | Upload a voice |
| `/api/modelslab/voice/fetch/[id]` | GET | Get voice details |

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid user ID |
| 402 | Payment Required - Insufficient credits |
| 403 | Forbidden - No permission |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

---

## Pagination

Most list endpoints support cursor-based pagination:

```json
{
  "items": [...],
  "nextCursor": "uuid-of-last-item",
  "hasMore": true
}
```

To get the next page, pass `cursor=<nextCursor>` as a query parameter.

---

## Rate Limiting

Rate limits are applied per user. Current limits:
- 100 requests per minute for read operations
- 30 requests per minute for write operations

When rate limited, you'll receive a `429 Too Many Requests` response.

---

## Plan Credit Allocations

| Plan | Monthly Credits |
|------|-----------------|
| FREE | 50 |
| BASIC | 500 |
| PRO | 2000 |
| PREMIUM | 5000 |
| ENTERPRISE | 20000 |

---

## Webhooks

### POST /api/webhooks/[provider]

Handles incoming webhooks from external providers (e.g., Stripe, ModelsLab).

Supported providers:
- `stripe` - Payment and subscription events
- `modelslab` - Generation job completion callbacks
