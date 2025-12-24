# Todo List

##notifications
* Maybe delete notifactions older than 30days to better the database?


## Recent Fixes (Dec 2025)
* ✅ Fixed displayName to firstName/lastName migration - Database schema updated, all backend services and frontend components updated
* ✅ Restored friends feature functionality - Friends list, search, and requests now working correctly
* ✅ Improved search - Now works with 1 character minimum (previously required 2 characters)
* ✅ Database migration completed - Successfully migrated user data from displayName to firstName/lastName
* ✅ Friend profile page - Complete profile view with privacy controls, birthday visibility (friends only), wishlists display
* ✅ Friend request management - Accept/decline on profile page, sent request tracking and cancellation
* ✅ Notification counter fixes - Badge updates correctly after friend request actions
* ✅ UI cleanup - Removed redundant "View Wishlists" menu option, streamlined friend menu
* ✅ Item interaction on friend's wishlist - Heart button (add to my wishlist), Reserve button (with allowReservations check), Link button
* ✅ Item reservation system - Reserve/unreserve items, visual feedback for reserved items, proper state management
* ✅ Reserve button visibility - Only shows when wishlist allows reservations (allowReservations check)
* ✅ Modal title customization - "Add to my Wishlist" title when adding items from friend's wishlist
* ✅ Action button spacing - Improved spacing between action buttons and divider

### Wishlists details page
* when clicking an image of an item it should be in the focus

### Friends page
* ✅ Fix styling
* ✅ Add search function - Inline animated search bar with Instagram-style UX
* ✅ Create adding friends feature - Send friend requests via search
* ✅ Show friend requests (both ways) and options to accept and decline - Pending requests section with themed accept/decline buttons
* ✅ Friend management - Remove friend with confirmation modal, three-dot menu options
* ✅ Friend request notifications - Notifications for new requests with badges on Friends tab and bell icon
* ✅ Cancel friend requests - Ability to cancel sent requests from search results
* ✅ Search improvement - Now works with single character input (improved from 2 character minimum)
* ✅ Friend profile page - View friend profiles with public details, birthday (friends only), wishlists, and special items
* ✅ Clickable friend entries - Friends list and search results navigate to user profiles
* ✅ Clickable pending requests - View sender's profile before accepting/declining requests
* ✅ Accept/decline on profile page - Manage friend requests directly from profile with refresh after action
* ✅ Sent request management - View and cancel sent requests from profile page and Friends page
* ✅ Notification counter sync - Badge updates correctly after accepting/declining requests
* ✅ Removed redundant "View Wishlists" option - Wishlists are now only viewed on profile page
* ✅ Wishlist card restyling on friend profile - Removed large icon, new layout with left column (title, active wishes, total price) and right side (image, chevron)
* ✅ Wishlist sorting on friend profile - Sort button with same functionality as main wishlists page
* ✅ Item action buttons on friend's wishlist - Heart (add to wishlist), Reserve (buy/reserve gift), Link (open URL) buttons
* ✅ Item reservation system - Full reservation functionality with proper state management and visual feedback
* ✅ Reserve button conditional display - Only shows when wishlist.allowReservations is true
* ✅ Modal title customization - Custom "Add to my Wishlist" title when adding items from friend's wishlist
* ✅ Friends wishlists display - View friend's wishlists on their profile with sorting
* ✅ Birthday display - Show birthdays on friend profiles (friends only, with privacy controls)
* ⚠️ Important dates/events - Not yet implemented (mentioned in requirements)
* ⚠️ Mutual friends display - Not yet implemented (mentioned in cursorrules.md)
* ✅ Block/unblock users - BLOCKED status exists in schema but UI functionality not implemented

### Gifts
* find out what should go here
* Gift recommendation based on profile (age/sex/interests)

### Profile page
✅ Turn profile page into a instagram inspired page
✅ showcase how others view u
✅ allow access to settings page
✅ Saved themes by user.
✅ Delete my account feature (deletes from both Clerk and database) 

### Fab button
✅ implement other buttons features

### Add Item
* Add item from link, scan barcode, manual entry --, share link to app
* route link for affiliate


### Guided onboarding
* sign up
✅ create profile
* choose interests
✅ choose default theme



### Sharing links

### Refresh pages by pulling down
* ✅ Completed - All pages now have pull-to-refresh functionality

### Affiliate marketing
* add products, graphs, show cheapest options, replace links








