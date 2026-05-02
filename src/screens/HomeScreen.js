import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import ProductCard from '@components/ProductCard';
import {EmptyState, ErrorState, LoadingState} from '@components/StateViews';
import apiService from '@services/api';
import {useConfig} from '@context/ConfigContext';
import {useAuth} from '@context/AuthContext';
import {useCart} from '@context/CartContext';
import {formatPrice} from '@utils/helpers';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

const HomeScreen = () => {
  const navigation = useNavigation();
  const {config, isMultiStore} = useConfig();
  const { primary } = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);
  const shopName = config.shop_name || 'JO-Shop';
  const shopLogoUrl = config.shop_logo_url || '';
  const primaryColor = config.primary_color || primary;
  const accentColor = config.accent_color || theme.colors.accent;
  const {user, isAuthenticated, logout} = useAuth();
  const {totalItems} = useCart();

  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Sin filtros para carousels
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

  // Carousel refs
  const bestSellersRef = useRef(null);
  const offersRef = useRef(null);

  // Scroll arrow states for store chips
  const storeListRef = useRef(null);
  const storeWrapperLayout = useRef(null);
  const [storeCanScrollLeft, setStoreCanScrollLeft] = useState(false);
  const [storeCanScrollRight, setStoreCanScrollRight] = useState(false);

  const SCROLL_ARROW_AMOUNT = 150;

  // Verificar si hay configuración de API
  useEffect(() => {
    const checkConfig = async () => {
      const cfg = await apiService.getApiConfig();
      setHasApiConfig(!!cfg.baseUrl);
    };
    checkConfig();
  }, [navigation]);

  // Cargar productos (filtrados)
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

  // Cargar TODOS los productos (sin filtros) para carousels
  const loadAllProducts = useCallback(async () => {
    try {
      const data = await apiService.fetchProducts({});
      const list = Array.isArray(data)
        ? data
        : data?.data || data?.products || data?.results || [];
      setAllProducts(list);
    } catch {
      // non-critical
    }
  }, []);

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
      loadAllProducts();
      loadCategories();
      loadStores();
    } else {
      setLoading(false);
    }
  }, [hasApiConfig, loadProducts, loadAllProducts, loadCategories, loadStores]);

  // Debounce de búsqueda
  useEffect(() => {
    if (!hasApiConfig) return;
    const timer = setTimeout(() => {
      loadProducts();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Banners de publicidad ────────────────────────────────────────────
  const bannersEnabled = config.banners_enabled === 'true';
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [bannersLoading, setBannersLoading] = useState(false);
  const bannerTimerRef = useRef(null);
  const bannerProgressRef = useRef(null);
  const bannerScrollRef = useRef(null);
  const isAutoScrollingRef = useRef(false);
  const currentBannerRef = useRef(0);
  const bannersLengthRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { currentBannerRef.current = currentBanner; }, [currentBanner]);
  useEffect(() => { bannersLengthRef.current = banners.length; }, [banners.length]);

  useEffect(() => {
    if (!bannersEnabled || !hasApiConfig) { setBanners([]); setBannersLoading(false); return; }
    let cancelled = false;
    const loadBanners = async () => {
      setBannersLoading(true);
      try {
        const data = await apiService.fetchBanners();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setBanners(list);
      } catch {
        if (!cancelled) setBanners([]);
      } finally {
        if (!cancelled) setBannersLoading(false);
      }
    };
    loadBanners();
    return () => { cancelled = true; };
  }, [bannersEnabled, hasApiConfig]);

  // Auto-rotate banners with per-banner duration + progress bar
  useEffect(() => {
    if (banners.length <= 1) {
      setBannerProgress(100);
      return;
    }

    // Cleanup previous timers properly
    if (bannerTimerRef.current) { clearTimeout(bannerTimerRef.current); bannerTimerRef.current = null; }
    if (bannerProgressRef.current) { clearInterval(bannerProgressRef.current); bannerProgressRef.current = null; }

    const duration = (banners[currentBanner]?.duration || 4) * 1000;
    const stepMs = 50;
    setBannerProgress(0);
    let elapsed = 0;

    // Smooth progress bar animation
    bannerProgressRef.current = setInterval(() => {
      elapsed += stepMs;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setBannerProgress(progress);
    }, stepMs);

    // Advance to next banner when duration expires
    bannerTimerRef.current = setTimeout(() => {
      const nextIndex = (currentBannerRef.current + 1) % bannersLengthRef.current;
      isAutoScrollingRef.current = true;
      setCurrentBanner(nextIndex);

      // Scroll using scrollToOffset (more reliable than scrollToIndex on Android)
      if (bannerScrollRef.current) {
        const slideWidth = Dimensions.get('window').width - theme.spacing.md * 2;
        try {
          bannerScrollRef.current.scrollToOffset({
            offset: slideWidth * nextIndex,
            animated: true,
          });
        } catch (e) {
          // Silently ignore scroll errors
        }
      }

      // Reset auto-scrolling flag after animation completes
      setTimeout(() => { isAutoScrollingRef.current = false; }, 600);
    }, duration);

    return () => {
      if (bannerTimerRef.current) { clearTimeout(bannerTimerRef.current); bannerTimerRef.current = null; }
      if (bannerProgressRef.current) { clearInterval(bannerProgressRef.current); bannerProgressRef.current = null; }
    };
  }, [currentBanner, banners.length]);

  // Calcular datos derivados para carousels
  const bestSellers = useMemo(() => {
    return allProducts.slice(0, 6);
  }, [allProducts]);

  const offers = useMemo(() => {
    return allProducts
      .filter(p => {
        const hasDiscount = p.discountPercent > 0 || p.discount_percent > 0 || p.oldPrice || p.originalPrice || p.compareAtPrice;
        return hasDiscount;
      })
      .slice(0, 6);
  }, [allProducts]);

  const hasActiveFilters = selectedCategory || selectedStore || searchQuery;

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

  // ─── Render sin configuración ────────────────────────────────────────────
  if (!hasApiConfig && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            {shopLogoUrl ? (
              <Image source={{uri: shopLogoUrl}} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <Text style={[styles.logo, {color: primaryColor}]}>{shopName}</Text>
            )}
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

  // ─── Carousel de productos ──────────────────────────────────────────────
  const renderProductCarousel = (title, data, listRef) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={styles.carouselSection}>
        <Text style={styles.carouselTitle}>{title}</Text>
        <FlatList
          ref={listRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data}
          keyExtractor={item => `carousel-${item.id || item._id || ''}`}
          contentContainerStyle={styles.carouselList}
          renderItem={({item}) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleProductPress(item)}
              style={styles.carouselCard}>
              <View style={styles.carouselImageContainer}>
                <Image
                  source={{uri: item.image || item.imageUrl || item.images?.[0]}}
                  style={styles.carouselImage}
                  resizeMode="cover"
                  onError={() => {}}
                />
                {item.stock !== undefined && item.stock <= 0 && (
                  <View style={styles.outOfStockBadge}>
                    <Text style={styles.outOfStockText}>Agotado</Text>
                  </View>
                )}
                {(item.discountPercent > 0 || item.discount_percent > 0) && (
                  <View style={styles.carouselDiscountBadge}>
                    <Text style={styles.carouselDiscountText}>
                      -{item.discountPercent || item.discount_percent}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.carouselInfo}>
                <Text style={styles.carouselName} numberOfLines={1}>
                  {item.name || item.title}
                </Text>
                <View style={styles.carouselPriceRow}>
                  {(item.discountPercent > 0 || item.discount_percent > 0) ? (
                    <>
                      <Text style={styles.carouselOldPrice}>
                        {formatPrice(item.price || item.precio)}
                      </Text>
                      <Text style={styles.carouselPrice}>
                        {formatPrice((item.price || item.precio) * (1 - (item.discountPercent || item.discount_percent) / 100))}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.carouselPrice}>
                        {formatPrice(item.price || item.precio)}
                      </Text>
                      {(item.oldPrice || item.originalPrice || item.compareAtPrice) && (
                        <Text style={styles.carouselOldPrice}>
                          {formatPrice(item.oldPrice || item.originalPrice || item.compareAtPrice)}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  // ─── Feature strip ──────────────────────────────────────────────────────
  const renderFeatureStrip = () => {
    if (hasActiveFilters) return null;
    return (
      <View style={styles.featureStrip}>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, {backgroundColor: primaryColor + '15'}]}>
            <Icon name="rocket-outline" size={20} color={primaryColor} />
          </View>
          <Text style={styles.featureLabel}>Envío rápido</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, {backgroundColor: primaryColor + '15'}]}>
            <Icon name="shield-checkmark-outline" size={20} color={primaryColor} />
          </View>
          <Text style={styles.featureLabel}>Pago seguro</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, {backgroundColor: primaryColor + '15'}]}>
            <Icon name="headset-outline" size={20} color={primaryColor} />
          </View>
          <Text style={styles.featureLabel}>Soporte 24/7</Text>
        </View>
      </View>
    );
  };

  // ─── Banner Carousel (publicidad) ─────────────────────────────────────
  const renderBannerCarousel = () => {
    if (!bannersEnabled || hasActiveFilters) return null;

    // Show placeholder skeleton while loading to prevent layout collapse
    if (bannersLoading) {
      return (
        <View style={styles.bannerCarousel}>
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          </View>
        </View>
      );
    }

    if (banners.length === 0) return null;

    return (
      <View style={styles.bannerCarousel}>
        <FlatList
          ref={bannerScrollRef}
          data={banners}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `banner-${item.id}`}
          scrollEventThrottle={16}
          onScroll={(event) => {
            // Ignore scroll events during auto-rotate animation
            if (isAutoScrollingRef.current) return;
            const offset = event.nativeEvent.contentOffset.x;
            const width = event.nativeEvent.layoutMeasurement.width;
            if (width === 0) return;
            const index = Math.round(offset / width);
            if (index >= 0 && index < banners.length && index !== currentBannerRef.current) {
              setCurrentBanner(index);
            }
          }}
          getItemLayout={(_data, index) => {
            const slideWidth = Dimensions.get('window').width - theme.spacing.md * 2;
            return {
              length: slideWidth,
              offset: slideWidth * index,
              index,
            };
          }}
          renderItem={({item}) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (item.link) {
                  try {
                    const url = item.link.startsWith('http') ? item.link : `https://${item.link}`;
                    // Linking.openURL would go here
                  } catch {}
                }
              }}
              style={styles.bannerSlide}>
              {item.mediaType === 'video' ? (
                <View style={styles.bannerImage}>
                  {/* Videos require react-native-video - fallback to image */}
                  <Image
                    source={{uri: item.imageUrl}}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Image
                  source={{uri: item.imageUrl}}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>
          )}
        />
        {/* Subtle progress bar — thin line at bottom left corner */}
        {banners.length > 1 && (
          <View style={styles.bannerProgressBg}>
            <View style={[styles.bannerProgressFill, {width: `${bannerProgress}%`}]} />
          </View>
        )}
        {/* Dots indicator */}
        {banners.length > 1 && (
          <View style={styles.bannerDots}>
            {banners.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.bannerDot,
                  index === currentBanner && styles.bannerDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  // ─── Login prompt (para guests con items en carrito) ────────────────────
  const renderLoginPrompt = () => {
    if (isAuthenticated || totalItems === 0) return null;
    return (
      <View style={styles.loginPrompt}>
        <View style={styles.loginPromptContent}>
          <Icon name="log-in-outline" size={22} color={primaryColor} />
          <Text style={styles.loginPromptText}>
            Inicia sesión para completar tu compra
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.loginPromptBtn, {backgroundColor: primaryColor}]}
          onPress={() => navigation.navigate('Login', {fromGuest: true})}
          activeOpacity={0.8}>
          <Text style={styles.loginPromptBtnText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ═══ Header ═══ */}
      <View style={styles.header}>
        {shopLogoUrl ? (
          <Image source={{uri: shopLogoUrl}} style={styles.logoImage} resizeMode="contain" />
        ) : (
          <Text style={[styles.logo, {color: primaryColor}]}>{shopName}</Text>
        )}
        {/* Search bar in header */}
        <View style={styles.headerSearchContainer}>
          <Icon name="search" size={16} color={theme.colors.textLight} />
          <TextInput
            style={styles.headerSearchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar productos..."
            placeholderTextColor={theme.colors.textLight}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
              <Icon name="close-circle" size={16} color={theme.colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
        {isAuthenticated ? (
          <TouchableOpacity onPress={logout} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="log-out-outline" size={22} color={primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Login', {fromGuest: true})}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={[styles.loginBtn, {backgroundColor: primaryColor}]}>
            <Text style={styles.loginBtnText}>Ingresar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ═══ Main Scrollable Content ═══ */}
      <FlatList
        data={products}
        keyExtractor={item => (item.id || item._id || '').toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { loadProducts(true); loadAllProducts(); }}
            colors={[primary]}
            tintColor={primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* ═══ Banner Carousel (publicidad) ═══ */}
            {renderBannerCarousel()}

            {/* ═══ Category cards with images ═══ */}
            {categories.length > 0 && (
              <View style={styles.categorySection}>
                <FlatList
                  ref={categoryListRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleCategoryScroll}
                  scrollEventThrottle={16}
                  data={[{id: null, name: 'Todos', image: null}, ...categories]}
                  keyExtractor={item => `cat-${item.id?.toString() || 'all'}`}
                  renderItem={({item}) => {
                    const isActive = selectedCategory === item.id;
                    return (
                      <TouchableOpacity
                        onPress={() => handleCategorySelect(item.id)}
                        style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                        activeOpacity={0.8}>
                        <View style={[styles.categoryImageWrap, isActive && styles.categoryImageWrapActive]}>
                          {item.image ? (
                            <Image source={{uri: item.image}} style={styles.categoryImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.categoryIconWrap, isActive && styles.categoryIconWrapActive]}>
                              <Icon name={item.id === null ? 'grid-outline' : 'pricetag-outline'} size={22} color={isActive ? theme.colors.white : theme.colors.textSecondary} />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.categoryName, isActive && styles.categoryNameActive]}
                          numberOfLines={1}>
                          {item.name || 'Todos'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                  contentContainerStyle={styles.categoryList}
                  onContentSizeChange={(w) => handleCategoryContentResize(w)}
                />
              </View>
            )}

            {/* ═══ Store filter ═══ */}
            {isMultiStore && stores.length > 0 && (
              <View style={styles.storeFilterRow}>
                <TouchableOpacity
                  style={styles.storeFilterToggle}
                  onPress={() => setShowStoreFilter(prev => !prev)}>
                  <Icon name="storefront-outline" size={16} color={selectedStore ? primary : theme.colors.textSecondary} />
                  <Text style={[styles.storeFilterLabel, selectedStore && styles.storeFilterLabelActive]}>
                    {selectedStore
                      ? stores.find(s => s.id === selectedStore)?.name || 'Tienda'
                      : 'Filtrar por tienda'}
                  </Text>
                  <Icon name={showStoreFilter ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {hasActiveFilters && (
                  <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                    <Icon name="close-circle" size={16} color={primary} />
                    <Text style={styles.clearFiltersText}>Limpiar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ═══ Store filter chips dropdown ═══ */}
            {isMultiStore && showStoreFilter && stores.length > 0 && (
              <View style={styles.storeFilterContainer}>
                <View style={styles.chipScrollWrapper} onLayout={handleStoreLayout}>
                  {storeCanScrollLeft && (
                    <TouchableOpacity
                      style={styles.scrollArrowLeft}
                      onPress={() => scrollStoreBy('left')}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
                      <Icon name="chevron-back" size={20} color={primary} />
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
                          style={[styles.storeChip, selectedStore === item.id && styles.storeChipActive]}
                          activeOpacity={0.7}>
                          <Icon name="storefront" size={14} color={selectedStore === item.id ? theme.colors.white : theme.colors.textSecondary} />
                          <Text style={[styles.storeChipText, selectedStore === item.id && styles.storeChipTextActive]}>
                            {item.name || 'Todas'}
                          </Text>
                          {storeCount > 0 && (
                            <Text style={[styles.storeChipCount, selectedStore === item.id && styles.storeChipCountActive]}>
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
                      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
                      <Icon name="chevron-forward" size={20} color={primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* ═══ Feature Strip ═══ */}
            {renderFeatureStrip()}

            {/* ═══ Best Sellers Carousel ═══ */}
            {renderProductCarousel('Más vendidos', bestSellers, bestSellersRef)}

            {/* ═══ Offers Carousel ═══ */}
            {renderProductCarousel('Ofertas', offers, offersRef)}

            {/* ═══ All Products Title ═══ */}
            <Text style={styles.sectionTitle}>
              {hasActiveFilters ? 'Resultados' : 'Todos los productos'}
            </Text>

            {/* ═══ Login Prompt (guests with cart items) ═══ */}
            {renderLoginPrompt()}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadProducts()} />
          ) : (
            <EmptyState
              icon="search-outline"
              title={searchQuery ? 'Sin resultados' : 'No hay productos'}
              message={
                searchQuery
                  ? `No encontramos resultados para "${searchQuery}". Intenta con otra búsqueda.`
                  : selectedStore
                    ? 'Esta tienda no tiene productos disponibles.'
                    : 'Aún no hay productos disponibles. ¡Vuelve pronto!'
              }
            />
          )
        }
        renderItem={({item}) => (
          <ProductCard
            product={item}
            onPress={handleProductPress}
            containerStyle={styles.productCard}
          />
        )}
      />
    </SafeAreaView>
  );
};

const createStyles = (primary) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mainScroll: {
    paddingBottom: theme.spacing.xxl,
  },
  // ─── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    height: 40,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    height: 40,
    padding: 0,
    marginLeft: 6,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  loginBtnText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  logo: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  logoImage: {
    width: 90,
    height: 40,
  },
  // ─── Category Cards (with images) ────────────────────────────────────
  categorySection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  categoryList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  categoryCard: {
    alignItems: 'center',
    width: 72,
  },
  categoryCardActive: {
    // Active state handled per-sub-element
  },
  categoryImageWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  categoryImageWrapActive: {
    borderColor: primary,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapActive: {
    backgroundColor: primary,
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: primary,
    fontWeight: '700',
  },
  // ─── Feature Strip ───────────────────────────────────────────────────
  featureStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.sm,
  },
  featureItem: {
    alignItems: 'center',
    gap: 4,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // ─── Banner Carousel ─────────────────────────────────────────────────
  bannerCarousel: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    height: 160,
    position: 'relative',
    backgroundColor: theme.colors.inputBg,
  },
  bannerSlide: {
    width: Dimensions.get('window').width - theme.spacing.md * 2,
    height: 160,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  bannerDots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  bannerDotActive: {
    backgroundColor: theme.colors.white,
    width: 18,
  },
  // ─── Banner Progress Bar (subtle) ──────────────────────────────────
  bannerProgressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 48,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    zIndex: 10,
    overflow: 'hidden',
  },
  bannerProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
  },
  // ─── Carousel ───────────────────────────────────────────────────────
  carouselSection: {
    marginBottom: theme.spacing.md,
  },
  carouselTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  carouselList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  carouselCard: {
    width: 150,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  carouselImageContainer: {
    width: 150,
    height: 120,
    position: 'relative',
    backgroundColor: theme.colors.inputBg,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  outOfStockText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  carouselDiscountBadge: {
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
    shadowRadius: 3,
    elevation: 3,
  },
  carouselDiscountText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  carouselInfo: {
    padding: theme.spacing.sm,
  },
  carouselName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  carouselPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carouselPrice: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: primary,
  },
  carouselOldPrice: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    textDecorationLine: 'line-through',
  },
  // ─── Section title ──────────────────────────────────────────────────
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  // ─── Login Prompt ───────────────────────────────────────────────────
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  loginPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  loginPromptText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  loginPromptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  loginPromptBtnText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  // ─── Filters ────────────────────────────────────────────────────────
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  chipScrollWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Store filter
  storeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
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
    color: primary,
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
    color: primary,
    fontWeight: '600',
  },
  storeFilterContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
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
    backgroundColor: primary,
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
  // ─── Product Grid ──────────────────────────────────────────────────
  productList: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  row: {
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  productCard: {
    flex: 1,
    maxWidth: '48%',
  },
});

export default HomeScreen;
