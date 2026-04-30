import React, {useState, useMemo, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useCart} from '@context/CartContext';
import {formatPrice, truncateText} from '@utils/helpers';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

const {width: screenWidth} = Dimensions.get('window');

// ─── Helper to parse product images ────────────────────────────────────────────
const parseProductImages = product => {
  const images = [];

  // Primary image first
  const primaryImage =
    product.image || product.thumbnail || product.image_url || null;
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
        galleryImages = [product.images];
      }
    }
  }

  // Deduplicate
  for (const url of galleryImages) {
    if (url && typeof url === 'string' && !images.includes(url)) {
      images.push(url);
    }
  }

  return images;
};

const ProductDetailScreen = ({route}) => {
  const navigation = useNavigation();
  const {addItem} = useCart();
  const {primary} = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);
  const product = route.params?.product;
  const [addedToCart, setAddedToCart] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const allImages = useMemo(() => parseProductImages(product), [product]);
  const hasMultipleImages = allImages.length > 1;

  if (!product) {
    navigation.goBack();
    return null;
  }

  const discount = product.discountPercent ?? product.discount_percent ?? 0;
  const hasDiscount = discount > 0;
  const price = product.price ?? product.precio ?? 0;
  const discountedPrice = hasDiscount ? price * (1 - discount / 100) : price;
  const savings = hasDiscount ? price - discountedPrice : 0;

  // Fade animation on image change
  useEffect(() => {
    if (!hasMultipleImages) return;

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex, hasMultipleImages, fadeAnim]);

  // Auto-play every 4 seconds
  useEffect(() => {
    if (!hasMultipleImages) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % allImages.length);
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hasMultipleImages, allImages.length]);

  const goToImage = idx => {
    if (idx < 0) {
      idx = allImages.length - 1;
    } else if (idx >= allImages.length) {
      idx = 0;
    }
    setCurrentIndex(idx);
    // Reset auto-play timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % allImages.length);
      }, 4000);
    }
  };

  const handleAddToCart = () => {
    addItem(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleGoToCart = () => {
    navigation.navigate('Cart');
  };

  const imageUrl = allImages.length > 0 ? allImages[currentIndex] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Imagen / Carousel */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Animated.View style={{opacity: fadeAnim, flex: 1}}>
              <Image source={{uri: imageUrl}} style={styles.image} />
            </Animated.View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon
                name="image-outline"
                size={64}
                color={theme.colors.textLight}
              />
            </View>
          )}

          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Icon name="pricetag" size={14} color={theme.colors.white} />
              <Text style={styles.discountBadgeText}>-{discount}%</Text>
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}>
            <View style={styles.backButtonBg}>
              <Icon name="arrow-back" size={22} color={theme.colors.white} />
            </View>
          </TouchableOpacity>

          {/* Left arrow */}
          {hasMultipleImages && (
            <TouchableOpacity
              onPress={() => goToImage(currentIndex - 1)}
              style={styles.arrowLeft}
              activeOpacity={0.7}>
              <View style={styles.arrowButtonBg}>
                <Icon name="chevron-back" size={22} color={theme.colors.white} />
              </View>
            </TouchableOpacity>
          )}

          {/* Right arrow */}
          {hasMultipleImages && (
            <TouchableOpacity
              onPress={() => goToImage(currentIndex + 1)}
              style={styles.arrowRight}
              activeOpacity={0.7}>
              <View style={styles.arrowButtonBg}>
                <Icon name="chevron-forward" size={22} color={theme.colors.white} />
              </View>
            </TouchableOpacity>
          )}

          {/* Dot indicators */}
          {hasMultipleImages && (
            <View style={styles.dotsContainer}>
              {allImages.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => goToImage(idx)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.dot,
                      idx === currentIndex && styles.dotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
              <Text style={styles.dotCounter}>
                {currentIndex + 1}/{allImages.length}
              </Text>
            </View>
          )}
        </View>

        {/* Detalles del producto */}
        <View style={styles.details}>
          {/* Categoría */}
          {product.category && (
            <Text style={styles.category}>
              {typeof product.category === 'object'
                ? product.category.name
                : product.category}
            </Text>
          )}

          {/* Nombre */}
          <Text style={styles.name}>
            {product.name || product.title || 'Sin nombre'}
          </Text>

          {/* Precio */}
          <View style={styles.priceSection}>
            {hasDiscount && (
              <>
                <Text style={styles.oldPrice}>{formatPrice(price)}</Text>
                <Text style={styles.savingsText}>
                  Ahorras {formatPrice(savings)}
                </Text>
              </>
            )}
            <Text style={[styles.price, hasDiscount && styles.discountedPrice]}>
              {formatPrice(discountedPrice)}
            </Text>
          </View>

          {/* Descripción */}
          {product.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Descripción</Text>
              <Text style={styles.description}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Stock / Disponibilidad */}
          {(product.stock !== undefined || product.available !== undefined) && (
            <View style={styles.stockContainer}>
              <Icon
                name={
                  (product.stock > 0 || product.available)
                    ? 'checkmark-circle'
                    : 'close-circle'
                }
                size={18}
                color={
                  (product.stock > 0 || product.available)
                    ? theme.colors.success
                    : primary
                }
              />
              <Text
                style={[
                  styles.stockText,
                  {
                    color:
                      (product.stock > 0 || product.available)
                        ? theme.colors.success
                        : primary,
                  },
                ]}>
                {(product.stock > 0 || product.available)
                  ? `En stock${product.stock ? ` (${product.stock} disponibles)` : ''}`
                  : 'Agotado'}
              </Text>
            </View>
          )}

          {/* Botón agregar al carrito */}
          <TouchableOpacity
            onPress={handleAddToCart}
            style={[
              styles.addButton,
              addedToCart && styles.addButtonAdded,
            ]}
            activeOpacity={0.8}>
            {addedToCart ? (
              <>
                <Icon name="checkmark" size={22} color={theme.colors.white} />
                <Text style={styles.addButtonText}>Agregado</Text>
              </>
            ) : (
              <>
                <Icon name="cart-outline" size={22} color={theme.colors.white} />
                <Text style={styles.addButtonText}>Agregar al carrito</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Ir al carrito */}
          <TouchableOpacity
            onPress={handleGoToCart}
            style={styles.goToCartButton}
            activeOpacity={0.7}>
            <Text style={styles.goToCartText}>Ver mi carrito</Text>
            <Icon name="arrow-forward" size={16} color={primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (primary) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  imageContainer: {
    width: screenWidth,
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
  backButton: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
  },
  backButtonBg: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Arrow buttons
  arrowLeft: {
    position: 'absolute',
    top: '50%',
    left: theme.spacing.md,
    marginTop: -20,
  },
  arrowRight: {
    position: 'absolute',
    top: '50%',
    right: theme.spacing.md,
    marginTop: -20,
  },
  arrowButtonBg: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dots
  dotsContainer: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: theme.colors.white,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.white,
    marginLeft: theme.spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  details: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    marginTop: -theme.borderRadius.xl,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  category: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 34,
    marginBottom: theme.spacing.sm,
  },
  price: {
    fontSize: theme.fontSize.hero,
    fontWeight: '800',
    color: primary,
  },
  discountedPrice: {
    color: '#FF6B6B',
  },
  priceSection: {
    marginBottom: theme.spacing.lg,
  },
  oldPrice: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.textLight,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    marginBottom: 2,
  },
  savingsText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: '#00B894',
    marginBottom: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: theme.spacing.lg + 8,
    right: theme.spacing.lg,
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    shadowColor: '#FF6B6B',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  discountBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
  descriptionContainer: {
    marginBottom: theme.spacing.lg,
  },
  descriptionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  stockText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md + 4,
    ...theme.shadows.md,
  },
  addButtonAdded: {
    backgroundColor: theme.colors.success,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  goToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  goToCartText: {
    color: primary,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    marginRight: theme.spacing.xs,
  },
});

export default ProductDetailScreen;
