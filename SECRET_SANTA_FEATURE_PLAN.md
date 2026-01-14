# Secret Santa Feature - Implementation Plan

## Overview
Secret Santa is a gift exchange feature that allows users to organize anonymous gift exchanges with friends. The feature leverages existing wishlist, collaboration, and reservation systems to create a seamless experience.

---

## Core Concept

**How It Works:**
1. **Organizer** creates a Secret Santa event and invites participants
2. System creates a **GROUP wishlist** for the event
3. Participants add items to their own wishlists (or the group wishlist)
4. Organizer triggers **name drawing** (random assignment)
5. Each participant gets assigned a **receiver** (who they'll buy for)
6. Participants can **reveal their assignment** to see who they're buying for
7. Participants **reserve/purchase items** from their receiver's wishlist
8. System tracks progress and completion

---

## User Flows

### Flow 1: Creating a Secret Santa Event (Organizer)

1. **User Action:** Navigate to Secret Santa tab → Tap "Create Secret Santa"
2. **UI:** 
   - Form with fields:
     - Event name/title
     - Description (optional)
     - Budget (optional)
     - Exchange date
     - Draw date (when to draw names)
   - Friend selector (multi-select from friends list)
3. **Backend:**
   - Creates `SecretSantaEvent` record
   - Creates GROUP wishlist with title like "Secret Santa: [Event Name]"
   - Adds organizer as participant (status: ACCEPTED)
   - Adds selected friends as participants (status: INVITED)
   - Adds all participants as collaborators to the GROUP wishlist
   - Sends notifications to invited participants
4. **Result:** 
   - Event appears in organizer's Secret Santa list
   - Invited friends receive notifications
   - GROUP wishlist is created and accessible to all participants

### Flow 2: Accepting/Declining Invitation (Participant)

1. **User Action:** Receives notification → Opens Secret Santa tab
2. **UI:** 
   - Shows pending invitations section
   - Each invitation shows:
     - Event name
     - Organizer name
     - Exchange date
     - Budget (if set)
     - "Accept" / "Decline" buttons
3. **Backend:**
   - If accepted: Updates `SecretSantaParticipant.status = ACCEPTED`
   - If declined: Updates `SecretSantaParticipant.status = DECLINED`
   - Sends notification to organizer
4. **Result:** 
   - Accepted: Participant can now see event and add items
   - Declined: Event removed from participant's view

### Flow 3: Adding Items (Participant)

**Option A: Add to Personal Wishlist**
- Participants add items to their own wishlists (existing flow)
- System tracks which wishlists belong to participants

**Option B: Add to Group Wishlist**
- Participants can add items directly to the Secret Santa GROUP wishlist
- Items show "Added by [Participant Name]"

**Implementation Note:** We'll need to track which wishlists belong to each participant for the assignment reveal.

### Flow 4: Drawing Names (Organizer)

1. **Prerequisites:**
   - All participants must have ACCEPTED
   - Minimum 2 participants
   - Draw date must be reached (or organizer can draw early)

2. **User Action:** Organizer opens event → Taps "Draw Names" button
3. **UI:** 
   - Confirmation dialog: "Are you sure? This cannot be undone."
   - Loading state during draw
4. **Backend Algorithm:**
   ```
   For each participant:
     - Randomly select another participant as receiver
     - Ensure: giverId ≠ receiverId (no self-assignment)
     - Ensure: No duplicate assignments (each person gets one giver)
     - Create SecretSantaAssignment record
   - Update event.status = DRAWN
   - Send notifications to all participants
   ```
5. **Result:**
   - Event status changes to DRAWN
   - All participants receive notification: "Names have been drawn! Reveal your assignment."
   - Assignments are created but not yet revealed

### Flow 5: Revealing Assignment (Participant)

1. **User Action:** Participant opens event → Taps "Reveal My Assignment" button
2. **UI:**
   - Confirmation: "Are you sure? Once revealed, you'll see who you're buying for."
   - Animation/celebration when revealed
   - Shows receiver's name and avatar
   - Button to "View [Receiver]'s Wishlist"
3. **Backend:**
   - Updates `SecretSantaAssignment.revealed = true`
   - Grants special access to receiver's wishlist (even if PRIVATE)
   - Creates temporary access permission
4. **Result:**
   - Participant can now see receiver's wishlist
   - Can reserve items from receiver's wishlist
   - Assignment is permanently revealed (cannot be hidden again)

### Flow 6: Buying Gifts (Participant)

1. **User Action:** After revealing assignment → View receiver's wishlist
2. **UI:**
   - Shows receiver's wishlist items
   - Can filter by budget (if set)
   - Can reserve items (existing reservation flow)
   - Shows progress: "X of Y items reserved"
3. **Backend:**
   - Uses existing reservation system
   - Tracks reservations per assignment
   - Updates progress tracking
4. **Result:**
   - Items are reserved (existing flow)
   - Progress is tracked
   - Receiver gets notification when items are reserved

### Flow 7: Tracking Progress

1. **Organizer View:**
   - See all participants
   - See who has revealed assignments
   - See completion status (all items reserved/purchased)
   - Can manually mark event as COMPLETED

2. **Participant View:**
   - See own assignment status
   - See own progress (items reserved/purchased)
   - See event-wide progress (optional)

---

## Database Schema (Based on Documentation)

```prisma
model SecretSantaEvent {
  id              String   @id @default(cuid())
  title           String
  description     String?
  organizerId     String
  wishlistId      String   @unique  // Associated GROUP wishlist
  drawDate        DateTime // When names should be drawn
  exchangeDate    DateTime // When gifts are exchanged
  budget          Float?
  currency        String   @default("USD")
  status          SecretSantaStatus @default(PENDING)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  organizer       User     @relation(fields: [organizerId], references: [id])
  wishlist        Wishlist @relation(fields: [wishlistId], references: [id])
  participants    SecretSantaParticipant[]
  assignments     SecretSantaAssignment[]
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

---

## UI/UX Design

### Secret Santa Tab (Main Screen)

**Empty State:**
- Large gift icon
- "No Secret Santa events yet"
- "Create your first Secret Santa" button

**Active Events List:**
- Cards showing:
  - Event name
  - Exchange date
  - Status badge (Pending, Names Drawn, In Progress, Completed)
  - Participant count
  - Progress indicator (if drawn)
  - Action button (contextual):
    - "Draw Names" (organizer, pending)
    - "Reveal Assignment" (participant, drawn but not revealed)
    - "View Event" (otherwise)

**Sections:**
1. **My Events** (organized by me)
2. **Invitations** (pending acceptance)
3. **Active Events** (participating in)
4. **Past Events** (completed)

### Event Detail Screen

**Header:**
- Event name
- Exchange date
- Budget (if set)
- Status badge

**Organizer View:**
- Participants list with status
- "Draw Names" button (if pending)
- Progress overview
- "Mark as Completed" button

**Participant View:**
- Assignment card (if revealed):
  - "You're buying for: [Name]"
  - Avatar
  - "View Wishlist" button
- "Reveal Assignment" button (if drawn but not revealed)
- Progress: "X items reserved"
- Event info

**Tabs:**
- Overview
- Participants
- Progress (organizer only)

### Create Event Screen

**Form Fields:**
- Event name (required)
- Description (optional, text area)
- Budget (optional, number input with currency)
- Exchange date (date picker)
- Draw date (date picker, defaults to exchange date - 7 days)
- Participants (multi-select from friends)

**Validation:**
- Minimum 2 participants
- Draw date < Exchange date
- All fields validated before submission

---

## Integration with Existing Systems

### 1. Wishlist System
- **GROUP wishlist** created automatically
- All participants added as collaborators (EDITOR role)
- Participants can add items to group wishlist
- Uses existing wishlist viewing/editing flows

### 2. Reservation System
- Participants reserve items from receiver's wishlist
- Uses existing `ItemReservation` system
- Tracks reservations per assignment
- Notifications sent when items reserved

### 3. Notification System
- `SECRET_SANTA_INVITED` - When invited to event
- `SECRET_SANTA_ACCEPTED` - When participant accepts
- `SECRET_SANTA_DRAWN` - When names are drawn
- `SECRET_SANTA_ASSIGNMENT_REVEALED` - When assignment revealed
- `SECRET_SANTA_ITEM_RESERVED` - When item reserved for receiver

### 4. Friendship System
- Only friends can be invited
- Uses existing friendship checks
- Friend list used for participant selection

### 5. Access Control
- **Special Permission:** Giver gets temporary access to receiver's wishlist
- Even if receiver's wishlist is PRIVATE, giver can view it
- This is a special case that bypasses normal privacy rules
- Access is granted when assignment is revealed
- Access is revoked when event is completed (or manually)

---

## API Endpoints (Backend)

### Events
```
POST   /secret-santa/events
GET    /secret-santa/events                    // List user's events
GET    /secret-santa/events/:id                // Get event details
PATCH  /secret-santa/events/:id                // Update event (organizer only)
DELETE /secret-santa/events/:id                // Delete event (organizer only)
```

### Participants
```
POST   /secret-santa/events/:id/participants/invite    // Invite participant
POST   /secret-santa/events/:id/participants/accept     // Accept invitation
POST   /secret-santa/events/:id/participants/decline    // Decline invitation
DELETE /secret-santa/events/:id/participants/:userId    // Remove participant (organizer only)
GET    /secret-santa/events/:id/participants           // List participants
```

### Assignments
```
POST   /secret-santa/events/:id/draw                    // Draw names (organizer only)
GET    /secret-santa/events/:id/assignment              // Get my assignment
POST   /secret-santa/events/:id/assignment/reveal       // Reveal my assignment
GET    /secret-santa/events/:id/assignments             // Get all assignments (organizer only)
```

### Progress
```
GET    /secret-santa/events/:id/progress                // Get completion status
POST   /secret-santa/events/:id/complete                // Mark as completed (organizer only)
```

---

## Frontend Implementation

### Services
**Location:** `apps/mobile/src/services/secretSanta.ts`

```typescript
secretSantaService = {
  // Event operations
  createEvent(payload): Promise<SecretSantaEvent>
  getEvents(): Promise<SecretSantaEvent[]>
  getEvent(id: string): Promise<SecretSantaEvent>
  updateEvent(id: string, payload): Promise<SecretSantaEvent>
  deleteEvent(id: string): Promise<void>
  
  // Participant operations
  inviteParticipant(eventId: string, userId: string): Promise<void>
  acceptInvitation(eventId: string): Promise<void>
  declineInvitation(eventId: string): Promise<void>
  removeParticipant(eventId: string, userId: string): Promise<void>
  getParticipants(eventId: string): Promise<Participant[]>
  
  // Assignment operations
  drawNames(eventId: string): Promise<void>
  getMyAssignment(eventId: string): Promise<Assignment | null>
  revealAssignment(eventId: string): Promise<Assignment>
  getAllAssignments(eventId: string): Promise<Assignment[]>  // Organizer only
  
  // Progress
  getProgress(eventId: string): Promise<Progress>
  markAsCompleted(eventId: string): Promise<void>
}
```

### React Query Hooks
**Location:** `apps/mobile/src/hooks/useSecretSanta.ts`

```typescript
// Queries
useSecretSantaEvents(): UseQueryResult<SecretSantaEvent[]>
useSecretSantaEvent(id: string): UseQueryResult<SecretSantaEvent>
useSecretSantaParticipants(eventId: string): UseQueryResult<Participant[]>
useSecretSantaAssignment(eventId: string): UseQueryResult<Assignment | null>
useSecretSantaProgress(eventId: string): UseQueryResult<Progress>

// Mutations
useCreateSecretSantaEvent(): UseMutationResult
useUpdateSecretSantaEvent(): UseMutationResult
useDeleteSecretSantaEvent(): UseMutationResult
useInviteParticipant(): UseMutationResult
useAcceptInvitation(): UseMutationResult
useDeclineInvitation(): UseMutationResult
useDrawNames(): UseMutationResult
useRevealAssignment(): UseMutationResult
useMarkEventCompleted(): UseMutationResult
```

### Components

1. **SecretSantaScreen** (main tab)
   - Event list
   - Empty state
   - Filtering/sorting

2. **CreateSecretSantaSheet**
   - Form for creating event
   - Friend selector
   - Date pickers

3. **SecretSantaEventCard**
   - Event summary card
   - Status badge
   - Action buttons

4. **SecretSantaEventDetail**
   - Full event view
   - Assignment reveal
   - Progress tracking

5. **ParticipantList**
   - List of participants
   - Status indicators
   - Remove participant (organizer)

6. **AssignmentCard**
   - Shows assignment (if revealed)
   - Receiver info
   - Link to wishlist

---

## Business Logic & Constraints

### Name Drawing Algorithm

**Requirements:**
- No self-assignment (giver ≠ receiver)
- Each person gets exactly one giver
- Each person is assigned to exactly one receiver
- Random distribution

**Algorithm:**
```typescript
function drawNames(participants: User[]): Assignment[] {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const assignments: Assignment[] = [];
  
  for (let i = 0; i < shuffled.length; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % shuffled.length]; // Circular assignment
    
    // Ensure no self-assignment (shouldn't happen with circular, but safety check)
    if (giver.id === receiver.id) {
      // Fallback: swap with next person
      const nextIndex = (i + 2) % shuffled.length;
      [shuffled[i + 1], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[i + 1]];
      receiver = shuffled[(i + 1) % shuffled.length];
    }
    
    assignments.push({ giverId: giver.id, receiverId: receiver.id });
  }
  
  return assignments;
}
```

### Access Control Rules

1. **Event Access:**
   - Organizer: Full access
   - Participant: Can view own event
   - Others: No access

2. **Assignment Access:**
   - Giver: Can see own assignment (after reveal)
   - Receiver: Cannot see who their giver is (stays secret)
   - Organizer: Can see all assignments (for admin)

3. **Wishlist Access:**
   - Normal rules apply (privacy level, friendship)
   - **Exception:** Giver gets special access to receiver's wishlist after reveal
   - This access is temporary and event-specific

### Progress Tracking

**Completion Criteria:**
- All participants have revealed assignments
- All givers have reserved at least one item for their receiver
- (Optional) All reserved items marked as purchased

**Progress Calculation:**
```typescript
interface Progress {
  totalParticipants: number
  assignmentsRevealed: number
  assignmentsCompleted: number  // All items reserved/purchased
  eventStatus: SecretSantaStatus
}
```

---

## Edge Cases & Considerations

1. **Minimum Participants:**
   - Need at least 2 participants
   - Validation on creation and drawing

2. **Participant Drops Out:**
   - If participant declines after drawing: Re-draw required
   - If participant declines before drawing: Remove from event

3. **Event Deletion:**
   - Organizer can delete event
   - Cascade deletes: participants, assignments, wishlist (if event-specific)

4. **Multiple Wishlists:**
   - Participants may have multiple wishlists
   - Need to identify which wishlist to use for assignment
   - **Solution:** Use receiver's primary/default wishlist, or let giver choose

5. **Budget Constraints:**
   - Optional budget field
   - Filter items by budget when viewing receiver's wishlist
   - Show budget remaining

6. **Draw Date vs Exchange Date:**
   - Draw date: When names are drawn (can be manual)
   - Exchange date: When gifts are exchanged
   - Organizer can draw early if all participants accepted

7. **Reveal Timing:**
   - Once revealed, cannot be hidden
   - All participants can reveal at their own pace
   - Organizer can see who has revealed

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Database schema (Prisma models)
- [ ] Backend API endpoints
- [ ] Basic service layer
- [ ] React Query hooks

### Phase 2: Event Management
- [ ] Create event flow
- [ ] Event list view
- [ ] Event detail view
- [ ] Participant management

### Phase 3: Name Drawing
- [ ] Draw names algorithm
- [ ] Assignment creation
- [ ] Assignment reveal flow
- [ ] Special wishlist access

### Phase 4: Integration
- [ ] Wishlist integration
- [ ] Reservation integration
- [ ] Notification integration
- [ ] Progress tracking

### Phase 5: Polish
- [ ] UI/UX refinements
- [ ] Animations
- [ ] Error handling
- [ ] Edge case handling

---

## Open Questions

1. **Wishlist Selection:**
   - Should we use receiver's default wishlist?
   - Or allow giver to choose from receiver's wishlists?
   - Or create a dedicated wishlist for the event?

2. **Group Wishlist Usage:**
   - Should participants add items to the group wishlist?
   - Or only to their personal wishlists?
   - Or both?

3. **Assignment Visibility:**
   - Should organizer see all assignments immediately?
   - Or only after all participants have revealed?

4. **Re-draw Functionality:**
   - Should organizer be able to re-draw names?
   - Under what circumstances?

5. **Event Completion:**
   - Automatic when all items purchased?
   - Or manual by organizer?
   - Or both?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Answer open questions** to finalize design
3. **Create detailed technical specs** for backend
4. **Design UI mockups** for key screens
5. **Begin Phase 1 implementation**

---

This plan leverages the existing wishlist, collaboration, and reservation systems while adding the Secret Santa-specific logic for assignments and reveals. The feature integrates seamlessly with the current architecture.
