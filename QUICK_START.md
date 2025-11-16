# 🚀 Quick Start Guide - Audio & Video Calls

## TL;DR - Get Started in 3 Minutes

### Prerequisites
Make sure these are running:
```bash
# Jitsi Server
http://10.68.0.49:30083 ✅

# RocketChat Server  
http://10.68.0.49:30082 ✅

# Backend API
http://localhost:8000 ✅
```

---

## 🎬 Step-by-Step

### 1. Start Your Frontend (30 seconds)
```bash
cd Social-Hub
npm run dev
# or
bun dev
```

Wait for:
```
✅ Local: http://localhost:5173
```

### 2. Open & Login (30 seconds)
1. Open browser: **http://localhost:5173**
2. Click **"Login"**
3. Enter credentials
4. Click **"Messages"** in navbar

### 3. Make Your First Call (1 minute)
1. See **"Communication Hub"** card at top
2. Click green **"📞 Audio Call"** button
3. ✅ New window opens with Jitsi
4. ✅ Dialog shows meeting link
5. Click **"Copy Link"** button
6. Share link with someone else!

### 4. Test All Features (1 minute)
- Try **"📹 Video Call"** (blue button)
- Try **"👥 Conference"** (purple button)
- Share links via chat or any method

---

## 🎯 What You'll See

### Messages Page
```
┌──────────────────────────────────────┐
│  📞 Communication Hub                │
│  Start an audio call, video call... │
│                                      │
│  [📞 Audio] [📹 Video] [👥 Conference] │
└──────────────────────────────────────┘

[Custom Chat] [Rocket.Chat]  ← tabs
```

### When You Click a Button
1. **New window opens** → Jitsi Meet interface
2. **Dialog appears** → Shows meeting link
3. **Toast notification** → Confirms action

---

## ✅ Quick Test Checklist

- [ ] Can see three call buttons on Messages page
- [ ] Audio call opens with video disabled
- [ ] Video call opens with video enabled
- [ ] Conference opens in larger window
- [ ] Meeting link dialog appears
- [ ] Can copy link to clipboard
- [ ] Toast notifications work
- [ ] Can share link with others

---

## 🎨 Button Reference

| Button | Icon | Color | What It Does |
|--------|------|-------|--------------|
| **Audio Call** | 📞 | Green | Voice only (no video) |
| **Video Call** | 📹 | Blue | Face-to-face (video + audio) |
| **Conference** | 👥 | Purple | Group meeting (larger window) |

---

## 🔗 Meeting Links Look Like This

```
http://10.68.0.49:30083/audio-1699999999999-abc123#config.startWithVideoMuted=true
```

- Each call gets a **unique room name**
- Anyone with the link can join
- Share via chat, email, or any method

---

## 🆘 Quick Troubleshooting

### Problem: Don't see call buttons
**Fix**: Make sure you're on the Messages page (`/messages`)

### Problem: Popup blocked
**Fix**: Click "Allow popups" in browser address bar

### Problem: No audio/video
**Fix**: Grant browser permissions when prompted

### Problem: Can't start call
**Fix**: Check Jitsi server is running at `http://10.68.0.49:30083`

---

## 💡 Pro Tips

### For Better Calls
- Use headphones to prevent echo
- Good lighting for video calls
- Close other tabs for better performance

### For Sharing
- Copy link before closing dialog
- Paste in RocketChat for team access
- Share directly with specific people

### For Testing
- Open link in incognito for second user
- Test on different devices
- Try screen sharing in conference mode

---

## 📖 Full Documentation

For more details, see:
- **IMPLEMENTATION_SUMMARY.md** - What was built
- **JITSI_INTEGRATION.md** - How it works
- **TESTING_AUDIO_VIDEO_CALLS.md** - Complete test guide

---

## 🎉 You're Ready!

That's it! You now have:
- ✅ Audio calling
- ✅ Video calling  
- ✅ Conference calls
- ✅ Easy link sharing
- ✅ Beautiful UI

**Go ahead and make your first call!** 🚀

---

## ❓ Need Help?

1. Check browser console (F12) for errors
2. Verify servers are running
3. Review documentation files
4. Test with different browsers

**Happy calling!** 📞📹👥
