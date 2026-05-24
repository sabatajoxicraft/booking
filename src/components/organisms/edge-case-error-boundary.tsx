import { useState } from 'react'
import type { ReactNode } from 'react'
import type { EdgeCaseErrorResponse } from '@/services/edge-case-handlers'
import { Button } from '@/components/ui/button'
import { EdgeCaseErrorContext } from '@/components/organisms/edge-case-error-context'

interface EdgeCaseErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  onRestart?: () => void
  onSelectAlternative?: () => void
  onSupportContact?: () => void
}

interface EdgeCaseErrorBoundaryState {
  error: EdgeCaseErrorResponse | null
  hasError: boolean
}

export function EdgeCaseErrorBoundary({
  children,
  onRetry,
  onRestart,
  onSelectAlternative,
  onSupportContact,
}: EdgeCaseErrorBoundaryProps) {
  const [state, setState] = useState<EdgeCaseErrorBoundaryState>({
    error: null,
    hasError: false,
  })

  const handleShowError = (error: EdgeCaseErrorResponse) => {
    setState({
      error,
      hasError: true,
    })
  }

  const handleDismiss = () => {
    setState({
      error: null,
      hasError: false,
    })
  }

  const handleAction = (action: string) => {
    handleDismiss()
    switch (action) {
      case 'retry':
        onRetry?.()
        break
      case 'restart':
        onRestart?.()
        break
      case 'select-alternative':
        onSelectAlternative?.()
        break
      case 'support-contact':
        onSupportContact?.()
        break
    }
  }

  if (state.hasError && state.error) {
    const error = state.error
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{error.message}</h2>
            {error.detail && <p className="mt-2 text-sm text-gray-600">{error.detail}</p>}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleAction(error.primaryAction)}
              variant="default"
              className="w-full"
            >
              {getActionLabel(error.primaryAction)}
            </Button>

            {error.secondaryAction && (
              <Button
                onClick={() => handleAction(error.secondaryAction!)}
                variant="outline"
                className="w-full"
              >
                {getActionLabel(error.secondaryAction)}
              </Button>
            )}

            <Button onClick={handleDismiss} variant="ghost" className="w-full text-xs">
              Close
            </Button>
          </div>

          {typeof window !== 'undefined' && window.location.href.includes('localhost') && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-gray-500">Edge Case: {error.edgeCaseId}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      <EdgeCaseErrorContext.Provider value={handleShowError}>
        {/* Error boundary context provided to children */}
      </EdgeCaseErrorContext.Provider>
    </>
  )
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'retry':
      return 'Try Again'
    case 'restart':
      return 'Start Over'
    case 'select-alternative':
      return 'Find Another Time'
    case 'support-contact':
      return 'Contact Support'
    default:
      return 'Continue'
  }
}

