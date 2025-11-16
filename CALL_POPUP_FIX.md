# Incoming Call Popup Fix

## Issue Fixed
The incoming call popup was not showing up when making audio/video calls because the recipient's email was not being passed correctly through the call invitation system.

## Changes Made

### 1. **Updated ChatConversation Interface** (`src/services/chat.ts`)
- Added `other_user_email?: string` field to properly track recipient email addresses in direct messages
- This field is already being sent from the backend but was missing in the TypeScript interface

### 2. **Fixed Email Passing** (`src/components/chat/EnhancedMessagesWidget.tsx`)
- Changed from passing `other_user` (username) to `other_user_email` (actual email)
- Updated to use `display_name` for the recipient's full name
```tsx
recipientEmail={selectedConversation.other_user_email || selectedConversation.other_user}
recipientName={selectedConversation.display_name || selectedConversation.name || ...}
```

### 3. **Enhanced Call Invitation Manager** (`src/services/callInvitations.ts`)
- Added comprehensive debug logging to track invitation flow
- Added manual storage event dispatch for same-tab testing
- Logs show:
  - When invitations are sent
  - Current user email being listened to
  - All invitations in storage
  - Filtered invitations for current user

### 4. **Added Debug Logging** (`src/components/chat/InlineCallButtons.tsx`)
- Added console logs showing recipient details when sending invitations
- Helps verify correct data is being passed

### 5. **Updated Popup Position** (`src/components/chat/IncomingCallBanner.tsx`)
- Changed from center-top to **top-right corner** (WhatsApp style)
- Changed from: `left-1/2 -translate-x-1/2` (centered)
- To: `right-4` (right corner)

### 6. **Added Listener Logging** (`src/App.tsx`)
- Added logs when starting/stopping call invitation listener
- Shows which email is being listened to

## How It Works

1. **Caller initiates call** via `InlineCallButtons` component
2. **Call invitation is sent** via `callInvitationManager.sendInvitation()` with:
   - Recipient's **email** (not username)
   - Caller's name and email
   - Call type (audio/video)
   - Meeting link
   - Timestamp
3. **Invitation stored** in localStorage with key `social_hub_call_invitations`
4. **Storage event fired** (automatically for cross-tab, manually for same-tab)
5. **Recipient's browser** polls localStorage every second via `callInvitationManager`
6. **Invitations filtered** by matching `recipientEmail` with logged-in user's email
7. **Popup displayed** via `IncomingCallBanner` in top-right corner
8. **User accepts/declines** and popup disappears

## Testing Instructions

### Single Browser Testing (Same User)
Since the invitation system filters by email, you need **two different user accounts** to test:

1. **Setup Two Users:**
   ```bash
   # Make sure you have at least 2 users registered
   # Example: user1@example.com and user2@example.com
   ```

2. **Test with Two Tabs:**
   - Tab 1: Login as User A (e.g., `user1@example.com`)
   - Tab 2: Login as User B (e.g., `user2@example.com`)

3. **Make a Call:**
   - In Tab 1 (User A): Go to Messages → Select User B from DM list
   - Click the phone icon (audio) or video icon
   - Watch Tab 2 (User B): Popup should appear in top-right corner

4. **Check Console Logs:**
   - Caller (Tab 1) should show: `📤 Call invitation sent:`
   - Recipient (Tab 2) should show: 
     - `📬 Checking invitations:` 
     - `📨 My invitations:`
     - `📞 Incoming call notification received:`

### Two Browser Testing (Recommended)
- Browser 1 (e.g., Chrome): Login as User A
- Browser 2 (e.g., Firefox/Edge): Login as User B
- Make call from Browser 1
- Popup appears in Browser 2

### Debug Information
Open browser console (F12) to see detailed logs:
- `🎧 Starting call invitation listener for: <email>`
- `📞 Sending call invitation: { recipientEmail, recipientName, ... }`
- `📤 Call invitation sent: { ... }`
- `💾 All invitations in storage: [...]`
- `📬 Checking invitations: { currentUserEmail, totalInvitations, ... }`
- `📨 My invitations: [...]`
- `📞 Incoming call notification received: { ... }`

## Popup Features

### Visual Design (WhatsApp-style)
- ✅ **Top-right corner** positioning
- ✅ **Gradient background** (blue gradient)
- ✅ **Pulsing call icon** animation
- ✅ **User avatar** with fallback initials
- ✅ **Caller name** and call type display
- ✅ **Two action buttons:**
  - Red decline button (X icon)
  - Green accept button (Phone/Video icon with pulse animation)
- ✅ **Semi-transparent backdrop**

### Functionality
- ✅ Auto-dismisses on click outside
- ✅ Opens call in new tab when accepted
- ✅ Shows toast notification on accept/decline
- ✅ Smooth slide-in animation
- ✅ Clears invitation after processing

## Troubleshooting

### Popup Not Showing?

1. **Check if both users are logged in with different emails**
   - Open console in recipient's browser
   - Look for: `🎧 Starting call invitation listener for: <email>`
   - Verify it matches the recipient's email

2. **Check if invitation is being sent**
   - Open console in caller's browser
   - Look for: `📤 Call invitation sent:`
   - Verify `recipientEmail` matches the actual recipient's email

3. **Check localStorage**
   - Open DevTools → Application → Local Storage
   - Look for key: `social_hub_call_invitations`
   - Should contain an array with the invitation

4. **Check invitation filtering**
   - Look for: `📬 Checking invitations:`
   - Verify `currentUserEmail` matches your logged-in email
   - Check if `totalInvitations > 0`
   - Check if `myInvitations` array has items

5. **Common Issues:**
   - **Wrong email being sent**: Check if `other_user_email` exists in conversation data
   - **Not polling**: Verify listener is started (check for listener logs)
   - **Filtering issue**: Emails must match exactly (case-sensitive)
   - **Already processed**: Clear localStorage and try again

### Clear Test Data
```javascript
// In browser console
localStorage.removeItem('social_hub_call_invitations');
```

## Backend Verification

The backend already sends the correct data. Verify by checking the DM list API response:

```bash
# Check if other_user_email is present
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/rocket-chat/dm-list-complete
```

Expected response should include:
```json
{
  "dms": [
    {
      "other_user": "username",
      "other_user_email": "user@example.com",
      "display_name": "User Full Name"
    }
  ]
}
```

## Files Modified

1. `src/services/chat.ts` - Added `other_user_email` to interface
2. `src/components/chat/EnhancedMessagesWidget.tsx` - Fixed email passing
3. `src/services/callInvitations.ts` - Enhanced with debug logging
4. `src/components/chat/InlineCallButtons.tsx` - Added debug logging
5. `src/components/chat/IncomingCallBanner.tsx` - Fixed positioning
6. `src/App.tsx` - Added listener logging

## Next Steps

If the popup still doesn't show after these fixes:

1. Check browser console for all the debug logs mentioned above
2. Verify the recipient's email in the invitation matches their logged-in email
3. Try in different browsers (not just different tabs)
4. Check if popup is being hidden by z-index issues (unlikely with z-9999)
5. Verify no browser extensions are blocking the popup

## Success Criteria

✅ Popup appears in **top-right corner** (WhatsApp style)
✅ Shows caller's **name and avatar**
✅ Displays correct **call type** (audio/video)
✅ **Accept button** opens call in new tab
✅ **Decline button** dismisses the popup
✅ Works **cross-tab** and **cross-browser**
✅ Console shows complete **debug log trail**
