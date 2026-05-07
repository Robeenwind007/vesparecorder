import { useState, useEffect, useRef } from 'react'
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
// ── Piégeages ────────────────────────────────────────────────
import ListePiegeagesPage from './pages/ListePiegeagesPage'
import FormulairePiegeage from './pages/FormulairePiegeage'
import PiegeageDetail from './pages/PiegeageDetail'
import AdminTypesPieges from './pages/AdminTypesPieges'
import AdminAppats from './pages/AdminAppats'
import RapportPiegeagesPage from './pages/RapportPiegeagesPage'
import AdminSauvegardePage from './pages/AdminSauvegardePage'

function AppContent() {
  const { user, loading } = useUser()
  // Splash uniquement au démarrage initial : il s'affiche tant qu'il n'a jamais
  // été masqué. Une fois masqué, il ne se réaffichera plus jamais (même si
  // `loading` repasse à true lors de re-vérifications du user).
  const [splashDone, setSplashDone] = useState(false)
  const initialLoadingRef = useRef(true)

  // Marqueur : on a fini le tout premier chargement
  useEffect(() => {
    if (!loading) {
      initialLoadingRef.current = false
    }
  }, [loading])

  // Timer minimum d'affichage du splash (2.5s)
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  // Splash s'affiche uniquement au tout premier chargement, jamais après
  const showSplash = !splashDone || (initialLoadingRef.current && loading)

  if (showSplash) return <SplashPage onDone={() => setSplashDone(true)} />

  return (
    <Routes>
      <Route path="/identification" element={user ? <Navigate to="/" replace /> : <IdentificationPage />} />
      <Route path="/" element={user ? <Layout /> : <Navigate to="/identification" replace />}>
        <Route index element={<CartePage />} />
        <Route path="liste"                element={<ListePage />} />
        <Route path="nouveau"              element={<FormulaireIntervention />} />
        <Route path="observation/:id"      element={<ObservationDetail />} />
        <Route path="observation/:id/edit" element={<FormulaireIntervention />} />
        {/* ── Piégeages ── */}
        <Route path="piegeages"            element={<ListePiegeagesPage />} />
        <Route path="piegeages/nouveau"    element={<FormulairePiegeage />} />
        <Route path="piegeages/:id"        element={<PiegeageDetail />} />
        <Route path="piegeages/:id/edit"   element={<FormulairePiegeage />} />
        {/* ── Reste ── */}
        <Route path="stats"                element={<StatsPage />} />
        <Route path="profil"               element={<ProfilPage />} />
        <Route path="admin/donneurs"       element={<AdminDonneurs />} />
        <Route path="admin/types-pieges"   element={<AdminTypesPieges />} />
        <Route path="admin/appats"         element={<AdminAppats />} />
        <Route path="admin/utilisateurs"   element={<AdminUtilisateurs />} />
        <Route path="admin/rapport"        element={<RapportPage />} />
        <Route path="admin/rapport-pieges" element={<RapportPiegeagesPage />} />
        <Route path="admin/sauvegarde"     element={<AdminSauvegardePage />} />
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
