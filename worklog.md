---
Task ID: 1
Agent: Main Agent
Task: Fix admin chat connected users filtering + JO-Delivery & JO-Shop crashes

Work Log:
- Analyzed all 4 reported issues
- Added `platform` field to presence-admin-chat channel_data in backend pusher-auth.js (reads X-Platform header)
- JO-frontend-shop: Added X-Platform: frontend-shop header to pusher auth, filtered sidebar to show only landingpage admins
- JO-landingpage: Added X-Platform: landingpage header in pusher-auth proxy, filtered sidebar to show only users from other platforms (frontend-shop, app-shop, app-delivery)
- JO-Delivery: Fixed ChatScreen crash - changed `{Ionicons}` named import to default `Ionicons` import
- JO-Shop: Fixed MyOrdersScreen crash - changed `<Ionicons>` references to `<Icon>` on lines 494/496

Stage Summary:
- Backend commit: 25d18a7 (platform in presence data)
- Frontend-shop commit: ba6f5a1 (X-Platform header + filter)
- Landingpage commit: 6b0e4d8 (X-Platform header + filter)
- JO-Delivery commit: 2c26c9a (Ionicons import fix)
- JO-Shop commit: 892f354 (Ionicons → Icon reference fix)
