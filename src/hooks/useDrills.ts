import { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { mapSupabaseDrillToCard } from '../types/drill'
import type { DrillCard, DrillMechanic, SupabaseDrill } from '../types/drill'

export function useDrills() {
  const [drills, setDrills] = useState<DrillCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    supabase
      .from('drills')
      .select('*')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) {
          setError(new Error(err.message))
        } else {
          setDrills((data as SupabaseDrill[]).map(mapSupabaseDrillToCard))
        }
        setLoading(false)
      })
  }, [])

  return { drills, loading, error }
}

export function useDrillsByMechanic(mechanic: DrillMechanic | 'all') {
  const { drills, loading, error } = useDrills()
  const filtered = mechanic === 'all' ? drills : drills.filter(d => d.mechanic === mechanic)
  return { drills: filtered, loading, error }
}

export function useDrillById(id: string) {
  const [drill, setDrill] = useState<DrillCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('drills')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError(new Error(err.message))
        } else {
          setDrill(mapSupabaseDrillToCard(data as SupabaseDrill))
        }
        setLoading(false)
      })
  }, [id])

  return { drill, loading, error }
}
