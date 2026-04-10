// ============================================================
// useTheme — gestion du thème clair/sombre/système
// Stocké dans localStorage par utilisateur
// ============================================================
import { useState, useEffect, createContext, useContext } from 'react'

export type Theme = 'dark' | 'light' | 'system'

interface ThemeCtx {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {}
})

const LS_KEY = 'vespa_theme'

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'dark' | 'light') {
  const html = document.documentElement
  if (resolved === 'light') {
    html.classList.add('light')
    html.classList.remove('dark')
  } else {
    html.classList.remove('light')
    html.classList.add('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(LS_KEY) as Theme) ?? 'dark'
  })

  const resolvedTheme: 'dark' | 'light' =
    theme === 'system' ? getSystemTheme() : theme

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  // Écouter les changements système si mode 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t: Theme) => {
    _setTheme(t)
    localStorage.setItem(LS_KEY, t)
    const resolved = t === 'system' ? getSystemTheme() : t
    applyTheme(resolved)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
