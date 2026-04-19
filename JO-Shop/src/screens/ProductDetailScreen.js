import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useCart} from '@context/CartContext';
import {formatPrice, truncateText} from '@utils/helpers';
import theme from '@theme/styles';

const {width: screenWidth} = Dimensions.get('window');

const ProductDetailScreen = ({route}) => {
  const navigation = useNavigation();
  const {addItem} = useCart();
  const product = route.params?.product;
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) {
    navigation.goBack();
    return null;
  }

  const imageUrl = product.image || product.thumbnail || product.image_url || null;

  const handleAddToCart = () => {
    addItem(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleGoToCart = () => {
    navigation.navigate('Cart');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Imagen */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{uri: imageUrl}} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={64} color={theme.colors.textLight} />
            </View>
          )}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}>
            <View style={styles.backButtonBg}>
              <Icon name="arrow-back" size={22} color={theme.colors.white} />
            </View>
          </TouchableOpacity>
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
          <Text style={styles.price}>
            {formatPrice(product.price || product.precio || 0)}
          </Text>

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
                    : theme.colors.accent
                }
              />
              <Text
                style={[
                  styles.stockText,
                  {
                    color:
                      (product.stock > 0 || product.available)
                        ? theme.colors.success
                        : theme.colors.accent,
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
            <Icon name="arrow-forward" size={16} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    color: theme.colors.accent,
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
    color: theme.colors.accent,
    marginBottom: theme.spacing.lg,
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
    backgroundColor: theme.colors.accent,
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
    color: theme.colors.accent,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    marginRight: theme.spacing.xs,
  },
});

export default ProductDetailScreen;
