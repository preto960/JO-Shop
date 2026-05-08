import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MapView, {Marker} from 'react-native-maps';
import {Ionicons} from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import {
  getPusherClient,
  subscribeToOrderChannel,
  unsubscribeFromOrderChannel,
} from '@services/pusher';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

const {width, height} = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: -17.7833, // Santa Cruz de la Sierra, Bolivia
  longitude: -63.1821,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// ─── Component ────────────────────────────────────────────────────────────────

const TrackingScreen = ({route, navigation}) => {
  const {orderId, orderNumber, deliveryName, customerAddress} = route.params || {};
  const {token} = useAuth();
  const {primary} = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);

  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const mapRef = useRef(null);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  // Set header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Seguimiento de entrega',
      headerBackTitle: 'Volver',
    });
  }, [navigation]);

  // Fetch initial location
  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.fetchDeliveryLocation(orderId);
      if (res && (res.latitude || res.location)) {
        const loc = res.location || res;
        setDeliveryLocation({
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          timestamp: loc.timestamp || loc.updatedAt,
        });
        setLastUpdate(loc.timestamp || loc.updatedAt || new Date().toISOString());
        setError(null);
      } else {
        setError('Ubicación no disponible aún. El repartidor aún no ha comenzado el recorrido.');
      }
    } catch (err) {
      console.error('Error fetching location:', err);
      setError('No se pudo obtener la ubicación. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Subscribe to Pusher for real-time updates
  useEffect(() => {
    if (!token || !orderId) return;

    const pusher = getPusherClient(token);
    pusherRef.current = pusher;
    const channel = subscribeToOrderChannel(pusher, orderId);
    channelRef.current = channel;

    if (channel) {
      channel.bind('location-update', (data) => {
        console.log('[TrackingScreen] location-update received:', JSON.stringify(data));
        setDeliveryLocation({
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          timestamp: data.timestamp,
        });
        setLastUpdate(data.timestamp);
        setError(null);
      });
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind('location-update');
        unsubscribeFromOrderChannel(pusherRef.current, orderId);
      }
    };
  }, [token, orderId]);

  // Animate map to delivery location when it changes
  useEffect(() => {
    if (deliveryLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000,
      );
    }
  }, [deliveryLocation]);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      const s = date.getSeconds().toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    } catch {
      return '';
    }
  };

  // Get initial region
  const getInitialRegion = () => {
    if (deliveryLocation) {
      return {
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return DEFAULT_REGION;
  };

  // ─── Render: Delivery Marker ──────────────────────────────────────────────

  const renderDeliveryMarker = () => {
    if (!deliveryLocation) return null;

    return (
      <Marker
        coordinate={{
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude,
        }}
        title={deliveryName || 'Repartidor'}
        description="Tu repartidor está aquí"
      >
        <View style={styles.markerContainer}>
          <View style={styles.markerOuter}>
            <View style={styles.markerInner}>
              <Ionicons name="bicycle" size={16} color={theme.colors.white} />
            </View>
          </View>
          <View style={styles.markerArrow} />
        </View>
      </Marker>
    );
  };

  // ─── Render: Bottom Info Card ─────────────────────────────────────────────

  const renderBottomCard = () => {
    return (
      <SafeAreaView edges={['bottom']} style={styles.bottomCardContainer}>
        <View style={styles.bottomCard}>
          {/* Top colored strip */}
          <View style={[styles.cardStrip, {backgroundColor: primary}]} />

          <View style={styles.cardContent}>
            {/* Delivery person row */}
            <View style={styles.deliveryRow}>
              <View style={styles.deliveryAvatar}>
                <Ionicons name="person-circle" size={40} color={primary} />
              </View>
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryName}>
                  {deliveryName || 'Repartidor asignado'}
                </Text>
                <Text style={styles.deliveryStatus}>
                  En camino hacia tu dirección
                </Text>
              </View>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, {backgroundColor: '#1ABC9C'}]} />
              </View>
            </View>

            {/* Order info */}
            <View style={styles.orderInfoRow}>
              <View style={styles.orderInfoItem}>
                <Ionicons
                  name="receipt-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.orderInfoText}>
                  Pedido #{orderNumber || orderId}
                </Text>
              </View>
              {lastUpdate && (
                <View style={styles.orderInfoItem}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.orderInfoText}>
                    Última actualización: {formatTime(lastUpdate)}
                  </Text>
                </View>
              )}
            </View>

            {/* Customer address */}
            {customerAddress ? (
              <View style={styles.addressSection}>
                <View style={styles.addressLabelRow}>
                  <Ionicons
                    name="navigate-outline"
                    size={14}
                    color={primary}
                  />
                  <Text style={styles.addressLabel}>Destino</Text>
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
                  {customerAddress}
                </Text>
              </View>
            ) : null}

            {/* Action buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={fetchLocation}
                activeOpacity={0.7}>
                <Ionicons name="refresh" size={18} color={primary} />
                <Text style={styles.refreshBtnText}>Actualizar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() =>
                  navigation.navigate('Chat', {
                    orderId,
                    orderNumber,
                    otherUserName: deliveryName || 'Delivery',
                  })
                }
                activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={18} color={theme.colors.white} />
                <Text style={styles.chatBtnText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  };

  // ─── Render: Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={primary} />
        <Text style={styles.loadingText}>
          Obteniendo ubicación del repartidor...
        </Text>
      </View>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
      >
        {renderDeliveryMarker()}
      </MapView>

      {/* Error overlay */}
      {error && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#E74C3C" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={fetchLocation}
              activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={theme.colors.white} />
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Live indicator pill */}
      {!error && deliveryLocation && (
        <View style={styles.livePill}>
          <View style={styles.liveDotOuter}>
            <View style={styles.liveDotInner} />
          </View>
          <Text style={styles.livePillText}>En vivo</Text>
        </View>
      )}

      {/* Bottom card */}
      {renderBottomCard()}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (primary) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },

    // Error overlay
    errorOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.05)',
      zIndex: 5,
    },
    errorCard: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      width: width * 0.8,
      ...theme.shadows.lg,
    },
    errorText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
      lineHeight: 22,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: primary,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    retryBtnText: {
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      color: theme.colors.white,
    },

    // Live indicator
    livePill: {
      position: 'absolute',
      top: 12,
      left: (width - 80) / 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      ...theme.shadows.md,
      zIndex: 10,
    },
    liveDotOuter: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#E74C3C30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    liveDotInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#E74C3C',
    },
    livePillText: {
      fontSize: theme.fontSize.sm,
      fontWeight: '700',
      color: theme.colors.text,
    },

    // Marker
    markerContainer: {
      alignItems: 'center',
    },
    markerOuter: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#1ABC9C',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.white,
      ...theme.shadows.md,
    },
    markerInner: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#16A085',
      alignItems: 'center',
      justifyContent: 'center',
    },
    markerArrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 10,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: '#1ABC9C',
      marginTop: -2,
    },

    // Bottom card
    bottomCardContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    bottomCard: {
      backgroundColor: theme.colors.white,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      ...theme.shadows.lg,
      overflow: 'hidden',
    },
    cardStrip: {
      height: 4,
      width: 40,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: theme.spacing.sm,
    },
    cardContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
    },

    // Delivery person info
    deliveryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    deliveryAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    deliveryInfo: {
      flex: 1,
    },
    deliveryName: {
      fontSize: theme.fontSize.lg,
      fontWeight: '700',
      color: theme.colors.text,
    },
    deliveryStatus: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#1ABC9C20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    // Order info row
    orderInfoRow: {
      flexDirection: 'column',
      gap: 6,
      backgroundColor: theme.colors.inputBg,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    orderInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    orderInfoText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },

    // Address section
    addressSection: {
      backgroundColor: theme.colors.inputBg,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    addressLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    addressLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: '700',
      color: primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addressText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },

    // Action buttons
    actionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    refreshBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.inputBg,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    refreshBtnText: {
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      color: primary,
    },
    chatBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: '#3498DB',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
    },
    chatBtnText: {
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      color: theme.colors.white,
    },
  });

export default TrackingScreen;
