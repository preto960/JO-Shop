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
    padding: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
});

export default ProductCard;
