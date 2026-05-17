export type DrillMechanic = 'stance' | 'load' | 'power_position' | 'slot' | 'balance_at_contact' | 'full_swing';

export interface Drill {
  id: string;
  name: string;
  mechanic: DrillMechanic;
  level: string;
  whyItHelps: string;
  steps: string[];
  successCue: string;
}

export const drills: Drill[] = [
  // Stance drills
  {
    id: 'athletic-position-check',
    name: 'Athletic Position Check',
    mechanic: 'stance',
    level: 'Beginner',
    whyItHelps: 'Establishes proper balance and readiness to move in any direction',
    steps: [
      'Stand with feet shoulder-width apart',
      'Slight bend in knees, weight on balls of feet',
      'Chest up, shoulders relaxed',
      'Hold for 10 seconds, repeat 5 times'
    ],
    successCue: 'Feel balanced and ready to move in any direction'
  },
  {
    id: 'grip-pressure-drill',
    name: 'Grip Pressure Drill',
    mechanic: 'stance',
    level: 'Beginner',
    whyItHelps: 'Develops consistent grip pressure for better bat control',
    steps: [
      'Hold bat with normal grip',
      'Squeeze firmly for 3 seconds',
      'Relax to comfortable pressure',
      'Check that bat feels secure but not tense',
      'Repeat 10 times'
    ],
    successCue: 'Grip feels secure but hands stay relaxed'
  },
  {
    id: 'balance-point-find',
    name: 'Balance Point Find',
    mechanic: 'stance',
    level: 'Beginner',
    whyItHelps: 'Helps find optimal weight distribution for power and stability',
    steps: [
      'Get in batting stance',
      'Lift front foot slightly off ground',
      'Hold balance for 5 seconds',
      'Set foot down softly',
      'Repeat 8 times'
    ],
    successCue: 'Can hold balance without falling backward or forward'
  },
  // Load drills
  {
    id: 'rubber-band-load',
    name: 'Rubber Band Load',
    mechanic: 'load',
    level: 'Intermediate',
    whyItHelps: 'Creates proper separation and coil for power generation',
    steps: [
      'Attach resistance band to fence at shoulder height',
      'Hold other end in back hand',
      'Get in stance, begin load motion',
      'Feel stretch in band as you load back',
      'Hold load position for 2 seconds, repeat 12 times'
    ],
    successCue: 'Feel stretch and tension building in your core'
  },
  {
    id: 'hip-hinge-and-load',
    name: 'Hip Hinge and Load',
    mechanic: 'load',
    level: 'Intermediate',
    whyItHelps: 'Develops proper hip movement and weight shift timing',
    steps: [
      'Start in batting stance',
      'Push hips back slightly as you load',
      'Keep chest over back leg',
      'Feel weight shift to inside of back foot',
      'Hold for 3 seconds, repeat 10 times'
    ],
    successCue: 'Feel loaded and ready to explode forward'
  },
  {
    id: 'hand-separation-at-load',
    name: 'Hand Separation at Load',
    mechanic: 'load',
    level: 'Advanced',
    whyItHelps: 'Creates proper hand and bat position for optimal swing path',
    steps: [
      'Get in stance with normal grip',
      'Begin load, feeling hands move back',
      'Keep hands close to back shoulder',
      'Bat should angle slightly toward pitcher',
      'Hold position, check in mirror, repeat 15 times'
    ],
    successCue: 'Hands feel connected to back shoulder, bat in launch position'
  },
  // Power Position drills
  {
    id: 'post-stride-drill',
    name: 'Post-Stride Drill',
    mechanic: 'power_position',
    level: 'Intermediate',
    whyItHelps: 'Develops strong foundation and proper weight distribution at contact',
    steps: [
      'Take normal stride and freeze',
      'Check front foot is planted firmly',
      'Weight should be 60-40 front to back',
      'Hips should be starting to open',
      'Hold for 5 seconds, repeat 8 times'
    ],
    successCue: 'Feel strong and balanced, ready to rotate'
  },
  {
    id: 'back-leg-push-drill',
    name: 'Back Leg Push Drill',
    mechanic: 'power_position',
    level: 'Advanced',
    whyItHelps: 'Teaches proper weight shift and power generation from ground up',
    steps: [
      'Get in power position (post-stride)',
      'Push hard off back leg',
      'Drive weight toward front leg',
      'Feel back leg straighten and push',
      'Repeat explosive movement 12 times'
    ],
    successCue: 'Feel powerful push from back leg driving rotation'
  },
  {
    id: 'hip-fire-drill',
    name: 'Hip Fire Drill',
    mechanic: 'power_position',
    level: 'Advanced',
    whyItHelps: 'Develops explosive hip rotation for maximum power transfer',
    steps: [
      'Start in power position',
      'Fire hips open explosively',
      'Keep shoulders closed initially',
      'Feel separation between hips and shoulders',
      'Complete 10 explosive hip turns'
    ],
    successCue: 'Feel hips fire before shoulders, creating torque'
  },
  // Slot drills
  {
    id: 'attack-from-top-drill',
    name: 'Attack from the Top Drill',
    mechanic: 'slot',
    level: 'Intermediate',
    whyItHelps: 'Prevents casting and creates proper downward attack angle',
    steps: [
      'Start with hands in proper load position',
      'Begin swing by dropping hands down first',
      'Keep hands close to body',
      'Feel like you\'re chopping wood',
      'Practice slow motion 15 times'
    ],
    successCue: 'Hands drop first, then extend toward ball'
  },
  {
    id: 'engage-back-elbow',
    name: 'Engage the Back Elbow',
    mechanic: 'slot',
    level: 'Advanced',
    whyItHelps: 'Creates proper hand path and prevents dropping of back elbow',
    steps: [
      'Get in load position',
      'Focus on back elbow staying up',
      'Drive elbow down and forward',
      'Keep elbow ahead of hands initially',
      'Practice with slow swings 12 times'
    ],
    successCue: 'Back elbow leads the swing, hands follow'
  },
  {
    id: 'hand-path-a-to-c',
    name: 'Hand Path A to C',
    mechanic: 'slot',
    level: 'Advanced',
    whyItHelps: 'Develops direct hand path for consistent contact and power',
    steps: [
      'Set up cones: A (load position), C (contact point)',
      'Practice moving hands directly from A to C',
      'Avoid looping or casting motion',
      'Keep hands inside the ball',
      'Complete 20 slow practice swings'
    ],
    successCue: 'Hands travel shortest path from load to contact'
  },
  // Balance at Contact drills
  {
    id: 'chin-to-shoulder',
    name: 'Chin to Shoulder',
    mechanic: 'balance_at_contact',
    level: 'Beginner',
    whyItHelps: 'Maintains head stability and balance through contact',
    steps: [
      'Get in batting stance',
      'Rest chin lightly on front shoulder',
      'Take slow practice swings',
      'Keep chin in contact with shoulder',
      'Practice 15 slow swings'
    ],
    successCue: 'Head stays quiet and balanced through swing'
  },
  {
    id: 'still-head-contact',
    name: 'Still Head Contact',
    mechanic: 'balance_at_contact',
    level: 'Intermediate',
    whyItHelps: 'Improves contact consistency by maintaining visual stability',
    steps: [
      'Partner holds finger 2 feet away at eye level',
      'Focus on partner\'s finger throughout swing',
      'Take practice swings while staring at finger',
      'Head should not move off target',
      'Complete 10 focused swings'
    ],
    successCue: 'Can see finger clearly throughout entire swing'
  },
  {
    id: 'eyes-on-spot',
    name: 'Eyes on the Spot',
    mechanic: 'balance_at_contact',
    level: 'Beginner',
    whyItHelps: 'Develops visual discipline and head stability for better contact',
    steps: [
      'Place small target where ball would be at contact',
      'Get in batting stance',
      'Stare at target throughout swing motion',
      'Complete swing while maintaining focus',
      'Practice 12 swings with intense focus'
    ],
    successCue: 'Can see target clearly even after swing completion'
  },
  {
    id: 'high-finish',
    name: 'High Finish',
    mechanic: 'balance_at_contact',
    level: 'Intermediate',
    whyItHelps: 'Promotes proper extension and follow-through for power',
    steps: [
      'Take normal swing',
      'Focus on finishing with hands high',
      'Back elbow should be up by ear',
      'Weight should be on front leg',
      'Hold finish position for 3 seconds, repeat 10 times'
    ],
    successCue: 'Feel balanced with weight forward and hands high'
  },
  // Full Swing drill
  {
    id: 'controlled-aggressive',
    name: 'Controlled Aggressive',
    mechanic: 'full_swing',
    level: 'Advanced',
    whyItHelps: 'Combines all mechanics into one fluid, powerful motion',
    steps: [
      'Start with slow, controlled swings',
      'Focus on proper sequence: load, stride, rotate, contact, finish',
      'Gradually increase speed while maintaining control',
      'Stay aggressive but under control',
      'Complete 15 swings, building intensity'
    ],
    successCue: 'Swing feels powerful but completely under control'
  }
];

export function getDrillsByMechanic(mechanic: DrillMechanic): Drill[] {
  return drills.filter(drill => drill.mechanic === mechanic);
}

export function getDrillById(id: string): Drill | undefined {
  return drills.find(drill => drill.id === id);
}