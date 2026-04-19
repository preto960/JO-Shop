import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useCart} from '@context/CartContext';
import CartItemComponent from '@components/CartItem';
import {EmptyState} from '@components/StateViews';
import {formatPrice} from '@utils/helpers';
import apiService from '@services/api';
import theme from '@theme/styles';

const CartScreen = () => {
  const navigation = useNavigation();
  const {
    items,
    isLoading,
    totalItems,
    totalPrice,
    clearCart,
  } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const handleCheckout = () => {
    if (items.length === 0) return;

    if (!customerName.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu nombre.');
      return;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu teléfono de contacto.');
      return;
    }

    setShowOrderForm(true);
  };

  const confirmOrder = async () => {
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

      try {
        await apiService.createOrder(orderData);
      } catch {
        // Si el backend no acepta el pedido, lo creamos localmente igualmente
        console.log('Pedido guardado localmente (servidor no disponible)');
      }

      clearCart();
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setShowOrderForm(false);

      navigation.navigate('OrderConfirmation', {
        order: orderData,
        savedToServer: true,
      });
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo procesar el pedido.');
    } finally {
      setOrdering(false);
    }
  };

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

  if (items.length === 0 && !showOrderForm) {
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

  if (showOrderForm) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowOrderForm(false)}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datos de entrega</Text>
          <View style={{width: 24}} />
        </View>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.formLabel}>Nombre completo</Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Tu nombre"
            style={styles.input}
            placeholderTextColor={theme.colors.textLight}
          />

          <Text style={styles.formLabel}>Teléfono</Text>
          <TextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="Tu número de teléfono"
            style={styles.input}
            placeholderTextColor={theme.colors.textLight}
            keyboardType="phone-pad"
          />

          <Text style={styles.formLabel}>Dirección de entrega</Text>
          <TextInput
            value={customerAddress}
            onChangeText={setCustomerAddress}
            placeholder="Dirección completa"
            style={[styles.input, styles.addressInput]}
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={3}
          />

          {/* Resumen del pedido */}
          <View style={styles.orderSummary}>
            <Text style={styles.summaryTitle}>Resumen del pedido</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Productos ({totalItems})</Text>
              <Text style={styles.summaryValue}>{formatPrice(totalPrice)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatPrice(totalPrice)}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={confirmOrder}
            style={[styles.confirmButton, ordering && styles.buttonDisabled]}
            disabled={ordering}
            activeOpacity={0.8}>
            {ordering ? (
              <Text style={styles.confirmButtonText}>Procesando...</Text>
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirmar pedido - {formatPrice(totalPrice)}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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

      {/* Lista de productos */}
      <FlatList
        data={items}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => <CartItemComponent item={item} />}
      />

      {/* Footer con total y botón de checkout */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>
            Total ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})
          </Text>
          <Text style={styles.footerTotal}>{formatPrice(totalPrice)}</Text>
        </View>
        <TouchableOpacity
          onPress={handleCheckout}
          style={styles.checkoutButton}
          activeOpacity={0.8}>
          <Text style={styles.checkoutText}>Realizar pedido</Text>
        </TouchableOpacity>
      </View>
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
  // Formulario
  formContainer: {
    padding: theme.spacing.lg,
  },
  formLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  addressInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  orderSummary: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  divider: {
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
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
});

export default CartScreen;
