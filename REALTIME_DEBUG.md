## Real-time Update Debugging Guide

### Console Messages to Look For

When triggering an alert, you should see these log messages in sequence:

#### From useAlerts Hook:
1. `🚀 [useAlerts] Component mounted, starting initial fetch`
2. `🔌 [useAlerts] Setting up real-time subscriptions...`
3. `🔧 [useAlerts] Creating subscriptions for user: [user-id]`
4. `📡 [useAlerts] Alerts subscription status: SUBSCRIBED`
5. `📡 [useAlerts] Responses subscription status: SUBSCRIBED`
6. `✅ [useAlerts] Successfully subscribed to alerts changes`

#### When New Alert is Created:
1. `🚨 [useAlerts] Alert change detected: [details]`
2. `🔄 [useAlerts] Triggering immediate fetch due to alert change`
3. `🔄 [useAlerts] Fetching alerts at: [timestamp]`
4. `📊 [useAlerts] ALL alerts in database: [count and details]`
5. `✅ [useAlerts] About to update alerts state with data: [count] alerts`

### Troubleshooting

If you don't see subscription messages:
- Check if Supabase realtime is enabled
- Verify database permissions for subscriptions
- Look for error messages in the console

If subscriptions fail:
- Polling fallback should start: `🔄 [useAlerts] Starting polling fallback (5s interval)`
- Every 5 seconds: `⏰ [useAlerts] Polling fallback fetch`

### Manual Testing

1. Open ResponderDashboard
2. In another tab/window, trigger an alert (EmergencyHelp or MonitoringView)
3. Watch console for real-time subscription messages
4. Verify the alert appears immediately (within 1-2 seconds)

### Performance Improvements Made

1. **Unique Channels**: Added timestamps to prevent subscription conflicts
2. **Immediate Fetch**: Removed debouncing for faster updates  
3. **Faster Polling**: Reduced fallback polling from 10s to 5s
4. **Safety Net**: Auto-start polling if subscriptions don't connect within 3s
5. **Better Filtering**: Include cancelled alerts so they show with proper status
