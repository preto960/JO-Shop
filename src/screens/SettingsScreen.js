import React, {useMemo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@context/AuthContext';
import {useConfig} from '@context/ConfigContext';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

const SECTIONS = [
  {
    id: 'appearance',
    title: 'Apariencia',
    description: 'Nombre, colores, logo y tema visual de la tienda',
    icon: 'color-palette-outline',
    adminOnly: true,
    gradient: ['#FF6B35', '#E94560'],
  },
  {
    id: 'storeMode',
    title: 'Modo de Tienda',
    description: 'Multi-tienda o tienda unica',
    icon: 'storefront-outline',
    adminOnly: true,
    gradient: ['#667EEA', '#764BA2'],
  },
  {
    id: 'banners',
    title: 'Banners de Publicidad',
    description: 'Gestiona banners promocionales del inicio',
    icon: 'images-outline',
    adminOnly: true,
    gradient: ['#F093FB', '#F5576C'],
  },
  {
    id: 'server',
    title: 'Servidor Backend',
    description: 'URL del servidor y conexion a la API',
    icon: 'server-outline',
    adminOnly: true,
    gradient: ['#4FACFE', '#00F2FE'],
  },
  {
    id: 'about',
    title: 'Acerca de',
    description: 'Version y datos de la aplicacion',
    icon: 'information-circle-outline',
    adminOnly: false,
    gradient: ['#A8E063', '#56AB2F'],
  },
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {isAdmin} = useAuth();
  const {primary} = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);

  const visibleSections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Configuracion</Text>
          </View>
          <View style={{width: 40}} />
        </View>

        <Text style={styles.subtitle}>
          Selecciona una seccion para configurar
        </Text>

        {/* Cards Grid */}
        <View style={styles.grid}>
          {visibleSections.map(section => (
            <TouchableOpacity
              key={section.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SettingsSection', {section: section.id})}>
              <View style={[styles.iconContainer, {backgroundColor: section.gradient[0] + '18'}]}>
                <Icon name={section.icon} size={28} color={section.gradient[0]} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {section.description}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = primary => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    lineHeight: 20,
  },
  grid: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  bottomSpacing: {
    height: theme.spacing.xxl,
  },
});

export default SettingsScreen;
