# 🧪 Testing Call System - Step by Step

## Prerequisites
✅ Backend running on `http://localhost:8000`
✅ Frontend running on `http://localhost:8080`
✅ At least 2 user accounts registered

## 🔍 Step 1: Open Browser Console
Press **F12** or **Right-click → Inspect** to open Developer Tools
Go to the **Console** tab - this will show all debug logs

## 👥 Step 2: Testing with Two Browser Windows

### Window 1 - User A (Caller)
1. Open Chrome/Brave in normal mode
2. Go to `http://localhost:8080`
3. Login as User A (e.g., `john@example.com`)
4. Go to **Messages** tab
5. Click on a DM conversation with User B
6. **Watch Console** - You should see:
   ```
   🔍 DM Conversation Data: { display_name, other_user, other_user_email, ... }
   🎯 InlineCallButtons rendered with props: { recipientName, recipientEmail, ... }
   ```
7. Check if `other_user_email` is present in the console logs
8. Click the **phone icon** 📞 for audio call
9. **Watch Console** - You should see:
   ```
   📞 ========== SENDING CALL INVITATION ==========
   📞 Recipient Info: { recipientEmail, recipientName, ... }
   📤 Sending DM to: [username]
   📝 Message content: [call invitation message]
   ✉️ Send DM result: { success: true }
   ✅ Message sent successfully!
   🔔 Sending popup invitation to localStorage: { ... }
   📞 ========== INVITATION SENT ==========
   ```

### Window 2 - User B (Recipient)
1. Open Firefox/Edge or Chrome Incognito
2. Go to `http://localhost:8080`
3. Login as User B (e.g., `jane@example.com`)
4. Go to **Messages** tab
5. **Watch Console** - You should see every second:
   ```
   🎧 Starting call invitation listener for: jane@example.com
   📬 Checking invitations: { currentUserEmail, totalInvitations, ... }
   ```
6. When User A calls, you should see:
   ```
   📞 ========================================
   📞 INCOMING CALL NOTIFICATION RECEIVED!
   📞 Invitation details: { callerName, meetingLink, ... }
   📞 ========================================
   ```
7. **Popup should appear** in top-right corner
8. **Check Messages** - Call invitation link should appear in chat

## 🐛 Troubleshooting

### Issue 1: No `other_user_email` in Console
**Problem**: Console shows `other_user_email: undefined`

**Solution**: Backend database query issue
1. Stop backend (Ctrl+C)
2. Check if users exist in database
3. Restart backend: `cd backend && python3 main.py`
4. Refresh frontend and check DM list again

### Issue 2: Message Not Sent
**Problem**: Console shows error when sending DM

**Check**:
- Is `recipientUsername` correct?
- Backend logs: Look for "Sending DM to:" in backend terminal
- RocketChat connectivity: Check if backend can reach RocketChat

### Issue 3: Popup Not Appearing
**Problem**: Message sent but no popup

**Check Console Logs**:
```
📬 Checking invitations: { currentUserEmail: ?, totalInvitations: ? }
```
- Is `currentUserEmail` correct?
- Is `totalInvitations > 0`?
- Check localStorage: Open DevTools → Application → Local Storage → `social_hub_call_invitations`

**Check Invitation Match**:
```
📋 Checking invitation: { recipientEmail: ?, currentUserEmail: ?, matches: ? }
```
- Does `recipientEmail` match `currentUserEmail`?
- Emails are **case-sensitive**!

### Issue 4: Link Not in Chat
**Problem**: No call link message in chat

**Check**:
- Backend terminal: Look for "Sending DM" logs
- Frontend console: Check for "✉️ Send DM result: { success: true }"
- Refresh messages: Click another conversation then back
- Check if messages are auto-refreshing (every 3 seconds)

## 📊 Expected Console Output

### Caller Side (User A):
```
🔍 DM Conversation Data: {
  display_name: "Jane Doe",
  other_user: "jane",
  other_user_email: "jane@example.com"
}
🎯 InlineCallButtons rendered with props: {
  recipientName: "Jane Doe",
  recipientEmail: "jane@example.com",
  recipientUsername: "jane"
}
[User clicks call button]
📞 ========== SENDING CALL INVITATION ==========
📞 Recipient Info: {
  recipientEmail: "jane@example.com",
  callType: "audio",
  meetingLink: "https://meet.jit.si/audio-1234567890-xyz"
}
📤 Sending DM to: jane
✉️ Send DM result: { success: true }
✅ Message sent successfully!
🔔 Sending popup invitation to localStorage
📞 ========== INVITATION SENT ==========
```

### Recipient Side (User B):
```
🎧 Starting call invitation listener for: jane@example.com
📬 Checking invitations: { currentUserEmail: "jane@example.com", totalInvitations: 1 }
📋 Checking invitation: {
  recipientEmail: "jane@example.com",
  currentUserEmail: "jane@example.com",
  matches: true
}
📨 My invitations: [{ callerName: "John Doe", ... }]
✅ Processing invitation
📞 ========================================
📞 INCOMING CALL NOTIFICATION RECEIVED!
📞 Invitation details: {
  callerName: "John Doe",
  callType: "audio",
  meetingLink: "https://meet.jit.si/audio-1234567890-xyz"
}
📞 ========================================
✅ Incoming call state set!
```

## ✅ Success Indicators

1. ✅ Console shows `other_user_email` is populated (not undefined)
2. ✅ Call invitation message appears in chat with clickable link
3. ✅ Popup appears in top-right corner for recipient
4. ✅ Clicking "Accept" opens call in new tab
5. ✅ Clicking "Decline" dismisses popup
6. ✅ Toast notifications appear for both users

## 🔧 Quick Fixes

### Clear localStorage (if testing gets stuck):
```javascript
// In browser console:
localStorage.removeItem('social_hub_call_invitations');
```

### Check database for user emails:
```bash
# In backend terminal
cd /Users/syedabrar/Downloads/miniproj/Social-Hub/backend
python3
>>> from database import SessionLocal, User
>>> db = SessionLocal()
>>> users = db.query(User).all()
>>> for u in users:
...     print(f"{u.full_name}: {u.email} (rocket: {u.rocket_chat_username})")
```

### Force refresh DM list:
- Click away from Messages tab
- Click back to Messages tab
- Select a different DM
- Select the original DM again

## 📝 Notes

- Popup uses localStorage for cross-tab communication
- Polls every 1 second for new invitations
- Invitations expire after 2 minutes
- Message links work even if popup doesn't show
- Popup only works if `other_user_email` is available
