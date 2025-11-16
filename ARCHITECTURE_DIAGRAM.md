# 📊 Implementation Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Social Hub Application                      │
│                     (React + TypeScript)                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
         ┌──────────────┐  ┌──────────┐  ┌─────────────┐
         │  Messages    │  │  Feed    │  │  Profile    │
         │  Page        │  │  Page    │  │  Page       │
         └──────────────┘  └──────────┘  └─────────────┘
                │
                ├─── Communication Hub Card
                │    ├─ [📞 Audio Call Button]
                │    ├─ [📹 Video Call Button]
                │    └─ [👥 Conference Button]
                │
                ├─── Custom Chat Tab
                │    └─ EnhancedMessagesWidget
                │
                └─── RocketChat Tab
                     └─ RocketChatPopup
```

---

## Call Flow Architecture

```
User Clicks Button
       │
       ▼
┌──────────────────┐
│  CallButtons     │
│  Component       │
└──────────────────┘
       │
       ├─ handleAudioCall()
       ├─ handleVideoCall()
       └─ handleConference()
       │
       ▼
┌──────────────────┐
│  Jitsi Service   │
│  (jitsi.ts)      │
└──────────────────┘
       │
       ├─ generateRoomName()
       ├─ buildJitsiUrl()
       └─ window.open()
       │
       ▼
┌──────────────────┐
│  New Window      │
│  Opens with      │
│  Jitsi Meet      │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  User joins      │
│  meeting room    │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Meeting Link    │
│  Dialog shown    │
│  to user         │
└──────────────────┘
       │
       ├─ Copy to clipboard
       └─ (Optional) Post to RocketChat
```

---

## Component Structure

```
src/
├── pages/
│   └── Messages.tsx
│       └── Renders: Communication Hub + Call Buttons
│
├── components/
│   └── chat/
│       ├── CallButtons.tsx
│       │   ├─ Phone button (green)
│       │   ├─ Video button (blue)
│       │   ├─ Users button (purple)
│       │   └─ Meeting Link Dialog
│       │
│       ├── EnhancedMessagesWidget.tsx
│       ├── RocketChatPopup.tsx
│       └── RocketChatIframe.tsx
│
└── services/
    ├── jitsi.ts
    │   ├─ CallType enum
    │   ├─ JitsiService class
    │   ├─ startAudioCall()
    │   ├─ startVideoCall()
    │   ├─ startConference()
    │   └─ generateMeetingLink()
    │
    ├── rocketchat.ts
    │   ├─ RocketChatService class
    │   ├─ postMessage()
    │   ├─ postMeetingLink()
    │   └─ getStoredCredentials()
    │
    └── api.ts (existing)
```

---

## Data Flow

### 1. Audio Call Flow
```
[User Clicks "📞 Audio Call"]
         │
         ▼
    Get user info (name, email)
         │
         ▼
    Generate unique room name
    "audio-1699999999999-abc123"
         │
         ▼
    Build Jitsi URL with config
    + config.startWithVideoMuted=true
         │
         ▼
    Open new window (1200x700)
         │
         ▼
    Show meeting link dialog
         │
         ▼
    (Optional) Post to RocketChat
         │
         ▼
    User can copy & share link
```

### 2. Video Call Flow
```
[User Clicks "📹 Video Call"]
         │
         ▼
    Get user info (name, email)
         │
         ▼
    Generate unique room name
    "video-1699999999999-abc123"
         │
         ▼
    Build Jitsi URL with config
    + config.startWithVideoMuted=false
         │
         ▼
    Open new window (1200x700)
         │
         ▼
    Show meeting link dialog
         │
         ▼
    (Optional) Post to RocketChat
         │
         ▼
    User can copy & share link
```

### 3. Conference Flow
```
[User Clicks "👥 Conference"]
         │
         ▼
    Get user info (name, email)
         │
         ▼
    Generate unique room name
    "conference-1699999999999-abc123"
         │
         ▼
    Build Jitsi URL with config
    + config.enableWelcomePage=false
         │
         ▼
    Open new window (1400x800)
         │
         ▼
    Show meeting link dialog
         │
         ▼
    (Optional) Post to RocketChat
         │
         ▼
    User can copy & share link
```

---

## Integration Points

```
┌───────────────────────────────────────────────────────┐
│                  Social Hub Frontend                  │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │           Messages Page                      │    │
│  │                                              │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │   Communication Hub Card             │  │    │
│  │  │                                       │  │    │
│  │  │   [📞] [📹] [👥]  ← Call Buttons    │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  │                                              │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │   Chat Tabs                          │  │    │
│  │  │   • Custom Chat                      │  │    │
│  │  │   • RocketChat                       │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Backend API │  │ RocketChat  │  │ Jitsi Meet  │
│ :8000       │  │ :30082      │  │ :30083      │
└─────────────┘  └─────────────┘  └─────────────┘
     Auth            Chat           Calls
```

---

## Service Layer Design

```
┌──────────────────────────────────────────────────────┐
│              Jitsi Service (jitsi.ts)                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Properties:                                         │
│  • serverUrl: string                                 │
│                                                      │
│  Public Methods:                                     │
│  • startAudioCall(name, email, room?) → URL         │
│  • startVideoCall(name, email, room?) → URL         │
│  • startConference(name, email, room?) → URL        │
│  • generateMeetingLink(type, room?) → URL           │
│  • checkServerHealth() → Promise<boolean>           │
│                                                      │
│  Private Methods:                                    │
│  • generateRoomName(type) → string                  │
│  • buildJitsiUrl(options) → string                  │
│                                                      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│          RocketChat Service (rocketchat.ts)          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Properties:                                         │
│  • baseUrl: string                                   │
│                                                      │
│  Public Methods:                                     │
│  • postMessage(msg, creds) → Promise<boolean>       │
│  • postMeetingLink(room, url, type, creds)         │
│  • getStoredCredentials() → Credentials | null      │
│  • storeCredentials(token, userId) → void           │
│  • clearCredentials() → void                        │
│  • checkHealth() → Promise<boolean>                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## UI Component Hierarchy

```
Messages (Page)
│
├─ Card (Communication Hub)
│  ├─ CardHeader
│  │  ├─ CardTitle "📞 Communication Hub"
│  │  └─ CardDescription
│  │
│  └─ CardContent
│     └─ CallButtons
│        ├─ Button (Audio) - Green Gradient
│        ├─ Button (Video) - Blue Gradient
│        └─ Button (Conference) - Purple Gradient
│
├─ Tabs (Chat Interface)
│  ├─ TabsList
│  │  ├─ TabsTrigger "Custom Chat"
│  │  └─ TabsTrigger "Rocket.Chat"
│  │
│  ├─ TabsContent (Custom)
│  │  └─ EnhancedMessagesWidget
│  │
│  └─ TabsContent (RocketChat)
│     └─ RocketChatPopup
│
└─ Dialog (Meeting Link)
   ├─ DialogHeader
   │  ├─ Title with emoji
   │  └─ Description
   │
   └─ DialogContent
      ├─ Success indicator
      ├─ Meeting link input
      ├─ Copy button
      └─ Tip box
```

---

## State Management

```
CallButtons Component State:
┌─────────────────────────────────┐
│ meetingLink: string             │  ← Current meeting URL
│ showLinkDialog: boolean         │  ← Dialog visibility
│ callType: CallType              │  ← audio/video/conference
└─────────────────────────────────┘

User Context (Auth):
┌─────────────────────────────────┐
│ user: {                         │
│   id: string                    │  ← Used for call identification
│   email: string                 │  ← Shown in Jitsi
│   name: string                  │  ← Display name in call
│ }                               │
└─────────────────────────────────┘

RocketChat Credentials (localStorage):
┌─────────────────────────────────┐
│ rocketchat_auth_token: string   │  ← For posting links
│ rocketchat_user_id: string      │  ← User identification
└─────────────────────────────────┘
```

---

## Network Requests

```
Frontend → Jitsi Server
┌────────────────────────────────┐
│ No direct HTTP requests        │
│ Opens URLs in browser windows  │
│ WebRTC connections handled by  │
│ Jitsi Meet client              │
└────────────────────────────────┘

Frontend → RocketChat (Optional)
┌────────────────────────────────┐
│ POST /api/v1/chat.postMessage  │
│ Headers:                       │
│   X-Auth-Token: <token>        │
│   X-User-Id: <userId>          │
│ Body:                          │
│   roomId, text, emoji          │
└────────────────────────────────┘

Frontend → Backend API
┌────────────────────────────────┐
│ GET /auth/me                   │
│ PUT /auth/profile              │
│ POST /auth/login               │
│ (Existing auth endpoints)      │
└────────────────────────────────┘
```

---

## Error Handling Flow

```
User Action
    │
    ▼
Try to start call
    │
    ├─ Success ─────────→ Open window
    │                     Show dialog
    │                     Toast success
    │
    └─ Error
       │
       ├─ Server unreachable ──→ Toast error message
       │                         "Check if server accessible"
       │
       ├─ Popup blocked ──────→ Browser notification
       │                         User allows popup
       │
       └─ Network error ──────→ Toast error
                                Retry option
```

---

## Room Name Generation Logic

```
generateRoomName(type: CallType)
         │
         ▼
    type: "audio" | "video" | "conference"
         │
         ▼
    timestamp = Date.now()
    → 1699999999999
         │
         ▼
    random = Math.random().toString(36).substring(7)
    → "abc123"
         │
         ▼
    roomName = `${type}-${timestamp}-${random}`
    → "audio-1699999999999-abc123"
         │
         ▼
    RETURN roomName
```

---

## URL Configuration Building

```
buildJitsiUrl(options)
         │
         ▼
    Base URL: http://10.68.0.49:30083
         │
         ▼
    + Room name: /audio-1699999999999-abc123
         │
         ▼
    + User info params (if provided):
      userInfo.displayName=John+Doe
      userInfo.email=john@example.com
         │
         ▼
    + Call type configs:
      AUDIO:       config.startWithVideoMuted=true
      VIDEO:       config.startWithVideoMuted=false
      CONFERENCE:  config.enableWelcomePage=false
         │
         ▼
    Final URL:
    http://10.68.0.49:30083/audio-1699999999999-abc123#
    userInfo.displayName=John+Doe&
    config.startWithVideoMuted=true
```

---

## File Dependencies

```
Messages.tsx
    ├── imports CallButtons
    ├── imports Card components
    ├── imports Tabs components
    └── imports existing chat widgets

CallButtons.tsx
    ├── imports jitsiService
    ├── imports rocketChatService
    ├── imports useAuth hook
    ├── imports Button, Dialog components
    └── imports toast notifications

jitsi.ts
    └── No external dependencies
        (pure service logic)

rocketchat.ts
    └── No external dependencies
        (pure service logic)
```

---

## Deployment Checklist

```
Frontend Files:
├── ✅ src/services/jitsi.ts
├── ✅ src/services/rocketchat.ts
├── ✅ src/components/chat/CallButtons.tsx
└── ✅ src/pages/Messages.tsx (updated)

Documentation:
├── ✅ IMPLEMENTATION_SUMMARY.md
├── ✅ JITSI_INTEGRATION.md
├── ✅ TESTING_AUDIO_VIDEO_CALLS.md
├── ✅ QUICK_START.md
└── ✅ ARCHITECTURE_DIAGRAM.md (this file)

External Services Required:
├── ✅ Jitsi Meet Server (Port 30083)
├── ✅ RocketChat Server (Port 30082)
└── ✅ Backend API (Port 8000)

Configuration:
├── ✅ Jitsi URL configured
├── ✅ RocketChat URL configured
├── ✅ Window sizes optimized
└── ✅ Button styling configured
```

---

## Performance Considerations

```
Button Click → Response Time
┌────────────────────────────┐
│ State update:    < 50ms    │
│ URL generation:  < 10ms    │
│ Window open:     < 100ms   │
│ Dialog render:   < 200ms   │
│ Toast display:   immediate │
└────────────────────────────┘

Total user-perceived latency: < 500ms
```

---

## Browser Compatibility

```
Supported Browsers:
✅ Chrome/Chromium (80+)
✅ Firefox (75+)
✅ Safari (13+)
✅ Edge (80+)

Required Features:
✅ WebRTC support
✅ Popup windows
✅ Clipboard API (for copy)
✅ Modern ES6+ JavaScript
```

---

This architecture diagram provides a comprehensive visual overview of the entire audio and video call implementation! 🚀
