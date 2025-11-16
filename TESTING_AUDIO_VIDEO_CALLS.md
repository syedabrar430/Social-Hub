# Audio and Video Call Implementation - Testing Guide

## 🎯 What Was Implemented

### Components Created

1. **`/src/services/jitsi.ts`** - Jitsi Meet Integration Service
   - Handles audio, video, and conference calls
   - Generates unique room names
   - Manages call window creation
   - Configures call parameters

2. **`/src/components/chat/CallButtons.tsx`** - Call Buttons Component
   - Three beautiful gradient buttons (Audio, Video, Conference)
   - Meeting link dialog with copy functionality
   - Toast notifications for user feedback
   - Optional RocketChat integration

3. **`/src/services/rocketchat.ts`** - RocketChat API Service
   - Posts meeting links to RocketChat
   - Manages authentication
   - Health check functionality

4. **Updated `/src/pages/Messages.tsx`**
   - Added Communication Hub card with call buttons
   - Integrated seamlessly with existing chat tabs
   - Responsive layout

## 🚀 Quick Start Testing

### Prerequisites
- Jitsi server running at: `http://10.68.0.49:30083`
- RocketChat server running at: `http://10.68.0.49:30082`
- Frontend application running

### Test Steps

#### 1. Start Frontend
```bash
cd Social-Hub
npm run dev
# or
bun dev
```

#### 2. Navigate to Messages Page
1. Open browser: `http://localhost:5173` (or your dev port)
2. Login with your credentials
3. Click "Messages" in navigation

#### 3. Test Audio Call
1. Look for "Communication Hub" card at top
2. Click green **"📞 Audio Call"** button
3. ✅ New window should open with Jitsi
4. ✅ Video should be disabled (audio only)
5. ✅ Dialog shows meeting link
6. ✅ Toast notification appears
7. Click "Copy Link" button
8. ✅ Link copied to clipboard

#### 4. Test Video Call
1. Click blue **"📹 Video Call"** button
2. ✅ New window opens with video enabled
3. ✅ Both audio and video should work
4. ✅ Meeting link dialog appears
5. Share link with another user to test joining

#### 5. Test Conference
1. Click purple **"👥 Conference"** button
2. ✅ Larger window opens (1400x800)
3. ✅ Optimized for group calls
4. ✅ All features available

## 🧪 Detailed Test Cases

### Test Case 1: Audio Call Basic Flow
```
GIVEN: User is on Messages page
WHEN: User clicks "Audio Call" button
THEN:
  - New window opens with Jitsi Meet
  - Video is muted/disabled
  - Audio is enabled
  - Unique room URL is generated
  - Dialog shows meeting link
  - Success toast appears
```

### Test Case 2: Video Call Basic Flow
```
GIVEN: User is on Messages page
WHEN: User clicks "Video Call" button
THEN:
  - New window opens with Jitsi Meet
  - Video is enabled
  - Audio is enabled
  - Unique room URL is generated
  - Dialog shows meeting link
  - Success toast appears
```

### Test Case 3: Conference Basic Flow
```
GIVEN: User is on Messages page
WHEN: User clicks "Conference" button
THEN:
  - Larger window opens (1400x800)
  - Video is enabled
  - Audio is enabled
  - Unique room URL is generated
  - Dialog shows meeting link
  - Success toast appears
```

### Test Case 4: Link Sharing
```
GIVEN: User has started a call
WHEN: User clicks copy button in dialog
THEN:
  - Meeting URL copied to clipboard
  - "Link copied" toast appears
  - Link can be pasted and shared
```

### Test Case 5: Multi-User Join
```
GIVEN: User A has started a video call
AND: User A shares meeting link
WHEN: User B opens the shared link
THEN:
  - User B joins the same room
  - Both users can see/hear each other
  - Call continues seamlessly
```

### Test Case 6: User Info in Call
```
GIVEN: User is logged in as "John Doe"
WHEN: User starts any type of call
THEN:
  - Display name in Jitsi shows "John Doe"
  - Email is associated with call (if available)
```

### Test Case 7: Error Handling - Server Down
```
GIVEN: Jitsi server is not accessible
WHEN: User clicks any call button
THEN:
  - Error toast appears
  - Message: "Please check if Jitsi server is accessible"
  - No window opens
  - User can try again
```

### Test Case 8: Popup Blocker
```
GIVEN: Browser has popup blocker enabled
WHEN: User clicks call button
THEN:
  - Browser shows popup blocked notification
  - User can allow popup
  - Call works after allowing
```

## 📊 Visual Verification Checklist

### Messages Page Layout
- [ ] Communication Hub card visible at top
- [ ] Three buttons displayed horizontally
- [ ] Green button (Audio Call) on left
- [ ] Blue button (Video Call) in middle
- [ ] Purple button (Conference) on right
- [ ] Buttons have gradient effect
- [ ] Icons visible (📞 📹 👥)
- [ ] Labels visible ("Audio Call", "Video Call", "Conference")
- [ ] Card has title "Communication Hub"
- [ ] Card has description text

### Button Styling
- [ ] Hover effect works (scale + darker gradient)
- [ ] Shadow effects visible
- [ ] Smooth transitions
- [ ] Responsive on mobile

### Dialog Appearance
- [ ] Dialog opens after clicking button
- [ ] Call type emoji shows (📞/📹/👥)
- [ ] Title shows call type
- [ ] Green checkmark visible
- [ ] "Call window opened" message
- [ ] Meeting link in read-only input
- [ ] Copy button visible with link icon
- [ ] Blue tip box at bottom

### Toast Notifications
- [ ] Success toast on call start
- [ ] "Link copied" toast on copy
- [ ] Error toast if server unavailable
- [ ] Proper emoji icons (📞 📹 👥 📋)

## 🔍 Debug Checklist

If something doesn't work, check:

### 1. Server Connectivity
```bash
# Test Jitsi server
curl http://10.68.0.49:30083

# Test RocketChat server
curl http://10.68.0.49:30082
```

### 2. Browser Console
```javascript
// Check for errors
// Open DevTools (F12) -> Console tab
// Look for red error messages
```

### 3. Network Tab
```
// Open DevTools -> Network tab
// Start a call
// Check if requests succeed
```

### 4. Component Loading
```javascript
// In browser console, verify:
typeof jitsiService !== 'undefined'  // Should be true
```

## 🎨 Visual Test: Button States

### Normal State
```
Audio:     Green gradient, phone icon
Video:     Blue gradient, video icon
Conference: Purple gradient, users icon
```

### Hover State
```
Audio:     Darker green, slight scale up, shadow
Video:     Darker blue, slight scale up, shadow
Conference: Darker purple, slight scale up, shadow
```

### Active State
```
Button pressed effect, immediate response
```

## 📱 Responsive Testing

### Desktop (>768px)
- [ ] Buttons in horizontal row
- [ ] All labels visible
- [ ] Proper spacing between buttons
- [ ] Call window opens at correct size

### Tablet (768px)
- [ ] Buttons still horizontal
- [ ] Slightly smaller spacing
- [ ] Dialog responsive

### Mobile (<640px)
- [ ] Consider vertical button layout
- [ ] Icons remain visible
- [ ] Labels may stack
- [ ] Dialog fits screen

## 🔧 Configuration Verification

### Check Jitsi URL
```typescript
// In src/services/jitsi.ts
const JITSI_SERVER_URL = 'http://10.68.0.49:30083';
```

### Check RocketChat URL
```typescript
// In src/services/rocketchat.ts
const ROCKETCHAT_URL = 'http://10.68.0.49:30082';
```

## ✅ Expected Behavior Summary

### Audio Call
- ✅ Opens in new window (1200x700)
- ✅ Video muted by default
- ✅ Audio enabled
- ✅ Room name format: `audio-{timestamp}-{random}`
- ✅ Config: `startWithVideoMuted=true`

### Video Call
- ✅ Opens in new window (1200x700)
- ✅ Video enabled
- ✅ Audio enabled
- ✅ Room name format: `video-{timestamp}-{random}`
- ✅ Config: `startWithVideoMuted=false`

### Conference
- ✅ Opens in new window (1400x800)
- ✅ Video enabled
- ✅ Audio enabled
- ✅ Room name format: `conference-{timestamp}-{random}`
- ✅ Config: `enableWelcomePage=false`

## 🐛 Common Issues & Solutions

### Issue: Buttons not showing
**Solution**: Check Messages page is rendering, verify import paths

### Issue: Popup blocked
**Solution**: Allow popups in browser settings

### Issue: No video/audio
**Solution**: Grant browser permissions for camera/microphone

### Issue: Can't join from link
**Solution**: Verify Jitsi server URL is accessible from other devices

### Issue: RocketChat integration not working
**Solution**: Store credentials first:
```typescript
rocketChatService.storeCredentials(authToken, userId);
```

## 📈 Performance Metrics

Expected performance:
- Button click response: < 100ms
- Window open time: < 500ms
- Dialog render: < 200ms
- Toast display: Immediate
- Link copy: < 50ms

## 🎉 Success Criteria

Your implementation is successful when:
- [x] All three buttons are visible
- [x] Clicking audio call opens with video disabled
- [x] Clicking video call opens with video enabled
- [x] Clicking conference opens larger window
- [x] Meeting links are shareable
- [x] Multiple users can join same room
- [x] UI is responsive and smooth
- [x] Error handling works
- [x] Toast notifications appear

## 📝 Next Steps After Testing

1. **Test with real users** - Get feedback on UX
2. **Monitor performance** - Check call quality
3. **Optimize if needed** - Adjust window sizes, etc.
4. **Add features** - Password protection, recording, etc.
5. **Documentation** - Update user guides

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify server URLs are correct
3. Test servers independently
4. Check network connectivity
5. Review JITSI_INTEGRATION.md for more details

---

Happy Testing! 🚀
