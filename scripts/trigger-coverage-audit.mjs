import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const triggersPath = join(root, '.copilot', 'instructions', 'auto-triggers.md')
const hierarchyPath = join(root, '.copilot', 'instructions', 'hierarchy.md')
const reportPath = join(root, '.copilot', '.lane-audits', 'trigger-coverage-audit.json')

const triggerDoc = readFileSync(triggersPath, 'utf8')
const hierarchyDoc = readFileSync(hierarchyPath, 'utf8')

const gateFiles = readdirSync(join(root, '.github', 'agents'))
  .filter((name) => name.endsWith('-gate.md'))
  .map((name) => `.github/agents/${name}`)
  .sort()

const extractGatePaths = (content) => {
  const matches = content.match(/\.github\/agents\/[a-z0-9-]+-gate\.md/g) ?? []
  return matches.map((path) => path.trim())
}

const triggerPaths = extractGatePaths(triggerDoc)
const hierarchyPaths = extractGatePaths(hierarchyDoc)

const triggerCount = new Map()
for (const gate of triggerPaths) {
  triggerCount.set(gate, (triggerCount.get(gate) ?? 0) + 1)
}

const duplicateTriggerTargets = Array.from(triggerCount.entries())
  .filter(([, count]) => count > 1)
  .map(([gate, count]) => ({ gate, count }))

const missingInTriggers = gateFiles.filter((gate) => !triggerCount.has(gate))
const unknownTriggerTargets = Array.from(triggerCount.keys()).filter((gate) => !gateFiles.includes(gate))
const missingInHierarchy = gateFiles.filter((gate) => !hierarchyPaths.includes(gate))
const unknownHierarchyTargets = hierarchyPaths.filter((gate) => !gateFiles.includes(gate))

const errors = []
if (missingInTriggers.length > 0) {
  errors.push(`Missing trigger rows for: ${missingInTriggers.join(', ')}`)
}
if (duplicateTriggerTargets.length > 0) {
  errors.push(`Duplicate trigger targets: ${duplicateTriggerTargets.map((item) => `${item.gate} (${item.count})`).join(', ')}`)
}
if (unknownTriggerTargets.length > 0) {
  errors.push(`Unknown trigger targets: ${unknownTriggerTargets.join(', ')}`)
}
if (missingInHierarchy.length > 0) {
  errors.push(`Missing hierarchy references for: ${missingInHierarchy.join(', ')}`)
}
if (unknownHierarchyTargets.length > 0) {
  errors.push(`Unknown hierarchy references: ${unknownHierarchyTargets.join(', ')}`)
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? 'pass' : 'fail',
  gatesInRepository: gateFiles,
  triggerTargets: Array.from(triggerCount.entries()).map(([gate, count]) => ({ gate, count })),
  hierarchyTargets: hierarchyPaths,
  missingInTriggers,
  duplicateTriggerTargets,
  unknownTriggerTargets,
  missingInHierarchy,
  unknownHierarchyTargets,
  errors
}

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (errors.length > 0) {
  throw new Error(`Trigger coverage audit failed:\n- ${errors.join('\n- ')}`)
}

console.log('Trigger coverage audit passed.')
