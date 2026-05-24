import { DrillCard, DrillMechanic, ExperienceLevel } from '../types/drill'

export const DRILLS: DrillCard[] = [
  // STANCE (3 drills)
  {
    id: 'stance-001',
    mechanic: 'stance',
    title: 'Athletic Stance Mirror Drill',
    description: 'Train your body to feel what a balanced, athletic stance actually is.',
    whyItHelps: 'Your stance is the foundation of everything. If your feet are too narrow, too wide, or your weight is in the wrong place, every mechanic after it gets harder. This drill builds the muscle memory for a consistent starting position so you stop thinking about your stance and start thinking about your swing.',
    setup: 'Just a mirror or phone camera. Works at home, no equipment needed.',
    steps: [
      'Stand in front of a mirror with your feet shoulder-width apart.',
      'Bend your knees slightly — like you\'re about to sit down but stopped halfway.',
      'Push your hips back so your weight is in the middle of your feet, not your toes.',
      'Let your arms hang naturally. Your hands should fall just inside your knees.',
      'Hold for 10 seconds. Check the mirror — you should look like an athlete, not a statue.'
    ],
    reps: 'Do this 10 times, holding each rep for 10 seconds. Do it before every cage session.',
    experience_level: 'beginner',
    videoUrl: undefined
  },
  {
    id: 'stance-002',
    mechanic: 'stance',
    title: 'Feet Width Check Drill',
    description: 'Find your ideal foot width so your hips have room to rotate.',
    whyItHelps: 'Foot width controls how much hip rotation you can generate. Too narrow and your hips get stuck. Too wide and you lose explosiveness. This drill helps you find the width that gives you full rotation without sacrificing balance.',
    setup: 'A bat for reference. Works in your backyard or the cage.',
    steps: [
      'Lay your bat on the ground horizontally in front of you.',
      'Step over it so each foot is on one side — this is roughly shoulder width.',
      'Take your stance and take a slow practice swing, paying attention to how your hips feel.',
      'Move your feet half an inch wider and swing again. Then half an inch narrower.',
      'Find the width where your hips rotate most freely. That\'s your width.'
    ],
    reps: 'Spend 5 minutes on this. Mark your foot positions with tape if you\'re in the cage.',
    experience_level: 'beginner',
    videoUrl: undefined
  },
  {
    id: 'stance-003',
    mechanic: 'stance',
    title: 'Weight Distribution Drill',
    description: 'Train your weight to start in the right place so your load is explosive.',
    whyItHelps: 'Where your weight starts determines where it can go. If you start on your heels or your toes, your load and stride are working against you from the beginning. This drill trains the feeling of balanced weight so your body is ready to explode into the pitch.',
    setup: 'Just your cleats or sneakers. Works anywhere.',
    steps: [
      'Take your batting stance and close your eyes.',
      'Rock slowly forward onto your toes. Feel how your balance shifts.',
      'Rock back onto your heels. Feel how different that is.',
      'Find the middle — weight in the balls of your feet, not toes, not heels.',
      'Open your eyes and take three slow practice swings from that balanced position.'
    ],
    reps: 'Do this at the start of every practice session before picking up a bat.',
    experience_level: 'intermediate',
    videoUrl: undefined
  },

  // LOAD (3 drills)
  {
    id: 'load-001',
    mechanic: 'load',
    title: 'Pause at Load Drill',
    description: 'Hold your load for 2 full counts so your hands learn to stay back.',
    whyItHelps: 'Most timing problems come from the hands starting too early. When you pause at the top of your load, you train your hands to stay back while your hips get ready to fire. This is the single most effective drill for fixing early extension and weak contact.',
    setup: 'Just a bat. Works at home, in the cage, or in the backyard.',
    steps: [
      'Take your stance and begin your normal load — shift your weight back, hands move back.',
      'At the top of your load, stop completely. Freeze.',
      'Count to two out loud: "one, two."',
      'Now fire your hips and swing through.',
      'The pause should feel awkward at first. That\'s correct — it means you were rushing before.'
    ],
    reps: 'Do 20 swings with the pause before every hitting session. Drop the pause after 20 and feel the difference.',
    experience_level: 'beginner',
    videoUrl: undefined
  },
  {
    id: 'load-002',
    mechanic: 'load',
    title: 'Tee Load Emphasis Drill',
    description: 'Hit off a tee with exaggerated load to build load timing into muscle memory.',
    whyItHelps: 'The tee removes the variable of the pitch so you can focus entirely on your load. By exaggerating the load movement on tee work, your body learns what a full, controlled load feels like — so when the pitcher throws, you do it automatically.',
    setup: 'Batting tee and a ball. Works in the cage or backyard.',
    steps: [
      'Set up your tee at belt height, middle of your strike zone.',
      'Take your stance and make an exaggerated load — really shift your weight back, really pull your hands back.',
      'Pause at the top for one count.',
      'Drive your front hip toward the pitcher and swing through the ball.',
      'Focus on the sequence: load → pause → hip → hands. In that order every time.'
    ],
    reps: 'Hit 30 balls off the tee focusing only on the load sequence. Quality over speed.',
    experience_level: 'intermediate',
    videoUrl: undefined
  },
  {
    id: 'load-003',
    mechanic: 'load',
    title: 'Hand Path Load Drill',
    description: 'Train your hands to load straight back, not up or around.',
    whyItHelps: 'Where your hands go during the load determines your swing path. Hands that drift up or loop around during the load create a long, inefficient path to the ball. This drill locks in a short, direct hand path so your swing stays compact and powerful.',
    setup: 'A bat and a wall. Stand about 18 inches from the wall.',
    steps: [
      'Stand in your stance with your back shoulder about 18 inches from a wall.',
      'Begin your load and move your hands back toward the wall.',
      'Your hands should move straight back — not up, not in a loop.',
      'If your hands or bat hit the wall, your load path is going somewhere it shouldn\'t.',
      'Adjust until you can complete your load without touching the wall.'
    ],
    reps: 'Do 15 slow-motion loads focusing only on the hand path. No swinging — just the load.',
    experience_level: 'advanced',
    videoUrl: undefined
  },

  // POWER POSITION (3 drills)
  {
    id: 'power-001',
    mechanic: 'power_position',
    title: 'Hip Hinge Drill',
    description: 'Learn to push your hips back so your body coils properly before contact.',
    whyItHelps: 'The power position is about creating tension between your upper and lower body. When your hips hinge back correctly during the load, you store energy like a spring. This drill trains that hip hinge so you stop losing power before the swing even starts.',
    setup: 'A wall behind you. Stand about 6 inches away from it.',
    steps: [
      'Take your stance with your back hip about 6 inches from the wall.',
      'Push your back hip back toward the wall without turning.',
      'Feel your weight shift to the inside of your back foot.',
      'Your back knee should stay over your foot — don\'t let it collapse inward.',
      'Hold for 2 seconds, return to center, repeat.'
    ],
    reps: 'Do 15 reps slow and controlled. Focus on feeling the tension in your back hip and glute.',
    experience_level: 'beginner',
    videoUrl: undefined
  },
  {
    id: 'power-002',
    mechanic: 'power_position',
    title: 'Separation Drill',
    description: 'Train your hips to fire before your hands so you generate real power.',
    whyItHelps: 'Power in a baseball swing comes from separation — your hips turning while your hands stay back. Most hitters lose power because their hands and hips move at the same time. This drill teaches your body to sequence the movement correctly: hips first, hands second.',
    setup: 'A bat. Works in the cage, backyard, or in front of a mirror.',
    steps: [
      'Take your stance and complete your load.',
      'Now turn your front hip toward the pitcher as hard as you can — but keep your hands completely still.',
      'Hold your hands back as long as possible while your hips open up.',
      'Only after your hips are fully open, let your hands come through.',
      'The swing should feel like two separate movements at first. That\'s correct.'
    ],
    reps: 'Do 20 slow-motion swings focusing entirely on the hip-hands sequence. Speed comes later.',
    experience_level: 'intermediate',
    videoUrl: undefined
  },
  {
    id: 'power-003',
    mechanic: 'power_position',
    title: 'Power Position Freeze Drill',
    description: 'Freeze at the power position to feel where your body should be at heel strike.',
    whyItHelps: 'The power position is a specific moment — front heel hitting the ground, weight loaded on back hip, hands back, hips closed. Most hitters blow through this position without ever learning what it feels like. Freezing here builds body awareness so you can find it automatically in a game.',
    setup: 'Just a bat. Use a mirror if possible.',
    steps: [
      'Take your stance and begin your stride.',
      'When your front foot lands, freeze completely.',
      'Check your position: weight on back hip, hands back, front foot closed, hips closed.',
      'Hold for 3 seconds and look in the mirror.',
      'If anything is off, reset and try again before finishing the swing.'
    ],
    reps: 'Do 15 reps, freezing at landing every time. Only add the finish swing when the freeze position feels right.',
    experience_level: 'intermediate',
    videoUrl: undefined
  },

  // SLOT (3 drills)
  {
    id: 'slot-001',
    mechanic: 'slot',
    title: 'Towel Drill',
    description: 'Keep your lead arm close to your body so your bat stays on the right path.',
    whyItHelps: 'Getting your bat into the slot means keeping your lead elbow tight to your body as you start the downswing. When the elbow flies out, your bat goes around the ball instead of through it. The towel creates pressure that forces your elbow to stay in the right position.',
    setup: 'A small towel and a bat. Tuck the towel under your lead arm.',
    steps: [
      'Fold a small towel and tuck it firmly under your lead armpit.',
      'Take your normal stance.',
      'Begin your swing and try to keep the towel from falling out.',
      'If the towel drops during your downswing, your elbow is flying out.',
      'Repeat until you can complete 10 swings without the towel dropping.'
    ],
    reps: 'Do 20 swings with the towel. Then remove it and try to replicate the same feeling.',
    experience_level: 'beginner',
    videoUrl: undefined
  },
  {
    id: 'slot-002',
    mechanic: 'slot',
    title: 'Inside-Out Path Drill',
    description: 'Train your bat path to go inside the ball so you hit line drives not pop-ups.',
    whyItHelps: 'An inside-out swing path is what produces hard contact to all fields. When your bat comes from the outside or casts around the ball, you get weak contact and pull everything foul. This drill trains the feeling of letting the ball travel and hitting it with an inside-out path.',
    setup: 'A batting tee. Set it on the inside corner of the plate.',
    steps: [
      'Set your tee on the inside corner at belt height.',
      'Take your stance and focus on keeping your hands inside the ball.',
      'Think about hitting the inside half of the ball — the half closest to you.',
      'Your swing should feel like you\'re hitting the ball to the opposite field.',
      'Watch where the ball goes — line drive to the opposite field means your path is right.'
    ],
    reps: 'Hit 20 balls focusing only on hitting the inside half. Ignore where the ball goes at first.',
    experience_level: 'intermediate',
    videoUrl: undefined
  },
  {
    id: 'slot-003',
    mechanic: 'slot',
    title: 'Short Bat Slot Drill',
    description: 'Use a short bat to feel the correct slot position without casting.',
    whyItHelps: 'A shorter bat makes it impossible to cast because the leverage works against you. By training with a short bat or choke up dramatically, your body learns to keep the barrel back and let the hands lead — which is exactly what getting into the slot requires.',
    setup: 'Choke up 8-10 inches on your bat or use a training bat. Batting tee optional.',
    steps: [
      'Choke up dramatically — hands near the barrel — or use a short training bat.',
      'Take your normal stance and load.',
      'Make a swing focusing on keeping the barrel back as long as possible.',
      'Your hands should lead the barrel through the zone.',
      'If it feels like your hands are way ahead of the barrel, you\'re doing it right.'
    ],
    reps: 'Do 15 swings with the choked-up grip, then move your hands back to normal and try to replicate the feeling.',
    experience_level: 'advanced',
    videoUrl: undefined
  },

  // BALANCE AT CONTACT (3 drills)
  {
    id: 'balance-001',
    mechanic: 'balance_at_contact',
    title: 'Hold Your Finish Drill',
    description: 'Hold your follow-through for 3 seconds to train balance through contact.',
    whyItHelps: 'If you can\'t hold your finish, you lost your balance somewhere in the swing. Most hitters fall off or lunge forward without realizing it. Holding your finish for 3 seconds forces your body to find balance — and over time, you find it earlier and earlier in the swing.',
    setup: 'Just a bat. Works anywhere.',
    steps: [
      'Take your normal swing.',
      'When you reach your follow-through, stop and hold the position completely still.',
      'Count to three out loud: "one, two, three."',
      'Check your balance — weight should be on your front foot, back toe barely touching the ground.',
      'If you can\'t hold it, you rushed or lunged. Reset and try again.'
    ],
    reps: 'Do every swing this way for one full batting practice session. It will feel slow. That\'s the point.',
    experience_level: 'beginner',
    videoUrl: undefined
  },
  {
    id: 'balance-002',
    mechanic: 'balance_at_contact',
    title: 'One-Legged Finish Drill',
    description: 'Balance on your front leg after contact to build rotational stability.',
    whyItHelps: 'The best hitters in the world can hold a one-legged finish because their weight transfer is controlled and their rotation is complete. This drill exposes any lunging, early weight shift, or loss of posture immediately — and fixes it by making balance a requirement, not a suggestion.',
    setup: 'Just a bat. Start without a ball until the movement feels controlled.',
    steps: [
      'Take your normal swing.',
      'At contact, pick your back foot completely off the ground.',
      'Hold your finish balanced entirely on your front leg.',
      'Your back foot should lift naturally — don\'t force it up before contact.',
      'If you tip over, your weight shifted too early or you lunged at the ball.'
    ],
    reps: 'Do 15 swings lifting the back foot. Once you can hold it consistently, add a tee.',
    experience_level: 'intermediate',
    videoUrl: undefined
  },
  {
    id: 'balance-003',
    mechanic: 'balance_at_contact',
    title: 'Soft Toss Balance Drill',
    description: 'Stay balanced through a real pitch by focusing on your finish, not the ball.',
    whyItHelps: 'It\'s easy to stay balanced in slow-motion drills. The real test is when someone\'s tossing you a ball and your instinct is to lunge at it. This drill puts you in a real hitting situation while keeping balance as the primary focus — which is how balance becomes automatic in a game.',
    setup: 'A partner for soft toss, or a tee if no partner available.',
    steps: [
      'Get in the batter\'s box with a partner tossing from the side.',
      'Before each toss, remind yourself: "finish balanced."',
      'Swing at each toss and hold your finish for 2 full seconds.',
      'After each swing, your partner tells you: balanced or not balanced.',
      'If you lost balance, identify when — early weight shift, lunge at contact, or rushing the load.'
    ],
    reps: 'Take 25 soft toss swings with the 2-second hold. Focus entirely on the finish, not where the ball goes.',
    experience_level: 'advanced',
    videoUrl: undefined
  }
]

// Helper Functions

/**
 * Get all drills for a specific mechanic
 */
export function getDrillsByMechanic(mechanic: DrillMechanic): DrillCard[] {
  return DRILLS.filter(drill => drill.mechanic === mechanic)
}

/**
 * Get drills filtered by experience level
 */
export function getDrillsByExperienceLevel(level: ExperienceLevel): DrillCard[] {
  return DRILLS.filter(drill => drill.experience_level === level)
}

/**
 * Get the best drill for carousel slot 1 (matches mechanic + experience level)
 * Returns the first drill found that matches both criteria, or the first drill for the mechanic if no level match
 */
export function getDrillForMechanic(mechanic: DrillMechanic, level: ExperienceLevel): DrillCard {
  const mechanicDrills = getDrillsByMechanic(mechanic)
  const matchingDrill = mechanicDrills.find(drill => drill.experience_level === level)

  // Return the level-matched drill, or fall back to the first drill for this mechanic
  return matchingDrill || mechanicDrills[0]
}

/**
 * Get random drills from mechanics OTHER than the specified one (for carousel slots 2-5)
 */
export function getRandomDrillsExcluding(mechanic: DrillMechanic, count: number): DrillCard[] {
  const otherDrills = DRILLS.filter(drill => drill.mechanic !== mechanic)

  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...otherDrills]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}