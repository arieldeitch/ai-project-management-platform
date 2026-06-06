/**
 * Standalone validation script — no browser, no Dexie.
 * Imports seed.ts directly and extracts target project values.
 * Run: npx tsx scripts/validate-seed.mts
 */

// Resolve @/ alias manually — seed.ts only uses a `type` import so we can supply it inline
type ProjectCreateInput = Record<string, unknown>

// Re-export the array from seed without the alias import
const SEED_PROJECTS: ProjectCreateInput[] = (
  await import('../data/seed.ts' as string).catch(() => import('../data/seed.js'))
).SEED_PROJECTS

const TARGETS = [
  'פלטפורמת ניהול למידת AI',      // "AI Learning Management Platform"
  'אפליקציית הזדמנויות תעסוקה',   // "Employment Opportunities App"
  'סוכן כתיבת אפליקציות',         // "App Writing Agent"
  // "Family Flow" — search by partial match
]

const FAMILY_FLOW_SEARCH = ['family', 'flow', 'משפחה', 'זרימה', 'Family Flow']

console.log('=== SEED VALIDATION — Content Extraction ===\n')
console.log(`Total seed entries: ${SEED_PROJECTS.length}\n`)

// Find exact targets
for (const target of TARGETS) {
  const p = SEED_PROJECTS.find((p) => p.name === target)
  if (!p) {
    console.log(`❌ NOT FOUND: "${target}"`)
    continue
  }
  console.log(`✅ PROJECT: ${p.name}`)
  console.log(`   description : ${p.description}`)
  console.log(`   goal        : ${p.goal}`)
  console.log(`   next_action : ${p.next_action}`)
  console.log(`   status      : ${p.status}`)
  console.log()
}

// Search for "Family Flow" under any name
console.log('--- Search for "Family Flow" ---')
const familyHits = SEED_PROJECTS.filter((p) =>
  FAMILY_FLOW_SEARCH.some((term) =>
    JSON.stringify(p).toLowerCase().includes(term.toLowerCase())
  )
)
if (familyHits.length === 0) {
  console.log('❌ No project found matching "Family Flow" under any field or language')
} else {
  for (const p of familyHits) {
    console.log(`  MATCH: ${p.name}`)
    console.log(`    description : ${p.description}`)
    console.log(`    goal        : ${p.goal}`)
    console.log(`    next_action : ${p.next_action}`)
  }
}

// English content scan on all seed entries
console.log('\n--- English Content Scan ---')
const ENGLISH_TERMS = [
  'Structured', 'Define', 'Family tool', 'Learning tracks',
  'Job market', 'Career profiles', 'Activate only', 'Opportunity',
  'Tracking and managing',
]

let found = false
for (const p of SEED_PROJECTS) {
  const flat = JSON.stringify(p)
  for (const term of ENGLISH_TERMS) {
    if (flat.toLowerCase().includes(term.toLowerCase())) {
      console.log(`⚠️  ENGLISH FOUND in "${p.name}": matched "${term}"`)
      found = true
    }
  }
}
if (!found) {
  console.log('✅ None of the specified English terms found in any seed entry')
}

console.log('\n=== END ===')
