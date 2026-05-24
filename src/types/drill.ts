export interface DrillCard {
  id: string
  mechanic: 'stance' | 'load' | 'power_position' | 'slot' | 'balance_at_contact'
  title: string           // short name for carousel card
  description: string     // ONE sentence, coaching voice, ~80 chars max — for carousel Row 3
  whyItHelps: string      // 2-3 sentences, Darian's voice — for detail screen
  setup: string           // one line — what you need and where
  steps: string[]         // 3-5 steps as array — MUST be array not string
  reps: string            // full sentence — "Do this 10 times before your next session."
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  videoUrl?: string       // optional — null until Darian records
}

export type DrillMechanic = 'stance' | 'load' | 'power_position' | 'slot' | 'balance_at_contact'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'