import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const checklistPath = join(root, '.copilot', 'governance-handoff-checklist.json')
const reportPath = join(root, '.copilot', '.lane-audits', 'handoff-check-audit.json')

if (!existsSync(checklistPath)) {
  throw new Error('Missing .copilot/governance-handoff-checklist.json')
}

const checklist = JSON.parse(readFileSync(checklistPath, 'utf8'))
const gateFiles = readdirSync(join(root, '.github', 'agents'))
  .filter((name) => name.endsWith('-gate.md'))
  .map((name) => `.github/agents/${name}`)
const requiredTopLevel = ['schemaVersion', 'milestone', 'updatedAt', 'status', 'handoffs']
const requiredHandoff = ['id', 'from', 'to', 'trigger', 'inputs', 'outputs', 'gates']

const errors = []

for (const field of requiredTopLevel) {
  if (!(field in checklist)) {
    errors.push(`Missing top-level field: ${field}`)
  }
}

if (typeof checklist.schemaVersion !== 'number') {
  errors.push('schemaVersion must be a number')
}

if (typeof checklist.milestone !== 'string' || checklist.milestone.length === 0) {
  errors.push('milestone must be a non-empty string')
}

if (typeof checklist.updatedAt !== 'string' || Number.isNaN(Date.parse(checklist.updatedAt))) {
  errors.push('updatedAt must be an ISO-8601 date string')
}

if (!['pass', 'fail'].includes(checklist.status)) {
  errors.push("status must be 'pass' or 'fail'")
}

if (!Array.isArray(checklist.handoffs) || checklist.handoffs.length === 0) {
  errors.push('handoffs must be a non-empty array')
}

const referencedGates = new Set()
for (const handoff of checklist.handoffs ?? []) {
  for (const field of requiredHandoff) {
    if (!(field in handoff)) {
      errors.push(`handoff ${handoff.id ?? '<missing-id>'} missing field: ${field}`)
    }
  }

  if (!Array.isArray(handoff.inputs) || handoff.inputs.length === 0) {
    errors.push(`handoff ${handoff.id ?? '<missing-id>'} must include at least one input`)
  }

  if (!Array.isArray(handoff.outputs) || handoff.outputs.length === 0) {
    errors.push(`handoff ${handoff.id ?? '<missing-id>'} must include at least one output`)
  }

  if (!Array.isArray(handoff.gates) || handoff.gates.length === 0) {
    errors.push(`handoff ${handoff.id ?? '<missing-id>'} must include at least one gate`)
  }

  for (const gate of handoff.gates ?? []) {
    referencedGates.add(gate)
    if (!gateFiles.includes(gate)) {
      errors.push(`handoff ${handoff.id ?? '<missing-id>'} references unknown gate: ${gate}`)
    }
  }
}

const missingCoverage = gateFiles.filter((gate) => !referencedGates.has(gate))
if (missingCoverage.length > 0) {
  errors.push(`handoff coverage missing gates: ${missingCoverage.join(', ')}`)
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? 'pass' : 'fail',
  coveredGates: Array.from(referencedGates).sort(),
  missingCoverage,
  errors
}

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (errors.length > 0) {
  throw new Error(`Governance handoff check failed:\n- ${errors.join('\n- ')}`)
}

console.log('Governance handoff check passed.')
