import {useConfig} from '@context/ConfigContext';
import theme from '@theme/styles';

/**
 * Hook that returns the dynamic theme colors from the admin config.
 * Falls back to the static theme colors when no config is available.
 *
 * - primary: The main brand color (configurable via admin settings)
 *   -> defaults to theme.colors.accent (#E94560) when not set
 * - accent: The secondary brand color (configurable via admin settings)
 *   -> defaults to theme.colors.accentLight (#FF6B81) when not set
 */
const useThemeColors = () => {
  const {config} = useConfig();

  return {
    primary: config.primary_color || theme.colors.accent,
    accent: config.accent_color || theme.colors.accentLight,
  };
};

export default useThemeColors;
