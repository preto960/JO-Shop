---
Task ID: 1
Agent: Main Agent
Task: Mejorar logging FCM, navegación desde notificaciones, resaltar orden nueva, expandir datos delivery

Work Log:
- Clonados ambos repos (JO-Shop y JO-backend-shop) desde GitHub
- Leídos todos los archivos relevantes: App.js, DeliveryOrdersScreen.js, MyOrdersScreen.js, notifications.js (backend y app), orders.js
- Backend: Mejorado logging de errores FCM en sendToUser y sendToRole con detalle de código y mensaje por cada token fallido
- Backend: Auto-eliminación de tokens inválidos (registration-token-not-registered, invalid-registration-token)
- Backend: Restaurada notificación a delivery en notifyNewOrder que faltaba en GitHub
- Backend: Agregados highlightOrderId y expandOrderId en payloads de datos de notificaciones
- App: Modificado notifModal para guardar data completa (no solo screen)
- App: navigateToScreen ahora pasa params al destino (orderId, highlightOrderId, expandOrderId)
- App DeliveryOrdersScreen: Animación de pulso verde + scroll automático a orden nueva desde notificación
- App DeliveryOrdersScreen: Refresca al obtener foco con useIsFocused
- App MyOrdersScreen: Auto-expandir orden cuando llega notificación de order_accepted
- App MyOrdersScreen: Refresca al obtener foco, muestra delivery en status confirmed
- Push a ambos repos exitoso

Stage Summary:
- Backend: commit cad0cf1 pushed to main
- App: commit e51f999 pushed to main
- Los fallos en FCM ahora se verán con detalle en Vercel logs
- Tokens inválidos se eliminan automáticamente de la BD
- Botón "Ver" del modal navega y refresca la pantalla destino
- Delivery ve la orden nueva con pulso verde cuando toca "Ver"
- Cliente ve la orden expandida con datos del delivery cuando aceptan su pedido

---
Task ID: 2
Agent: Main Agent
Task: Corregir tokens FCM inválidos y notificaciones background no funcionan

Work Log:
- Diagnosticado: tokens FCM en BD están como "registration-token-not-registered"
- Encontrado Bug 1: onTokenRefresh en AuthContext.js solo logueaba el nuevo token, nunca lo enviaba al backend
- Encontrado Bug 2: registerPushToken se llamaba una vez sin reintento, si fallaba quedaba silencioso
- Encontrado Bug 3: Falta default_notification_channel_id en AndroidManifest.xml
- Corregido AuthContext.js: onTokenRefresh ahora llama registerPushToken()
- Corregido AuthContext.js: registerFcmWithRetry() con 3 reintentos y delay incremental
- Agregado meta-data default_notification_channel_id en AndroidManifest.xml

Stage Summary:
- Commit 2a74733 pushed to JO-Shop
- Los 3 bugs causaban que: token en BD se volvía viejo, no se re-registraba, y Android no sabía qué canal usar
- Requiere rebuild de APK release para que los cambios nativos (AndroidManifest) surtan efecto
---
Task ID: 1
Agent: Main Agent
Task: Fix auto-expand order when clicking 'Ver' on notification while already on screen

Work Log:
- Analyzed the issue: React Navigation may not re-trigger route.params effects when navigating to an already-focused tab screen
- Added DeviceEventEmitter 'pushNotificationAction' event in App.js handleNotifConfirm (when user clicks 'Ver')
- MyOrdersScreen.js: Added listener for 'pushNotificationAction' that sets pendingExpand, switches to 'all' tab, and triggers loadOrders
- DeliveryOrdersScreen.js: Added listener for 'pushNotificationAction' that sets highlightOrderId, switches to 'available' tab, and triggers loadOrders
- Improved route params handler in MyOrdersScreen to also trigger loadOrders for consistency
- Pushed to JO-Shop repo (commit 2e0ae40)

Stage Summary:
- Both 'pushNotificationReceived' (auto-refresh on notification) and 'pushNotificationAction' (user clicks Ver) events are now handled
- When user clicks 'Ver' on notification modal while already on MyOrders/DeliveryOrders screen, the order will expand/highlight correctly
- When user navigates from a different screen, route params still work as before
