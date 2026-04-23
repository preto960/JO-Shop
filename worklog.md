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
