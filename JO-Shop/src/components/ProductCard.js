import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useCart} from '@context/CartContext';
import {formatPrice, truncateText} from '@utils/helpers';
import theme from '@theme/styles';

const ProductCard = ({product, onPress, containerStyle}) => {
  const {addItem} = useCart();

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
        <Text style={styles.name} numberOfLines={2}>
          {product.name || product.title || 'Sin nombre'}
        </Text>

        {product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {truncateText(product.description, 60)}
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

const styles = StyleSheet.create({
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
    color: theme.colors.accent,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProductCard;
