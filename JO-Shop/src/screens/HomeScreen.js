import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import ProductCard from '@components/ProductCard';
import {EmptyState, ErrorState, LoadingState} from '@components/StateViews';
import apiService from '@services/api';
import theme from '@theme/styles';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasApiConfig, setHasApiConfig] = useState(false);

  // Verificar si hay configuración de API (se ejecuta cada vez que la pantalla gana foco)
  useEffect(() => {
    const checkConfig = async () => {
      const config = await apiService.getApiConfig();
      setHasApiConfig(!!config.baseUrl);
    };
    checkConfig();
  }, [navigation]);

  // Cargar productos
  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let data;
      if (searchQuery.trim()) {
        data = await apiService.searchProducts(searchQuery.trim(), {
          category: selectedCategory,
        });
      } else {
        data = await apiService.fetchProducts({
          category: selectedCategory,
        });
      }

      // Adaptar diferentes formatos de respuesta del backend
      const productsList = Array.isArray(data)
        ? data
        : data?.data || data?.products || data?.results || [];

      setProducts(productsList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory]);

  // Cargar categorías
  const loadCategories = useCallback(async () => {
    try {
      const data = await apiService.fetchCategories();
      const cats = Array.isArray(data) ? data : data?.data || data?.categories || [];
      setCategories(cats);
    } catch {
      // Si no hay endpoint de categorías, no es crítico
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (hasApiConfig) {
      loadProducts();
      loadCategories();
    } else {
      setLoading(false);
    }
  }, [hasApiConfig, loadProducts, loadCategories]);

  // Debounce de búsqueda
  useEffect(() => {
    if (!hasApiConfig) return;
    const timer = setTimeout(() => {
      loadProducts();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleProductPress = product => {
    navigation.navigate('ProductDetail', {product});
  };

  const handleCategorySelect = categoryId => {
    setSelectedCategory(prev => (prev === categoryId ? null : categoryId));
  };

  // Renderizar sin configuración
  if (!hasApiConfig && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>JO-Shop</Text>
          </View>
        </View>
        <EmptyState
          icon="cloud-offline-outline"
          title="Sin conexión al servidor"
          message="Configura la URL de tu backend en la sección de Ajustes para empezar a ver productos."
          actionLabel="Ir a Ajustes"
          onAction={() => navigation.navigate('Settings')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>JO-Shop</Text>
          <Text style={styles.subtitle}>Descubre productos increíbles</Text>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar productos..."
            placeholderTextColor={theme.colors.textLight}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={theme.colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Categorías */}
        {categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            <FlatList
              horizontal
              data={[{id: null, name: 'Todos'}, ...categories]}
              keyExtractor={item => item.id?.toString() || 'all'}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <TouchableOpacity
                  onPress={() => handleCategorySelect(item.id)}
                  style={[
                    styles.categoryChip,
                    selectedCategory === item.id && styles.categoryChipActive,
                  ]}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === item.id && styles.categoryTextActive,
                    ]}>
                    {item.name || 'Todos'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Contenido */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadProducts()} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => (item.id || item._id || '').toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadProducts(true)}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={
                searchQuery
                  ? 'Sin resultados'
                  : 'No hay productos'
              }
              message={
                searchQuery
                  ? `No encontramos resultados para "${searchQuery}". Intenta con otra búsqueda.`
                  : 'Aún no hay productos disponibles. ¡Vuelve pronto!'
              }
            />
          }
          renderItem={({item}) => (
            <ProductCard
              product={item}
              onPress={handleProductPress}
              containerStyle={styles.productCard}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  headerTop: {
    marginBottom: theme.spacing.sm,
  },
  logo: {
    fontSize: theme.fontSize.title,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    height: '100%',
  },
  categoriesContainer: {
    marginTop: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.inputBg,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accent,
  },
  categoryText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  categoryTextActive: {
    color: theme.colors.white,
  },
  productList: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  productCard: {
    width: '48%',
  },
});

export default HomeScreen;
