import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {formatPrice} from '@utils/helpers';
import theme from '@theme/styles';

const OrderConfirmationScreen = ({route}) => {
  const navigation = useNavigation();
  const order = route.params?.order;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Icono de éxito */}
        <View style={styles.successIconContainer}>
          <View style={styles.successCircle}>
            <Icon name="checkmark" size={48} color={theme.colors.white} />
          </View>
        </View>

        <Text style={styles.title}>Pedido realizado</Text>
        <Text style={styles.message}>
          Tu pedido ha sido registrado exitosamente. Recibirás una confirmación pronto.
        </Text>

        {/* Detalles del pedido */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailTitle}>Detalles del pedido</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cliente</Text>
            <Text style={styles.detailValue}>
              {order?.customer?.name || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Teléfono</Text>
            <Text style={styles.detailValue}>
              {order?.customer?.phone || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dirección</Text>
            <Text style={styles.detailValue}>
              {order?.customer?.address || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Productos</Text>
            <Text style={styles.detailValue}>
              {order?.items?.length || 0} ({order?.totalItems || 0} unidades)
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.detailTotal}>
              {formatPrice(order?.total || 0)}
            </Text>
          </View>
        </View>

        {/* Lista de productos */}
        <View style={styles.itemsCard}>
          <Text style={styles.detailTitle}>Productos</Text>
          {order?.items?.map((item, index) => (
            <View key={item.id || index}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.name} x{item.quantity}
                  </Text>
                  <Text style={styles.itemSubtotal}>
                    {formatPrice((item.price || 0) * item.quantity)}
                  </Text>
                </View>
              </View>
              {index < (order.items.length - 1) && (
                <View style={styles.detailDivider} />
              )}
            </View>
          ))}
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.primaryButton}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Seguir comprando</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  successIconContainer: {
    marginBottom: theme.spacing.lg,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    maxWidth: 320,
  },
  detailsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    width: '100%',
    ...theme.shadows.sm,
    marginBottom: theme.spacing.md,
  },
  itemsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    width: '100%',
    ...theme.shadows.sm,
    marginBottom: theme.spacing.xl,
  },
  detailTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  detailTotal: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  detailDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  itemSubtotal: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  actions: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md + 4,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default OrderConfirmationScreen;
