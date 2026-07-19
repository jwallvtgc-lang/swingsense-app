export interface SupabaseDrill {
  id: string
  name: string
  mechanic: DrillMechanic | null
  secondary_mechanics: DrillMechanic[] | null
  modalities: string[]
  foundation: string
  setup: string
  focus_points: string
  finish_reminders: string
  purpose: string
  video_url: string | null
  experience_level: ExperienceLevel
  created_at: string
}

export interface DrillCard {
  id: string
  mechanic: DrillMechanic | null
  title: string
  description: string
  whyItHelps: string
  setup: string
  steps: string[]
  reps: string
  experience_level: ExperienceLevel
  videoUrl?: string
}

export function mapSupabaseDrillToCard(d: SupabaseDrill): DrillCard {
  const parts = d.focus_points.split('. ')
  const steps = parts
    .map((p, i) => (i < parts.length - 1 ? p + '.' : p))
    .filter(s => s.trim().length > 0)

  return {
    id: d.id,
    mechanic: d.mechanic,
    title: d.name,
    description: d.foundation,
    whyItHelps: d.purpose,
    setup: d.setup,
    steps,
    reps: d.finish_reminders,
    experience_level: d.experience_level,
    videoUrl: d.video_url ?? undefined,
  }
}

export type DrillMechanic = 'Stance' | 'Load & Stride' | 'Power Position' | 'Slot' | 'Balance/Extension' | 'Multi'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'all'
