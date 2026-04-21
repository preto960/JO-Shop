import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
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

const CartScreen = () => {
  const navigation = useNavigation();
  const {items, isLoading, totalItems, totalPrice, clearCart} = useCart();
  const {user} = useAuth();

  // Customer data — pre-fill from user profile
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Pre-fill from user profile when screen mounts
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');
      setCustomerAddress(user.address || '');
    }
  }, [user]);

  const handleOpenCheckout = () => {
    if (items.length === 0) return;
    setShowCheckoutModal(true);
  };

  const handleConfirmOrder = async () => {
    if (!customerName.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu nombre.');
      return;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu teléfono de contacto.');
      return;
    }
    if (!customerAddress.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa la dirección de entrega.');
      return;
    }

    Alert.alert(
      'Confirmar pedido',
      `¿Deseas confirmar tu pedido por ${formatPrice(totalPrice)}?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Confirmar', onPress: processOrder},
      ],
    );
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
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Try to save to server
      let savedToServer = false;
      try {
        await apiService.createOrder(orderData);
        savedToServer = true;
      } catch {
        console.log('Pedido guardado localmente (servidor no disponible)');
      }

      // Save address to user profile for future orders
      try {
        const api = await apiService.createApiClient();
        if (api && user) {
          await api.put('/auth/profile', {
            phone: customerPhone.trim(),
            address: customerAddress.trim(),
          });
        }
      } catch {
        // Non-critical — don't block the order
      }

      clearCart();
      setShowCheckoutModal(false);

      navigation.navigate('OrderConfirmation', {
        order: orderData,
        savedToServer,
      });
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo procesar el pedido.');
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

            {/* Address */}
            <Text style={styles.formLabel}>
              Dirección de entrega <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              value={customerAddress}
              onChangeText={setCustomerAddress}
              placeholder="Dirección completa (calle, número, ciudad)"
              style={[styles.input, styles.addressInput]}
              placeholderTextColor={theme.colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Notes */}
            <Text style={styles.formLabel}>Notas (opcional)</Text>
            <TextInput
              value={customerNotes}
              onChangeText={setCustomerNotes}
              placeholder="Punto de referencia, apartamento, etc."
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
                <Text style={styles.summaryValue}>{formatPrice(totalPrice)}</Text>
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
                  <Text style={styles.confirmButtonText}>
                    Procesando...
                  </Text>
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
          <Text style={styles.headerTitle}>Mi Carrito</Text>
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
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
          <Text style={styles.clearText}>Vaciar</Text>
        </TouchableOpacity>
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
  clearText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    fontWeight: '500',
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
    maxHeight: '90%',
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
  addressInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  notesInput: {
    textAlignVertical: 'top',
    minHeight: 56,
  },
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
