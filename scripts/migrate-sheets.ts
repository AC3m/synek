import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'
import { z } from 'zod'
import {
  parseISO,
  startOfISOWeek,
  getISOWeekYear,
  getISOWeek,
  format,
  getDay,
} from 'date-fns'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Environment & config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ATHLETE_ID = process.env.ATHLETE_ID
const CSV_PATH = path.resolve('.data/googleSheetData.csv')

// Week plans that were migrated manually — skip entirely (no upsert, no sessions)
const EXCLUDED_WEEK_PLAN_IDS = new Set([
  'dfb6dfbf-66de-4672-b5af-3f65e69f422d',
  'ee4291f7-22d2-49d2-9f38-e3b97fe901e3',
])

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ATHLETE_ID) {
  console.error(
    'Missing required env vars: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ATHLETE_ID',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TrainingType =
  | 'run'
  | 'cycling'
  | 'strength'
  | 'yoga'
  | 'mobility'
  | 'swimming'
  | 'rest_day'
  | 'other'

type LoadType = 'easy' | 'medium' | 'hard'

type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

interface CsvRow {
  'TYDZIEŃ': string
  'DATA': string
  'D.T.': string
  'OPIS': string
  'UWAGI TRENERA:': string
  'UWagi trenera po wykonanym treningu': string
  'Obciążenie: (niskie/średnie /wysokie)': string
  'KM ZAPLANOWANE:': string
  'KM ZREALIZOWANE:': string
  'ŁĄCZNY CZAS TRENINGU Z CAŁEGO TYGODNIA:': string
  'ŁĄCZNY CZAS TRENINGU Z DANEGO DNIA': string
  'TĘTNO ŚREDNIE': string
  'TĘTNO MAX': string
  'ZMĘCZENIE 1-10': string
  '': string
  'CZAS': string
  'DYSTANS': string
  'TEMPO': string
  'RODZAJ': string
  'UWAGI ZAWODNIKA:': string
  'Waga:': string
}

interface ValidatedSession {
  date: string
  weekStart: string
  year: number
  weekNumber: number
  dayOfWeek: DayOfWeek
  trainingType: TrainingType
  description: string | null
  coachComments: string | null
  coachPostFeedback: string | null
  actualDurationMinutes: number | null
  actualDistanceKm: number | null
  actualPace: string | null
  avgHeartRate: number | null
  maxHeartRate: number | null
  rpe: number | null
  athleteNotes: string | null
  isCompleted: boolean
  sortOrder: number
}

interface ValidatedWeek {
  weekStart: string
  year: number
  weekNumber: number
  loadType: LoadType | null
  totalPlannedKm: number | null
  actualTotalKm: number | null
}

interface ValidationError {
  row: number
  date: string
  reason: string
}

// ---------------------------------------------------------------------------
// T012: Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse HH:MM:SS / H:MM:SS / MM:SS / just minutes to total minutes.
 * Handles data-entry quirks like "44:43:00" meaning 44m 43s.
 */
function parseDuration(str: string): number | null {
  const s = str.trim()
  if (!s) return null

  const parts = s.split(':')

  if (parts.length === 1) {
    // Plain number — treat as minutes
    const n = parseFloat(parts[0])
    return isNaN(n) ? null : Math.round(n)
  }

  if (parts.length === 2) {
    const a = parseInt(parts[0], 10)
    const b = parseInt(parts[1], 10)
    if (isNaN(a) || isNaN(b)) return null
    // If both parts ≤ 59 it's MM:SS, else H:MM
    if (a <= 59 && b <= 59) return a // just minutes portion of MM:SS
    return a * 60 + b
  }

  if (parts.length === 3) {
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    const sec = parseInt(parts[2], 10)
    if (isNaN(h) || isNaN(m) || isNaN(sec)) return null
    // If hours >= 24 it's a data-entry error: treat as MM:SS:xx
    if (h >= 24) {
      return Math.round((h * 60 + m) / 60) // h=minutes, m=seconds → convert
    }
    const totalMin = h * 60 + m + Math.round(sec / 60)
    if (totalMin > 600) {
      console.warn(`  ⚠ Suspicious duration "${str}" → ${totalMin} min`)
    }
    return totalMin
  }

  return null
}

/** Parse "9,00", "12km", "21.12", "Przebiegnięte Km: 65,4 (wg Strava)" → float km.
 * Extracts only the first numeric token to avoid concatenating digits from
 * time strings (e.g. "1:18:39" → 11839) that would overflow DECIMAL(6,2). */
function parseDistance(str: string): number | null {
  const normalised = str.trim().replace(',', '.')
  const match = normalised.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const n = parseFloat(match[0])
  if (isNaN(n) || n > 9999) return null
  return n
}

/** Normalise pace separators ("6;05" → "6:05") and pass through */
function parsePace(str: string): string | null {
  const s = str.trim().replace(';', ':')
  return s || null
}

/** Parse integer heart rate */
function parseHr(str: string): number | null {
  const s = str.trim()
  if (!s) return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

/** Parse RPE 1–10 */
function parseRpe(str: string): number | null {
  const s = str.trim()
  if (!s) return null
  const n = parseInt(s, 10)
  if (isNaN(n) || n < 1 || n > 10) return null
  return n
}

/** Map Polish load type strings → LoadType */
function parseLoadType(str: string): LoadType | null {
  const s = str.trim().toLowerCase()
  if (!s) return null
  if (s.includes('niskie') || s.includes('low')) return 'easy'
  if (
    s.includes('średnie') ||
    s.includes('srednie') ||
    s.includes('średnia') ||
    s.includes('medium')
  )
    return 'medium'
  if (
    s.includes('wysokie') ||
    s.includes('ciężki') ||
    s.includes('ciezki') ||
    s.includes('ciezkie') ||
    s.includes('high')
  )
    return 'hard'
  return null
}

/** Map JS getDay() result → DayOfWeek */
function parseDayOfWeek(date: Date): DayOfWeek {
  const map: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return map[getDay(date)]
}

/** Derive ISO week Monday date string from any date in that week */
function deriveWeekStart(date: Date): string {
  return format(startOfISOWeek(date), 'yyyy-MM-dd')
}

// ---------------------------------------------------------------------------
// T013: Training type detection
// ---------------------------------------------------------------------------

/** Detect training type from RODZAJ column value */
function detectTrainingType(rodzaj: string): TrainingType | null {
  const s = rodzaj.trim().toLowerCase()
  if (!s) return null
  if (s.includes('bieg') || s.includes('run') || s.includes('półmaraton') || s.includes('polmaraton')) return 'run'
  if (s.includes('rower') || s.includes('cycling') || s.includes('kolar')) return 'cycling'
  if (
    s.includes('siłow') ||
    s.includes('silowni') ||
    s.includes('siłk') ||
    s.includes('silka') ||
    s.includes('siła') ||
    s.includes('fbw') ||
    s.includes('upper') ||
    s.includes('cultural')
  )
    return 'strength'
  if (s.includes('basen') || s.includes('pływanie') || s.includes('plywanie') || s.includes('swim'))
    return 'swimming'
  if (s.includes('joga') || s.includes('yoga')) return 'yoga'
  if (s.includes('mobil')) return 'mobility'
  return 'other'
}

/** Detect training type from description text (for multi-activity splitting) */
function detectTypeFromText(text: string): TrainingType | null {
  const s = text.toLowerCase()
  if (s.includes('bieg') || s.includes('run') || s.includes('biegu') || s.includes('bieżni') || s.includes('biezni')) return 'run'
  if (s.includes('rower') || s.includes('cycling')) return 'cycling'
  if (
    s.includes('siłow') ||
    s.includes('siłk') ||
    s.includes('silka') ||
    s.includes('silowni') ||
    s.includes('siła') ||
    s.includes('cultural') ||
    s.includes('fbw') ||
    s.includes('upper')
  )
    return 'strength'
  if (s.includes('basen') || s.includes('pływanie') || s.includes('swim')) return 'swimming'
  if (s.includes('mobil')) return 'mobility'
  if (s.includes('joga') || s.includes('yoga')) return 'yoga'
  return null
}

// ---------------------------------------------------------------------------
// T014: Zod schemas + validateRow
// ---------------------------------------------------------------------------

const ValidatedSessionSchema = z.object({
  date: z.string(),
  weekStart: z.string(),
  year: z.number().int(),
  weekNumber: z.number().int(),
  dayOfWeek: z.enum([
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday',
  ]),
  trainingType: z.enum([
    'run', 'cycling', 'strength', 'yoga', 'mobility',
    'swimming', 'rest_day', 'other',
  ]),
  description: z.string().nullable(),
  coachComments: z.string().nullable(),
  coachPostFeedback: z.string().nullable(),
  actualDurationMinutes: z.number().int().nullable(),
  actualDistanceKm: z.number().nullable(),
  actualPace: z.string().nullable(),
  avgHeartRate: z.number().int().nullable(),
  maxHeartRate: z.number().int().nullable(),
  rpe: z.number().int().min(1).max(10).nullable(),
  athleteNotes: z.string().nullable(),
  isCompleted: z.boolean(),
  sortOrder: z.number().int(),
})

const ValidatedWeekSchema = z.object({
  weekStart: z.string(),
  year: z.number().int(),
  weekNumber: z.number().int(),
  loadType: z.enum(['easy', 'medium', 'hard']).nullable(),
  totalPlannedKm: z.number().nullable(),
  actualTotalKm: z.number().nullable(),
})

function validateRow(
  row: CsvRow,
  rowIndex: number,
): ValidatedSession | ValidationError {
  const dateStr = row['DATA']?.trim()
  if (!dateStr) {
    return { row: rowIndex, date: '', reason: 'Missing DATA column' }
  }

  let date: Date
  try {
    date = parseISO(dateStr)
  } catch {
    return { row: rowIndex, date: dateStr, reason: `Cannot parse date: ${dateStr}` }
  }

  const weekStart = deriveWeekStart(date)
  const year = getISOWeekYear(date)
  const weekNumber = getISOWeek(date)
  const dayOfWeek = parseDayOfWeek(date)

  // Training type from RODZAJ, then fallback to OPIS keyword scan
  const rodzaj = row['RODZAJ']?.trim() ?? ''
  let trainingType: TrainingType | null = detectTrainingType(rodzaj)

  const opis = row['OPIS']?.trim() ?? ''
  if (!trainingType) {
    // Try to detect from description if no RODZAJ
    trainingType = detectTypeFromText(opis)
  }

  if (!trainingType) {
    return { row: rowIndex, date: dateStr, reason: `No training type detected (RODZAJ="${rodzaj}", OPIS="${opis.slice(0, 40)}")` }
  }

  const actualDurationMinutes = parseDuration(row['CZAS'] ?? '')
  const actualDistanceKm = parseDistance(row['DYSTANS'] ?? '')
  const avgHeartRate = parseHr(row['TĘTNO ŚREDNIE'] ?? '')
  const maxHeartRate = parseHr(row['TĘTNO MAX'] ?? '')
  const rpe = parseRpe(row['ZMĘCZENIE 1-10'] ?? '')
  const actualPace = parsePace(row['TEMPO'] ?? '')

  // Completion: has actual data OR ✅ in description
  const hasActualData = actualDurationMinutes != null || actualDistanceKm != null
  const hasCheckmark = opis.includes('✅') || opis.includes('✓')
  const isCompleted = hasActualData || hasCheckmark

  // Athlete notes: combine UWAGI ZAWODNIKA + Waga
  const rawNotes = row['UWAGI ZAWODNIKA:']?.trim() ?? ''
  const weight = row['Waga:']?.trim() ?? ''
  let athleteNotes: string | null = rawNotes || null
  if (weight) {
    const weightNote = `Waga: ${weight} kg`
    athleteNotes = athleteNotes ? `${athleteNotes}\n${weightNote}` : weightNote
  }

  const description = opis || null
  const coachComments = row['UWAGI TRENERA:']?.trim() || null
  const coachPostFeedback = row['UWagi trenera po wykonanym treningu']?.trim() || null

  const candidate = {
    date: dateStr,
    weekStart,
    year,
    weekNumber,
    dayOfWeek,
    trainingType,
    description,
    coachComments,
    coachPostFeedback,
    actualDurationMinutes,
    actualDistanceKm,
    actualPace,
    avgHeartRate,
    maxHeartRate,
    rpe,
    athleteNotes,
    isCompleted,
    sortOrder: 0,
  }

  const result = ValidatedSessionSchema.safeParse(candidate)
  if (!result.success) {
    return {
      row: rowIndex,
      date: dateStr,
      reason: result.error.issues.map((i) => i.message).join('; '),
    }
  }

  return result.data as ValidatedSession
}

function isValidationError(x: ValidatedSession | ValidationError): x is ValidationError {
  return 'reason' in x
}

// ---------------------------------------------------------------------------
// T015: Group rows by week
// ---------------------------------------------------------------------------

interface WeekGroup {
  weekStart: string
  year: number
  weekNumber: number
  loadType: LoadType | null
  totalPlannedKm: number | null
  actualTotalKm: number | null
  rows: { row: CsvRow; index: number }[]
}

function groupRowsByWeek(rows: CsvRow[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const dateStr = row['DATA']?.trim()
    if (!dateStr) continue

    let date: Date
    try {
      date = parseISO(dateStr)
    } catch {
      continue
    }

    const weekStart = deriveWeekStart(date)
    const year = getISOWeekYear(date)
    const weekNumber = getISOWeek(date)

    if (!map.has(weekStart)) {
      map.set(weekStart, {
        weekStart,
        year,
        weekNumber,
        loadType: null,
        totalPlannedKm: null,
        actualTotalKm: null,
        rows: [],
      })
    }

    const group = map.get(weekStart)!
    group.rows.push({ row, index: i + 2 }) // +2 for 1-indexed + header row

    // Collect week-level fields from whichever row has them
    const loadTypeVal = parseLoadType(row['Obciążenie: (niskie/średnie /wysokie)'] ?? '')
    if (loadTypeVal && !group.loadType) group.loadType = loadTypeVal

    const plannedKm = parseDistance(row['KM ZAPLANOWANE:'] ?? '')
    if (plannedKm != null && group.totalPlannedKm == null) group.totalPlannedKm = plannedKm

    const actualKm = parseDistance(row['KM ZREALIZOWANE:'] ?? '')
    if (actualKm != null && group.actualTotalKm == null) group.actualTotalKm = actualKm
  }

  return Array.from(map.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

// ---------------------------------------------------------------------------
// T016: Split multi-activity rows
// ---------------------------------------------------------------------------

function splitMultiActivityRow(session: ValidatedSession, opis: string): ValidatedSession[] {
  // Only split if OPIS contains "+"
  if (!opis.includes('+')) return [session]

  const parts = opis.split('+').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return [session]

  const detectedTypes = parts.map((p) => detectTypeFromText(p))

  // Only split if there are 2+ distinct activity types — a single type repeated
  // (e.g. "WU + intervals + cooldown") is one session, not multiple
  const distinctTypes = new Set(detectedTypes.filter((t) => t != null))
  if (distinctTypes.size < 2) return [session]

  // Determine primary type: use session.trainingType for first part
  // that matches, others get their detected type
  const sessions: ValidatedSession[] = []
  let sortOrder = 0

  for (let i = 0; i < parts.length; i++) {
    const detectedType = i === 0
      ? session.trainingType // first part keeps primary type
      : (detectedTypes[i] ?? 'other')

    sessions.push({
      ...session,
      trainingType: detectedType,
      sortOrder,
      // Only first session carries the actual performance data
      actualDurationMinutes: i === 0 ? session.actualDurationMinutes : null,
      actualDistanceKm: i === 0 ? session.actualDistanceKm : null,
      actualPace: i === 0 ? session.actualPace : null,
      avgHeartRate: i === 0 ? session.avgHeartRate : null,
      maxHeartRate: i === 0 ? session.maxHeartRate : null,
      rpe: i === 0 ? session.rpe : null,
    })
    sortOrder++
  }

  return sessions
}

// ---------------------------------------------------------------------------
// T017: Upsert week plan
// ---------------------------------------------------------------------------

async function upsertWeekPlan(
  plan: ValidatedWeek,
  athleteId: string,
): Promise<string> {
  const result = ValidatedWeekSchema.safeParse(plan)
  if (!result.success) {
    throw new Error(`Invalid week plan: ${result.error.issues.map((i) => i.message).join('; ')}`)
  }

  const { data, error } = await supabase
    .from('week_plans')
    .upsert(
      {
        athlete_id: athleteId,
        week_start: plan.weekStart,
        year: plan.year,
        week_number: plan.weekNumber,
        load_type: plan.loadType,
        total_planned_km: plan.totalPlannedKm,
        actual_total_km: plan.actualTotalKm,
      },
      { onConflict: 'athlete_id,week_start' },
    )
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

// ---------------------------------------------------------------------------
// T018: Insert session (idempotent)
// ---------------------------------------------------------------------------

async function insertSession(
  session: ValidatedSession,
  weekPlanId: string,
): Promise<'created' | 'skipped'> {
  // Check for existing session at same slot
  const { data: existing } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('week_plan_id', weekPlanId)
    .eq('day_of_week', session.dayOfWeek)
    .eq('sort_order', session.sortOrder)
    .maybeSingle()

  if (existing) return 'skipped'

  const completedAt = session.isCompleted
    ? new Date(session.date + 'T12:00:00Z').toISOString()
    : null

  const { error } = await supabase.from('training_sessions').insert({
    week_plan_id: weekPlanId,
    day_of_week: session.dayOfWeek,
    sort_order: session.sortOrder,
    training_type: session.trainingType,
    description: session.description,
    coach_comments: session.coachComments,
    coach_post_feedback: session.coachPostFeedback,
    planned_duration_minutes: null,
    planned_distance_km: null,
    type_specific_data: { type: session.trainingType },
    is_completed: session.isCompleted,
    completed_at: completedAt,
    actual_duration_minutes: session.actualDurationMinutes,
    actual_distance_km: session.actualDistanceKm,
    actual_pace: session.actualPace,
    avg_heart_rate: session.avgHeartRate,
    max_heart_rate: session.maxHeartRate,
    rpe: session.rpe,
    trainee_notes: session.athleteNotes,
  })

  if (error) throw error
  return 'created'
}

// ---------------------------------------------------------------------------
// T019: Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Synek Sheets Migration ===')
  console.log(`Reading CSV: ${CSV_PATH}`)

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found: ${CSV_PATH}`)
    process.exit(1)
  }

  const csvText = fs.readFileSync(CSV_PATH, 'utf-8')
  const { data: rawRows, errors: parseErrors } = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parseErrors.length > 0) {
    console.error('CSV parse errors:', parseErrors)
  }

  console.log(`Parsed ${rawRows.length} rows.`)

  const weekGroups = groupRowsByWeek(rawRows)
  console.log(`Grouped into ${weekGroups.length} ISO weeks.\n`)

  // Resolve excluded week_start values from the excluded week plan IDs
  const excludedWeekStarts = new Set<string>()
  if (EXCLUDED_WEEK_PLAN_IDS.size > 0) {
    const { data: excluded } = await supabase
      .from('week_plans')
      .select('id, week_start')
      .in('id', Array.from(EXCLUDED_WEEK_PLAN_IDS))
    if (excluded) {
      for (const row of excluded) {
        excludedWeekStarts.add(row.week_start as string)
        console.log(`Excluding week ${row.week_start} (${row.id}) — manually migrated`)
      }
    }
  }

  let weeksCreated = 0
  let sessionsCreated = 0
  let sessionsSkipped = 0
  const errors: ValidationError[] = []

  for (const group of weekGroups) {
    if (excludedWeekStarts.has(group.weekStart)) {
      console.log(`Skipping week ${group.weekStart} (excluded)`)
      continue
    }

    console.log(`Processing week ${group.weekStart} (W${group.weekNumber} ${group.year})...`)

    // Upsert week plan
    const weekPlanId = await upsertWeekPlan(
      {
        weekStart: group.weekStart,
        year: group.year,
        weekNumber: group.weekNumber,
        loadType: group.loadType,
        totalPlannedKm: group.totalPlannedKm,
        actualTotalKm: group.actualTotalKm,
      },
      ATHLETE_ID!,
    )
    weeksCreated++

    // Process each row
    for (const { row, index } of group.rows) {
      const validated = validateRow(row, index)

      if (isValidationError(validated)) {
        errors.push(validated)
        continue
      }

      // Split multi-activity rows
      const opis = row['OPIS']?.trim() ?? ''
      const sessions = splitMultiActivityRow(validated, opis)

      for (const session of sessions) {
        try {
          const result = await insertSession(session, weekPlanId)
          if (result === 'created') sessionsCreated++
          else sessionsSkipped++
        } catch (err) {
          errors.push({
            row: index,
            date: session.date,
            reason: `Insert failed: ${String(err)}`,
          })
        }
      }
    }
  }

  console.log('\n=== Migration Summary ===')
  console.log(`Weeks processed: ${weeksCreated}`)
  console.log(`Sessions created: ${sessionsCreated}`)
  console.log(`Sessions skipped (already exist): ${sessionsSkipped}`)
  console.log(`Rows skipped/errors: ${errors.length}`)

  if (errors.length > 0) {
    console.log('\nSkipped rows:')
    for (const e of errors) {
      console.log(`  Row ${e.row} [${e.date}]: ${e.reason}`)
    }
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
