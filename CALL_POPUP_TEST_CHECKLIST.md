# 📋 Call Popup Testing Checklist

## 🎯 Quick Test (5 Minutes)

### Setup:
- [ ] Backend running on `localhost:8000`
- [ ] Frontend running on `localhost:5173`
- [ ] Two users registered in database

### Window 1 - Caller:
- [ ] Open normal browser window
- [ ] Login as User A
- [ ] Go to Messages page
- [ ] Select a DM conversation with User B

### Window 2 - Recipient:
- [ ] Open incognito/private browser window  
- [ ] Login as User B
- [ ] Go to Messages page
- [ ] Keep on Messages tab (any conversation or list)

### Test Call:
- [ ] In Window 1: Click 📞 Audio Call button
- [ ] Verify: Call opens in new tab for User A
- [ ] Verify: Toast shows "Call invitation sent!"
- [ ] **In Window 2: POPUP SHOULD APPEAR within 1-2 seconds!** 🎉
- [ ] Verify: Popup shows caller name and call type
- [ ] Verify: Green Accept and Red Decline buttons visible
- [ ] Click Accept in Window 2
- [ ] Verify: Call opens in new tab for User B
- [ ] Verify: Both users can join the Jitsi meeting

### Test Video Call:
- [ ] Repeat above steps with 📹 Video Call button
- [ ] Verify popup appears for video call
- [ ] Test Decline button (popup dismisses)

---

## 🔍 Debugging Checklist

### If Popup Doesn't Appear:

#### Check Console Logs (F12):

**Window 1 (Caller) - Should See:**
```
✅ 📞 ========== SENDING CALL INVITATION ==========
✅ 📞 Recipient Info: { ... }
✅ 🔍 Resolving email from backend...
✅ ✅ Resolved email from backend: user@gmail.com
✅ 📤 Sending DM to: username
✅ ✅ Message sent successfully to chat!
✅ 🔔 Sending popup invitation to localStorage
✅ 📧 Popup will appear for user with email: user@gmail.com
✅ 📞 ========== INVITATION SENT ==========
```

**Window 2 (Recipient) - Should See:**
```
✅ 🎧 Starting call invitation listener for: user@gmail.com
✅ 📬 Checking invitations: { totalInvitations: 1, ... }
✅ 📋 Checking invitation call-xyz: { emailsMatch: true, ... }
✅ 📨 My invitations: [...]
✅ ✅ Processing invitation: { ... }
✅ 🎨 IncomingCallBanner: Showing popup for invitation
```

#### Common Issues:

- [ ] **Email mismatch**: Check console for actual emails being compared
  - Caller email vs Recipient email in logs
  - Both should be normalized to lowercase

- [ ] **Backend not running**: 
  ```bash
  curl http://localhost:8000/health
  # Should return: {"message": "API is healthy and running!"}
  ```

- [ ] **User not on Messages page**: 
  - Listener only active on Messages page
  - Reload Messages page and try again

- [ ] **localStorage issue**:
  ```javascript
  // In console of Window 2
  localStorage.getItem('social_hub_call_invitations')
  // Should show invitation object
  ```

- [ ] **Browser cache**: 
  - Clear localStorage: `localStorage.clear()`
  - Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)

---

## 📊 Success Criteria

### ✅ Must Pass:
1. Popup appears within 1-2 seconds ✨
2. Popup shows correct caller information
3. Accept button opens call in new tab
4. Decline button dismisses popup
5. Chat message appears with meeting link
6. Works in both normal and incognito browsers
7. Works for both audio and video calls

### 🎁 Bonus (Optional):
- Works across multiple tabs of same user
- Multiple simultaneous calls handled
- Old invitations auto-expire
- Sound notification plays (if enabled)

---

## 🚨 Emergency Fixes

### Nuclear Option (If Nothing Works):

1. **Stop everything**:
   ```bash
   # Kill backend
   pkill -f "python.*main.py"
   
   # Kill frontend
   pkill -f "node.*vite"
   ```

2. **Clear all caches**:
   - Browser: Clear all site data for localhost
   - localStorage: `localStorage.clear()`
   - Cookies: Clear all localhost cookies

3. **Restart clean**:
   ```bash
   # Backend
   cd backend
   python main.py
   
   # Frontend (new terminal)
   cd ..
   npm run dev
   ```

4. **Test with fresh users**:
   - Register two completely new users
   - Test with these fresh accounts

---

## 📞 Quick Test Commands

### Backend Health Check:
```bash
curl http://localhost:8000/health
```

### Check User Exists:
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Email Resolution:
```bash
curl -X POST "http://localhost:8000/api/rocket-chat/resolve-user-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"username": "testuser"}'
```

---

## 🎯 Expected Console Output

### Perfect Working Scenario:

**Caller Window:**
```
📞 ========== SENDING CALL INVITATION ==========
📞 Recipient Info: {recipientName: 'John Doe', recipientEmail: 'john@gmail.com', ...}
📤 Sending DM to: john
✅ Message sent successfully to chat!
🔔 Sending popup invitation to localStorage
📧 Popup will appear for user with email: john@gmail.com
📞 ========== INVITATION SENT ==========
```

**Recipient Window (1-2 seconds later):**
```
📬 Checking invitations: {totalInvitations: 1, allInvitations: [...]}
📋 Checking invitation call-123: {emailsMatch: true, matches: true}
📨 My invitations: [{id: 'call-123', callerName: 'Syed Abrar', ...}]
✅ Processing invitation: {callerName: 'Syed Abrar', callType: 'audio', ...}
🎨 IncomingCallBanner: Showing popup for invitation
```

**When Accept Clicked:**
```
✅ Accepting call: https://meet.jit.si/audio-123-456
```

---

## 📝 Test Report Template

Use this to document your test results:

```markdown
## Test Date: [DATE]
## Tester: [YOUR NAME]

### Environment:
- Backend: ✅ Running / ❌ Not Running
- Frontend: ✅ Running / ❌ Not Running
- Browsers: [Chrome/Firefox/Safari]

### Test Results:

#### Audio Call Test:
- Popup appeared: ✅ Yes / ❌ No (Time: ___ seconds)
- Accept worked: ✅ Yes / ❌ No
- Decline worked: ✅ Yes / ❌ No
- Chat message sent: ✅ Yes / ❌ No

#### Video Call Test:
- Popup appeared: ✅ Yes / ❌ No (Time: ___ seconds)
- Accept worked: ✅ Yes / ❌ No
- Decline worked: ✅ Yes / ❌ No
- Chat message sent: ✅ Yes / ❌ No

#### Cross-Tab Test:
- Works in multiple tabs: ✅ Yes / ❌ No

### Issues Found:
[List any issues here]

### Console Errors:
[Paste any error messages]

### Overall Result: ✅ PASS / ❌ FAIL
```

---

## 🎉 Success!

If all checkboxes are ✅, congratulations! Your call popup system is working perfectly! 🚀📞✨

**Next Steps:**
- Test with real users
- Enable notification sound (optional)
- Monitor production logs
- Gather user feedback

---

**Need Help?** Check:
- `CALL_POPUP_COMPLETE_FIX.md` - Detailed implementation guide
- `INCOMING_CALL_POPUP.md` - Original feature documentation
- Console logs - Enable verbose logging in browser
