import React, {useMemo} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useCart} from '@context/CartContext';
import {formatPrice} from '@utils/helpers';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

const CartItem = ({item}) => {
  const {updateQuantity, removeItem} = useCart();
  const {primary} = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);

  const imageUrl = item.image || item.thumbnail || null;

  return (
    <View style={styles.container}>
      {/* Imagen */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{uri: imageUrl}} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="image-outline" size={24} color={theme.colors.textLight} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name || item.title || 'Sin nombre'}
        </Text>
        <Text style={styles.price}>
          {formatPrice(item.price || item.precio || 0)}
        </Text>
      </View>

      {/* Controles de cantidad */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
          style={styles.controlButton}
          activeOpacity={0.7}>
          <Icon
            name={item.quantity === 1 ? 'trash-outline' : 'remove'}
            size={18}
            color={item.quantity === 1 ? primary : theme.colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.quantity}>{item.quantity}</Text>

        <TouchableOpacity
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
          style={styles.controlButton}
          activeOpacity={0.7}>
          <Icon name="add" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (primary) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.inputBg,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    justifyContent: 'center',
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  price: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: primary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
});

export default CartItem;
