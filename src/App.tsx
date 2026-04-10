import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './hooks/useUser'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/Layout'
import SplashPage from './pages/SplashPage'
import IdentificationPage from './pages/IdentificationPage'
import CartePage from './pages/CartePage'
import ListePage from './pages/ListePage'
import FormulaireIntervention from './pages/FormulaireIntervention'
import ObservationDetail from './pages/ObservationDetail'
import StatsPage from './pages/StatsPage'
import ProfilPage from './pages/ProfilPage'
import AdminDonneurs from './pages/AdminDonneurs'
import AdminUtilisateurs from './pages/AdminUtilisateurs'
import RapportPage from './pages/RapportPage'

function AppContent() {
  const { user, loading } = useUser()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (showSplash || loading) return <SplashPage onDone={() => setShowSplash(false)} />

  return (
    <Routes>
      <Route path="/identification" element={user ? <Navigate to="/" replace /> : <IdentificationPage />} />
      <Route path="/" element={user ? <Layout /> : <Navigate to="/identification" replace />}>
        <Route index element={<CartePage />} />
        <Route path="liste"                element={<ListePage />} />
        <Route path="nouveau"              element={<FormulaireIntervention />} />
        <Route path="observation/:id"      element={<ObservationDetail />} />
        <Route path="observation/:id/edit" element={<FormulaireIntervention />} />
        <Route path="stats"                element={<StatsPage />} />
        <Route path="profil"               element={<ProfilPage />} />
        <Route path="admin/donneurs"       element={<AdminDonneurs />} />
        <Route path="admin/utilisateurs"   element={<AdminUtilisateurs />} />
        <Route path="admin/rapport"        element={<RapportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
