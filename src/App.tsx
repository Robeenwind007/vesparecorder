import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './hooks/useUser'
import { ThemeProvider } from './hooks/useTheme'
import { EspecesProvider } from './hooks/useEspeces'
import Layout from './components/Layout'
import SplashPage from './pages/SplashPage'
import { Spinner } from './components/UI'

// Lazy load — chaque page est dans un chunk séparé
const IdentificationPage    = lazy(() => import('./pages/IdentificationPage'))
const CartePage             = lazy(() => import('./pages/CartePage'))
const ListePage             = lazy(() => import('./pages/ListePage'))
const FormulaireIntervention= lazy(() => import('./pages/FormulaireIntervention'))
const ObservationDetail     = lazy(() => import('./pages/ObservationDetail'))
const StatsPage             = lazy(() => import('./pages/StatsPage'))
const ProfilPage            = lazy(() => import('./pages/ProfilPage'))
const AdminDonneurs         = lazy(() => import('./pages/AdminDonneurs'))
const AdminUtilisateurs     = lazy(() => import('./pages/AdminUtilisateurs'))
const RapportPage           = lazy(() => import('./pages/RapportPage'))
const AdminEspeces          = lazy(() => import('./pages/AdminEspeces'))
const AdminFaq              = lazy(() => import('./pages/AdminFaq'))
// Piégeages
const ListePiegeagesPage    = lazy(() => import('./pages/ListePiegeagesPage'))
const FormulairePiegeage    = lazy(() => import('./pages/FormulairePiegeage'))
const PiegeageDetail        = lazy(() => import('./pages/PiegeageDetail'))
const AdminTypesPieges      = lazy(() => import('./pages/AdminTypesPieges'))
const AdminAppats           = lazy(() => import('./pages/AdminAppats'))
const RapportPiegeagesPage  = lazy(() => import('./pages/RapportPiegeagesPage'))
const AdminSauvegardePage   = lazy(() => import('./pages/AdminSauvegardePage'))
const SupportPage           = lazy(() => import('./pages/SupportPage'))
const AdminSupportPage      = lazy(() => import('./pages/AdminSupportPage'))

// Fallback pendant le chargement d'une page lazy
const PageLoader = () => (
  <div className="flex items-center justify-center h-full bg-gray-900">
    <Spinner size={32} />
  </div>
)

function ModuleRoute({ allowed, children }: { allowed: boolean; children: JSX.Element }) {
  if (!allowed) return <Navigate to="/" replace />
  return children
}

function AppContent() {
  const { user, hasModuleTraitement, hasModulePiegeage } = useUser()
  // Splash : montré au plus une fois par session (sessionStorage = effacé quand l'onglet ferme)
  const [splashDone, setSplashDone] = useState(() => {
    try { return sessionStorage.getItem('vespa_splash_done') === '1' }
    catch { return false }
  })

  useEffect(() => {
    if (splashDone) return
    const timer = setTimeout(() => {
      setSplashDone(true)
      try { sessionStorage.setItem('vespa_splash_done', '1') } catch {}
    }, 2500)
    return () => clearTimeout(timer)
  }, [splashDone])

  const showSplash = !splashDone
  if (showSplash) return <SplashPage onDone={() => {
    setSplashDone(true)
    try { sessionStorage.setItem('vespa_splash_done', '1') } catch {}
  }} />

  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="admin/faq"            element={<AdminFaq />} />
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
    </Suspense>
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
