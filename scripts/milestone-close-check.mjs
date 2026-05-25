import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const milestonePath = join(root, '.copilot', 'current-milestone.md')
const boards = {
  M1: join(root, '.copilot', 'm1-tasks.md'),
  M2: join(root, '.copilot', 'm2-tasks.md'),
  M3: join(root, '.copilot', 'm3-tasks.md'),
  M4: join(root, '.copilot', 'm4-tasks.md')
}
const reportPath = join(root, '.copilot', '.lane-audits', 'milestone-governance-audit.json')

const errors = []
if (!existsSync(milestonePath)) {
  throw new Error('Missing .copilot/current-milestone.md')
}

const milestoneDoc = readFileSync(milestonePath, 'utf8')
const activeMilestoneMatch = milestoneDoc.match(/\*\*(M\d+)\s*\([^)]*\):\*\*\s*🟡/i)
const activeMilestone = activeMilestoneMatch ? activeMilestoneMatch[1].toUpperCase() : null

for (const [milestone, path] of Object.entries(boards)) {
  if (!existsSync(path)) {
    errors.push(`Missing board file for ${milestone}: ${path}`)
    continue
  }

  const board = readFileSync(path, 'utf8')
  const milestoneLineMatch = milestoneDoc.match(new RegExp(`\\*\\*${milestone}\\s*\\([^)]*\\):\\*\\*\\s*(.*)`))
  const milestoneLine = milestoneLineMatch?.[1] ?? ''
  const isReleasedOrComplete = milestoneLine.includes('✅ Complete')

  if (activeMilestone === milestone && !board.includes('(Kickoff)')) {
    errors.push(`${milestone} board should be marked as kickoff while active`)
  }

  if (activeMilestone !== milestone && isReleasedOrComplete && !board.includes('(Closed)')) {
    errors.push(`${milestone} board should be marked as closed when not active`)
  }
}

const requiredReleasedTags = [
  { milestone: 'M2', tag: 'M2-complete', marker: '**M2 (Feature wave):** ✅ Complete and released' },
  { milestone: 'M3', tag: 'M3-complete', marker: '**M3 (Optimization and readiness):** ✅ Complete and released' }
]

const localTags = execSync('git tag --list', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  .toString('utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const remoteTags = execSync('git ls-remote --tags origin', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  .toString('utf8')
  .split('\n')
  .map((line) => line.trim().split('\t')[1] ?? '')
  .filter((ref) => ref.startsWith('refs/tags/'))
  .map((ref) => ref.replace('refs/tags/', '').replace(/\^\{\}$/, ''))

const existingTags = new Set([...localTags, ...remoteTags])

for (const entry of requiredReleasedTags) {
  if (milestoneDoc.includes(entry.marker) && !existingTags.has(entry.tag)) {
    errors.push(`${entry.milestone} is marked released but missing git tag ${entry.tag}`)
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? 'pass' : 'fail',
  checkedBoards: Object.keys(boards),
  activeMilestone,
  requiredReleasedTags,
  errors
}

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (errors.length > 0) {
  throw new Error(`Milestone governance check failed:\n- ${errors.join('\n- ')}`)
}

console.log('Milestone governance check passed.')
