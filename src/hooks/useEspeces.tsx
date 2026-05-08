// ============================================================
// useEspeces — contexte React qui charge les espèces depuis la BDD
// Charge une fois au démarrage et expose helpers et listes
// ============================================================
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { getEspeces } from '../lib/especes'
import type { EspeceParam } from '../types'
import { ESPECE_COLORS_DEFAUT } from '../types'

interface EspecesCtx {
  especes: EspeceParam[]              // Liste des espèces actives, triée par ordre
  noms: string[]                      // Liste des noms uniquement (pour <select>)
  couleurs: Record<string, string>    // map nom → couleur hex
  loading: boolean
  reload: () => Promise<void>         // À appeler après ajout/modif depuis admin
  getColor: (nom: string) => string   // Helper avec fallback
}

const EspecesContext = createContext<EspecesCtx>({
  especes: [], noms: [], couleurs: {},
  loading: true, reload: async () => {},
  getColor: (n) => ESPECE_COLORS_DEFAUT[n] ?? '#D97706',
})

export function EspecesProvider({ children }: { children: React.ReactNode }) {
  const [especes, setEspeces] = useState<EspeceParam[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getEspeces()
    setEspeces(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const noms     = especes.map(e => e.nom)
  const couleurs = Object.fromEntries(especes.map(e => [e.nom, e.couleur]))

  const getColor = (nom: string): string =>
    couleurs[nom] ?? ESPECE_COLORS_DEFAUT[nom] ?? '#D97706'

  return (
    <EspecesContext.Provider value={{
      especes, noms, couleurs, loading, reload: load, getColor,
    }}>
      {children}
    </EspecesContext.Provider>
  )
}

export const useEspeces = () => useContext(EspecesContext)
