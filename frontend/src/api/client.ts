const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const ACCESS_TOKEN_KEY = 'aidiary_access_token'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type AuthResponse = {
  id: number
  email: string
  nickname: string
  accessToken: string
}

export type DiarySummary = {
  id: number
  title: string | null
  createdAt: string
}

export type DiaryDetail = DiarySummary & {
  content: string
  updatedAt: string | null
}

export type DiaryCreateResponse = {
  id: number
  title: string | null
  content: string
  createdAt: string
}
export type EmotionAnalysisResponse = {
  id: number
  diaryId: number
  source: string
  emotion: 'JOY' | 'SADNESS' | 'ANGER' | 'ANXIETY' | 'CALM'
  intensity: number
  scores: Record<'JOY' | 'SADNESS' | 'ANGER' | 'ANXIETY' | 'CALM', number>
  feedback: string
  createdAt: string
}

export type EmotionTrendItem = {
  date: string
  scores: Record<'JOY' | 'SADNESS' | 'ANGER' | 'ANXIETY' | 'CALM', number>
}

export type EmotionTrendResponse = {
  days: number
  trends: EmotionTrendItem[]
}

export type DiaryPage = {
  content: DiarySummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

type ApiErrorBody = {
  message?: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const headers = new Headers(init.headers)

  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    const body = await response.json().catch(() => ({} as ApiErrorBody))
    throw new ApiError(body.message ?? '요청 처리 중 오류가 발생했습니다.', response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function login(email: string, password: string) {
  const response = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
  return response
}

export async function signup(email: string, password: string, nickname: string) {
  const response = await request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname }),
  })
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
  return response
}

export function logout() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function hasAccessToken() {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
}

export function getDiaries(page = 0, size = 10) {
  return request<DiaryPage>(`/api/diaries?page=${page}&size=${size}`)
}

export function getDiary(diaryId: number) {
  return request<DiaryDetail>(`/api/diaries/${diaryId}`)
}

export function createDiary(title: string, content: string) {
  return request<DiaryCreateResponse>('/api/diaries', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  })
}

export function deleteDiary(diaryId: number) {
  return request<void>(`/api/diaries/${diaryId}`, { method: 'DELETE' })
}
export function analyzeDiary(diaryId: number) {
  return request<EmotionAnalysisResponse>(
      `/api/diaries/${diaryId}/analyses`,
      { method: 'POST' },
  )
}

export function getLatestAnalysis(diaryId: number) {
  return request<EmotionAnalysisResponse>(
      `/api/diaries/${diaryId}/analyses/latest`,
  )
}

export function getEmotionTrends(days = 7) {
  return request<EmotionTrendResponse>(`/api/emotions/trends?days=${days}`)
}
