import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './hooks/useUser'
import { Spinner } from './components/UI'
import Layout from './components/Layout'
import IdentificationPage from './pages/IdentificationPage'
import CartePage from './pages/CartePage'
import ListePage from './pages/ListePage'
import FormulaireIntervention from './pages/FormulaireIntervention'
import ObservationDetail from './pages/ObservationDetail'
import StatsPage from './pages/StatsPage'
import ProfilPage from './pages/ProfilPage'
import AdminDonneurs from './pages/AdminDonneurs'
import AdminUtilisateurs from './pages/AdminUtilisateurs'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  if (loading) return (
    <div className="min-h-dvh bg-gray-900 flex items-center justify-center">
      <Spinner size={40} />
    </div>
  )
  if (!user) return <Navigate to="/identification" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useUser()
  return (
    <Routes>
      <Route
        path="/identification"
        element={user ? <Navigate to="/" replace /> : <IdentificationPage />}
      />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<CartePage />} />
        <Route path="liste"                    element={<ListePage />} />
        <Route path="nouveau"                  element={<FormulaireIntervention />} />
        <Route path="observation/:id"          element={<ObservationDetail />} />
        <Route path="observation/:id/edit"     element={<FormulaireIntervention />} />
        <Route path="stats"                    element={<StatsPage />} />
        <Route path="profil"                   element={<ProfilPage />} />
        <Route path="admin/donneurs"           element={<AdminDonneurs />} />
        <Route path="admin/utilisateurs"       element={<AdminUtilisateurs />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  )
}
