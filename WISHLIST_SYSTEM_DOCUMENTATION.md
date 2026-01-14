# Wishlist System - Comprehensive Technical Documentation

## Table of Contents
1. [Database Schema](#database-schema)
2. [Core Concepts](#core-concepts)
3. [Wishlist Types & Privacy Levels](#wishlist-types--privacy-levels)
4. [Item Management](#item-management)
5. [Reservation System](#reservation-system)
6. [Group Wishlists & Collaboration](#group-wishlists--collaboration)
7. [Permissions & Access Control](#permissions--access-control)
8. [API Endpoints](#api-endpoints)
9. [Frontend Architecture](#frontend-architecture)
10. [Business Logic Flows](#business-logic-flows)
11. [Notifications](#notifications)
12. [Friendship System](#friendship-system)

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id                     String                 @id @default(cuid())
  clerkId                String                 @unique  // Clerk authentication ID
  email                  String                 @unique
  username               String?                @unique
  firstName              String?
  lastName               String?
  avatar                 String?
  bio                    String?
  birthday               DateTime?              // Used for birthday tracking
  privacyLevel           PrivacyLevel           @default(FRIENDS_ONLY)
  theme                  String?               // UI theme preference
  currency               String?                // Default currency
  language               String?
  timezone               String?
  role                   UserRole               @default(USER)
  
  // Relations
  wishlists              Wishlist[]             // Owned wishlists
  wishlistCollaborations WishlistCollaborator[] // Collaborations
  items                  Item[]                 // Items they added
  itemReservations       ItemReservation[]       // Items they reserved
  friendships            Friendship[]            // Friend relationships
  notifications          Notification[]
  comments               Comment[]
  affiliateClicks        AffiliateClick[]
}
```

#### Wishlist
```prisma
model Wishlist {
  id                String                 @id @default(cuid())
  title             String
  coverImage        String?
  privacyLevel      PrivacyLevel           @default(PRIVATE)
  shareToken        String?                @unique  // For public sharing
  viewCount         Int                    @default(0)
  allowComments     Boolean                @default(true)
  allowReservations Boolean                @default(true)
  ownerId           String
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt
  
  // Relations
  owner             User                   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  items             Item[]                 // All items in wishlist
  collaborators     WishlistCollaborator[]  // Group wishlist collaborators
  comments          Comment[]
}
```

**Key Fields:**
- `privacyLevel`: Controls who can view the wishlist (PRIVATE, FRIENDS_ONLY, PUBLIC, GROUP)
- `allowReservations`: Toggles whether items can be reserved
- `allowComments`: Toggles commenting functionality
- `shareToken`: Unique token for public sharing via URL

#### Item
```prisma
model Item {
  id              String            @id @default(cuid())
  title           String
  price           Float?
  currency        String            @default("USD")
  url             String?           // Product link
  imageUrl        String?
  priority        Priority          @default(NICE_TO_HAVE)
  status          ItemStatus        @default(WANTED)
  category        String?
  quantity        Int?              // How many of this item
  wishlistId      String
  addedById       String?           // Who added this item
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  // Relations
  wishlist        Wishlist          @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  addedBy         User?             @relation(fields: [addedById], references: [id])
  reservations    ItemReservation[] // Who reserved this item
  comments        Comment[]
  affiliateClicks AffiliateClick[]
}
```

**Item Status Flow:**
- `WANTED`: Default state, item is desired
- `RESERVED`: Someone has committed to buying it (via ItemReservation)
- `PURCHASED`: Item has been bought (status updated manually)

**Note:** `RESERVED` status is **not** automatically set when a reservation is created. The `status` field and `ItemReservation` are separate concepts:
- `ItemReservation` = someone committed to buy
- `status = RESERVED` = manually marked as reserved
- `status = PURCHASED` = manually marked as purchased

#### ItemReservation
```prisma
model ItemReservation {
  id        String   @id @default(cuid())
  itemId    String
  userId    String   // Who reserved this item
  createdAt DateTime @default(now())
  
  // Relations
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([itemId, userId])  // One reservation per user per item
}
```

**Important:** Multiple users can reserve the same item if `quantity > 1`, but each user can only reserve once per item.

#### WishlistCollaborator
```prisma
model WishlistCollaborator {
  id         String           @id @default(cuid())
  wishlistId String
  userId     String
  role       CollaboratorRole @default(EDITOR)
  createdAt  DateTime         @default(now())
  
  // Relations
  wishlist   Wishlist         @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([wishlistId, userId])  // One role per user per wishlist
}
```

**Collaborator Roles:**
- `VIEWER`: Can only view the wishlist
- `EDITOR`: Can add, edit, and delete items (only their own items for delete)
- `ADMIN`: Can do everything EDITOR can, plus delete any item and manage collaborators

#### Friendship
```prisma
model Friendship {
  id        String           @id @default(cuid())
  userId    String           // User who initiated
  friendId  String           // User being friended
  status    FriendshipStatus @default(PENDING)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  
  // Relations
  user      User             @relation("UserFriendships", fields: [userId], references: [id], onDelete: Cascade)
  friend    User             @relation("FriendOf", fields: [friendId], references: [id], onDelete: Cascade)
  
  @@unique([userId, friendId])  // One friendship record per pair
}
```

**Friendship Status:**
- `PENDING`: Request sent, awaiting acceptance
- `ACCEPTED`: Friends (bidirectional)
- `BLOCKED`: One user blocked the other

### Enums

```prisma
enum PrivacyLevel {
  PRIVATE      // Only owner can view
  FRIENDS_ONLY // Owner + friends can view
  PUBLIC       // Anyone can view
  GROUP        // Owner + collaborators can view/edit
}

enum Priority {
  MUST_HAVE
  NICE_TO_HAVE
}

enum ItemStatus {
  WANTED
  RESERVED
  PURCHASED
}

enum CollaboratorRole {
  VIEWER  // Read-only access
  EDITOR  // Can add/edit items (delete own items only)
  ADMIN   // Full access (delete any item, manage collaborators)
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  BLOCKED
}

enum NotificationType {
  FRIEND_REQUEST
  FRIEND_ACCEPTED
  WISHLIST_SHARED
  ITEM_RESERVED
  ITEM_PURCHASED
  COMMENT_ADDED
}
```

---

## Core Concepts

### 1. Wishlist Ownership
- Every wishlist has exactly **one owner** (`ownerId`)
- Owner has full control: delete wishlist, manage collaborators, update settings
- Owner can always add/edit/delete items

### 2. Group Wishlists
- Created when `privacyLevel = "GROUP"` OR when collaborators are added during creation
- Multiple users can collaborate on the same wishlist
- Each collaborator has a role (VIEWER, EDITOR, ADMIN)
- All collaborators can see all items, regardless of who added them

### 3. Item Ownership vs Wishlist Ownership
- **Item `addedById`**: Tracks who originally added the item
- **Wishlist `ownerId`**: The wishlist owner
- **Key Distinction**: In group wishlists, items can be added by collaborators, but the wishlist still has one owner

### 4. Reservation vs Status
- **`ItemReservation` table**: Tracks who committed to buy an item (creates a record)
- **`Item.status` field**: Manual state (WANTED, RESERVED, PURCHASED)
- These are **independent**: A reservation doesn't automatically change status
- Status changes are manual actions (mark as purchased, restore to wanted)

---

## Wishlist Types & Privacy Levels

### PRIVATE
- **View Access**: Only owner
- **Reservations**: Not allowed (owner can't reserve own items)
- **Use Case**: Personal wishlist, not shared

### FRIENDS_ONLY
- **View Access**: Owner + accepted friends
- **Reservations**: 
  - Friends can reserve items
  - Owner cannot reserve their own items
  - Must be friends (checked via `Friendship` table with `status = ACCEPTED`)
- **Use Case**: Sharing with close friends

### PUBLIC
- **View Access**: Anyone (no authentication required for viewing via share token)
- **Reservations**: 
  - Anyone can reserve items
  - Owner cannot reserve their own items
- **Use Case**: Public wishlist sharing

### GROUP
- **View Access**: Owner + all collaborators
- **Reservations**: 
  - **Special Rule**: Owners and collaborators CAN reserve items (even their own)
  - This allows group gift scenarios where members buy for each other
- **Use Case**: Group gifts, collaborative wishlists (e.g., "Hussein's Birthday")

**Group Wishlist Creation:**
- Automatically set to `GROUP` when collaborators are provided during creation
- Can also be manually set to `GROUP` privacy level
- If all collaborators are removed, automatically reverts to `PRIVATE`

---

## Item Management

### Creating Items

**Endpoint:** `POST /items/wishlists/:wishlistId/items`

**Permissions:**
- Owner can always create items
- Collaborators with `EDITOR` or `ADMIN` role can create items
- `VIEWER` role cannot create items

**Required Fields:**
- `title`: Item name
- `wishlistId`: Target wishlist
- `priority`: MUST_HAVE or NICE_TO_HAVE

**Optional Fields:**
- `url`: Product link
- `price`: Numeric price
- `currency`: Currency code (defaults to "USD")
- `quantity`: How many items (defaults to 1)
- `category`: Item category
- `imageUrl`: Item image URL

**Business Logic:**
- `addedById` is automatically set to the current user
- Item status defaults to `WANTED`
- Item is linked to the wishlist via `wishlistId`

### Updating Items

**Endpoint:** `PATCH /items/:id`

**Permissions:**
- Owner can update any item
- Collaborators with `EDITOR` or `ADMIN` role can update any item
- Item creator can update their own items (if they have wishlist edit access)

**Updateable Fields:**
- All item fields (title, price, url, quantity, priority, status, etc.)
- `wishlistId`: Can move item to another wishlist (requires edit access to both wishlists)

**Status Updates:**
- `WANTED` → `PURCHASED`: Mark item as bought
- `PURCHASED` → `WANTED`: Restore item to wanted list
- `status = RESERVED`: Manual state (not automatically set by reservations)

### Deleting Items

**Endpoint:** `DELETE /items/:id`

**Permissions:**
- **Owner**: Can delete any item in their wishlist
- **ADMIN collaborator**: Can delete any item
- **EDITOR collaborator**: Can only delete items they added (`addedById === userId`)
- **VIEWER**: Cannot delete items

**Cascade Behavior:**
- Deleting an item automatically deletes all `ItemReservation` records for that item
- Deleting an item automatically deletes all `Comment` records for that item

### Item Status Management

**Status Transitions:**
1. **WANTED → PURCHASED**: User marks item as purchased
   - Available to: Owner, ADMIN, or item creator (if they have edit access)
   - Updates `Item.status` field
   - Does NOT affect `ItemReservation` records

2. **PURCHASED → WANTED**: User restores item to wanted list
   - Available to: Owner, ADMIN, or item creator
   - Updates `Item.status` field

3. **Status = RESERVED**: Manual state
   - This is a separate concept from `ItemReservation`
   - Can be set manually but is not automatically managed

---

## Reservation System

### How Reservations Work

**Reservation Flow:**
1. User clicks "Reserve" on an item
2. System creates an `ItemReservation` record linking `itemId` and `userId`
3. Item can now show "Reserved by [User]" in UI
4. User can track reserved items in "Reserved Items" section

**Important:** Creating a reservation does NOT:
- Change `Item.status` (remains `WANTED` unless manually changed)
- Prevent other users from reserving (if `quantity > 1`)
- Automatically mark item as purchased

### Reserving an Item

**Endpoint:** `POST /items/:id/reserve`

**Permission Checks:**

**For GROUP wishlists:**
- ✅ Owner can reserve any item (including their own)
- ✅ Collaborators can reserve any item (including their own)
- ❌ Non-collaborators cannot reserve

**For non-GROUP wishlists (PRIVATE, FRIENDS_ONLY, PUBLIC):**
- ✅ Friends (for FRIENDS_ONLY) or anyone (for PUBLIC) can reserve
- ❌ Owner **cannot** reserve their own items
- ❌ PRIVATE wishlists: No one can reserve (not accessible)

**Additional Checks:**
- Wishlist must have `allowReservations = true`
- User cannot reserve the same item twice (enforced by `@@unique([itemId, userId])`)

**Business Logic:**
```typescript
// Pseudo-code for reservation logic
if (wishlist.privacyLevel === "GROUP") {
  // Group wishlists: owner and collaborators can reserve
  if (isOwner || isCollaborator) {
    allowReservation = true;
  }
} else {
  // Non-group: owner cannot reserve own items
  if (isOwner) {
    throw "Cannot reserve own items";
  }
  // Check friendship for FRIENDS_ONLY
  if (privacyLevel === "FRIENDS_ONLY" && !areFriends) {
    throw "Must be friends";
  }
}
```

### Unreserving an Item

**Endpoint:** `DELETE /items/:id/reserve`

**Permissions:**
- User can only unreserve their own reservations
- No other permission checks needed

**Business Logic:**
- Deletes the `ItemReservation` record
- Does NOT affect `Item.status`

### Finding Reserved Items

**Endpoint:** `GET /items/reserved/all`

**Returns:** All items reserved by the current user, including:
- Item details
- Original wishlist information
- Owner information
- Item status (WANTED, RESERVED, PURCHASED)

**Use Case:** "Reserved Items" section on friends page shows all items user has reserved across all wishlists.

---

## Group Wishlists & Collaboration

### Creating Group Wishlists

**Method 1: During Creation**
```typescript
// When creating wishlist with collaboratorIds
POST /wishlists
{
  title: "Hussein's Birthday",
  privacyLevel: "PRIVATE",  // Will be changed to GROUP
  collaboratorIds: ["user-id-1", "user-id-2"]
}
```

**Backend Logic:**
- If `collaboratorIds` provided → automatically set `privacyLevel = "GROUP"`
- Creates wishlist
- Invites all collaborators (creates `WishlistCollaborator` records with `role = "EDITOR"`)
- Sends notifications to invited users

**Method 2: Manual Invitation**
```typescript
// Create wishlist first
POST /wishlists { title: "Group Gift", privacyLevel: "GROUP" }

// Then invite collaborators
POST /wishlists/:id/collaborators/invite
{ inviteeUserId: "user-id" }
```

### Collaborator Roles

#### VIEWER
- ✅ View wishlist and items
- ✅ Reserve items (in group wishlists)
- ❌ Cannot add/edit/delete items
- ❌ Cannot manage collaborators

#### EDITOR (Default)
- ✅ All VIEWER permissions
- ✅ Add items to wishlist
- ✅ Edit any item
- ✅ Delete items they added (`addedById === userId`)
- ❌ Cannot delete items added by others
- ❌ Cannot manage collaborators

#### ADMIN
- ✅ All EDITOR permissions
- ✅ Delete any item (regardless of who added it)
- ✅ Remove collaborators (except owner)
- ✅ Update collaborator roles
- ❌ Cannot delete wishlist (only owner can)
- ❌ Cannot remove owner

### Collaborator Management

**Invite Collaborator:**
- **Endpoint:** `POST /wishlists/:id/collaborators/invite`
- **Body:** `{ inviteeUserId: string }` (database user ID, not Clerk ID)
- **Permissions:** Only owner can invite
- **Creates:** `WishlistCollaborator` record with `role = "EDITOR"` (default)
- **Sends:** Notification to invitee

**Accept Collaboration:**
- **Endpoint:** `POST /wishlists/:id/collaborators/accept`
- **Permissions:** Invited user can accept
- **Note:** Currently, invitations are auto-accepted when created (no pending state)

**Remove Collaborator:**
- **Endpoint:** `DELETE /wishlists/:id/collaborators/:collaboratorId`
- **Permissions:** Owner OR the collaborator themselves (can leave)
- **Special:** Owner cannot remove themselves
- **Auto-cleanup:** If last collaborator removed and `privacyLevel = "GROUP"`, changes to `PRIVATE`

**Update Role:**
- **Endpoint:** `PATCH /wishlists/:id/collaborators/:collaboratorId/role`
- **Body:** `{ role: "VIEWER" | "EDITOR" | "ADMIN" }`
- **Permissions:** Only owner can update roles

**List Collaborators:**
- **Endpoint:** `GET /wishlists/:id/collaborators`
- **Returns:** All collaborators with user details and roles

### Group Wishlist Behavior

**Item Management:**
- Any collaborator with EDITOR/ADMIN can add items
- Items show `addedBy` information (who added them)
- In UI, items show "Added by [User]" badge

**Reservations:**
- **Special Rule:** In GROUP wishlists, owners and collaborators CAN reserve items, even their own
- This enables group gift scenarios where members buy gifts for each other

**Permissions Summary:**
| Action | Owner | ADMIN | EDITOR | VIEWER |
|--------|-------|-------|--------|--------|
| View wishlist | ✅ | ✅ | ✅ | ✅ |
| Add items | ✅ | ✅ | ✅ | ❌ |
| Edit any item | ✅ | ✅ | ✅ | ❌ |
| Delete own items | ✅ | ✅ | ✅ | ❌ |
| Delete any item | ✅ | ✅ | ❌ | ❌ |
| Reserve items | ✅ | ✅ | ✅ | ✅ |
| Manage collaborators | ✅ | ❌ | ❌ | ❌ |
| Delete wishlist | ✅ | ❌ | ❌ | ❌ |

---

## Permissions & Access Control

### Wishlist Access Control

**Viewing Wishlists:**

1. **Owner**: Always has access
2. **Collaborator** (GROUP wishlists): Has access
3. **Friend** (FRIENDS_ONLY): Must have `Friendship` with `status = ACCEPTED`
4. **Public** (PUBLIC): Anyone can view (via share token)
5. **Private** (PRIVATE): Only owner

**Checking Friendship:**
```typescript
// Backend checks both directions
const areFriends = await prisma.friendship.findFirst({
  where: {
    OR: [
      { userId: currentUser.id, friendId: ownerId, status: "ACCEPTED" },
      { userId: ownerId, friendId: currentUser.id, status: "ACCEPTED" }
    ]
  }
});
```

### Item Access Control

**Viewing Items:**
- Same rules as wishlist access
- Items inherit wishlist privacy level

**Editing Items:**
- Owner: Can edit any item
- ADMIN: Can edit any item
- EDITOR: Can edit any item
- Item creator: Can edit their own items (if they have wishlist edit access)
- VIEWER: Cannot edit

**Deleting Items:**
- Owner: Can delete any item
- ADMIN: Can delete any item
- EDITOR: Can only delete items they added (`addedById === userId`)
- VIEWER: Cannot delete

### Reservation Access Control

**Group Wishlists:**
- ✅ Owner can reserve
- ✅ Collaborators can reserve
- ❌ Non-collaborators cannot reserve

**Non-Group Wishlists:**
- ✅ Friends (FRIENDS_ONLY) or anyone (PUBLIC) can reserve
- ❌ Owner cannot reserve their own items
- ❌ PRIVATE: No reservations allowed

---

## API Endpoints

### Wishlists

#### Get All Wishlists
```
GET /wishlists
Authorization: Bearer <clerk-token>
```
**Returns:** All wishlists where user is owner OR collaborator
**Includes:** Items, owner, collaborators

#### Get Wishlist by ID
```
GET /wishlists/:id
Authorization: Bearer <clerk-token>
```
**Returns:** Single wishlist with items, owner, collaborators
**Access Control:** Checks privacy level and permissions

#### Create Wishlist
```
POST /wishlists
Authorization: Bearer <clerk-token>
Body: {
  title: string
  privacyLevel: "PRIVATE" | "FRIENDS_ONLY" | "PUBLIC" | "GROUP"
  allowComments: boolean
  allowReservations: boolean
  collaboratorIds?: string[]  // Optional: if provided, sets to GROUP
}
```
**Auto-behavior:** If `collaboratorIds` provided, automatically sets `privacyLevel = "GROUP"`

#### Update Wishlist
```
PATCH /wishlists/:id
Authorization: Bearer <clerk-token>
Body: { ...partial fields }
```
**Permissions:** Only owner can update

#### Delete Wishlist
```
DELETE /wishlists/:id
Authorization: Bearer <clerk-token>
```
**Permissions:** Only owner can delete
**Cascade:** Deletes all items, reservations, collaborators, comments

#### Get Public Wishlist (Share Token)
```
GET /wishlists/public/:shareToken
No authentication required
```
**Returns:** Public wishlist data (read-only)

### Items

#### Get Items by Wishlist
```
GET /items/wishlists/:wishlistId/items
Authorization: Bearer <clerk-token>
```
**Returns:** All items in wishlist
**Includes:** `addedBy`, `isReservedByCurrentUser`, `hasReservations`

#### Create Item
```
POST /items/wishlists/:wishlistId/items
Authorization: Bearer <clerk-token>
Body: {
  title: string
  url?: string
  price?: number
  currency?: string
  quantity?: number
  priority: "MUST_HAVE" | "NICE_TO_HAVE"
  category?: string
  imageUrl?: string
}
```
**Permissions:** Owner or EDITOR/ADMIN collaborator
**Auto-sets:** `addedById = currentUser.id`, `status = "WANTED"`

#### Update Item
```
PATCH /items/:id
Authorization: Bearer <clerk-token>
Body: {
  title?: string
  status?: "WANTED" | "RESERVED" | "PURCHASED"
  wishlistId?: string  // Can move item to another wishlist
  ...other fields
}
```
**Permissions:** Owner, ADMIN, or item creator (if has edit access)

#### Delete Item
```
DELETE /items/:id
Authorization: Bearer <clerk-token>
```
**Permissions:** Owner, ADMIN, or item creator (EDITOR can only delete own items)

#### Reserve Item
```
POST /items/:id/reserve
Authorization: Bearer <clerk-token>
```
**Creates:** `ItemReservation` record
**Permissions:** See [Reservation System](#reservation-system)

#### Unreserve Item
```
DELETE /items/:id/reserve
Authorization: Bearer <clerk-token>
```
**Deletes:** User's own `ItemReservation` record

#### Get All Reserved Items
```
GET /items/reserved/all
Authorization: Bearer <clerk-token>
```
**Returns:** All items reserved by current user across all wishlists
**Includes:** Original wishlist and owner information

### Collaborators

#### Invite Collaborator
```
POST /wishlists/:id/collaborators/invite
Authorization: Bearer <clerk-token>
Body: { inviteeUserId: string }
```
**Permissions:** Only owner
**Creates:** `WishlistCollaborator` with `role = "EDITOR"`

#### Accept Collaboration
```
POST /wishlists/:id/collaborators/accept
Authorization: Bearer <clerk-token>
```
**Note:** Currently auto-accepted on invite

#### Remove Collaborator
```
DELETE /wishlists/:id/collaborators/:collaboratorId
Authorization: Bearer <clerk-token>
```
**Permissions:** Owner or collaborator themselves

#### Update Collaborator Role
```
PATCH /wishlists/:id/collaborators/:collaboratorId/role
Authorization: Bearer <clerk-token>
Body: { role: "VIEWER" | "EDITOR" | "ADMIN" }
```
**Permissions:** Only owner

#### Get Collaborators
```
GET /wishlists/:id/collaborators
Authorization: Bearer <clerk-token>
```
**Returns:** List of all collaborators with user details

---

## Frontend Architecture

### Services Layer

**Location:** `apps/mobile/src/services/wishlists.ts`

**Service Methods:**
```typescript
wishlistsService = {
  // Wishlist operations
  getWishlists(): Promise<Wishlist[]>
  getWishlist(id: string): Promise<Wishlist>
  createWishlist(payload): Promise<Wishlist>
  updateWishlist(payload): Promise<Wishlist>
  deleteWishlist(id: string): Promise<void>
  shareWishlist(id: string): Promise<{ shareToken, shareUrl }>
  
  // Item operations
  getWishlistItems(wishlistId: string): Promise<Item[]>
  createItem(payload): Promise<Item>
  updateItem(payload): Promise<Item>
  deleteItem(id: string): Promise<void>
  parseProductUrl(url: string): Promise<ProductData>
  
  // Reservation operations
  reserveItem(itemId: string): Promise<void>
  unreserveItem(itemId: string): Promise<void>
  getReservedItems(): Promise<Item[]>
  
  // Collaborator operations
  inviteCollaborator(wishlistId, inviteeUserId): Promise<void>
  acceptCollaboration(wishlistId): Promise<void>
  removeCollaborator(wishlistId, collaboratorId): Promise<void>
  updateCollaboratorRole(wishlistId, collaboratorId, role): Promise<void>
  getCollaborators(wishlistId): Promise<Collaborator[]>
}
```

### React Query Hooks

**Location:** `apps/mobile/src/hooks/useWishlists.ts`

**Hooks:**
```typescript
// Get all wishlists (owner + collaborator)
useWishlists(): UseQueryResult<Wishlist[]>

// Get single wishlist
useWishlist(id: string): UseQueryResult<Wishlist>

// Get items for a wishlist
useWishlistItems(wishlistId: string): UseQueryResult<Item[]>

// Mutations
useCreateWishlist(): UseMutationResult
useUpdateWishlist(): UseMutationResult
useDeleteWishlist(): UseMutationResult
useCreateItem(): UseMutationResult
useUpdateItem(): UseMutationResult
useDeleteItem(): UseMutationResult
```

**Query Key Structure:**
```typescript
['wishlists']                    // All wishlists
['wishlists', wishlistId]       // Single wishlist
['items', 'wishlists', wishlistId]  // Items for wishlist
['items', 'reserved', 'all']    // Reserved items
```

**Cache Invalidation:**
- When item updated: Invalidates `['items', 'wishlists', wishlistId]` and `['items', 'reserved', 'all']`
- When wishlist updated: Invalidates `['wishlists']` and `['wishlists', id]`

### Type Definitions

**Location:** `apps/mobile/src/types/index.ts`

**Key Types:**
```typescript
type PrivacyLevel = "PRIVATE" | "FRIENDS_ONLY" | "PUBLIC" | "GROUP"
type Priority = "MUST_HAVE" | "NICE_TO_HAVE"
type ItemStatus = "WANTED" | "RESERVED" | "PURCHASED"
type CollaboratorRole = "VIEWER" | "EDITOR" | "ADMIN"

interface Wishlist {
  id: string
  title: string
  privacyLevel: PrivacyLevel
  allowReservations: boolean
  ownerId: string
  owner?: User
  collaborators?: Collaborator[]
  items?: Item[]
}

interface Item {
  id: string
  title: string
  status: ItemStatus
  wishlistId: string
  addedById: string
  addedBy?: User
  isReservedByCurrentUser?: boolean  // Computed from ItemReservation
  hasReservations?: boolean          // True if any reservations exist
  wishlist?: {                       // For reserved items
    id: string
    ownerId: string
    privacyLevel: PrivacyLevel
  }
}
```

---

## Business Logic Flows

### Flow 1: Creating a Group Wishlist

1. **User Action:** Click "Create Group Gift" → Select friends → Create
2. **Frontend:** Calls `wishlistsService.createWishlist({ title, collaboratorIds })`
3. **Backend:**
   - Creates wishlist with `privacyLevel = "GROUP"` (auto-set if collaborators provided)
   - Creates `WishlistCollaborator` records for each invitee with `role = "EDITOR"`
   - Sends `WISHLIST_SHARED` notifications to invitees
4. **Result:** Wishlist appears in owner's and collaborators' wishlist lists

### Flow 2: Reserving an Item

1. **User Action:** Click "Reserve" button on item
2. **Frontend:** Calls `wishlistsService.reserveItem(itemId)`
3. **Backend:**
   - Checks wishlist `allowReservations`
   - Checks privacy level and permissions (see [Reservation System](#reservation-system))
   - Creates `ItemReservation` record
   - Sends `ITEM_RESERVED` notification to wishlist owner
4. **Frontend:** 
   - Invalidates item queries
   - Updates UI to show "Reserved by you"
   - Item appears in "Reserved Items" section

### Flow 3: Marking Item as Purchased

1. **User Action:** Click item card or "Mark as Purchased" in menu
2. **Frontend:** Calls `wishlistsService.updateItem({ id, status: "PURCHASED" })`
3. **Backend:**
   - Checks permissions (owner, ADMIN, or item creator)
   - Updates `Item.status = "PURCHASED"`
4. **Frontend:**
   - Invalidates queries
   - Item moves to "Purchased" tab
   - If last item in "Wanted" tab, auto-switches to "Purchased" tab

### Flow 4: Moving Item Between Tabs (Wanted ↔ Purchased)

**From Wanted to Purchased:**
- User clicks item card or menu option
- Updates `Item.status = "PURCHASED"`
- Item appears in "Purchased" tab

**From Purchased to Wanted:**
- User clicks item card or "Restore to Wanted" menu option
- Updates `Item.status = "WANTED"`
- Item appears in "Wanted" tab
- **Smart Tab Switching:** Only switches to "Wanted" tab if "Purchased" list becomes empty

### Flow 5: Adding Item to Another Wishlist

1. **User Action:** Click heart icon or "Add to Another Wishlist" menu option
2. **Frontend:** Opens wishlist selection modal
3. **User Action:** Select target wishlist
4. **Frontend:** Calls `wishlistsService.createItem({ ...itemData, wishlistId: targetId })`
5. **Backend:** Creates new item (duplicate) in target wishlist
6. **Result:** Item exists in both wishlists (separate records)

**Note:** This creates a **duplicate**, not a move. Original item remains in source wishlist.

---

## Notifications

### Notification Types

**FRIEND_REQUEST:**
- Triggered: When user sends friend request
- Recipient: Requested user
- Data: `{ fromUserId, friendshipId }`

**FRIEND_ACCEPTED:**
- Triggered: When friend request is accepted
- Recipient: Original requester
- Data: `{ fromUserId, friendshipId }`

**WISHLIST_SHARED:**
- Triggered: When collaborator is invited to group wishlist
- Recipient: Invited user
- Data: `{ wishlistId, fromUserId }`

**ITEM_RESERVED:**
- Triggered: When item is reserved
- Recipient: Wishlist owner
- Data: `{ itemId, wishlistId, reservedByUserId }`

**ITEM_PURCHASED:**
- Triggered: When item status changes to PURCHASED
- Recipient: Wishlist owner (if not the purchaser)
- Data: `{ itemId, wishlistId }`

**COMMENT_ADDED:**
- Triggered: When comment is added to item or wishlist
- Recipient: Item/wishlist owner
- Data: `{ commentId, itemId?, wishlistId? }`

### Notification Model

```prisma
model Notification {
  id        String           @id @default(cuid())
  type      NotificationType
  title     String
  body      String
  data      Json?            // Flexible data storage
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
  userId    String           // Recipient
}
```

---

## Friendship System

### Friendship Model

**Bidirectional Relationship:**
- One `Friendship` record represents the relationship
- `userId` = initiator, `friendId` = recipient
- Check both directions when verifying friendship

**Status Flow:**
1. **PENDING**: Request sent
2. **ACCEPTED**: Request accepted (both users are friends)
3. **BLOCKED**: One user blocked the other

### Checking Friendship

```typescript
// Backend helper function
async areFriends(userId1: string, userId2: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: userId1, friendId: userId2, status: "ACCEPTED" },
        { userId: userId2, friendId: userId1, status: "ACCEPTED" }
      ]
    }
  });
  return !!friendship;
}
```

### Friendship Impact on Wishlists

**FRIENDS_ONLY Wishlists:**
- Only friends (`status = ACCEPTED`) can view
- Only friends can reserve items
- Owner cannot reserve own items

**Friend Profile Pages:**
- Shows friend's wishlists (based on privacy level)
- Can navigate to friend's wishlists
- Can reserve items if friends-only or public

---

## Key Implementation Details

### User Identification

**Clerk ID vs Database ID:**
- **Clerk ID** (`clerkId`): Authentication identifier from Clerk
- **Database ID** (`id`): Internal database primary key
- **Conversion:** Backend has `getOrCreateUser(clerkUserId)` helper that converts Clerk ID to database ID

**Important:** When passing user IDs in API:
- **Clerk ID**: Used in authentication (from JWT token)
- **Database ID**: Used in `collaboratorIds`, `inviteeUserId`, etc.

### Cache Management

**React Query Cache Keys:**
```typescript
['wishlists']                           // All wishlists
['wishlists', wishlistId]               // Single wishlist
['items', 'wishlists', wishlistId]     // Items for wishlist
['items', 'reserved', 'all']           // Reserved items
['friends']                             // Friends list
```

**Invalidation Strategy:**
- Item update → Invalidate item queries + reserved items
- Wishlist update → Invalidate wishlist queries
- Reservation → Invalidate item queries + reserved items

### Navigation & Routing

**Return Navigation:**
- Uses `returnTo` query parameter to track navigation source
- Values: `"wishlists"`, `"reserved"`, `"profile"`, `"notifications"`, `"discover"`
- Back button logic checks `returnTo` to navigate correctly

**Example:**
```
/wishlist/:id?returnTo=reserved&itemId=xxx&ownerId=yyy
```

---

## Secret Santa Feature - Implementation Guide

Based on this system, here's how to implement Secret Santa:

### 1. Database Schema Addition

```prisma
model SecretSantaEvent {
  id              String   @id @default(cuid())
  title           String
  description     String?
  organizerId     String   // User who created it
  wishlistId      String   // Associated group wishlist
  drawDate        DateTime // When names are drawn
  exchangeDate    DateTime // When gifts are exchanged
  budget          Float?
  currency        String   @default("USD")
  status          SecretSantaStatus @default(PENDING)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  organizer       User     @relation(fields: [organizerId], references: [id])
  wishlist        Wishlist @relation(fields: [wishlistId], references: [id])
  participants    SecretSantaParticipant[]
  assignments     SecretSantaAssignment[] // Who gets whom
}

model SecretSantaParticipant {
  id              String   @id @default(cuid())
  eventId         String
  userId          String
  status          ParticipantStatus @default(INVITED)
  createdAt       DateTime @default(now())
  
  event           SecretSantaEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user            User             @relation(fields: [userId], references: [id])
  
  @@unique([eventId, userId])
}

model SecretSantaAssignment {
  id              String   @id @default(cuid())
  eventId         String
  giverId         String   // Who gives
  receiverId      String   // Who receives
  revealed        Boolean  @default(false) // Can giver see who they got?
  createdAt       DateTime @default(now())
  
  event           SecretSantaEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  giver           User             @relation("Giver", fields: [giverId], references: [id])
  receiver        User             @relation("Receiver", fields: [receiverId], references: [id])
  
  @@unique([eventId, giverId]) // One assignment per giver
}

enum SecretSantaStatus {
  PENDING      // Event created, participants invited
  DRAWN        // Names have been drawn
  IN_PROGRESS  // Gifts being purchased
  COMPLETED    // Exchange completed
}

enum ParticipantStatus {
  INVITED
  ACCEPTED
  DECLINED
}
```

### 2. Integration Points

**Use Existing Systems:**
- **Wishlist**: Create a GROUP wishlist for the event
- **Collaborators**: Add all participants as collaborators
- **Items**: Participants add items to the shared wishlist
- **Reservations**: Use reservations to track who's buying what
- **Notifications**: Notify participants of draws, assignments, etc.

**New Components Needed:**
- Secret Santa event creation flow
- Participant invitation system
- Name drawing algorithm (random assignment with constraints)
- Assignment reveal system (giver can see receiver's wishlist)
- Progress tracking (who has reserved/purchased items)

### 3. Business Logic

**Event Creation:**
1. Create GROUP wishlist
2. Create SecretSantaEvent linked to wishlist
3. Add organizer as participant with ACCEPTED status
4. Invite other participants (creates SecretSantaParticipant records)

**Name Drawing:**
1. Verify all participants have ACCEPTED
2. Randomly assign giver → receiver (no self-assignment)
3. Create SecretSantaAssignment records
4. Update event status to DRAWN
5. Send notifications with assignments

**Assignment Reveal:**
- Giver can see receiver's wishlist (special access)
- Giver can reserve items from receiver's wishlist
- Use existing reservation system

**Progress Tracking:**
- Track reservations per assignment
- Show completion status (all items reserved/purchased)
- Update event status to COMPLETED when all done

### 4. API Endpoints Needed

```
POST   /secret-santa/events              // Create event
GET    /secret-santa/events              // List user's events
GET    /secret-santa/events/:id          // Get event details
POST   /secret-santa/events/:id/draw     // Draw names
GET    /secret-santa/events/:id/assignment  // Get my assignment
POST   /secret-santa/events/:id/reveal   // Reveal assignment
GET    /secret-santa/events/:id/progress // Get completion status
```

### 5. Permission Considerations

**Event Organizer:**
- Can manage participants
- Can trigger name drawing
- Can view all assignments (for admin purposes)
- Can delete event

**Participants:**
- Can view their own assignment (after reveal)
- Can access receiver's wishlist (special permission)
- Can reserve items from receiver's wishlist
- Cannot see other assignments

**Access Control:**
- Use existing wishlist access system
- Add special "Secret Santa" access check for receiver's wishlist
- Giver gets temporary access to receiver's wishlist (even if private)

---

## Summary

This system provides:
- ✅ Multi-user wishlist management
- ✅ Group collaboration with role-based permissions
- ✅ Item reservation tracking
- ✅ Privacy controls (PRIVATE, FRIENDS_ONLY, PUBLIC, GROUP)
- ✅ Friendship-based access control
- ✅ Notification system
- ✅ Flexible item status management
- ✅ Comprehensive API with proper permissions

The architecture is designed to be extensible, making it straightforward to add features like Secret Santa by leveraging existing wishlist, collaboration, and reservation systems.
