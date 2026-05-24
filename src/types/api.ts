export type ApiErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT' | 'UNAVAILABLE' | 'INVALID_TRANSITION'

export interface ApiErrorContract {
  code: ApiErrorCode
  message: string
  details?: string
}

export interface ApiSuccessEnvelope<TData> {
  status: 'success'
  data: TData
  meta?: {
    source: 'mock'
    generatedAt: string
  }
}

export interface ApiFailureEnvelope<TError extends ApiErrorContract = ApiErrorContract> {
  status: 'failure'
  error: TError
}

export type ApiResult<TData, TError extends ApiErrorContract = ApiErrorContract> =
  | ApiSuccessEnvelope<TData>
  | ApiFailureEnvelope<TError>

export const ok = <TData>(data: TData): ApiSuccessEnvelope<TData> => ({
  status: 'success',
  data,
  meta: {
    source: 'mock',
    generatedAt: new Date('2026-01-15T08:00:00.000Z').toISOString(),
  },
})

export const fail = <TError extends ApiErrorContract>(error: TError): ApiFailureEnvelope<TError> => ({
  status: 'failure',
  error,
})
