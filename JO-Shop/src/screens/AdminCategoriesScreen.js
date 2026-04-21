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
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import apiService from '@services/api';
import theme from '@theme/styles';

const AdminCategoriesScreen = () => {
  const navigation = useNavigation();
  const nameInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await apiService.fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err.message);
      setError('No se pudieron cargar las categorías. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, []);

  // ── Validation ──────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    const trimmedName = formName.trim();
    const trimmedImage = formImage.trim();

    if (!trimmedName) {
      errors.name = 'El nombre es obligatorio';
    } else if (trimmedName.length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (trimmedName.length > 60) {
      errors.name = 'El nombre no puede exceder 60 caracteres';
    }

    if (trimmedImage && !/^https?:\/\/.+/.test(trimmedImage)) {
      errors.image = 'Ingresa una URL válida (http:// o https://)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Open / Close modal ──────────────────────────────────────
  const openCreateModal = () => {
    setIsEditing(false);
    setEditingCategory(null);
    setFormName('');
    setFormImage('');
    setFormErrors({});
    setModalVisible(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const openEditModal = (category) => {
    setIsEditing(true);
    setEditingCategory(category);
    setFormName(category.name || '');
    setFormImage(category.image || '');
    setFormErrors({});
    setModalVisible(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalVisible(false);
    setFormName('');
    setFormImage('');
    setFormErrors({});
    setEditingCategory(null);
    setIsEditing(false);
  };

  // ── Submit (create / update) ────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      name: formName.trim(),
      image: formImage.trim() || null,
    };

    try {
      setSubmitting(true);

      if (isEditing && editingCategory) {
        await apiService.updateCategory(editingCategory.id, payload);
      } else {
        await apiService.createCategory(payload);
      }

      closeModal();
      loadCategories(true);
    } catch (err) {
      console.error('Error saving category:', err.message);
      Alert.alert(
        'Error',
        err.message || 'No se pudo guardar la categoría. Intenta de nuevo.',
        [{text: 'OK'}],
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = (category) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Estás seguro de eliminar "${category.name}"?${
        category._count?.products
          ? `\n\nEsta categoría tiene ${category._count.products} producto(s) asociado(s).`
          : ''
      }`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteCategory(category.id);
              loadCategories(true);
            } catch (err) {
              console.error('Error deleting category:', err.message);
              Alert.alert(
                'Error',
                err.message || 'No se pudo eliminar la categoría.',
                [{text: 'OK'}],
              );
            }
          },
        },
      ],
    );
  };

  // ── Render helpers ──────────────────────────────────────────
  const renderCategoryCard = ({item}) => (
    <View style={styles.card}>
      {/* Image thumbnail or placeholder */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <View style={[styles.imagePlaceholder, {backgroundColor: '#FDE8EC'}]}>
            <Icon name="image-outline" size={28} color={theme.colors.accent} />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="folder-outline" size={28} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardSlug} numberOfLines={1}>
          {item.slug || '—'}
        </Text>
        <View style={styles.productCountBadge}>
          <Icon name="pricetag-outline" size={12} color={theme.colors.textSecondary} />
          <Text style={styles.productCountText}>
            {item._count?.products || 0} producto{(item._count?.products || 0) !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}>
          <Icon name="create-outline" size={20} color="#3498DB" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}>
          <Icon name="trash-outline" size={20} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="folder-open-outline" size={56} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>Sin categorías</Text>
      <Text style={styles.emptySubtitle}>
        Pulsa el botón + para agregar tu primera categoría
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Icon name="alert-circle-outline" size={56} color={theme.colors.accent} />
      <Text style={styles.emptyTitle}>Error de conexión</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => loadCategories()} activeOpacity={0.8}>
        <Text style={styles.retryBtnText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Form label helper ───────────────────────────────────────
  const renderFieldLabel = (label, fieldName) => (
    <Text style={styles.fieldLabel}>
      {label}
      {formErrors[fieldName] && (
        <Text style={styles.fieldError}> {formErrors[fieldName]}</Text>
      )}
    </Text>
  );

  // ── Main render ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categorías</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorías</Text>
        <Text style={styles.headerCount}>{categories.length}</Text>
      </View>

      {/* List */}
      {error && !categories.length ? (
        renderError()
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCategoryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!error ? renderEmpty : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCategories(true)}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openCreateModal}
        activeOpacity={0.85}>
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeModal} activeOpacity={1} />
          <View style={styles.modalContent}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Editar categoría' : 'Nueva categoría'}
              </Text>
              <TouchableOpacity onPress={closeModal} activeOpacity={0.7} disabled={submitting}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Name field */}
              <View style={styles.fieldGroup}>
                {renderFieldLabel('Nombre', 'name')}
                <TextInput
                  ref={nameInputRef}
                  style={[styles.textInput, formErrors.name && styles.inputError]}
                  value={formName}
                  onChangeText={(text) => {
                    setFormName(text);
                    if (formErrors.name) setFormErrors((prev) => ({...prev, name: undefined}));
                  }}
                  placeholder="Ej. Electrónica"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={60}
                  editable={!submitting}
                  returnKeyType="next"
                  onSubmitEditing={() => imageInputRef.current?.focus()}
                />
              </View>

              {/* Image URL field */}
              <View style={styles.fieldGroup}>
                {renderFieldLabel('URL de imagen (opcional)', 'image')}
                <TextInput
                  ref={imageInputRef}
                  style={[styles.textInput, formErrors.image && styles.inputError]}
                  value={formImage}
                  onChangeText={(text) => {
                    setFormImage(text);
                    if (formErrors.image) setFormErrors((prev) => ({...prev, image: undefined}));
                  }}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!submitting}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </ScrollView>

            {/* Modal footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={closeModal}
                activeOpacity={0.8}
                disabled={submitting}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit, submitting && styles.modalBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>
                    {isEditing ? 'Guardar cambios' : 'Crear categoría'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  headerRight: {
    width: 40,
  },
  headerCount: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

  // List
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl + 70,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  imageContainer: {
    marginRight: theme.spacing.md,
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  cardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardSlug: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  productCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  productCountText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty / Error states
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  retryBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: theme.colors.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnCancel: {
    backgroundColor: '#F0F2F5',
  },
  modalBtnCancelText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modalBtnSubmit: {
    backgroundColor: theme.colors.accent,
  },
  modalBtnDisabled: {
    opacity: 0.65,
  },
  modalBtnSubmitText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Form fields
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  fieldError: {
    color: theme.colors.accent,
    fontWeight: '400',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.inputBg || '#F0F2F5',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.accent,
  },
});

export default AdminCategoriesScreen;
