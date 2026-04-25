import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import ProductCard from '@components/ProductCard';
import {EmptyState, ErrorState, LoadingState} from '@components/StateViews';
import apiService from '@services/api';
import {useSystemConfig} from '@context/SystemConfigContext';
import theme from '@theme/styles';

const HomeScreen = () => {
  const navigation = useNavigation();
  const {isMultiStore} = useSystemConfig();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasApiConfig, setHasApiConfig] = useState(false);
  const [showStoreFilter, setShowStoreFilter] = useState(false);

  // Scroll arrow states for category chips
  const categoryListRef = useRef(null);
  const categoryWrapperLayout = useRef(null);
  const [catCanScrollLeft, setCatCanScrollLeft] = useState(false);
  const [catCanScrollRight, setCatCanScrollRight] = useState(false);

  // Scroll arrow states for store chips
  const storeListRef = useRef(null);
  const storeWrapperLayout = useRef(null);
  const [storeCanScrollLeft, setStoreCanScrollLeft] = useState(false);
  const [storeCanScrollRight, setStoreCanScrollRight] = useState(false);

  const SCROLL_ARROW_AMOUNT = 150;

  // Verificar si hay configuración de API
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

      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStore) params.store = selectedStore;

      let data;
      if (searchQuery.trim()) {
        data = await apiService.searchProducts(searchQuery.trim(), params);
      } else {
        data = await apiService.fetchProducts(params);
      }

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
  }, [searchQuery, selectedCategory, selectedStore]);

  // Cargar categorías
  const loadCategories = useCallback(async () => {
    try {
      const data = await apiService.fetchCategories();
      const cats = Array.isArray(data) ? data : data?.data || data?.categories || [];
      setCategories(cats);
    } catch {
      setCategories([]);
    }
  }, []);

  // Cargar tiendas
  const loadStores = useCallback(async () => {
    try {
      const data = await apiService.fetchStores();
      const storeList = Array.isArray(data) ? data : data?.data || data?.stores || [];
      setStores(storeList);
    } catch {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    if (hasApiConfig) {
      loadProducts();
      loadCategories();
      loadStores();
    } else {
      setLoading(false);
    }
  }, [hasApiConfig, loadProducts, loadCategories, loadStores]);

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

  const handleStoreSelect = storeId => {
    setSelectedStore(prev => (prev === storeId ? null : storeId));
  };

  const scrollCategoryBy = (direction) => {
    if (!categoryListRef.current) return;
    categoryListRef.current.scrollToOffset({
      offset: (direction === 'left' ? -SCROLL_ARROW_AMOUNT : SCROLL_ARROW_AMOUNT),
      animated: true,
    });
  };

  const scrollStoreBy = (direction) => {
    if (!storeListRef.current) return;
    storeListRef.current.scrollToOffset({
      offset: (direction === 'left' ? -SCROLL_ARROW_AMOUNT : SCROLL_ARROW_AMOUNT),
      animated: true,
    });
  };

  const handleCategoryScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setCatCanScrollLeft(contentOffset.x > 5);
    setCatCanScrollRight(contentOffset.x + layoutMeasurement.width < contentSize.width - 5);
  }, []);

  const handleCategoryContentResize = useCallback((contentWidth) => {
    if (categoryWrapperLayout.current && contentWidth > categoryWrapperLayout.current.width) {
      setCatCanScrollRight(true);
    }
  }, []);

  const handleCategoryLayout = useCallback((event) => {
    categoryWrapperLayout.current = event.nativeEvent.layout;
  }, []);

  const handleStoreScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setStoreCanScrollLeft(contentOffset.x > 5);
    setStoreCanScrollRight(contentOffset.x + layoutMeasurement.width < contentSize.width - 5);
  }, []);

  const handleStoreContentResize = useCallback((contentWidth) => {
    if (storeWrapperLayout.current && contentWidth > storeWrapperLayout.current.width) {
      setStoreCanScrollRight(true);
    }
  }, []);

  const handleStoreLayout = useCallback((event) => {
    storeWrapperLayout.current = event.nativeEvent.layout;
  }, []);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedStore(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory || selectedStore || searchQuery;

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

        {/* Filtros */}
        <View style={styles.filterRow}>
          {/* Categorías con flechas */}
          {categories.length > 0 && (
            <View style={styles.chipScrollWrapper} onLayout={handleCategoryLayout}>
              {/* Fade + flecha izquierda */}
              {catCanScrollLeft && (
                <TouchableOpacity
                  style={styles.scrollArrowLeft}
                  onPress={() => scrollCategoryBy('left')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Icon name="chevron-back" size={20} color={theme.colors.accent} />
                </TouchableOpacity>
              )}
              <FlatList
                ref={categoryListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={handleCategoryScroll}
                scrollEventThrottle={16}
                data={[{id: null, name: 'Todos'}, ...categories]}
                keyExtractor={item => `cat-${item.id?.toString() || 'all'}`}
                renderItem={({item}) => (
                  <TouchableOpacity
                    onPress={() => handleCategorySelect(item.id)}
                    style={[
                      styles.filterChip,
                      selectedCategory === item.id && styles.filterChipActive,
                    ]}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedCategory === item.id && styles.filterChipTextActive,
                      ]}>
                      {item.name || 'Todos'}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.filterList}
                onContentSizeChange={(w) => handleCategoryContentResize(w)}
              />
              {/* Fade + flecha derecha */}
              {catCanScrollRight && (
                <TouchableOpacity
                  style={styles.scrollArrowRight}
                  onPress={() => scrollCategoryBy('right')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Icon name="chevron-forward" size={20} color={theme.colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Tiendas filter */}
        {isMultiStore && stores.length > 0 && (
          <View style={styles.storeFilterRow}>
            <TouchableOpacity
              style={styles.storeFilterToggle}
              onPress={() => setShowStoreFilter(prev => !prev)}>
              <Icon
                name="storefront-outline"
                size={16}
                color={selectedStore ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[
                styles.storeFilterLabel,
                selectedStore && styles.storeFilterLabelActive,
              ]}>
                {selectedStore
                  ? stores.find(s => s.id === selectedStore)?.name || 'Tienda'
                  : 'Filtrar por tienda'}
              </Text>
              <Icon
                name={showStoreFilter ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearFiltersBtn}
                onPress={clearFilters}>
                <Icon name="close-circle" size={16} color={theme.colors.accent} />
                <Text style={styles.clearFiltersText}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isMultiStore && showStoreFilter && stores.length > 0 && (
          <View style={styles.storeFilterContainer}>
            <View style={styles.chipScrollWrapper} onLayout={handleStoreLayout}>
              {storeCanScrollLeft && (
                <TouchableOpacity
                  style={styles.scrollArrowLeft}
                  onPress={() => scrollStoreBy('left')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Icon name="chevron-back" size={20} color={theme.colors.accent} />
                </TouchableOpacity>
              )}
              <FlatList
                ref={storeListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={handleStoreScroll}
                scrollEventThrottle={16}
                data={[{id: null, name: 'Todas las tiendas'}, ...stores]}
                keyExtractor={item => `store-${item.id?.toString() || 'all'}`}
                renderItem={({item}) => {
                  const storeCount = item._count?.products || 0;
                  return (
                    <TouchableOpacity
                      onPress={() => handleStoreSelect(item.id)}
                      style={[
                        styles.storeChip,
                        selectedStore === item.id && styles.storeChipActive,
                      ]}
                      activeOpacity={0.7}>
                      <Icon
                        name="storefront"
                        size={14}
                        color={selectedStore === item.id ? theme.colors.white : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.storeChipText,
                          selectedStore === item.id && styles.storeChipTextActive,
                        ]}>
                        {item.name || 'Todas'}
                      </Text>
                      {storeCount > 0 && (
                        <Text style={[
                          styles.storeChipCount,
                          selectedStore === item.id && styles.storeChipCountActive,
                        ]}>
                          {storeCount}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.filterList}
                onContentSizeChange={(w) => handleStoreContentResize(w)}
              />
              {storeCanScrollRight && (
                <TouchableOpacity
                  style={styles.scrollArrowRight}
                  onPress={() => scrollStoreBy('right')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Icon name="chevron-forward" size={20} color={theme.colors.accent} />
                </TouchableOpacity>
              )}
            </View>
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
                  : selectedStore
                    ? 'Esta tienda no tiene productos disponibles.'
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
  filterRow: {
    marginTop: theme.spacing.sm,
  },
  chipScrollWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollArrowLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: theme.borderRadius.xl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: -1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scrollArrowRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: theme.borderRadius.xl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  filterList: {
    marginRight: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.inputBg,
    marginRight: theme.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
  },
  filterChipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.white,
  },
  // Store filter toggle
  storeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  storeFilterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  storeFilterLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  storeFilterLabelActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  storeFilterContainer: {
    marginTop: theme.spacing.xs,
  },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.inputBg,
    marginRight: theme.spacing.sm,
  },
  storeChipActive: {
    backgroundColor: theme.colors.accent,
  },
  storeChipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  storeChipTextActive: {
    color: theme.colors.white,
  },
  storeChipCount: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textLight,
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    textAlign: 'center',
  },
  storeChipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    color: theme.colors.white,
  },
  productList: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  row: {
    gap: theme.spacing.md,
  },
  productCard: {
    width: '48%',
  },
});

export default HomeScreen;
