const STORAGE_KEY = 'life-path-dark-mode'

export function useDarkMode() {
  const isDark = ref(false)

  function load() {
    if (import.meta.server) return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      isDark.value = stored === 'true'
    }
    else {
      // 跟隨系統偏好
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  function toggle() {
    isDark.value = !isDark.value
    if (!import.meta.server) {
      localStorage.setItem(STORAGE_KEY, String(isDark.value))
    }
    applyTheme()
  }

  function applyTheme() {
    if (import.meta.server) return
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  }

  load()

  return {
    isDark: readonly(isDark),
    toggle
  }
}
