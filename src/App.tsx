import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './hooks/useUser'
import { ThemeProvider } from './hooks/useTheme'
import { EspecesProvider } from './hooks/useEspeces'
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
import AdminEspeces from './pages/AdminEspeces'
// ── Piégeages ────────────────────────────────────────────────
import ListePiegeagesPage from './pages/ListePiegeagesPage'
import FormulairePiegeage from './pages/FormulairePiegeage'
import PiegeageDetail from './pages/PiegeageDetail'
import AdminTypesPieges from './pages/AdminTypesPieges'
import AdminAppats from './pages/AdminAppats'
import RapportPiegeagesPage from './pages/RapportPiegeagesPage'
import AdminSauvegardePage from './pages/AdminSauvegardePage'
import SupportPage from './pages/SupportPage'
import AdminSupportPage from './pages/AdminSupportPage'

function ModuleRoute({ allowed, children }: { allowed: boolean; children: JSX.Element }) {
  if (!allowed) return <Navigate to="/" replace />
  return children
}

function AppContent() {
  const { user, loading, hasModuleTraitement, hasModulePiegeage } = useUser()
  const [splashDone, setSplashDone] = useState(false)
  const initialLoadingRef = useRef(true)

  useEffect(() => {
    if (!loading) initialLoadingRef.current = false
  }, [loading])

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  const showSplash = !splashDone || (initialLoadingRef.current && loading)
  if (showSplash) return <SplashPage onDone={() => setSplashDone(true)} />

  return (
    <Routes>
      <Route path="/identification" element={user ? <Navigate to="/" replace /> : <IdentificationPage />} />
      <Route path="/" element={user ? <Layout /> : <Navigate to="/identification" replace />}>
        <Route index element={<CartePage />} />

        {/* Module Traitement */}
        <Route path="liste"                element={<ModuleRoute allowed={hasModuleTraitement}><ListePage /></ModuleRoute>} />
        <Route path="nouveau"              element={<ModuleRoute allowed={hasModuleTraitement}><FormulaireIntervention /></ModuleRoute>} />
        <Route path="observation/:id"      element={<ModuleRoute allowed={hasModuleTraitement}><ObservationDetail /></ModuleRoute>} />
        <Route path="observation/:id/edit" element={<ModuleRoute allowed={hasModuleTraitement}><FormulaireIntervention /></ModuleRoute>} />

        {/* Module Piégeage */}
        <Route path="piegeages"            element={<ModuleRoute allowed={hasModulePiegeage}><ListePiegeagesPage /></ModuleRoute>} />
        <Route path="piegeages/nouveau"    element={<ModuleRoute allowed={hasModulePiegeage}><FormulairePiegeage /></ModuleRoute>} />
        <Route path="piegeages/:id"        element={<ModuleRoute allowed={hasModulePiegeage}><PiegeageDetail /></ModuleRoute>} />
        <Route path="piegeages/:id/edit"   element={<ModuleRoute allowed={hasModulePiegeage}><FormulairePiegeage /></ModuleRoute>} />

        <Route path="stats"                element={<StatsPage />} />
        <Route path="profil"               element={<ProfilPage />} />
        <Route path="admin/donneurs"       element={<AdminDonneurs />} />
        <Route path="admin/types-pieges"   element={<AdminTypesPieges />} />
        <Route path="admin/appats"         element={<AdminAppats />} />
        <Route path="admin/especes"        element={<AdminEspeces />} />
        <Route path="admin/utilisateurs"   element={<AdminUtilisateurs />} />
        <Route path="admin/rapport"        element={<RapportPage />} />
        <Route path="admin/rapport-pieges" element={<RapportPiegeagesPage />} />
        <Route path="admin/sauvegarde"     element={<AdminSauvegardePage />} />

        {/* Support */}
        <Route path="support"              element={<SupportPage />} />
        <Route path="support/:id"          element={<SupportPage />} />
        <Route path="admin/support"        element={<AdminSupportPage />} />
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
          <EspecesProvider>
            <AppContent />
          </EspecesProvider>
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
