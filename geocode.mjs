// geocode.mjs — À lancer UNE SEULE FOIS depuis ~/Desktop/Apps/vesparecorder
// Géocode toutes les observations sans lat/lng via Nominatim (OSM, gratuit)
// Usage : node geocode.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://tvozrqsgrcwyrpxebwih.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2b3pycXNncmN3eXJweGVid2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzIzNjEsImV4cCI6MjA5MTIwODM2MX0.qSBJjZpvGSb_AFpWw-UmZtD14cTRBfLj9lhYVkdKWUs'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Nominatim exige 1 requête/seconde max
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function geocode(adresse) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1&countrycodes=fr`
  const res  = await fetch(url, {
    headers: { 
      'Accept-Language': 'fr',
      'User-Agent': 'VespaRecorder/2.0 (obernard@herculepro.com)'
    }
  })
  const json = await res.json()
  if (!json.length) return null
  return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) }
}

async function main() {
  console.log('🐝 Vespa Recorder — Géocodage en masse\n')

  // Récupérer toutes les observations sans coordonnées
  const { data: obs, error } = await supabase
    .from('observations')
    .select('id, adresse')
    .is('latitude', null)
    .not('adresse', 'is', null)

  if (error) { console.error('Erreur Supabase:', error); process.exit(1) }
  console.log(`📋 ${obs.length} observations à géocoder\n`)

  let ok = 0, echec = 0

  for (let i = 0; i < obs.length; i++) {
    const { id, adresse } = obs[i]
    process.stdout.write(`[${i+1}/${obs.length}] ${adresse} ... `)

    const coords = await geocode(adresse)

    if (coords) {
      await supabase
        .from('observations')
        .update({ latitude: coords.lat, longitude: coords.lng, origine_localisation: 'Adresse' })
        .eq('id', id)
      console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
      ok++
    } else {
      console.log('❌ non trouvée')
      echec++
    }

    // Respecter la limite Nominatim : 1 req/sec
    await sleep(1100)
  }

  console.log(`\n✅ Géocodées : ${ok}`)
  console.log(`❌ Échecs    : ${echec}`)
  console.log('\n🗺️  Rechargez la carte dans l\'app !')
}

main()
