import React, {useMemo, useState, useEffect, useRef} from 'react';
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

// ─── Helper to parse product images ────────────────────────────────────────────
const parseProductImages = product => {
  const images = [];

  // Primary image first
  const primaryImage = product.image || product.thumbnail || null;
  if (primaryImage) {
    images.push(primaryImage);
  }

  // Parse images field (could be JSON string or array)
  let galleryImages = [];
  if (product.images) {
    if (Array.isArray(product.images)) {
      galleryImages = product.images;
    } else if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) {
          galleryImages = parsed;
        }
      } catch {
        // If it's not valid JSON, treat as a single URL string
        galleryImages = [product.images];
      }
    }
  }

  // Deduplicate: add gallery images that aren't already in the list
  for (const url of galleryImages) {
    if (url && typeof url === 'string' && !images.includes(url)) {
      images.push(url);
    }
  }

  return images;
};

const ProductCard = ({product, onPress, containerStyle}) => {
  const {addItem} = useCart();
  const {primary} = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);

  const allImages = useMemo(() => parseProductImages(product), [product]);
  const hasMultipleImages = allImages.length > 1;
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  // Auto-rotate every 3 seconds when multiple images
  useEffect(() => {
    if (!hasMultipleImages) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % allImages.length);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hasMultipleImages, allImages.length]);

  const handleAddToCart = () => {
    addItem(product);
  };

  const imageUrl = allImages.length > 0 ? allImages[currentIndex] : null;
  const discount = product.discountPercent ?? product.discount_percent ?? 0;
  const hasDiscount = discount > 0;
  const price = product.price ?? product.precio ?? 0;
  const discountedPrice = hasDiscount ? price * (1 - discount / 100) : price;

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

        {/* Badge de descuento */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{discount}%</Text>
          </View>
        )}

        {/* Badge de agotado */}
        {product.stock !== undefined && product.stock <= 0 && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Agotado</Text>
          </View>
        )}

        {/* Image counter badge for multiple images */}
        {hasMultipleImages && (
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>
              {currentIndex + 1}/{allImages.length}
            </Text>
          </View>
        )}

        {/* Dot indicators for multiple images */}
        {hasMultipleImages && (
          <View style={styles.dotContainer}>
            {allImages.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentIndex && styles.dotActive,
                ]}
              />
            ))}
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
          <View style={styles.priceContainer}>
            {hasDiscount && (
              <Text style={styles.oldPrice} numberOfLines={1}>
                {formatPrice(price)}
              </Text>
            )}
            <Text style={[styles.price, hasDiscount && styles.discountedPrice]}>
              {formatPrice(discountedPrice)}
            </Text>
          </View>
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
    position: 'relative',
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
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    shadowColor: '#FF6B6B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.white,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.colors.danger || '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
    letterSpacing: 0.3,
  },
  counterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  counterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  dotContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: theme.colors.white,
    width: 8,
    height: 8,
    borderRadius: 4,
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
  priceContainer: {
    flex: 1,
    marginRight: 8,
  },
  oldPrice: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textLight,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  price: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: primary,
  },
  discountedPrice: {
    color: '#FF6B6B',
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
