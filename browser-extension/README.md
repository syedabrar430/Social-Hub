# Social Hub Browser Extension

This browser extension adds a "Social Hub" button to your Rocket.Chat interface, allowing you to easily navigate between Rocket.Chat and your local Social Hub application.

## Features

- 🚀 **One-click navigation** from Rocket.Chat to Social Hub
- 🎨 **Beautiful button design** that matches modern UI standards
- 🔄 **Auto-detection** of Rocket.Chat interface
- 📱 **Responsive positioning** in the top-right corner
- ✨ **Visual feedback** when clicked
- 🔧 **SPA navigation support** for single-page applications

## Installation

### Chrome/Edge/Brave

1. **Open Chrome/Edge/Brave** and navigate to `chrome://extensions/`
2. **Enable Developer Mode** (toggle in top-right corner)
3. **Click "Load unpacked"**
4. **Select the browser-extension folder** from your Social Hub project
5. **The extension will be installed** and active

### Firefox

1. **Open Firefox** and navigate to `about:debugging`
2. **Click "This Firefox"**
3. **Click "Load Temporary Add-on"**
4. **Select the manifest.json file** from the browser-extension folder
5. **The extension will be installed** and active

## Usage

1. **Navigate to your Rocket.Chat** at `http://10.68.0.49:30082`
2. **Look for the "🚀 Social Hub" button** in the top-right corner
3. **Click the button** to open your Social Hub at `http://localhost:8080/feed`
4. **The button will show visual feedback** when clicked

## Configuration

To change the Social Hub URL, edit the `SOCIAL_HUB_URL` variable in `content.js`:

```javascript
const SOCIAL_HUB_URL = 'http://localhost:8080/feed'; // Change this URL
```

To change the button position, edit the `BUTTON_POSITION` object in `content.js`:

```javascript
const BUTTON_POSITION = {
    top: '20px',    // Distance from top
    right: '80px'   // Distance from right
};
```

## Troubleshooting

### Button not appearing?
- Make sure you're on the correct Rocket.Chat URL (`http://10.68.0.49:30082`)
- Check browser console for any error messages
- Try refreshing the page

### Button not working?
- Ensure your Social Hub is running on `http://localhost:8080`
- Check if pop-ups are blocked in your browser
- Verify the URL in the extension code

### Extension not loading?
- Make sure Developer Mode is enabled
- Check that all files are in the correct folder
- Try reloading the extension

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main extension logic
- `README.md` - This file
- `icon*.png` - Extension icons (placeholder)

## Development

To modify the extension:

1. **Edit the files** in the browser-extension folder
2. **Reload the extension** in your browser's extension manager
3. **Refresh the Rocket.Chat page** to see changes

## Support

If you encounter any issues, check the browser console for error messages and ensure your Social Hub application is running on the correct port.
