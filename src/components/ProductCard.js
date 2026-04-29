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
import {formatPrice, truncateText} from '@utils/helpers';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

const ProductCard = ({product, onPress, containerStyle}) => {
  const {addItem} = useCart();
  const {primary} = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);

  const handleAddToCart = () => {
    addItem(product);
  };

  const imageUrl = product.image || product.thumbnail || null;

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(product)}
      activeOpacity={0.85}
      style={[styles.card, containerStyle]}>
      {/* Imagen del producto */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{uri: imageUrl}} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="image-outline" size={36} color={theme.colors.textLight} />
          </View>
        )}
      </View>

      {/* Info del producto */}
      <View style={styles.info}>
        {/* Store badge */}
        {product.store?.name && (
          <View style={styles.storeBadge}>
            <Icon name="storefront" size={10} color={theme.colors.textLight} />
            <Text style={styles.storeName} numberOfLines={1}>
              {product.store.name}
            </Text>
          </View>
        )}

        <Text style={styles.name} numberOfLines={2}>
          {product.name || product.title || 'Sin nombre'}
        </Text>

        {product.description && (
          <Text style={styles.description} numberOfLines={1}>
            {truncateText(product.description, 50)}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.price}>
            {formatPrice(product.price || product.precio || 0)}
          </Text>
          <TouchableOpacity
            onPress={handleAddToCart}
            activeOpacity={0.7}
            style={styles.addButton}>
            <Icon name="add" size={20} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (primary) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
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
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: 2,
  },
  description: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 14,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  price: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: primary,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    backgroundColor: primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProductCard;
