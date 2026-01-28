import type { GlobalThemeOverrides } from 'naive-ui'

export function useNaiveTheme() {
  const themeOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#D4A5A5',
      primaryColorHover: '#E8C5C5',
      primaryColorPressed: '#B88888',
      primaryColorSuppl: '#D4A5A5',
      infoColor: '#A7C4D4',
      infoColorHover: '#BDD4E3',
      successColor: '#8FB996',
      successColorHover: '#A8CCAF',
      warningColor: '#E8C4A2',
      warningColorHover: '#F0D4B8',
      errorColor: '#D4A5A5',
      errorColorHover: '#E8C5C5',
      textColorBase: '#5D4E4E',
      textColor1: '#5D4E4E',
      textColor2: '#5D4E4E',
      textColor3: '#9E8E8E',
      textColorDisabled: '#9E8E8E',
      placeholderColor: '#9E8E8E',
      borderColor: '#E8DDD5',
      dividerColor: '#E8DDD5',
      inputColor: '#FFFBF8',
      modalColor: '#FFFBF8',
      cardColor: '#FFFBF8',
      popoverColor: '#FFFBF8',
      tableColor: '#FFFBF8',
      bodyColor: '#FDF8F5',
      borderRadius: '14px',
      borderRadiusSmall: '10px',
      fontFamily: "'Noto Sans TC', sans-serif",
      fontFamilyMono: "'Noto Sans TC', sans-serif"
    },
    Button: {
      fontWeight: '500',
      borderRadiusMedium: '14px',
      borderRadiusLarge: '14px',
      heightMedium: '40px',
      heightLarge: '48px',
      paddingMedium: '0 20px',
      paddingLarge: '0 24px',
      colorPrimary: '#D4A5A5',
      colorHoverPrimary: '#E8C5C5',
      colorPressedPrimary: '#B88888',
      colorFocusPrimary: '#E8C5C5',
      textColorPrimary: '#5D4E4E',
      textColorHoverPrimary: '#5D4E4E',
      textColorPressedPrimary: '#5D4E4E',
      textColorFocusPrimary: '#5D4E4E'
    },
    Select: {
      peers: {
        InternalSelection: {
          borderRadius: '14px',
          heightMedium: '44px',
          fontSizeMedium: '15px',
          textColor: '#5D4E4E',
          placeholderColor: '#9E8E8E',
          border: '2px solid #E8DDD5',
          borderHover: '2px solid #D4A5A5',
          borderActive: '2px solid #D4A5A5',
          borderFocus: '2px solid #D4A5A5',
          boxShadowActive: '0 0 0 2px rgba(212, 165, 165, 0.2)',
          boxShadowFocus: '0 0 0 2px rgba(212, 165, 165, 0.2)',
          color: '#FFFBF8',
          colorActive: '#FFFBF8'
        },
        InternalSelectMenu: {
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(93, 78, 78, 0.12)',
          color: '#FFFBF8',
          optionTextColor: '#5D4E4E',
          optionTextColorActive: '#5D4E4E',
          optionColorPending: 'rgba(212, 165, 165, 0.15)',
          optionColorActive: 'rgba(212, 165, 165, 0.25)',
          optionCheckColor: '#D4A5A5'
        }
      }
    },
    Card: {
      borderRadius: '18px',
      color: 'rgba(255, 251, 248, 0.85)',
      borderColor: '#E8DDD5',
      titleFontSizeSmall: '16px',
      titleFontSizeMedium: '18px',
      titleFontSizeLarge: '20px',
      titleFontSizeHuge: '22px',
      titleTextColor: '#5D4E4E',
      boxShadow: '0 4px 20px rgba(93, 78, 78, 0.08)'
    },
    Tag: {
      borderRadius: '20px',
      heightSmall: '24px',
      heightMedium: '28px',
      fontSizeSmall: '12px',
      fontSizeMedium: '13px',
      padding: '0 12px',
      colorPrimary: 'rgba(212, 165, 165, 0.15)',
      colorInfo: 'rgba(167, 196, 212, 0.2)',
      colorSuccess: 'rgba(143, 185, 150, 0.2)',
      colorWarning: 'rgba(232, 196, 162, 0.25)',
      colorError: 'rgba(212, 165, 165, 0.2)',
      textColorPrimary: '#B88888',
      textColorInfo: '#6A9AB0',
      textColorSuccess: '#6A9A73',
      textColorWarning: '#C4966A',
      textColorError: '#B88888',
      border: 'none'
    },
    Collapse: {
      titleFontSize: '15px',
      titleFontWeight: '500',
      titleTextColor: '#5D4E4E',
      arrowColor: '#9E8E8E',
      dividerColor: '#E8DDD5',
      itemMargin: '8px 0 0 0'
    }
  }

  return {
    themeOverrides
  }
}
