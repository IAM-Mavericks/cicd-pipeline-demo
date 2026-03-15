# Inactivity Timeout Feature

## Overview
The MavenPay application now includes a 60-second inactivity timeout feature that automatically logs out users after periods of inactivity for enhanced security.

## How It Works

### Timeout Configuration
- **Timeout Duration**: 60 seconds of inactivity
- **Warning Time**: 10 seconds before logout
- **Activity Detection**: Mouse movements, clicks, key presses, scrolling, and touch events

### User Experience Flow
1. **Active Session**: User interacts normally with the application
2. **Inactivity Detection**: System detects 50 seconds of inactivity
3. **Warning Dialog**: Shows countdown dialog with 10 seconds remaining
4. **User Choice**: User can either:
   - Click "Stay Logged In" to extend session
   - Click "Logout Now" to logout immediately
   - Do nothing and be automatically logged out
5. **Automatic Logout**: If no action taken, user is logged out and shown notification

### Security Features
- Only active when user is logged in
- Pauses on page visibility changes
- Resets timer on any user activity
- Shows clear visual countdown
- Provides audit trail through toast notifications

## Implementation Details

### Components Added
1. **`useInactivityTimeout` Hook** (`src/hooks/use-inactivity-timeout.ts`)
   - Manages timeout logic and activity detection
   - Configurable timeout and warning periods
   - Returns timer state and control functions

2. **`TimeoutWarningDialog` Component** (`src/components/timeout-warning-dialog.tsx`)
   - Beautiful warning dialog with countdown
   - Progress bar showing time remaining
   - Clear action buttons for user choice

3. **App Integration** (Updated `src/App.tsx`)
   - Integrates timeout hook with existing auth system
   - Handles logout scenarios with appropriate notifications
   - Only enables timeout for authenticated users

### Activity Events Monitored
- `mousedown` - Mouse button press
- `mousemove` - Mouse movement
- `keypress` - Key press
- `keydown` - Key down
- `click` - Click events
- `scroll` - Page scrolling
- `touchstart` - Touch start (mobile)
- `touchmove` - Touch movement (mobile)

## Usage

The timeout feature automatically activates when a user logs in and deactivates when they log out. No additional configuration is required.

### Customization Options
To modify the timeout duration, edit the timeout value in `src/App.tsx`:

```typescript
const { timeLeft, isWarningActive } = useInactivityTimeout({
  timeout: 60000, // Change this value (in milliseconds)
  warningTime: 10000, // Warning period (in milliseconds)
  // ... other options
});
```

## Testing

### Manual Testing
1. Log into the application
2. Wait for 50 seconds without interacting
3. Observe the warning dialog appears
4. Test both "Stay Logged In" and "Logout Now" options
5. Test automatic logout by not interacting during warning

### Development Testing
- Reduce timeout to 10 seconds for faster testing during development
- Check browser console for any errors
- Verify toast notifications appear correctly

## Browser Compatibility
- Works in all modern browsers
- Mobile-friendly with touch event support
- Gracefully handles browser tab visibility changes

## Security Considerations
- Timeout only applies to active user sessions
- Sensitive operations should have their own timeout mechanisms
- Consider implementing server-side session timeouts as well
- Activity detection doesn't include passive actions like video playback

## Future Enhancements
- Server-side session validation
- Configurable timeout per user role
- Activity logging for audit purposes
- Integration with biometric re-authentication