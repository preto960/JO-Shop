import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useCart} from '@context/CartContext';
import {useAuth} from '@context/AuthContext';
import CartItemComponent from '@components/CartItem';
import {EmptyState} from '@components/StateViews';
import {formatPrice} from '@utils/helpers';
import apiService from '@services/api';
import theme from '@theme/styles';
import ENV from '@config/env';
import ConfirmModal from '@components/ConfirmModal';

const CartScreen = () => {
  const navigation = useNavigation();
  const {items, isLoading, totalItems, totalPrice, clearCart} = useCart();
  const {user, logout} = useAuth();

  // Customer data — pre-fill from user profile
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Custom modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: () => {},
  });

  // Address system
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [customerAddress, setCustomerAddress] = useState('');
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' | 'new'
  const [addressesLoading, setAddressesLoading] = useState(false);

  // New address form
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressText, setNewAddressText] = useState('');
  const [newAddressCity, setNewAddressCity] = useState('');
  const [newAddressNotes, setNewAddressNotes] = useState('');
  const [newAddressLat, setNewAddressLat] = useState(null);
  const [newAddressLng, setNewAddressLng] = useState(null);

  // Google Places search
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  // Pre-fill from user profile when screen mounts
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');
    }
  }, [user]);

  // Load saved addresses
  const loadAddresses = useCallback(async () => {
    try {
      setAddressesLoading(true);
      const res = await apiService.fetchAddresses();
      const list = res.data || res || [];
      setAddresses(Array.isArray(list) ? list : []);

      // Auto-select default address
      const defaultAddr = list.find(a => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setCustomerAddress(defaultAddr.address);
      }
    } catch {
      // Non-critical
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // ─── Google Places Autocomplete ──────────────────────────────────────────

  const searchPlaces = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setPlaceResults([]);
      return;
    }

    try {
      setPlacesLoading(true);
      const apiKey = ENV.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        setPlaceResults([]);
        setPlacesLoading(false);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&language=es&components=country:ve`,
      );
      const data = await response.json();

      if (data.predictions) {
        setPlaceResults(
          data.predictions.map(p => ({
            place_id: p.place_id,
            description: p.description,
            structured_formatting: p.structured_formatting,
          })),
        );
      }
    } catch {
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  const selectPlace = useCallback(async (place) => {
    try {
      setPlacesLoading(true);
      const apiKey = ENV.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_address,geometry&key=${apiKey}`,
      );
      const data = await response.json();

      if (data.result) {
        setNewAddressText(data.result.formatted_address || place.description);
        if (data.result.geometry?.location) {
          setNewAddressLat(data.result.geometry.location.lat);
          setNewAddressLng(data.result.geometry.location.lng);
        }
      }

      setShowPlaceSearch(false);
      setPlaceSearchQuery('');
      setPlaceResults([]);
    } catch {
      setShowPlaceSearch(false);
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  const handleOpenCheckout = () => {
    if (items.length === 0) return;
    setShowCheckoutModal(true);
  };

  const handleLogout = () => {
    logout();
  };

  const showCustomModal = (config) => {
    setModalConfig(config);
    setModalVisible(true);
  };

  const handleSaveNewAddress = async () => {
    if (!newAddressLabel.trim() || !newAddressText.trim()) {
      showCustomModal({
        type: 'alert',
        title: 'Datos requeridos',
        message: 'Ingresa una etiqueta y la dirección.',
        confirmText: 'Entendido',
      });
      return;
    }

    try {
      const res = await apiService.createAddress({
        label: newAddressLabel.trim(),
        address: newAddressText.trim(),
        city: newAddressCity.trim() || null,
        notes: newAddressNotes.trim() || null,
        lat: newAddressLat,
        lng: newAddressLng,
      });

      const newAddr = res.address || res;
      setAddresses(prev => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setCustomerAddress(newAddr.address);
      setAddressMode('saved');

      // Reset form
      setNewAddressLabel('');
      setNewAddressText('');
      setNewAddressCity('');
      setNewAddressNotes('');
      setNewAddressLat(null);
      setNewAddressLng(null);

      showCustomModal({
        type: 'alert',
        icon: 'checkmark-circle',
        title: 'Dirección guardada',
        message: 'La dirección se guardó correctamente.',
        confirmText: 'Entendido',
      });
    } catch (err) {
      showCustomModal({
        type: 'alert',
        title: 'Error',
        message: err.message || 'No se pudo guardar la dirección.',
        confirmText: 'Entendido',
      });
    }
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setCustomerAddress(addr.address);
    setAddressMode('saved');
  };

  const handleConfirmOrder = async () => {
    if (!customerName.trim()) {
      showCustomModal({
        type: 'alert',
        title: 'Datos requeridos',
        message: 'Por favor ingresa tu nombre.',
        confirmText: 'Entendido',
      });
      return;
    }
    if (!customerPhone.trim()) {
      showCustomModal({
        type: 'alert',
        title: 'Datos requeridos',
        message: 'Por favor ingresa tu teléfono de contacto.',
        confirmText: 'Entendido',
      });
      return;
    }

    const finalAddress =
      addressMode === 'saved' && selectedAddressId
        ? customerAddress
        : customerAddress.trim();

    if (!finalAddress) {
      showCustomModal({
        type: 'alert',
        title: 'Datos requeridos',
        message: 'Por favor selecciona o ingresa una dirección de entrega.',
        confirmText: 'Entendido',
      });
      return;
    }

    showCustomModal({
      type: 'confirm',
      icon: 'cart',
      title: 'Confirmar pedido',
      message: `¿Deseas confirmar tu pedido por ${formatPrice(totalPrice)}?`,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: processOrder,
    });
  };

  const processOrder = async () => {
    setOrdering(true);

    try {
      const orderData = {
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          notes: customerNotes.trim() || undefined,
        },
        items: items.map(item => ({
          id: item.id,
          name: item.name || item.title,
          price: item.price || item.precio,
          quantity: item.quantity,
        })),
        total: totalPrice,
        totalItems,
        addressId: addressMode === 'saved' ? selectedAddressId : null,
      };

      // Save to server
      let savedToServer = false;
      try {
        await apiService.createOrder(orderData);
        savedToServer = true;
      } catch {
        console.log('Pedido guardado localmente (servidor no disponible)');
      }

      // Save phone to user profile for future orders
      try {
        const api = await apiService.createApiClient();
        if (api && user) {
          await api.put('/auth/profile', {
            phone: customerPhone.trim(),
          });
        }
      } catch {
        // Non-critical
      }

      clearCart();
      setShowCheckoutModal(false);

      navigation.navigate('OrderConfirmation', {
        order: orderData,
        savedToServer,
      });
    } catch (err) {
      showCustomModal({
        type: 'alert',
        title: 'Error',
        message: err.message || 'No se pudo procesar el pedido.',
        confirmText: 'Entendido',
      });
    } finally {
      setOrdering(false);
    }
  };

  // ─── Checkout Modal ────────────────────────────────────────────────────

  const renderCheckoutModal = () => (
    <Modal
      visible={showCheckoutModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCheckoutModal(false)}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCheckoutModal(false)}>
        <View style={styles.modalSheet}>
          {/* Handle bar */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Datos de entrega</Text>
            <TouchableOpacity
              onPress={() => setShowCheckoutModal(false)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Name */}
            <Text style={styles.formLabel}>
              Nombre completo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Tu nombre"
              style={styles.input}
              placeholderTextColor={theme.colors.textLight}
            />

            {/* Phone */}
            <Text style={styles.formLabel}>
              Teléfono <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Tu número de teléfono"
              style={styles.input}
              placeholderTextColor={theme.colors.textLight}
              keyboardType="phone-pad"
              maxLength={20}
            />

            {/* ─── Address Section ──────────────────────────────────────── */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>
              <Icon
                name="location-outline"
                size={18}
                color={theme.colors.accent}
              />{' '}
              Dirección de entrega <Text style={styles.required}>*</Text>
            </Text>

            {/* Toggle saved / new */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  addressMode === 'saved' && styles.modeButtonActive,
                ]}
                onPress={() => setAddressMode('saved')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.modeButtonText,
                    addressMode === 'saved' && styles.modeButtonTextActive,
                  ]}>
                  Guardadas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  addressMode === 'new' && styles.modeButtonActive,
                ]}
                onPress={() => setAddressMode('new')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.modeButtonText,
                    addressMode === 'new' && styles.modeButtonTextActive,
                  ]}>
                  Nueva
                </Text>
              </TouchableOpacity>
            </View>

            {/* Saved addresses list */}
            {addressMode === 'saved' && (
              <View style={styles.addressesSection}>
                {addressesLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.accent}
                  />
                ) : addresses.length > 0 ? (
                  addresses.map(addr => (
                    <TouchableOpacity
                      key={addr.id}
                      style={[
                        styles.addressCard,
                        selectedAddressId === addr.id &&
                          styles.addressCardSelected,
                      ]}
                      onPress={() => handleSelectSavedAddress(addr)}
                      activeOpacity={0.7}>
                      <View style={styles.addressRadio}>
                        {selectedAddressId === addr.id && (
                          <View style={styles.addressRadioInner} />
                        )}
                      </View>
                      <View style={styles.addressInfo}>
                        <View style={styles.addressLabelRow}>
                          <Text style={styles.addressLabel}>
                            {addr.label}
                          </Text>
                          {addr.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>
                                Principal
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.addressText} numberOfLines={2}>
                          {addr.address}
                        </Text>
                        {addr.city && (
                          <Text style={styles.addressCity}>{addr.city}</Text>
                        )}
                      </View>
                      <Icon
                        name={
                          selectedAddressId === addr.id
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={22}
                        color={
                          selectedAddressId === addr.id
                            ? theme.colors.accent
                            : theme.colors.textLight
                        }
                      />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyAddresses}>
                    <Icon
                      name="location-outline"
                      size={32}
                      color={theme.colors.textLight}
                    />
                    <Text style={styles.emptyAddressesText}>
                      No tienes direcciones guardadas
                    </Text>
                    <TouchableOpacity
                      onPress={() => setAddressMode('new')}
                      activeOpacity={0.7}>
                      <Text style={styles.addNewLink}>
                        + Agregar nueva dirección
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* New address form */}
            {addressMode === 'new' && (
              <View style={styles.newAddressSection}>
                <Text style={styles.formLabel}>Etiqueta</Text>
                <TextInput
                  value={newAddressLabel}
                  onChangeText={setNewAddressLabel}
                  placeholder="Ej: Casa, Oficina, Apartamento..."
                  style={styles.input}
                  placeholderTextColor={theme.colors.textLight}
                />

                {/* Google Places search */}
                <Text style={styles.formLabel}>Dirección</Text>
                <View style={styles.placeSearchRow}>
                  <TextInput
                    value={newAddressText}
                    onChangeText={(text) => {
                      setNewAddressText(text);
                      searchPlaces(text);
                    }}
                    placeholder="Escribe o busca una dirección..."
                    style={[styles.input, styles.placeInput]}
                    placeholderTextColor={theme.colors.textLight}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    onFocus={() => {
                      if (ENV.GOOGLE_PLACES_API_KEY) {
                        setShowPlaceSearch(true);
                      }
                    }}
                  />
                  {ENV.GOOGLE_PLACES_API_KEY && (
                    <TouchableOpacity
                      style={styles.searchIcon}
                      onPress={() => {
                        if (newAddressText.length >= 3) {
                          searchPlaces(newAddressText);
                          setShowPlaceSearch(true);
                        }
                      }}>
                      <Icon
                        name="search"
                        size={20}
                        color={theme.colors.accent}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Place results dropdown */}
                {showPlaceSearch && placeResults.length > 0 && (
                  <View style={styles.placeResults}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      style={{maxHeight: 200}}>
                      {placesLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.accent}
                        />
                      ) : (
                        placeResults.map(place => (
                          <TouchableOpacity
                            key={place.place_id}
                            style={styles.placeResultItem}
                            onPress={() => selectPlace(place)}>
                            <Icon
                              name="location-outline"
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.placeResultText} numberOfLines={2}>
                              {place.description}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

                {newAddressLat && newAddressLng && (
                  <View style={styles.coordsRow}>
                    <Icon
                      name="navigate-outline"
                      size={14}
                      color={theme.colors.success}
                    />
                    <Text style={styles.coordsText}>
                      Ubicación verificada en Google Maps
                    </Text>
                  </View>
                )}

                <Text style={styles.formLabel}>Ciudad</Text>
                <TextInput
                  value={newAddressCity}
                  onChangeText={setNewAddressCity}
                  placeholder="Ej: Caracas"
                  style={styles.input}
                  placeholderTextColor={theme.colors.textLight}
                />

                <Text style={styles.formLabel}>Notas (opcional)</Text>
                <TextInput
                  value={newAddressNotes}
                  onChangeText={setNewAddressNotes}
                  placeholder="Punto de referencia, apartamento, etc."
                  style={[styles.input, styles.notesInput]}
                  placeholderTextColor={theme.colors.textLight}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  onPress={handleSaveNewAddress}
                  style={styles.saveAddressBtn}
                  activeOpacity={0.8}>
                  <Icon
                    name="save-outline"
                    size={18}
                    color={theme.colors.white}
                  />
                  <Text style={styles.saveAddressBtnText}>
                    Guardar dirección
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Selected address display (when in saved mode) */}
            {addressMode === 'saved' && customerAddress && (
              <View style={styles.selectedAddressDisplay}>
                <Icon
                  name="checkmark-circle"
                  size={18}
                  color={theme.colors.success}
                />
                <Text style={styles.selectedAddressText}>
                  {customerAddress}
                </Text>
              </View>
            )}

            {/* Notes */}
            <View style={styles.sectionDivider} />
            <Text style={styles.formLabel}>Notas del pedido (opcional)</Text>
            <TextInput
              value={customerNotes}
              onChangeText={setCustomerNotes}
              placeholder="Instrucciones especiales para la entrega..."
              style={[styles.input, styles.notesInput]}
              placeholderTextColor={theme.colors.textLight}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {/* Order summary */}
            <View style={styles.orderSummary}>
              <Text style={styles.summaryTitle}>Resumen del pedido</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Productos ({totalItems})
                </Text>
                <Text style={styles.summaryValue}>
                  {formatPrice(totalPrice)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatPrice(totalPrice)}
                </Text>
              </View>
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              onPress={handleConfirmOrder}
              style={[styles.confirmButton, ordering && styles.buttonDisabled]}
              disabled={ordering}
              activeOpacity={0.8}>
              {ordering ? (
                <View style={styles.confirmBtnLoading}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.white}
                  />
                  <Text style={styles.confirmButtonText}>Procesando...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirmar pedido - {formatPrice(totalPrice)}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.modalBottom} />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ─── Main Renders ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Cargando carrito"
        message="Preparando tu carrito de compras..."
        loading
      />
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mi Carrito</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleLogout} hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
              <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
        <EmptyState
          icon="cart-outline"
          title="Tu carrito está vacío"
          message="Explora los productos y agrega los que más te gusten a tu carrito."
          actionLabel="Explorar productos"
          onAction={() => navigation.navigate('Home')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mi Carrito</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={clearCart} hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Icon name="trash-outline" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product list */}
      <FlatList
        data={items}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => <CartItemComponent item={item} />}
      />

      {/* Footer with total + checkout */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>
            Total ({totalItems}{' '}
            {totalItems === 1 ? 'producto' : 'productos'})
          </Text>
          <Text style={styles.footerTotal}>{formatPrice(totalPrice)}</Text>
        </View>
        <TouchableOpacity
          onPress={handleOpenCheckout}
          style={styles.checkoutButton}
          activeOpacity={0.8}>
          <Text style={styles.checkoutText}>Realizar pedido</Text>
        </TouchableOpacity>
      </View>

      {/* Checkout Modal */}
      {renderCheckoutModal()}

      {/* Custom Confirm Modal */}
      <ConfirmModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={() => {
          setModalVisible(false);
          modalConfig.onConfirm();
        }}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        type={modalConfig.type}
        icon={modalConfig.icon}
        loading={ordering}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerLeft: {
    width: 68,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 80,
    gap: theme.spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  footerLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  footerTotal: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  checkoutButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md + 4,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  checkoutText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Checkout modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalBody: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  modalBottom: {
    height: theme.spacing.xxl,
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  required: {
    color: theme.colors.accent,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  notesInput: {
    textAlignVertical: 'top',
    minHeight: 56,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Mode toggle (saved / new)
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    marginTop: theme.spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  modeButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modeButtonTextActive: {
    color: theme.colors.accent,
  },
  // Saved addresses
  addressesSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '08',
  },
  addressRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  addressRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  addressLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  defaultBadge: {
    backgroundColor: theme.colors.accent + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  addressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addressCity: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  emptyAddresses: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyAddressesText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  addNewLink: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  // Selected address display
  selectedAddressDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  // New address form
  newAddressSection: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  placeSearchRow: {
    position: 'relative',
  },
  placeInput: {
    paddingRight: 44,
    minHeight: 60,
  },
  searchIcon: {
    position: 'absolute',
    right: theme.spacing.md,
    top: 14,
  },
  placeResults: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: -theme.spacing.xs,
    ...theme.shadows.sm,
  },
  placeResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  placeResultText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  coordsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '600',
  },
  saveAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  saveAddressBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  // Order summary
  orderSummary: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  summaryTotal: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  summaryTotalValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  confirmButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md + 4,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmBtnLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
});

export default CartScreen;
