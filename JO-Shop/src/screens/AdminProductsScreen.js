import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Switch,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import apiService from '@services/api';
import {formatPrice} from '@utils/helpers';
import theme from '@theme/styles';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20;

const INITIAL_FORM = {
  name: '',
  description: '',
  price: '',
  image: '',
  thumbnail: '',
  stock: '',
  categoryId: '',
  active: true,
};

const EMPTY_FORM_ERRORS = {};

// ─── Component ────────────────────────────────────────────────────────────────
const AdminProductsScreen = () => {
  const navigation = useNavigation();

  // Data state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState(EMPTY_FORM_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  // Category picker
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const stockInputRef = useRef(null);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    try {
      const res = await apiService.fetchCategories();
      const list = Array.isArray(res) ? res : res.data || res.categories || [];
      setCategories(list);
    } catch (err) {
      console.warn('Failed to load categories:', err.message);
    }
  }, []);

  const loadProducts = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const res = await apiService.fetchProducts({
          page: pageNum,
          limit: PAGE_LIMIT,
          search: searchQuery || undefined,
        });

        const items = Array.isArray(res) ? res : res.data || [];
        const paginationData = res.pagination || null;

        if (pageNum === 1) {
          setProducts(items);
        } else {
          setProducts(prev => [...prev, ...items]);
        }

        setPagination(paginationData);
        setHasMore(
          paginationData
            ? pageNum < paginationData.totalPages
            : items.length >= PAGE_LIMIT,
        );
        setPage(pageNum);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [searchQuery],
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts(1);
  }, [searchQuery, loadProducts]);

  const handleRefresh = useCallback(() => {
    loadProducts(1, true);
  }, [loadProducts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !refreshing && hasMore) {
      loadProducts(page + 1);
    }
  }, [loadingMore, refreshing, hasMore, page, loadProducts]);

  // ─── Form Helpers ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFormErrors(EMPTY_FORM_ERRORS);
    setEditingProduct(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setModalVisible(true);
    setTimeout(() => nameInputRef.current?.focus(), 300);
  }, [resetForm]);

  const openEditModal = useCallback(product => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
      image: product.image || '',
      thumbnail: product.thumbnail || '',
      stock: product.stock != null ? String(product.stock) : '',
      categoryId: product.categoryId || product.category?.id || '',
      active: product.active !== false,
    });
    setFormErrors(EMPTY_FORM_ERRORS);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    resetForm();
  }, [resetForm]);

  const updateField = useCallback((field, value) => {
    setForm(prev => ({...prev, [field]: value}));
    setFormErrors(prev => ({...prev, [field]: undefined}));
  }, []);

  const getCategoryName = useCallback(
    categoryId => {
      if (!categoryId) return null;
      const cat = categories.find(c => c.id === categoryId);
      return cat ? cat.name : null;
    },
    [categories],
  );

  // ─── Validation ───────────────────────────────────────────────────────────

  const validateForm = useCallback(() => {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = 'El nombre es obligatorio';
    }

    if (!form.price.trim()) {
      errors.price = 'El precio es obligatorio';
    } else if (isNaN(Number(form.price)) || Number(form.price) < 0) {
      errors.price = 'Precio inválido';
    }

    if (
      form.stock.trim() &&
      (isNaN(Number(form.stock)) || Number(form.stock) < 0)
    ) {
      errors.stock = 'Stock inválido';
    }

    if (form.image.trim() && !isValidUrl(form.image.trim())) {
      errors.image = 'URL inválida';
    }

    if (form.thumbnail.trim() && !isValidUrl(form.thumbnail.trim())) {
      errors.thumbnail = 'URL inválida';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(Number(form.price)),
        image: form.image.trim() || null,
        thumbnail: form.thumbnail.trim() || null,
        stock: parseInt(Number(form.stock), 10) || 0,
        categoryId: form.categoryId || null,
        active: form.active,
      };

      if (editingProduct) {
        await apiService.updateProduct(editingProduct.id, payload);
      } else {
        await apiService.createProduct(payload);
      }

      closeModal();
      loadProducts(1, true);
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo guardar el producto');
    } finally {
      setSubmitting(false);
    }
  }, [form, editingProduct, validateForm, closeModal, loadProducts]);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    product => {
      Alert.alert(
        'Eliminar producto',
        `¿Estás seguro de que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await apiService.deleteProduct(product.id);
                setProducts(prev => prev.filter(p => p.id !== product.id));
              } catch (err) {
                Alert.alert('Error', err.message || 'No se pudo eliminar el producto');
              }
            },
          },
        ],
      );
    },
    [],
  );

  // ─── Toggle Active ────────────────────────────────────────────────────────

  const handleToggleActive = useCallback(
    product => {
      const newStatus = !product.active;
      const label = newStatus ? 'activar' : 'desactivar';

      Alert.alert(
        `${newStatus ? 'Activar' : 'Desactivar'} producto`,
        `¿Deseas ${label} "${product.name}"?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: newStatus ? 'Activar' : 'Desactivar',
            onPress: async () => {
              try {
                await apiService.updateProduct(product.id, {active: newStatus});
                setProducts(prev =>
                  prev.map(p =>
                    p.id === product.id ? {...p, active: newStatus} : p,
                  ),
                );
              } catch (err) {
                Alert.alert('Error', err.message || 'No se pudo actualizar el producto');
              }
            },
          },
        ],
      );
    },
    [],
  );

  // ─── Render Helpers ───────────────────────────────────────────────────────

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (error && products.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={56} color={theme.colors.accent} />
          <Text style={styles.emptyTitle}>Error al cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadProducts(1)}
            activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search-outline" size={56} color={theme.colors.textLight} />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>
            No se encontraron productos para "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="pricetag-outline" size={56} color={theme.colors.textLight} />
        <Text style={styles.emptyTitle}>Sin productos</Text>
        <Text style={styles.emptyText}>
          Agrega tu primer producto tocando el botón +
        </Text>
      </View>
    );
  }, [loading, error, products.length, searchQuery, loadProducts]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.footerText}>Cargando más...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderProductCard = useCallback(
    ({item}) => {
      const categoryName = getCategoryName(item.categoryId || item.category?.id);
      const isActive = item.active !== false;

      return (
        <View style={styles.card}>
          {/* Product thumbnail */}
          <View style={styles.cardImageContainer}>
            {item.thumbnail || item.image ? (
              <Image
                source={{uri: item.thumbnail || item.image}}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Icon
                  name="image-outline"
                  size={28}
                  color={theme.colors.textLight}
                />
              </View>
            )}
            {/* Active indicator */}
            <View
              style={[
                styles.activeIndicator,
                {backgroundColor: isActive ? theme.colors.success : theme.colors.textLight},
              ]}
            />
          </View>

          {/* Product info */}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <TouchableOpacity
                onPress={() => handleToggleActive(item)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Switch
                  value={isActive}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.success,
                  }}
                  thumbColor={theme.colors.white}
                  onValueChange={() => {}}
                  disabled
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>

            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.cardMeta}>
              {/* Stock */}
              <View style={styles.metaItem}>
                <Icon
                  name="cube-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.metaText,
                    item.stock === 0 && styles.metaTextDanger,
                  ]}>
                  {item.stock === 0 ? 'Agotado' : `Stock: ${item.stock}`}
                </Text>
              </View>

              {/* Category */}
              {categoryName ? (
                <View style={styles.metaItem}>
                  <Icon
                    name="folder-outline"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {categoryName}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Status badge */}
            {!isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactivo</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => openEditModal(item)}
              activeOpacity={0.7}>
              <Icon name="create-outline" size={18} color={theme.colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}>
              <Icon name="trash-outline" size={18} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [getCategoryName, handleToggleActive, openEditModal, handleDelete],
  );

  // ─── Render Category Picker ───────────────────────────────────────────────

  const renderCategoryPicker = useCallback(() => {
    const selectedName = getCategoryName(form.categoryId);

    return (
      <View style={styles.pickerWrapper}>
        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity
          style={[
            styles.pickerTrigger,
            formErrors.categoryId && styles.inputError,
          ]}
          onPress={() => setCategoryPickerVisible(true)}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.pickerText,
              !selectedName && styles.pickerPlaceholder,
            ]}
            numberOfLines={1}>
            {selectedName || 'Seleccionar categoría (opcional)'}
          </Text>
          <Icon
            name="chevron-down"
            size={18}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
        {formErrors.categoryId && (
          <Text style={styles.errorText}>{formErrors.categoryId}</Text>
        )}

        <Modal
          visible={categoryPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCategoryPickerVisible(false)}>
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setCategoryPickerVisible(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Seleccionar Categoría</Text>
                <TouchableOpacity
                  onPress={() => setCategoryPickerVisible(false)}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Icon
                    name="close"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* None option */}
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  !form.categoryId && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  updateField('categoryId', '');
                  setCategoryPickerVisible(false);
                }}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.pickerOptionText,
                    !form.categoryId && styles.pickerOptionTextSelected,
                  ]}>
                  Sin categoría
                </Text>
                {!form.categoryId && (
                  <Icon
                    name="checkmark"
                    size={20}
                    color={theme.colors.accent}
                  />
                )}
              </TouchableOpacity>

              <ScrollView
                style={styles.pickerList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.pickerOption,
                      form.categoryId === cat.id &&
                        styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      updateField('categoryId', cat.id);
                      setCategoryPickerVisible(false);
                    }}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.categoryId === cat.id &&
                          styles.pickerOptionTextSelected,
                      ]}>
                      {cat.name}
                    </Text>
                    {form.categoryId === cat.id && (
                      <Icon
                        name="checkmark"
                        size={20}
                        color={theme.colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }, [
    categoryPickerVisible,
    categories,
    form.categoryId,
    formErrors.categoryId,
    getCategoryName,
    updateField,
  ]);

  // ─── Render Form Modal ────────────────────────────────────────────────────

  const renderFormModal = useCallback(() => {
    const isEditing = !!editingProduct;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={closeModal}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </Text>
            <View style={{width: 28}} />
          </View>

          {/* Modal body */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets>
            {/* Preview thumbnail */}
            {(form.image || form.thumbnail) && (
              <View style={styles.imagePreview}>
                <Image
                  source={{uri: form.thumbnail || form.image}}
                  style={styles.imagePreviewThumb}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.imagePreviewRemove}
                  onPress={() => {
                    updateField('thumbnail', '');
                    updateField('image', '');
                  }}>
                  <Icon name="close-circle" size={22} color={theme.colors.accent} />
                </TouchableOpacity>
              </View>
            )}

            {/* Name */}
            <Text style={styles.label}>
              Nombre <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              ref={nameInputRef}
              style={[styles.input, formErrors.name && styles.inputError]}
              value={form.name}
              onChangeText={val => updateField('name', val)}
              placeholder="Nombre del producto"
              placeholderTextColor={theme.colors.textLight}
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
              maxLength={200}
            />
            {formErrors.name && (
              <Text style={styles.errorText}>{formErrors.name}</Text>
            )}

            {/* Description */}
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              ref={descriptionInputRef}
              style={[styles.input, styles.inputMultiline]}
              value={form.description}
              onChangeText={val => updateField('description', val)}
              placeholder="Descripción del producto"
              placeholderTextColor={theme.colors.textLight}
              returnKeyType="next"
              onSubmitEditing={() => priceInputRef.current?.focus()}
              maxLength={1000}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Price & Stock row */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>
                  Precio <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  ref={priceInputRef}
                  style={[
                    styles.input,
                    formErrors.price && styles.inputError,
                  ]}
                  value={form.price}
                  onChangeText={val => updateField('price', val)}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => stockInputRef.current?.focus()}
                />
                {formErrors.price && (
                  <Text style={styles.errorText}>{formErrors.price}</Text>
                )}
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Stock</Text>
                <TextInput
                  ref={stockInputRef}
                  style={[
                    styles.input,
                    formErrors.stock && styles.inputError,
                  ]}
                  value={form.stock}
                  onChangeText={val => updateField('stock', val)}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => imageInputRef.current?.focus()}
                />
                {formErrors.stock && (
                  <Text style={styles.errorText}>{formErrors.stock}</Text>
                )}
              </View>
            </View>

            {/* Image URL */}
            <Text style={styles.label}>URL de Imagen</Text>
            <TextInput
              ref={imageInputRef}
              style={[styles.input, formErrors.image && styles.inputError]}
              value={form.image}
              onChangeText={val => updateField('image', val)}
              placeholder="https://ejemplo.com/imagen.jpg"
              placeholderTextColor={theme.colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="next"
              onSubmitEditing={() => thumbnailInputRef.current?.focus()}
            />
            {formErrors.image && (
              <Text style={styles.errorText}>{formErrors.image}</Text>
            )}

            {/* Thumbnail URL */}
            <Text style={styles.label}>URL de Miniatura</Text>
            <TextInput
              ref={thumbnailInputRef}
              style={[styles.input, formErrors.thumbnail && styles.inputError]}
              value={form.thumbnail}
              onChangeText={val => updateField('thumbnail', val)}
              placeholder="https://ejemplo.com/miniatura.jpg"
              placeholderTextColor={theme.colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {formErrors.thumbnail && (
              <Text style={styles.errorText}>{formErrors.thumbnail}</Text>
            )}

            {/* Category picker */}
            {renderCategoryPicker()}

            {/* Active toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Producto activo</Text>
                <Text style={styles.toggleDescription}>
                  Los productos inactivos no se muestran en la tienda
                </Text>
              </View>
              <Switch
                value={form.active}
                onValueChange={val => updateField('active', val)}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.success,
                }}
                thumbColor={theme.colors.white}
              />
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}>
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }, [
    modalVisible,
    editingProduct,
    form,
    formErrors,
    submitting,
    closeModal,
    updateField,
    handleSubmit,
    renderCategoryPicker,
  ]);

  // ─── Main Render ──────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Productos</Text>
            <Text style={styles.headerSubtitle}>
              Administrar catálogo
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>Cargando productos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Productos</Text>
          <Text style={styles.headerSubtitle}>
            {products.length} producto{products.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={openCreateModal}
            hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Icon name="add-circle-outline" size={28} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon
            name="search"
            size={18}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
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
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon
                name="close-circle"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Product list */}
      <FlatList
        data={products}
        keyExtractor={item => String(item.id)}
        renderItem={renderProductCard}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={
          products.length === 0 ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openCreateModal}
        activeOpacity={0.85}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Icon name="add" size={28} color={theme.colors.white} />
      </TouchableOpacity>

      {/* Form modal */}
      {renderFormModal()}
    </SafeAreaView>
  );
};

// ─── Simple URL validator (inline to avoid import issues) ─────────────────────
function isValidUrl(string) {
  if (!string || typeof string !== 'string') return false;
  const pattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
  return pattern.test(string.trim());
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },

  // Loading
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  loaderText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

  // Search
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    height: 42,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    height: 42,
    padding: 0,
    ...Platform.select({ios: {paddingVertical: 2}}),
  },

  // List
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
    paddingTop: theme.spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },

  // Product card
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: 90,
    minHeight: 110,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardContent: {
    flex: 1,
    padding: theme.spacing.sm,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  cardPrice: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.accent,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  metaTextDanger: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  inactiveBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.accent + '18',
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.sm,
  },
  inactiveText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  cardActions: {
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.sm,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: '#3498DB',
  },
  deleteBtn: {
    backgroundColor: theme.colors.accent,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xxl,
    right: theme.spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
    elevation: 8,
  },

  // Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },

  // Image preview
  imagePreview: {
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
    position: 'relative',
  },
  imagePreviewThumb: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.inputBg,
  },
  imagePreviewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },

  // Form
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  required: {
    color: theme.colors.accent,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? theme.spacing.md + 2 : theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 46,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '08',
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rowItem: {
    flex: 1,
  },

  // Category picker
  pickerWrapper: {
    marginTop: theme.spacing.sm,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? theme.spacing.md + 2 : theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 46,
  },
  pickerText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  pickerPlaceholder: {
    color: theme.colors.textLight,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '60%',
    ...theme.shadows.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pickerList: {
    paddingHorizontal: theme.spacing.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.accent + '10',
  },
  pickerOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  pickerOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: '600',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  toggleDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },

  // Submit button
  submitButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    minHeight: 50,
    ...theme.shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
});

export default AdminProductsScreen;
