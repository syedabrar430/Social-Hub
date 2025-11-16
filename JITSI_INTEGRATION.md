# Jitsi Meet Integration Guide

## Overview
This Social Hub application now includes integrated audio calling, video calling, and conference functionality using Jitsi Meet. The integration is completely separate from RocketChat, allowing users to start calls while continuing to use the chat features.

## Features

### 📞 Audio Call
- Start audio-only calls with video disabled
- Perfect for quick voice conversations
- Opens in a new window for better focus
- Generates unique room names for each call

### 📹 Video Call  
- Start video calls with audio and video enabled
- Ideal for 1-on-1 face-to-face conversations
- High-quality video and audio
- Full screen sharing capabilities

### 👥 Conference
- Start group conferences for multiple participants
- Optimized for larger meetings
- Screen sharing and collaborative features
- Bigger window size for better viewing

## Architecture

```
Your Website
├── RocketChat (Chat functionality)
├── Jitsi Meet (Audio/Video calls) - INDEPENDENT
└── Call Buttons (UI controls)
```

### Key Components

1. **`/src/services/jitsi.ts`**
   - Core Jitsi service handling all call types
   - Generates unique room names
   - Builds configured URLs with parameters
   - Manages call window creation

2. **`/src/components/chat/CallButtons.tsx`**
   - UI component with 3 call buttons
   - Handles user interactions
   - Shows meeting link dialog
   - Optional RocketChat integration

3. **`/src/services/rocketchat.ts`**
   - Posts meeting links to RocketChat (optional)
   - Manages RocketChat API integration
   - Handles authentication

## Configuration

### Jitsi Server URL
Update the server URL in `/src/services/jitsi.ts`:

```typescript
const JITSI_SERVER_URL = 'http://10.68.0.49:30083';
```

### RocketChat Server URL
Update in `/src/services/rocketchat.ts`:

```typescript
const ROCKETCHAT_URL = 'http://10.68.0.49:30082';
```

## Usage

### Basic Integration

Add call buttons to any component:

```tsx
import CallButtons from '@/components/chat/CallButtons';

function MyComponent() {
  return (
    <CallButtons 
      showLabels={true}
      orientation="horizontal"
    />
  );
}
```

### With RocketChat Integration

Enable automatic posting of meeting links to RocketChat:

```tsx
<CallButtons 
  showLabels={true}
  orientation="horizontal"
  postToRocketChat={true}
  rocketChatRoomId="GENERAL"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showLabels` | `boolean` | `true` | Show text labels on buttons |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Button layout |
| `postToRocketChat` | `boolean` | `false` | Auto-post links to RocketChat |
| `rocketChatRoomId` | `string` | `'GENERAL'` | RocketChat room ID for posting |
| `className` | `string` | `''` | Additional CSS classes |

## How It Works

### 1. User Clicks a Call Button
- User clicks Audio, Video, or Conference button
- Service generates unique room name
- Jitsi URL is built with configuration

### 2. Call Window Opens
- New window opens with Jitsi Meet interface
- User automatically joins the room
- Configuration applied (video muted for audio calls, etc.)

### 3. Meeting Link Generated
- Dialog shows with shareable link
- User can copy link to clipboard
- Link can be shared via chat or any method

### 4. Optional: Post to RocketChat
- If enabled, link automatically posted to chat
- Team members can click to join
- Formatted with call type emoji

## Meeting Link Format

Meeting links follow this pattern:

```
http://10.68.0.49:30083/{type}-{timestamp}-{random}#config
```

Example:
```
http://10.68.0.49:30083/audio-1699999999999-abc123#config.startWithVideoMuted=true
```

## Room Name Generation

Each call gets a unique room name:
- **Type**: `audio`, `video`, or `conference`
- **Timestamp**: Ensures uniqueness
- **Random**: Additional entropy

Format: `{type}-{timestamp}-{random}`

Example: `audio-1699999999999-abc123`

## Configuration Parameters

### Audio Call
```
config.startWithVideoMuted=true
config.startVideoMuted=true
```

### Video Call
```
config.startWithVideoMuted=false
```

### Conference
```
config.startWithVideoMuted=false
config.enableWelcomePage=false
```

## User Experience Flow

1. **User on Messages page** → Sees call buttons at top
2. **Clicks "Audio Call"** → New window opens with Jitsi
3. **Dialog appears** → Shows meeting link
4. **User copies link** → Shares with others
5. **Others click link** → Join the same call
6. **Continue chatting** → RocketChat still works independently

## Benefits of This Approach

### ✅ Advantages

1. **No RocketChat downgrade needed** - Keep latest version
2. **Clean separation** - Each service does what it's best at
3. **More flexible** - Full control over call UI and features
4. **Better UX** - Integrated into your website design
5. **Independent** - If RocketChat has issues, calls still work

### 🔄 Comparison to Alternative

| Feature | Separate Integration | RocketChat Built-in |
|---------|---------------------|---------------------|
| RocketChat Version | Latest (6.13.0+) | Must downgrade to 5.4.x |
| Customization | Full control | Limited |
| Maintenance | Independent updates | Coupled with RocketChat |
| Flexibility | Very flexible | Fixed to RocketChat UI |

## Troubleshooting

### Jitsi Server Not Accessible

**Error**: "Failed to start audio call - Please check if Jitsi server is accessible"

**Solutions**:
1. Verify Jitsi is running: `http://10.68.0.49:30083`
2. Check network connectivity
3. Ensure firewall allows access
4. Verify URL in `jitsi.ts` is correct

### Call Window Blocked by Browser

**Problem**: Browser blocks popup windows

**Solutions**:
1. Allow popups for your domain
2. Use embedded mode (see Advanced Usage)
3. Check browser popup settings

### RocketChat Link Posting Fails

**Problem**: Meeting links not posting to RocketChat

**Solutions**:
1. Store RocketChat credentials:
   ```typescript
   rocketChatService.storeCredentials(authToken, userId);
   ```
2. Check RocketChat API is accessible
3. Verify room ID is correct
4. Check authentication token validity

## Advanced Usage

### Embedded Jitsi (Modal)

Create a modal with embedded Jitsi instead of popup:

```tsx
import { jitsiService } from '@/services/jitsi';

function EmbeddedCall() {
  const [roomUrl, setRoomUrl] = useState('');
  
  const startCall = () => {
    const link = jitsiService.generateMeetingLink('video');
    setRoomUrl(link);
  };
  
  return (
    <Dialog open={!!roomUrl} onOpenChange={() => setRoomUrl('')}>
      <DialogContent className="max-w-4xl h-[600px]">
        <iframe src={roomUrl} className="w-full h-full" />
      </DialogContent>
    </Dialog>
  );
}
```

### Custom Room Names

Use custom room names for specific purposes:

```tsx
const startTeamCall = () => {
  const roomName = `team-${teamId}-standup`;
  jitsiService.startVideoCall(userName, userEmail, roomName);
};
```

### Programmatic Call Initiation

Start calls without button clicks:

```tsx
// From any component
import { jitsiService, CallType } from '@/services/jitsi';

// Start audio call programmatically
const meetingUrl = jitsiService.startAudioCall(userName, userEmail);

// Or generate link without opening window
const link = jitsiService.generateMeetingLink(CallType.VIDEO, 'custom-room');
```

## Security Considerations

1. **Room Names**: Use unpredictable names for private calls
2. **Access Control**: Consider adding password protection
3. **Link Sharing**: Be careful where meeting links are posted
4. **User Authentication**: Verify users before sharing links

## Future Enhancements

Potential improvements:

- [ ] Add password protection to rooms
- [ ] Schedule calls with calendar integration
- [ ] Call history and recording
- [ ] Waiting room functionality
- [ ] Screen sharing controls
- [ ] Breakout rooms for conferences
- [ ] Call analytics and duration tracking

## Testing

### Test Audio Call
1. Click "Audio Call" button
2. Verify video is disabled
3. Check audio works
4. Verify meeting link is shareable

### Test Video Call
1. Click "Video Call" button
2. Verify video and audio both work
3. Test screen sharing
4. Verify link sharing

### Test Conference
1. Click "Conference" button
2. Verify larger window opens
3. Test with multiple participants
4. Check group features

## Support

For issues or questions:
1. Check Jitsi server logs
2. Verify network connectivity
3. Test with different browsers
4. Check console for errors

## Summary

This integration provides:
- ✅ Three types of calls (audio, video, conference)
- ✅ Independent from RocketChat
- ✅ Easy to use and integrate
- ✅ Shareable meeting links
- ✅ Optional RocketChat integration
- ✅ Fully customizable
- ✅ Modern UI with toast notifications

Enjoy your enhanced communication platform! 🎉
