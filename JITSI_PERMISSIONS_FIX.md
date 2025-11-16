# Fixing Jitsi Browser Permissions Issue

## The Problem
Browsers **block** microphone and camera access on HTTP (non-HTTPS) sites for security reasons. This is why you see "Blocked access" in browser settings.

## Current Solution (Temporary)
I've switched to using the **public Jitsi server** (`https://meet.jit.si`) which has HTTPS enabled. This will work immediately and allow browser permissions.

**Pros:**
- ✅ Works instantly
- ✅ HTTPS enabled (mic/camera permissions work)
- ✅ No setup required

**Cons:**
- ❌ Uses public infrastructure (less privacy)
- ❌ Requires internet connection

## Option 1: Use Your Local Jitsi with HTTPS (Recommended for Production)

If you want to use your local Jitsi server (`10.68.0.49:30083`), you need to set up HTTPS:

### Steps:

1. **Generate SSL Certificate** (self-signed for testing):
```bash
# On your Jitsi server
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/jitsi.key \
  -out /etc/ssl/certs/jitsi.crt
```

2. **Configure Jitsi to use HTTPS**:
Edit your Jitsi Docker compose or nginx config to use port 443 with SSL.

3. **Update the URL in code**:
```typescript
// In src/services/jitsi.ts
const JITSI_SERVER_URL = 'https://10.68.0.49:30443';
```

4. **Trust the certificate in your browser**:
- Navigate to `https://10.68.0.49:30443`
- Click "Advanced" → "Proceed to 10.68.0.49 (unsafe)"
- Browser will now allow permissions

## Option 2: Use Localhost (Quick Testing)

If you're testing locally, browsers allow mic/camera on `localhost`:

1. **Access via localhost**:
```typescript
// In src/services/jitsi.ts
const JITSI_SERVER_URL = 'http://localhost:30083';
```

2. **Port forward** if needed:
```bash
kubectl port-forward svc/jitsi-meet 30083:80
```

This works because browsers trust `localhost` even on HTTP.

## Option 3: Keep Using Public Jitsi (Current)

The code is currently configured to use `https://meet.jit.si` which works out of the box. No changes needed!

---

## Testing Microphone/Camera Permissions

Once you have HTTPS working:

1. **Join a call** - Click audio/video button
2. **Browser popup appears** - "Allow meet.jit.si to use your microphone and camera?"
3. **Click "Allow"** - Permission granted!
4. **Check settings**: Click 🔒 in address bar → Site settings → Microphone/Camera should show "Allow"

## Troubleshooting

### "Blocked access" in browser settings
- **Cause**: Using HTTP instead of HTTPS
- **Fix**: Switch to HTTPS server (public Jitsi or local with SSL)

### "Permission denied" in Jitsi
- **Cause**: Previously blocked permissions
- **Fix**: 
  1. Click 🔒 in address bar
  2. Site settings → Reset permissions
  3. Reload page and allow when prompted

### Cannot find permission settings
- **Chrome/Edge**: Settings → Privacy and security → Site Settings → Camera/Microphone
- **Firefox**: Settings → Privacy & Security → Permissions → Camera/Microphone
- **Safari**: Safari → Settings for This Website → Camera/Microphone

---

## Current Configuration Status

✅ **Switched to HTTPS Jitsi** (`https://meet.jit.si`)  
✅ **Browser permissions will now work**  
✅ **Message sending with better error handling**  
✅ **Auto-unmute audio/video on join**

**Next Steps:**
1. Test with public Jitsi (should work immediately)
2. If you need private infrastructure, set up HTTPS on your local server
3. Update `JITSI_SERVER_URL` in `src/services/jitsi.ts` when ready
