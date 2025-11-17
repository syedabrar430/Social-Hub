# 🚀 CALL SYSTEM - COMPLETE TEST GUIDE

## ⚠️ CRITICAL: You MUST have 2 different users to test!

Based on your database, you have:
- **User 1**: `cs22btech11058@iith.ac.in` (Syed Abrar)
- **User 2**: `syed.abrar430@gmail.com` (Test Abrar)

---

## 🔧 Step 1: Open Two Browser Windows

### Window 1 - Chrome (Normal Mode)
1. Open Chrome
2. Go to `http://localhost:8080`
3. **Login as User 1**: `cs22btech11058@iith.ac.in`
4. Go to **Messages** tab
5. **Open Browser Console** (F12 → Console)
6. Click on the DM with "Test Abrar" (`syed.abrar430`)
7. **Watch the console** - Look for:
   ```
   🔍 DM Conversation Data: {
     other_user: "syed.abrar430",
     other_user_email: "syed.abrar430@gmail.com",  ← MUST BE PRESENT!
     display_name: "Test Abrar"
   }
   ```

### Window 2 - Firefox/Edge (or Chrome Incognito)
1. Open Firefox or Chrome Incognito
2. Go to `http://localhost:8080`
3. **Login as User 2**: `syed.abrar430@gmail.com`
4. Go to **Messages** tab  
5. **Open Browser Console** (F12 → Console)
6. **Watch the console** - You should see every 1 second:
   ```
   🎧 Starting call invitation listener for: syed.abrar430@gmail.com
   📬 Checking invitations: { currentUserEmail: "syed.abrar430@gmail.com", ... }
   ```

---

## 📞 Step 2: Make a Call

### In Window 1 (User 1 - cs22btech11058@iith.ac.in):
1. Make sure you're in the DM with "Test Abrar"
2. **Click the phone icon** 📞 (green button)
3. A new tab will open with the Jitsi call
4. **Watch Console in Window 1** - You should see:
   ```
   📞 ========== SENDING CALL INVITATION ==========
   📞 Recipient Info: {
     recipientName: "Test Abrar",
     recipientEmail: "syed.abrar430@gmail.com",  ← MUST NOT BE UNDEFINED!
     recipientUsername: "syed.abrar430",
     meetingLink: "https://meet.jit.si/audio-..."
   }
   📤 Sending DM to: syed.abrar430
   📝 Message content: [call invitation with link]
   ✉️ Send DM result: { success: true }
   ✅ Message sent successfully!
   🔔 Sending popup invitation to localStorage
   📞 ========== INVITATION SENT ==========
   ```

### In Window 2 (User 2 - syed.abrar430@gmail.com):
1. **Within 1-2 seconds**, watch the console:
   ```
   📬 Checking invitations: { totalInvitations: 1, ... }
   📋 Checking invitation: {
     recipientEmail: "syed.abrar430@gmail.com",
     currentUserEmail: "syed.abrar430@gmail.com",
     matches: true  ← MUST BE TRUE!
   }
   📨 My invitations: [{ callerName: "Syed Abrar", ... }]
   📞 ========================================
   📞 INCOMING CALL NOTIFICATION RECEIVED!
   📞 ========================================
   ```

2. **POPUP SHOULD APPEAR** in top-right corner!
3. **Check Messages tab** - Call invitation link should appear in chat

---

## ❌ If Popup Doesn't Appear - Debugging

### Check 1: Is `other_user_email` present?
**In Window 1 Console:**
```
🔍 DM Conversation Data: { other_user_email: ??? }
```

- ❌ If `undefined` or missing → Backend issue, email not being fetched
- ✅ If present with correct email → Continue to Check 2

**Fix if missing:**
1. Check backend terminal for:
   ```
   ✅ Added email for syed.abrar430: syed.abrar430@gmail.com
   ```
2. If you see `⚠️ User not found in DB`, the database lookup failed
3. Restart backend: `Ctrl+C` in backend terminal, then run `python3 main.py`

### Check 2: Is invitation being sent?
**In Window 1 Console:**
```
🔔 Sending popup invitation to localStorage: { recipientEmail: ??? }
```

- ❌ If you don't see this → sendMeetingInvite function didn't run or failed
- ❌ If `recipientEmail` is `undefined` → Email not passed to component
- ✅ If recipientEmail is correct → Continue to Check 3

### Check 3: Is invitation in localStorage?
**In Window 2:**
1. Open DevTools → Application tab → Local Storage → `http://localhost:8080`
2. Look for key: `social_hub_call_invitations`
3. Click on it - should show:
   ```json
   [{"id":"call-...","recipientEmail":"syed.abrar430@gmail.com",...}]
   ```

- ❌ If missing → Invitation wasn't saved to localStorage
- ✅ If present → Continue to Check 4

### Check 4: Is listener checking?
**In Window 2 Console:**
```
📬 Checking invitations: { currentUserEmail: ???, totalInvitations: ??? }
```

- ❌ If not appearing every second → Listener not started
- ❌ If `currentUserEmail` is wrong → Wrong user logged in
- ❌ If `totalInvitations: 0` → localStorage is empty
- ✅ If all correct → Continue to Check 5

### Check 5: Does email match?
**In Window 2 Console:**
```
📋 Checking invitation: {
  recipientEmail: "...",
  currentUserEmail: "...",
  matches: ???
}
```

- ❌ If `matches: false` → Emails don't match (case-sensitive!)
- ❌ If you don't see this log → Filtering logic has a bug
- ✅ If `matches: true` → Popup SHOULD appear!

---

## 🐛 Common Issues & Solutions

### Issue: "Call invitation sent!" but no message in chat
**Solution:**
1. Check backend terminal for errors
2. Make sure you're logged in (401 errors = logged out)
3. Refresh the Messages page
4. Check if auto-refresh is working (messages update every 3 seconds)

### Issue: Message appears but no popup
**Solution:**
1. Check if `other_user_email` is correct in DM list
2. Verify exact email match between invitation and logged-in user
3. Clear localStorage: `localStorage.removeItem('social_hub_call_invitations')`
4. Refresh both windows

### Issue: Popup appears for caller too
**Solution:**
- This is normal if testing with same user in both windows
- Use two different user accounts to test properly

### Issue: Backend shows "⚠️ User not found in DB"
**Solution:**
The email lookup failed. The backend tries to match the RocketChat username with database users.

Run this in backend terminal to check users:
```bash
cd /Users/syedabrar/Downloads/miniproj/Social-Hub/backend
python3 -c "
from database import SessionLocal, User
db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f'{u.full_name}: {u.email} (rocket: {u.rocket_chat_username})')
"
```

---

## ✅ Success Checklist

When everything works, you should see:

### Window 1 (Caller):
- ✅ Console shows invitation sent
- ✅ Toast: "Call invitation sent!"
- ✅ New tab opens with Jitsi call
- ✅ Dialog shows meeting link

### Window 2 (Recipient):
- ✅ **POPUP APPEARS** in top-right corner
- ✅ Shows caller name and avatar
- ✅ Shows "Incoming Audio/Video Call"
- ✅ Has green "Accept" and red "Decline" buttons
- ✅ **Message with call link** appears in chat
- ✅ Message is clickable and opens call

---

## 🎯 Quick Test Commands

### Clear localStorage (if stuck):
```javascript
// In browser console
localStorage.removeItem('social_hub_call_invitations');
localStorage.removeItem('selectedConversation');
```

### Check current user email:
```javascript
// In browser console
JSON.parse(localStorage.getItem('user')).email
```

### Manually trigger invitation (for testing):
```javascript
// In Window 1 console
localStorage.setItem('social_hub_call_invitations', JSON.stringify([{
  id: "test-123",
  callerName: "Test User",
  callerEmail: "test@example.com",
  callType: "audio",
  meetingLink: "https://meet.jit.si/test-room",
  timestamp: Date.now(),
  recipientEmail: "syed.abrar430@gmail.com"  // Use recipient's actual email
}]));
```

Then watch Window 2 - popup should appear within 1 second!

---

## 📸 Expected Visual Result

When call is initiated, recipient should see:

```
┌─────────────────────────────────────┐
│  🔵  Syed Abrar                     │
│      Incoming Audio Call            │
│                                      │
│      ❌ Decline    ✅ Accept         │
└─────────────────────────────────────┘
```

In top-right corner, with:
- Blue gradient background
- Pulsing phone icon
- Caller avatar
- Two buttons

---

## 🔄 If Still Not Working

1. **Restart everything:**
   ```bash
   # Kill backend
   lsof -ti:8000 | xargs kill -9
   
   # Kill frontend
   lsof -ti:8080 | xargs kill -9
   
   # Start backend
   cd backend && python3 main.py
   
   # Start frontend
   cd .. && npm run dev
   ```

2. **Clear browser data:**
   - Close all tabs
   - Clear localStorage
   - Clear cookies
   - Reload and login again

3. **Check the logs:**
   - Backend terminal: Look for email lookup logs
   - Frontend console: Look for all 📞 emoji logs
   - Network tab: Check API calls for errors

---

## 📞 Need Help?

If popup still doesn't appear after following all steps:
1. Copy all console output from both windows
2. Copy backend terminal output
3. Check if you see `✅ Added email for [username]: [email]` in backend
4. Verify emails match EXACTLY (case-sensitive!)
