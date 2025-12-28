# Testing Guide: Group Gift Feature

This guide will help you test the group gift functionality that has been implemented.

## Prerequisites

### 1. Backend Server Running
Make sure your backend is running and connected to the database:

```bash
# In the root directory
npm run backend:dev
```

The backend should be running on `http://localhost:3000` (or your configured port).

### 2. Database is Up to Date
The schema already includes `WishlistCollaborator` model, so no migration is needed. But verify your database is synced:

```bash
npm run db:generate
npm run db:migrate
```

### 3. Frontend App Running
Start the mobile app:

```bash
# In the root directory
npm run mobile:dev
# OR
cd apps/mobile
npx expo start
```

## Testing Steps

### Test 1: Create a Group Gift Wishlist

1. **Navigate to Friends Page**
   - Open the app and go to the "Friends" tab
   - Or navigate to `/friends/birthdays`

2. **Open Birthday Gift Modal**
   - Find a friend with an upcoming birthday
   - Tap the "Gift" button next to their name
   - You should see a bottom sheet with two options:
     - "Create Wishlist" (personal)
     - "Create Group Gift" (shared)

3. **Create Group Gift**
   - Tap "Create Group Gift"
   - The `CreateGroupGiftSheet` should open

4. **Fill in Details**
   - Enter a title (e.g., "John's Birthday Gift")
   - Optionally add a description
   - **Select friends to invite** (this is the key feature!)
     - You should see a list of all your friends
     - Tap friends to select/deselect them
     - Selected friends will have a checkmark
   - Configure settings (Allow Comments, Allow Reservations)

5. **Create the Wishlist**
   - Tap "Create Group Gift" button
   - The wishlist should be created
   - Invitations should be sent to selected friends

### Test 2: Verify Backend Endpoints

You can test the backend endpoints directly using a tool like Postman or curl:

#### Get Wishlists (should include collaborator wishlists)
```bash
GET http://localhost:3000/api/wishlists
Authorization: Bearer <your-clerk-token>
```

#### Invite a Collaborator
```bash
POST http://localhost:3000/api/wishlists/{wishlistId}/collaborators/invite
Authorization: Bearer <your-clerk-token>
Content-Type: application/json

{
  "inviteeUserId": "<friend-clerk-id>"
}
```

#### Get Collaborators
```bash
GET http://localhost:3000/api/wishlists/{wishlistId}/collaborators
Authorization: Bearer <your-clerk-token>
```

#### Accept Collaboration (as the invited friend)
```bash
POST http://localhost:3000/api/wishlists/{wishlistId}/collaborators/accept
Authorization: Bearer <friend-clerk-token>
```

### Test 3: Check Notifications

1. **As the Invited Friend**
   - Log in as a friend who was invited
   - Go to Notifications
   - You should see a notification: "Group Gift Invitation"
   - The notification should say: "[Your Name] invited you to collaborate on '[Wishlist Title]'"

2. **Accept Invitation** (Manual for now)
   - Currently, you need to accept via API or we need to build the UI
   - Once accepted, the friend should see the wishlist in their wishlists list

### Test 4: Collaborator Permissions

1. **As a Collaborator (after accepting)**
   - The collaborator should be able to:
     - ✅ View the wishlist
     - ✅ Add items to the wishlist
     - ✅ Edit items they added
     - ✅ Delete items they added
     - ❌ Delete the wishlist (only owner can)
     - ❌ Remove other collaborators (only owner/admin can)

2. **As the Owner**
   - The owner should be able to:
     - ✅ Do everything a collaborator can do
     - ✅ Remove collaborators
     - ✅ Update collaborator roles
     - ✅ Delete the wishlist

### Test 5: View Group Wishlists

1. **On Wishlists Page**
   - Navigate to the main Wishlists tab
   - You should see:
     - Your personal wishlists (where you're the owner)
     - Group wishlists (where you're a collaborator)
   - **Note**: Currently they're all mixed together. We still need to add a "Group" section.

## What's Working ✅

- ✅ Backend: Collaborator endpoints (invite, accept, remove, list, update role)
- ✅ Backend: Permission checks (collaborators can add/edit/delete items)
- ✅ Backend: Wishlist queries include collaborator wishlists
- ✅ Frontend: CreateGroupGiftSheet component with friend selection
- ✅ Frontend: Integration with birthdays page
- ✅ Frontend: Types and service methods for collaborators
- ✅ Notifications: Invitations are sent when creating group gifts

## What's Not Done Yet ⏳

- ⏳ **Accept Invitation UI**: Friends need a way to accept invitations from notifications
- ⏳ **Group Wishlists Section**: Wishlists page should show group wishlists separately
- ⏳ **Collaborator Management UI**: View/manage collaborators on wishlist detail page
- ⏳ **Show Who Added Items**: Item display should show which collaborator added each item
- ⏳ **Admin Controls**: UI for owner to remove collaborators, change roles, etc.
- ⏳ **Other Friends Pages**: Update `all.tsx`, `friends.tsx`, and `[id].tsx` to use CreateGroupGiftSheet

## Troubleshooting

### Issue: "No friends to invite"
- **Solution**: Make sure you have friends added. Go to Friends tab and add some friends first.

### Issue: "Failed to create group gift wishlist"
- **Check**: Is the backend running?
- **Check**: Are you authenticated? (Check Clerk token)
- **Check**: Console logs for detailed error messages

### Issue: "Error inviting friend"
- **Check**: Is the friend's Clerk ID correct?
- **Check**: Is the friend already a collaborator?
- **Note**: Errors are logged but don't stop the wishlist creation

### Issue: Can't see group wishlists
- **Check**: Did you accept the collaboration invitation?
- **Check**: Backend `findAll` should return both owned and collaborator wishlists
- **Note**: UI separation (Group section) is not implemented yet

## Quick Test Checklist

- [ ] Backend server is running
- [ ] Mobile app is running
- [ ] You have at least 2-3 friends added
- [ ] Can open CreateGroupGiftSheet from birthdays page
- [ ] Can select/deselect friends
- [ ] Can create group gift wishlist
- [ ] Invited friends receive notifications
- [ ] Can accept invitation (via API for now)
- [ ] Collaborator can add items to wishlist
- [ ] Owner can see all collaborators
- [ ] Owner can remove collaborators

## Next Steps for Full Implementation

1. **Add Accept Invitation UI** - Handle notification tap to accept
2. **Add Group Section** - Separate group wishlists on main page
3. **Add Collaborator Management** - View/edit collaborators on wishlist detail
4. **Show Item Authors** - Display who added each item
5. **Add Admin Controls** - Remove collaborators, change roles
6. **Update All Friends Pages** - Use CreateGroupGiftSheet everywhere

## Testing with Multiple Users

To fully test the collaboration flow:

1. **User A (Owner)**
   - Create a group gift wishlist
   - Invite User B and User C

2. **User B (Collaborator)**
   - Receive notification
   - Accept invitation
   - Add items to wishlist
   - Edit items

3. **User C (Collaborator)**
   - Receive notification
   - Accept invitation
   - Add items to wishlist

4. **User A (Owner)**
   - See all items added by collaborators
   - Manage collaborators
   - Delete wishlist if needed

This will test the full collaboration workflow!

