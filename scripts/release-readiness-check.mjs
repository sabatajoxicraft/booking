import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

const gateEvidencePath = join(root, '.copilot', 'gate-evidence.json')
const readmePath = join(root, 'README.md')
const workflowPath = join(root, '.github', 'workflows', 'test-lint.yml')

if (!existsSync(gateEvidencePath)) {
  throw new Error('Missing .copilot/gate-evidence.json')
}

if (!existsSync(readmePath)) {
  throw new Error('Missing README.md')
}

if (!existsSync(workflowPath)) {
  throw new Error('Missing .github/workflows/test-lint.yml')
}

const gateEvidence = JSON.parse(readFileSync(gateEvidencePath, 'utf8'))
const timestamp = gateEvidence?.gatesSummary?.timestamp
if (typeof timestamp !== 'string') {
  throw new Error('Missing gatesSummary.timestamp in .copilot/gate-evidence.json')
}

const timestampMs = Date.parse(timestamp)
if (Number.isNaN(timestampMs)) {
  throw new Error(`Invalid gatesSummary.timestamp value: ${timestamp}`)
}

const ageDays = Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24))
const isStale = ageDays > 180
const maxAllowedAgeDays = 730
if (ageDays > maxAllowedAgeDays) {
  throw new Error(`Gate evidence timestamp is too old (${ageDays} days).`)
}

const readme = readFileSync(readmePath, 'utf8')
const hasCiBadge =
  readme.includes('![CI]') &&
  readme.includes('/actions/workflows/test-lint.yml/badge.svg') &&
  readme.includes('/actions/workflows/test-lint.yml')

if (!hasCiBadge) {
  throw new Error('README is missing the CI badge/link for test-lint workflow.')
}

if (isStale) {
  console.warn(`Release readiness warning: gate evidence is ${ageDays} days old.`)
}

console.log('Release readiness checks passed.')
