import { FormEvent, useEffect, useMemo, useState } from 'react'

import {
  ApiError,
  createDiary,
  deleteDiary as deleteDiaryRequest,
  getDiaries,
  hasAccessToken,
  login,
  getDiary,
    analyzeDiary,
    getLatestAnalysis,
    type EmotionAnalysisResponse,
  type DiaryDetail,
  type DiarySummary,
} from './api/client'
import './App.css'

type Emotion = 'JOY' | 'SADNESS' | 'ANGER' | 'ANXIETY' | 'CALM'

type Diary = {
  id: number
  title: string
  content: string
  createdAt: string
  emotion: Emotion
  intensity: number
}

const emotionInfo: Record<Emotion, { label: string; icon: string; color: string }> = {
  JOY: { label: '기쁨', icon: '☀️', color: '#ef9b3d' },
  SADNESS: { label: '슬픔', icon: '🌧️', color: '#6686d8' },
  ANGER: { label: '분노', icon: '🔥', color: '#df6672' },
  ANXIETY: { label: '불안', icon: '🌫️', color: '#9a7bc3' },
  CALM: { label: '평온', icon: '🌿', color: '#5f9d80' },
}

const initialDiaries: Diary[] = [
  {
    id: 1,
    title: '천천히 정리한 하루',
    content: '해야 할 일이 많았지만 하나씩 정리하니 마음이 조금 가벼워졌다. 오늘도 충분히 잘 해냈다.',
    createdAt: '2026. 09. 27',
    emotion: 'CALM',
    intensity: 3,
  },
  {
    id: 2,
    title: '작은 성취',
    content: '어려웠던 문제를 해결했다. 생각보다 뿌듯하고 내일도 한 걸음 더 나아가고 싶다.',
    createdAt: '2026. 09. 26',
    emotion: 'JOY',
    intensity: 4,
  },
  {
    id: 3,
    title: '복잡했던 마음',
    content: '계획대로 되지 않아 걱정이 많았지만, 잠시 쉬면서 다시 우선순위를 정해 보기로 했다.',
    createdAt: '2026. 09. 25',
    emotion: 'ANXIETY',
    intensity: 3,
  },
]
type View = 'home' | 'list' | 'write' | 'detail' | 'login'

export default function App() {
  const [isSavingDiary, setIsSavingDiary] = useState(false)
  const [diarySaveError, setDiarySaveError] = useState('')
  const [diaries, setDiaries] = useState<Diary[]>(initialDiaries)
  const [view, setView] = useState<View>('home')
  const [selectedId, setSelectedId] = useState(1)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(hasAccessToken())

  const [realDiaries, setRealDiaries] = useState<DiarySummary[]>([])
  const [selectedRealDiary, setSelectedRealDiary] = useState<DiaryDetail | null>(null)
    const [latestAnalysis, setLatestAnalysis] =
        useState<EmotionAnalysisResponse | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisError, setAnalysisError] = useState('')
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailLoadError, setDetailLoadError] = useState('')
  const [isDeletingDiary, setIsDeletingDiary] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isLoadingDiaries, setIsLoadingDiaries] = useState(false)
  const [diaryLoadError, setDiaryLoadError] = useState('')

  const selectedDiary = diaries.find((diary) => diary.id === selectedId) ?? diaries[0]
  const recentDiaries = useMemo(() => diaries.slice(0, 3), [diaries])

  useEffect(() => {
    if (!isLoggedIn) return

    async function loadDiaries() {
      setIsLoadingDiaries(true)
      setDiaryLoadError('')

      try {
        const response = await getDiaries()
        setRealDiaries(response.content)
      } catch (error) {
        if (error instanceof ApiError) {
          setDiaryLoadError(`${error.message} (${error.status})`)
        } else {
          setDiaryLoadError('일기 목록을 불러오지 못했습니다.')
        }
      } finally {
        setIsLoadingDiaries(false)
      }
    }

    loadDiaries()
  }, [isLoggedIn])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    setIsLoggingIn(true)

    try {
      await login(email, password)
      setIsLoggedIn(true)
      setView('home')
    } catch (error) {
      if (error instanceof ApiError) {
        setLoginError(`${error.message} (${error.status})`)
      } else {
        console.error('로그인 실패:', error)

        if (error instanceof Error) {
          setLoginError(error.message)
        } else {
          setLoginError('로그인 중 알 수 없는 오류가 발생했습니다.')
        }
      }
    } finally {
      setIsLoggingIn(false)
    }
  }
    async function openDetail(id: number) {
        setView('detail')
        setSelectedRealDiary(null)
        setLatestAnalysis(null)
        setDetailLoadError('')
        setAnalysisError('')
        setIsLoadingDetail(true)

        try {
            const diary = await getDiary(id)
            setSelectedRealDiary(diary)

            try {
                const analysis = await getLatestAnalysis(id)
                setLatestAnalysis(analysis)
            } catch (error) {
                if (error instanceof ApiError && error.status !== 404) {
                    setAnalysisError(`${error.message} (${error.status})`)
                }
            }
        } catch (error) {
            if (error instanceof ApiError) {
                setDetailLoadError(`${error.message} (${error.status})`)
            } else {
                setDetailLoadError('일기 상세 내용을 불러오지 못했습니다.')
            }
        } finally {
            setIsLoadingDetail(false)
        }
    }

  async function saveDiary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim() || !content.trim()) return

    setDiarySaveError('')
    setIsSavingDiary(true)

    try {
      const created = await createDiary(title.trim(), content.trim())

      setRealDiaries((previous) => [
        {
          id: created.id,
          title: created.title,
          createdAt: created.createdAt,
        },
        ...previous,
      ])

      setSelectedRealDiary({
        id: created.id,
        title: created.title,
        content: created.content,
        createdAt: created.createdAt,
        updatedAt: null,
      })
      setLatestAnalysis(null)
      setDetailLoadError('')
      setAnalysisError('')
      setTitle('')
      setContent('')
      setView('detail')

      await runAnalysis(created.id)
    } catch (error) {
      if (error instanceof ApiError) {
        setDiarySaveError(`${error.message} (${error.status})`)
      } else {
        setDiarySaveError('일기 저장 중 오류가 발생했습니다.')
      }
    } finally {
      setIsSavingDiary(false)
    }
  }

  async function handleDeleteDiary() {
    if (!selectedRealDiary) return

    const confirmed = window.confirm('이 일기를 삭제할까요?')
    if (!confirmed) return

    setDeleteError('')
    setIsDeletingDiary(true)

    try {
      await deleteDiaryRequest(selectedRealDiary.id)

      setRealDiaries((previous) =>
          previous.filter((diary) => diary.id !== selectedRealDiary.id),
      )

      setSelectedRealDiary(null)
      setView('list')
    } catch (error) {
      if (error instanceof ApiError) {
        setDeleteError(`${error.message} (${error.status})`)
      } else {
        setDeleteError('일기 삭제 중 오류가 발생했습니다.')
      }
    } finally {
      setIsDeletingDiary(false)
    }
  }
  async function runAnalysis(diaryId: number) {
    setAnalysisError('')
    setIsAnalyzing(true)

    try {
      const analysis = await analyzeDiary(diaryId)
      setLatestAnalysis(analysis)
    } catch (error) {
      if (error instanceof ApiError) {
        setAnalysisError(`${error.message} (${error.status})`)
      } else {
        setAnalysisError('감정 분석 중 오류가 발생했습니다.')
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleAnalyze() {
    if (!selectedRealDiary) return

    await runAnalysis(selectedRealDiary.id)
  }
  return (
    <main className="app-shell">
      <header className="top-bar">
        <button className="brand" onClick={() => setView('home')} aria-label="홈으로 이동">
          <span className="brand-mark">✦</span>
          <span>AI Diary</span>
        </button>
        <button
            className="profile-button"
            onClick={() => setView(isLoggedIn ? 'home' : 'login')}
            aria-label="로그인"
        >
          {isLoggedIn ? '민' : '로그인'}
        </button>
      </header>

      <section className="content">
        {view === 'login' && (
            <section className="page-section">
              <button className="back-button" onClick={() => setView('home')}>
                ← 돌아가기
              </button>

              <p className="eyebrow">WELCOME BACK</p>
              <h1>다시 만나서<br />반가워요</h1>

              <form className="diary-form" onSubmit={handleLogin}>
                <label>
                  이메일
                  <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="example@email.com"
                      required
                  />
                </label>

                <label>
                  비밀번호
                  <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      required
                  />
                </label>

                {loginError && <p className="login-error">{loginError}</p>}

                <button className="primary-button" type="submit" disabled={isLoggingIn}>
                  {isLoggingIn ? '로그인 중...' : '로그인하기'}
                </button>
              </form>
            </section>
        )}
        {view === 'home' && (
          <>
            <div className="hero">
              <p className="eyebrow">SATURDAY, SEPTEMBER 27</p>
              <h1>오늘의 마음은<br />어떤가요?</h1>
              <p>짧은 기록도 괜찮아요. 오늘의 감정을 AI와 함께 돌아봐요.</p>
              <button className="primary-button" onClick={() => setView('write')}>오늘의 일기 쓰기 <span>→</span></button>
            </div>

            <section className="section-block">
              <div className="section-heading">
                <div><p className="eyebrow">EMOTION SNAPSHOT</p><h2>최근 마음의 흐름</h2></div>
                <button className="text-button" onClick={() => setView('list')}>전체 보기</button>
              </div>
              <div className="trend-card">
                <div className="trend-icon">🌿</div>
                <div><strong>평온한 흐름이에요</strong><p>최근 7일 동안 차분한 감정이 가장 많이 기록됐어요.</p></div>
              </div>
              <div className="bars" aria-label="최근 감정 강도 그래프">
                {[42, 58, 36, 70, 53, 75, 62].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading"><div><p className="eyebrow">RECENT DIARIES</p><h2>최근 기록</h2></div></div>
              <div className="diary-list">
                {recentDiaries.map((diary) => <DiaryCard key={diary.id} diary={diary} onClick={() => openDetail(diary.id)} />)}
              </div>
            </section>
          </>
        )}

        {view === 'list' && (
          <section className="page-section">
            <p className="eyebrow">MY ARCHIVE</p><h1>나의 일기</h1>
            <div className="diary-list">
              {isLoadingDiaries && <p>일기를 불러오는 중이에요...</p>}

              {diaryLoadError && (
                  <p className="login-error">{diaryLoadError}</p>
              )}

              {!isLoadingDiaries && !diaryLoadError && realDiaries.length === 0 && (
                  <p>아직 작성한 일기가 없어요.</p>
              )}

              {!isLoadingDiaries && !diaryLoadError &&
                  realDiaries.map((diary) => (
                      <button
                          type="button"
                          className="diary-card"
                          key={diary.id}
                          onClick={() => openDetail(diary.id)}
                      >
                        <span className="emotion-icon small">📖</span>

                        <span className="diary-card-copy">
          <small>
            {new Date(diary.createdAt).toLocaleDateString('ko-KR')}
          </small>
          <strong>{diary.title ?? '제목 없는 일기'}</strong>
        </span>
                      </button>
                  ))}
            </div>
          </section>
        )}

        {view === 'write' && (
          <section className="page-section">
            <button className="back-button" onClick={() => setView('home')}>← 돌아가기</button>
            <p className="eyebrow">NEW DIARY</p><h1>오늘을 기록해요</h1>
            <form className="diary-form" onSubmit={saveDiary}>
              <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="오늘을 한마디로 표현하면?" maxLength={255} /></label>
              <label>내용<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="오늘 있었던 일과 마음을 자유롭게 적어주세요." rows={10} /></label>
              <p className="form-note">
                저장 후 AI가 감정과 짧은 피드백을 준비해요.
              </p>

              {diarySaveError && (
                  <p className="login-error">{diarySaveError}</p>
              )}

              <button
                  className="primary-button"
                  type="submit"
                  disabled={isSavingDiary}
              >
                {isSavingDiary ? '저장 중...' : '일기 저장하기'}
                {!isSavingDiary && <span>→</span>}
              </button>
            </form>
          </section>
        )}

        {view === 'detail' && (
            <section className="page-section detail-page">
              <button className="back-button" onClick={() => setView('list')}>
                ← 목록으로
              </button>

              {isLoadingDetail && <p>일기 내용을 불러오는 중이에요...</p>}

              {detailLoadError && (
                  <p className="login-error">{detailLoadError}</p>
              )}

              {selectedRealDiary && (
                  <>
                    <p className="eyebrow">
                      {new Date(selectedRealDiary.createdAt).toLocaleDateString('ko-KR')}
                    </p>

                    <h1>{selectedRealDiary.title ?? '제목 없는 일기'}</h1>

                    <p className="diary-content">{selectedRealDiary.content}</p>

                    {selectedRealDiary.updatedAt && (
                        <p className="form-note">
                          수정일: {new Date(selectedRealDiary.updatedAt).toLocaleDateString('ko-KR')}
                        </p>
                    )}

                      <section className="analysis-card">
                          <p className="eyebrow">AI EMOTION ANALYSIS</p>

                          {latestAnalysis ? (
                              <>
                                  <div className="analysis-header">
        <span className="emotion-icon">
          {emotionInfo[latestAnalysis.emotion].icon}
        </span>

                                      <div>
                                          <strong>{emotionInfo[latestAnalysis.emotion].label}</strong>
                                          <p>감정 강도 {latestAnalysis.intensity} / 5</p>
                                      </div>
                                  </div>

                                  <p className="feedback">{latestAnalysis.feedback}</p>

                                  <button
                                      className="primary-button"
                                      type="button"
                                      onClick={handleAnalyze}
                                      disabled={isAnalyzing}
                                  >
                                      {isAnalyzing ? '다시 분석 중...' : '다시 분석하기'}
                                  </button>
                              </>
                          ) : (
                              <button
                                  className="primary-button"
                                  type="button"
                                  onClick={handleAnalyze}
                                  disabled={isAnalyzing}
                              >
                                  {isAnalyzing ? '감정 분석 중...' : 'AI로 감정 분석하기'}
                              </button>
                          )}

                          {analysisError && (
                              <p className="login-error">{analysisError}</p>
                          )}
                      </section>
                    {deleteError && (
                      <p className="login-error">{deleteError}</p>
                    )}

                    <button
                      className="delete-button"
                      type="button"
                      onClick={handleDeleteDiary}
                      disabled={isDeletingDiary}
                    >
                      {isDeletingDiary ? '삭제 중...' : '이 일기 삭제하기'}
                    </button>
                  </>
              )}
            </section>
        )}

      </section>

      <nav className="bottom-nav">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><span>⌂</span>홈</button>
        <button className={view === 'list' || view === 'detail' ? 'active' : ''} onClick={() => setView('list')}><span>☰</span>기록</button>
        <button className="write-nav" onClick={() => setView('write')} aria-label="새 일기 쓰기">+</button>
      </nav>
    </main>
  )
}

function DiaryCard({ diary, onClick }: { diary: Diary; onClick: () => void }) {
  const info = emotionInfo[diary.emotion]
  return <button className="diary-card" onClick={onClick}>
    <span className="emotion-icon small">{info.icon}</span>
    <span className="diary-card-copy"><small>{diary.createdAt}</small><strong>{diary.title}</strong><span>{diary.content}</span></span>
    <span className="arrow">›</span>
  </button>
}
