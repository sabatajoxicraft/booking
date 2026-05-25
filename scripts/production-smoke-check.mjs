import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const playbookPath = join(root, '.copilot', 'production-smoke-playbook.md')
const artifactPath = join(root, '.copilot', '.lane-audits', 'production-smoke-latest.json')

if (!existsSync(playbookPath)) {
  throw new Error('Missing .copilot/production-smoke-playbook.md')
}

if (!existsSync(artifactPath)) {
  throw new Error('Missing .copilot/.lane-audits/production-smoke-latest.json')
}

const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
const requiredTopLevel = ['schemaVersion', 'runAt', 'environment', 'status', 'checks']
const requiredCheckFields = ['id', 'description', 'status', 'evidence']
const errors = []

for (const field of requiredTopLevel) {
  if (!(field in artifact)) {
    errors.push(`Missing smoke artifact field: ${field}`)
  }
}

if (!Array.isArray(artifact.checks) || artifact.checks.length === 0) {
  errors.push('Smoke artifact must include at least one check')
}

if (!['pass', 'fail'].includes(artifact.status)) {
  errors.push("Smoke artifact status must be 'pass' or 'fail'")
}

for (const check of artifact.checks ?? []) {
  for (const field of requiredCheckFields) {
    if (!(field in check)) {
      errors.push(`Smoke check ${check.id ?? '<missing-id>'} missing field: ${field}`)
    }
  }
  if (!['pass', 'fail'].includes(check.status)) {
    errors.push(`Smoke check ${check.id ?? '<missing-id>'} has invalid status`)
  }
}

if (errors.length > 0) {
  throw new Error(`Production smoke check failed:\n- ${errors.join('\n- ')}`)
}

console.log('Production smoke check passed.')
