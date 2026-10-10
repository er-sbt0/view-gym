// Guesses exercise, muscle groups and equipment from a video title using keyword rules.
// Every name produced here must appear in PRESETS (enforced by test/infer.test.js).

// Each exercise lists the phrases that identify it, plus the muscles and equipment it
// implies when the title doesn't say otherwise. Phrases are matched as whole words after
// normalization (lowercase, "&" → "and", punctuation/hyphens → spaces), with an optional
// plural "s" — so "pull up" also matches "Pull-Ups".
const EXERCISES = [
  // Olympic weightlifting
  { name: 'Clean and Jerk', phrases: ['clean and jerk', 'c and j', 'cnj'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Power Clean', phrases: ['power clean', 'hang power clean'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Hang Clean', phrases: ['hang clean'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Clean', phrases: ['clean', 'squat clean', 'clean pull'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Power Snatch', phrases: ['power snatch', 'hang power snatch'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Hang Snatch', phrases: ['hang snatch'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Snatch', phrases: ['snatch', 'squat snatch', 'snatch pull'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Jerk', phrases: ['jerk', 'split jerk', 'push jerk', 'power jerk'], muscles: ['Shoulders', 'Triceps', 'Quads'], equipment: ['Barbell'] },
  { name: 'Overhead Squat', phrases: ['overhead squat', 'ohs'], muscles: ['Quads', 'Glutes', 'Shoulders', 'Core'], equipment: ['Barbell'] },
  { name: 'Thruster', phrases: ['thruster'], muscles: ['Full Body'], equipment: ['Barbell'] },
  { name: 'Kettlebell Swing', phrases: ['kettlebell swing', 'kb swing'], muscles: ['Glutes', 'Hamstrings', 'Core'], equipment: ['Kettlebell'] },

  // Squat / hinge
  { name: 'Front Squat', phrases: ['front squat'], muscles: ['Quads', 'Glutes', 'Core'], equipment: ['Barbell'] },
  { name: 'Bulgarian Split Squat', phrases: ['bulgarian split squat', 'bulgarian', 'bss'], muscles: ['Quads', 'Glutes'], equipment: ['Dumbbell'] },
  { name: 'Squat', phrases: ['squat', 'back squat'], muscles: ['Quads', 'Glutes'], equipment: ['Barbell'] },
  { name: 'Romanian Deadlift', phrases: ['romanian deadlift', 'rdl'], muscles: ['Hamstrings', 'Glutes'], equipment: ['Barbell'] },
  { name: 'Deadlift', phrases: ['deadlift', 'sumo deadlift', 'conventional deadlift'], muscles: ['Back', 'Hamstrings', 'Glutes'], equipment: ['Barbell'] },
  { name: 'Hip Thrust', phrases: ['hip thrust'], muscles: ['Glutes'], equipment: ['Barbell'] },
  { name: 'Lunge', phrases: ['lunge'], muscles: ['Quads', 'Glutes'], equipment: ['Dumbbell'] },
  { name: 'Leg Press', phrases: ['leg press'], muscles: ['Quads', 'Glutes'], equipment: ['Machine'] },

  // Push
  { name: 'Incline Bench Press', phrases: ['incline bench press', 'incline bench', 'incline press'], muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Barbell'] },
  { name: 'Bench Press', phrases: ['bench press', 'bench'], muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Barbell'] },
  { name: 'Overhead Press', phrases: ['overhead press', 'ohp', 'military press', 'shoulder press'], muscles: ['Shoulders', 'Triceps'], equipment: ['Barbell'] },
  { name: 'Lateral Raise', phrases: ['lateral raise', 'side raise'], muscles: ['Shoulders'], equipment: ['Dumbbell'] },
  { name: 'Dip', phrases: ['dip'], muscles: ['Chest', 'Triceps'], equipment: ['Bodyweight'] },
  { name: 'Tricep Extension', phrases: ['tricep extension', 'triceps extension', 'skull crusher', 'tricep pushdown', 'triceps pushdown'], muscles: ['Triceps'], equipment: [] },

  // Pull
  { name: 'Pull-up', phrases: ['pull up', 'pullup'], muscles: ['Back', 'Biceps'], equipment: ['Bodyweight'] },
  { name: 'Chin-up', phrases: ['chin up', 'chinup'], muscles: ['Back', 'Biceps'], equipment: ['Bodyweight'] },
  { name: 'Barbell Row', phrases: ['barbell row', 'bent over row', 'pendlay row'], muscles: ['Back'], equipment: ['Barbell'] },
  { name: 'Dumbbell Row', phrases: ['dumbbell row', 'db row', 'one arm row', 'single arm row'], muscles: ['Back'], equipment: ['Dumbbell'] },
  { name: 'Lat Pulldown', phrases: ['lat pulldown', 'pulldown', 'pull down'], muscles: ['Back', 'Biceps'], equipment: ['Cable'] },
  { name: 'Bicep Curl', phrases: ['bicep curl', 'biceps curl', 'hammer curl', 'preacher curl', 'dumbbell curl', 'barbell curl'], muscles: ['Biceps'], equipment: [] },

  // Core
  { name: 'Plank', phrases: ['plank'], muscles: ['Core'], equipment: ['Bodyweight'] },
];

const EQUIPMENT = [
  { name: 'Smith Machine', phrases: ['smith machine', 'smith'] },
  { name: 'EZ Bar', phrases: ['ez bar', 'ez curl bar'] },
  { name: 'Trap Bar', phrases: ['trap bar', 'hex bar'] },
  { name: 'Barbell', phrases: ['barbell'] },
  { name: 'Dumbbell', phrases: ['dumbbell', 'db'] },
  { name: 'Kettlebell', phrases: ['kettlebell', 'kb'] },
  { name: 'Cable', phrases: ['cable'] },
  { name: 'Machine', phrases: ['machine'] },
  { name: 'Bodyweight', phrases: ['bodyweight', 'calisthenics'] },
  { name: 'Bands', phrases: ['band', 'resistance band'] },
];

const MUSCLES = [
  { name: 'Chest', phrases: ['chest', 'pec'] },
  { name: 'Back', phrases: ['lat', 'back day', 'back workout', 'upper back', 'lower back'] },
  { name: 'Shoulders', phrases: ['shoulder', 'delt'] },
  { name: 'Biceps', phrases: ['bicep', 'biceps'] },
  { name: 'Triceps', phrases: ['tricep', 'triceps'] },
  { name: 'Forearms', phrases: ['forearm', 'grip strength'] },
  { name: 'Core', phrases: ['core', 'abs', 'oblique'] },
  { name: 'Quads', phrases: ['quad', 'quadricep'] },
  { name: 'Hamstrings', phrases: ['hamstring', 'hammy'] },
  { name: 'Glutes', phrases: ['glute', 'booty'] },
  { name: 'Calves', phrases: ['calf', 'calves'] },
  { name: 'Full Body', phrases: ['full body'] },
];

function normalize(text) {
  return ` ${String(text || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

function phraseRe(phrase) {
  return new RegExp(` ${phrase}s? `);
}

// Compile once: each rule gets regexes for its phrases.
const compile = (rules) => rules.map((r) => ({ ...r, res: r.phrases.map(phraseRe) }));
const EXERCISE_RULES = compile(EXERCISES);
const EQUIPMENT_RULES = compile(EQUIPMENT);
const MUSCLE_RULES = compile(MUSCLES);

// Earliest match in the title, preferring the longer phrase at the same position.
function firstMatch(rule, text) {
  let best = null;
  for (const re of rule.res) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length))) {
      best = { index: m.index, length: m[0].length, re };
    }
  }
  return best;
}

// The exercise named first in the title wins ("Squat vs Deadlift" → Squat); at the same
// position the longer phrase wins ("Clean and Jerk" over "Clean").
function inferExercise(text) {
  let best = null;
  for (const rule of EXERCISE_RULES) {
    const m = firstMatch(rule, text);
    if (m && (!best || m.index < best.index || (m.index === best.index && m.length > best.length))) {
      best = { ...m, rule };
    }
  }
  return best;
}

// Names of every rule that matches. Each hit is blanked out before trying later rules,
// so "Smith Machine" doesn't also tag "Machine".
function matchAll(rules, text) {
  const out = [];
  let rest = text;
  for (const rule of rules) {
    const hit = rule.res.find((re) => re.test(rest));
    if (hit) {
      out.push(rule.name);
      rest = rest.replace(hit, ' ');
    }
  }
  return out;
}

export function inferTags(title) {
  const text = normalize(title);
  const match = inferExercise(text);
  const exercise = match?.rule;
  const namedEquipment = matchAll(EQUIPMENT_RULES, text);
  // Look for muscles outside the exercise phrase, so "Back Squat" doesn't tag Back.
  const rest = match ? text.replace(match.re, ' ') : text;
  const muscles = [...new Set([...(exercise?.muscles ?? []), ...matchAll(MUSCLE_RULES, rest)])];
  return {
    exercise: exercise?.name ?? '',
    muscles,
    // Equipment named in the title overrides the exercise's default ("Dumbbell Bench Press").
    equipment: namedEquipment.length ? namedEquipment : [...(exercise?.equipment ?? [])],
  };
}

export const INFERABLE = {
  exercises: EXERCISES.map((r) => r.name),
  muscles: [...new Set([...MUSCLES.map((r) => r.name), ...EXERCISES.flatMap((r) => r.muscles)])],
  equipment: [...new Set([...EQUIPMENT.map((r) => r.name), ...EXERCISES.flatMap((r) => r.equipment)])],
};
