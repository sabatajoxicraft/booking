import { createContext, useContext } from 'react'
import type { EdgeCaseErrorResponse } from '@/services/edge-case-handlers'

/**
 * Context for showing edge-case errors from within child components
 */
export const EdgeCaseErrorContext = createContext<(error: EdgeCaseErrorResponse) => void>(() => {})

/**
 * Hook to show edge-case errors from any component
 */
export function useEdgeCaseError() {
  return useContext(EdgeCaseErrorContext)
}
