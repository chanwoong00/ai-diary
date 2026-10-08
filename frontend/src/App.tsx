import { FormEvent, useEffect, useState } from 'react'

import {
  ApiError,
  createDiary,
  deleteDiary as deleteDiaryRequest,
  getDiaries,
  getOnThisDay,
  getStreak,
  hasAccessToken,
  login,
  logout,
  signup,
  getDiary,
  analyzeDiary,
  getLatestAnalysis,
  getEmotionTrends,
  type EmotionAnalysisResponse,
  type EmotionTrendResponse,
  type DiaryDetail,
  type DiarySummary,
  type OnThisDayResponse,
  type StreakResponse,
} from './api/client'
import './App.css'

type Emotion = 'JOY' | 'SADNESS' | 'ANGER' | 'ANXIETY' | 'CALM'

const emotionInfo: Record<Emotion, { label: string; icon: string; color: string }> = {
  JOY: { label: '기쁨', icon: '☀️', color: '#ef9b3d' },
  SADNESS: { label: '슬픔', icon: '🌧️', color: '#6686d8' },
  ANGER: { label: '분노', icon: '🔥', color: '#df6672' },
  ANXIETY: { label: '불안', icon: '🌫️', color: '#9a7bc3' },
  CALM: { label: '평온', icon: '🌿', color: '#5f9d80' },
}

type View = 'home' | 'report' | 'list' | 'write' | 'detail' | 'login' | 'signup'

const emotionKeys = Object.keys(emotionInfo) as Emotion[]

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(date)
}

function getAverageScores(trends: EmotionTrendResponse['trends']) {
  return emotionKeys.reduce<Record<Emotion, number>>((scores, emotion) => {
    const total = trends.reduce((sum, trend) => sum + trend.scores[emotion], 0)
    scores[emotion] = trends.length === 0
      ? 0
      : Math.round((total / trends.length) * 10) / 10
    return scores
  }, {} as Record<Emotion, number>)
}

function getDominantEmotion(trends: EmotionTrendResponse['trends']) {
  if (!trends.some((trend) => Object.values(trend.scores).some((score) => score > 0))) {
    return null
  }

  return emotionKeys.reduce((current, emotion) => {
    const currentTotal = trends.reduce((sum, trend) => sum + trend.scores[current], 0)
    const emotionTotal = trends.reduce((sum, trend) => sum + trend.scores[emotion], 0)
    return emotionTotal > currentTotal ? emotion : current
  }, 'JOY')
}

function makeLinePoints(trends: EmotionTrendResponse['trends'], emotion: Emotion) {
  return trends.map((_, index) => {
    const point = getChartPoint(trends, index, emotion)
    return `${point.x},${point.y}`
  }).join(' ')
}

function getChartPoint(
  trends: EmotionTrendResponse['trends'],
  index: number,
  emotion: Emotion,
) {
  const graphWidth = 280
  const graphLeft = 26
  const graphTop = 16
  const graphHeight = 124
  const interval = trends.length > 1 ? graphWidth / (trends.length - 1) : 0

  return {
    x: graphLeft + interval * index,
    y: graphTop + ((5 - trends[index].scores[emotion]) / 5) * graphHeight,
  }
}

export default function App() {
  const [isSavingDiary, setIsSavingDiary] = useState(false)
  const [diarySaveError, setDiarySaveError] = useState('')
  const [view, setView] = useState<View>('home')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(hasAccessToken())

  const [realDiaries, setRealDiaries] = useState<DiarySummary[]>([])
  const [selectedRealDiary, setSelectedRealDiary] = useState<DiaryDetail | null>(null)
  const [onThisDay, setOnThisDay] = useState<OnThisDayResponse | null>(null)
  const [isLoadingOnThisDay, setIsLoadingOnThisDay] = useState(false)
  const [onThisDayError, setOnThisDayError] = useState('')
  const [streak, setStreak] = useState<StreakResponse | null>(null)
  const [isLoadingStreak, setIsLoadingStreak] = useState(false)
  const [streakLoadError, setStreakLoadError] = useState('')
  const [latestAnalysis, setLatestAnalysis] =
    useState<EmotionAnalysisResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [emotionTrend, setEmotionTrend] = useState<EmotionTrendResponse | null>(null)
  const [isLoadingTrend, setIsLoadingTrend] = useState(false)
  const [trendLoadError, setTrendLoadError] = useState('')
  const [reportDays, setReportDays] = useState<7 | 30>(7)
  const [reportTrend, setReportTrend] = useState<EmotionTrendResponse | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportLoadError, setReportLoadError] = useState('')
  const [hoveredReportIndex, setHoveredReportIndex] = useState<number | null>(null)
  const [hoveredHomeTrendIndex, setHoveredHomeTrendIndex] = useState<number | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailLoadError, setDetailLoadError] = useState('')
  const [isDeletingDiary, setIsDeletingDiary] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isLoadingDiaries, setIsLoadingDiaries] = useState(false)
  const [diaryLoadError, setDiaryLoadError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchEmotion, setSearchEmotion] = useState<Emotion | ''>('')
  const [filteredDiaries, setFilteredDiaries] = useState<DiarySummary[]>([])
  const [isLoadingFilteredDiaries, setIsLoadingFilteredDiaries] = useState(false)
  const [filteredDiaryError, setFilteredDiaryError] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const todayLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  async function loadEmotionTrend() {
    setIsLoadingTrend(true)
    setTrendLoadError('')

    try {
      const response = await getEmotionTrends(7)
      setEmotionTrend(response)
    } catch (error) {
      if (error instanceof ApiError) {
        setTrendLoadError(`${error.message} (${error.status})`)
      } else {
        setTrendLoadError('감정 트렌드를 불러오지 못했습니다.')
      }
    } finally {
      setIsLoadingTrend(false)
    }
  }

  async function loadReportTrend(days: 7 | 30) {
    setIsLoadingReport(true)
    setReportLoadError('')

    try {
      const response = await getEmotionTrends(days)
      setReportTrend(response)
    } catch (error) {
      if (error instanceof ApiError) {
        setReportLoadError(`${error.message} (${error.status})`)
      } else {
        setReportLoadError('감정 리포트를 불러오지 못했습니다.')
      }
    } finally {
      setIsLoadingReport(false)
    }
  }

  async function loadOnThisDay() {
    setIsLoadingOnThisDay(true)
    setOnThisDayError('')

    try {
      const response = await getOnThisDay()
      setOnThisDay(response)
    } catch (error) {
      if (error instanceof ApiError) {
        setOnThisDayError(`${error.message} (${error.status})`)
      } else {
        setOnThisDayError('1년 전 오늘의 기록을 불러오지 못했습니다.')
      }
    } finally {
      setIsLoadingOnThisDay(false)
    }
  }

  async function loadStreak() {
    setIsLoadingStreak(true)
    setStreakLoadError('')

    try {
      const response = await getStreak()
      setStreak(response)
    } catch (error) {
      if (error instanceof ApiError) {
        setStreakLoadError(`${error.message} (${error.status})`)
      } else {
        setStreakLoadError('연속 기록을 불러오지 못했습니다.')
      }
    } finally {
      setIsLoadingStreak(false)
    }
  }

  async function loadFilteredDiaries() {
    setIsLoadingFilteredDiaries(true)
    setFilteredDiaryError('')

    try {
      const response = await getDiaries(0, 100, {
        keyword: searchKeyword.trim() || undefined,
        emotion: searchEmotion || undefined,
      })
      setFilteredDiaries(response.content)
    } catch (error) {
      if (error instanceof ApiError) {
        setFilteredDiaryError(`${error.message} (${error.status})`)
      } else {
        setFilteredDiaryError('검색 결과를 불러오지 못했습니다.')
      }
    } finally {
      setIsLoadingFilteredDiaries(false)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return

    async function loadDiaries() {
      setIsLoadingDiaries(true)
      setDiaryLoadError('')

      try {
        const response = await getDiaries(0, 100)
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

  useEffect(() => {
    if (!isLoggedIn) {
      setEmotionTrend(null)
      return
    }

    void loadEmotionTrend()
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) {
      setOnThisDay(null)
      return
    }

    void loadOnThisDay()
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) {
      setStreak(null)
      return
    }

    void loadStreak()
  }, [isLoggedIn])

  useEffect(() => {
    if (view !== 'list' || !isLoggedIn) return

    const timer = window.setTimeout(() => {
      void loadFilteredDiaries()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [view, isLoggedIn, searchKeyword, searchEmotion])

  useEffect(() => {
    if (view !== 'report' || !isLoggedIn) return
    void loadReportTrend(reportDays)
  }, [view, isLoggedIn, reportDays])

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

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSignupError('')
    setIsSigningUp(true)

    try {
      await signup(email, password, nickname)
      setIsLoggedIn(true)
      setView('home')
    } catch (error) {
      if (error instanceof ApiError) {
        setSignupError(`${error.message} (${error.status})`)
      } else {
        setSignupError('회원가입 중 오류가 발생했습니다.')
      }
    } finally {
      setIsSigningUp(false)
    }
  }

  function handleLogout() {
    logout()
    setIsLoggedIn(false)
    setRealDiaries([])
    setSelectedRealDiary(null)
    setLatestAnalysis(null)
    setEmotionTrend(null)
    setReportTrend(null)
    setOnThisDay(null)
    setStreak(null)
    setFilteredDiaries([])
    setView('home')
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

      void loadStreak()

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
      void loadStreak()
      void loadOnThisDay()
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
      await loadEmotionTrend()
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

  const dominantTrendEmotion = getDominantEmotion(emotionTrend?.trends ?? [])
  const reportAverageScores = getAverageScores(reportTrend?.trends ?? [])
  const dominantReportEmotion = getDominantEmotion(reportTrend?.trends ?? [])
  const hoveredReport = hoveredReportIndex === null
    ? null
    : reportTrend?.trends[hoveredReportIndex] ?? null
  const hoveredHomeTrend = hoveredHomeTrendIndex === null
    ? null
    : emotionTrend?.trends[hoveredHomeTrendIndex] ?? null

  const calendarStartDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  ).getDay()
  const calendarLastDate = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate()
  const calendarDates = [
    ...Array<null>(calendarStartDay).fill(null),
    ...Array.from({ length: calendarLastDate }, (_, index) => index + 1),
  ]
  const diariesByDate = realDiaries.reduce<Record<string, DiarySummary[]>>(
    (result, diary) => {
      const dateKey = toDateKey(new Date(diary.createdAt))
      result[dateKey] = [...(result[dateKey] ?? []), diary]
      return result
    },
    {},
  )
  const selectedDateDiaries = selectedCalendarDate
    ? diariesByDate[selectedCalendarDate] ?? []
    : []

  return (
    <main className="app-shell">
      <header className="top-bar">
        <button className="brand" onClick={() => setView('home')} aria-label="홈으로 이동">
          <span className="brand-mark">✦</span>
          <span>AI Diary</span>
        </button>
        <div className="header-actions">
          {isLoggedIn && (
            <button className="logout-button" type="button" onClick={handleLogout}>
              로그아웃
            </button>
          )}

          <button
              className="profile-button"
              onClick={() => setView(isLoggedIn ? 'home' : 'login')}
              aria-label="로그인"
          >
            {isLoggedIn ? '민' : '로그인'}
          </button>
        </div>
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

                <p className="auth-switch">
                  아직 계정이 없나요?{' '}
                  <button type="button" onClick={() => setView('signup')}>
                    회원가입하기
                  </button>
                </p>
              </form>
            </section>
        )}

        {view === 'signup' && (
          <section className="page-section">
            <button className="back-button" onClick={() => setView('login')}>
              ← 로그인으로
            </button>

            <p className="eyebrow">CREATE ACCOUNT</p>
            <h1>나만의 감정 기록을<br />시작해요</h1>

            <form className="diary-form" onSubmit={handleSignup}>
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
                  placeholder="8자 이상 입력하세요"
                  minLength={8}
                  required
                />
              </label>

              <label>
                닉네임
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="서비스에서 사용할 이름"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>

              {signupError && <p className="login-error">{signupError}</p>}

              <button className="primary-button" type="submit" disabled={isSigningUp}>
                {isSigningUp ? '가입 중...' : '회원가입하고 시작하기'}
              </button>
            </form>
          </section>
        )}

        {view === 'home' && (
          <>
            <div className="hero">
              <p className="eyebrow">{todayLabel}</p>
              <h1>오늘의 마음은<br />어떤가요?</h1>
              <p>짧은 기록도 괜찮아요. 오늘의 감정을 AI와 함께 돌아봐요.</p>
              <button className="primary-button" onClick={() => setView('write')}>오늘의 일기 쓰기 <span>→</span></button>
            </div>

            {isLoggedIn && (
              <section className="streak-card" aria-label="연속 일기 작성일">
                {isLoadingStreak && <p>연속 기록을 확인하는 중이에요...</p>}
                {streakLoadError && <p className="login-error">{streakLoadError}</p>}
                {!isLoadingStreak && !streakLoadError && streak && (
                  <>
                    <span className="streak-card-label">CONTINUOUS RECORD</span>
                    <strong>{streak.streak > 0 ? `${streak.streak}일째 기록 중` : '오늘의 기록을 시작해 볼까요?'}</strong>
                    <p>
                      {streak.streak > 0 && streak.startedAt
                        ? `${streak.startedAt}부터 마음을 기록하고 있어요.`
                        : streak.lastWrittenDate
                          ? `마지막 기록은 ${streak.lastWrittenDate}이에요.`
                          : '첫 기록을 남기면 연속 기록을 시작할 수 있어요.'}
                    </p>
                  </>
                )}
              </section>
            )}

            <section className="section-block on-this-day-section">
              <div className="section-heading">
                <div><p className="eyebrow">ON THIS DAY</p><h2>1년 전 오늘</h2></div>
              </div>

              {!isLoggedIn && <p>로그인하면 지난 기록을 돌아볼 수 있어요.</p>}
              {isLoggedIn && isLoadingOnThisDay && <p>작년 오늘의 기록을 찾는 중이에요...</p>}
              {isLoggedIn && onThisDayError && <p className="login-error">{onThisDayError}</p>}

              {isLoggedIn && !isLoadingOnThisDay && !onThisDayError && onThisDay?.diaries.length === 0 && (
                <div className="on-this-day-empty">
                  <span>✦</span>
                  <p>{onThisDay.targetDate}의 기록은 아직 없어요.</p>
                </div>
              )}

              {isLoggedIn && !isLoadingOnThisDay && !onThisDayError && onThisDay && onThisDay.diaries.length > 0 && (
                <div className="on-this-day-list">
                  {onThisDay.diaries.map((diary) => (
                    <button
                      type="button"
                      className="on-this-day-card"
                      key={diary.id}
                      onClick={() => openDetail(diary.id)}
                    >
                      <small>{new Date(diary.createdAt).toLocaleDateString('ko-KR')}</small>
                      <strong>{diary.title ?? '제목 없는 일기'}</strong>
                      <span>{diary.content}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div><p className="eyebrow">EMOTION SNAPSHOT</p><h2>최근 마음의 흐름</h2></div>
                <button className="text-button" onClick={() => setView('report')}>리포트 보기 →</button>
              </div>
              <div className="trend-card">
                <div className="trend-icon">{dominantTrendEmotion ? emotionInfo[dominantTrendEmotion].icon : '📊'}</div>
                <div>
                  <strong>
                    {dominantTrendEmotion
                      ? `최근에는 ${emotionInfo[dominantTrendEmotion].label} 감정이 두드러져요`
                      : '아직 분석된 기록이 없어요'}
                  </strong>
                  <p>
                    {dominantTrendEmotion
                      ? '최근 7일 동안 기록된 감정 점수를 평균으로 보여줘요.'
                      : '일기를 작성하고 AI 분석을 실행하면 감정 흐름이 나타나요.'}
                  </p>
                </div>
              </div>
              {isLoadingTrend && <p>감정 흐름을 불러오는 중이에요...</p>}
              {trendLoadError && <p className="login-error">{trendLoadError}</p>}
              {!isLoadingTrend && !trendLoadError && (
                <div className="home-chart-area" onMouseLeave={() => setHoveredHomeTrendIndex(null)}>
                  <div className="bars" aria-label="최근 7일 감정 강도 그래프">
                    {(emotionTrend?.trends ?? []).map((trend, index) => {
                      const dominantEmotion = emotionKeys.reduce(
                        (current, emotion) =>
                          trend.scores[emotion] > trend.scores[current] ? emotion : current,
                        'JOY',
                      )
                      const score = trend.scores[dominantEmotion]

                      return (
                        <span
                          key={trend.date}
                          onMouseEnter={() => setHoveredHomeTrendIndex(index)}
                          style={{
                            height: `${score * 20}%`,
                            background: emotionInfo[dominantEmotion].color,
                          }}
                        />
                      )
                    })}
                  </div>

                  {hoveredHomeTrend && (() => {
                    const dominantEmotion = emotionKeys.reduce(
                      (current, emotion) =>
                        hoveredHomeTrend.scores[emotion] > hoveredHomeTrend.scores[current]
                          ? emotion
                          : current,
                      'JOY',
                    )
                    const score = hoveredHomeTrend.scores[dominantEmotion]
                    const left = ((hoveredHomeTrendIndex! + 0.5) / emotionTrend!.trends.length) * 100

                    return (
                      <div className="home-chart-tooltip" style={{ left: `${left}%` }}>
                        <strong>{hoveredHomeTrend.date}</strong>
                        <span>
                          <i style={{ backgroundColor: emotionInfo[dominantEmotion].color }} />
                          {emotionInfo[dominantEmotion].label} {score} / 5
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div><p className="eyebrow">RECENT DIARIES</p><h2>최근 기록</h2></div>
                <button className="text-button" onClick={() => setView('list')}>더보기 →</button>
              </div>
              <div className="diary-list">
                {!isLoggedIn && <p>로그인하면 최근 기록을 확인할 수 있어요.</p>}

                {isLoggedIn && isLoadingDiaries && (
                  <p>최근 기록을 불러오는 중이에요...</p>
                )}

                {isLoggedIn && diaryLoadError && (
                  <p className="login-error">{diaryLoadError}</p>
                )}

                {isLoggedIn && !isLoadingDiaries && !diaryLoadError && realDiaries.length === 0 && (
                  <p>아직 작성한 일기가 없어요.</p>
                )}

                {isLoggedIn && !isLoadingDiaries && !diaryLoadError &&
                  realDiaries.slice(0, 3).map((diary) => (
                    <button
                      type="button"
                      className="diary-card"
                      key={diary.id}
                      onClick={() => openDetail(diary.id)}
                    >
                      <span className="emotion-icon small">📖</span>
                      <span className="diary-card-copy">
                        <small>{new Date(diary.createdAt).toLocaleDateString('ko-KR')}</small>
                        <strong>{diary.title ?? '제목 없는 일기'}</strong>
                        <span>상세 화면에서 감정 분석 결과를 확인해요.</span>
                      </span>
                      <span className="arrow">›</span>
                    </button>
                  ))}
              </div>
            </section>
          </>
        )}

        {view === 'report' && (
          <section className="page-section report-page">
            <button className="back-button" onClick={() => setView('home')}>← 홈으로</button>
            <p className="eyebrow">EMOTION REPORT</p>
            <h1>마음 리포트</h1>
            <p className="report-description">기록한 감정의 변화를 날짜별로 살펴보세요.</p>

            <div className="period-toggle" role="group" aria-label="리포트 기간 선택">
              <button
                type="button"
                className={reportDays === 7 ? 'active' : ''}
                onClick={() => setReportDays(7)}
              >
                최근 7일
              </button>
              <button
                type="button"
                className={reportDays === 30 ? 'active' : ''}
                onClick={() => setReportDays(30)}
              >
                최근 30일
              </button>
            </div>

            {isLoadingReport && <p>감정 리포트를 불러오는 중이에요...</p>}
            {reportLoadError && <p className="login-error">{reportLoadError}</p>}

            {!isLoadingReport && !reportLoadError && reportTrend && (
              <>
                <section className="report-summary-card">
                  <span className="report-summary-icon">
                    {dominantReportEmotion ? emotionInfo[dominantReportEmotion].icon : '📝'}
                  </span>
                  <div>
                    <p>최근 {reportTrend.days}일의 대표 감정</p>
                    <strong>
                      {dominantReportEmotion
                        ? emotionInfo[dominantReportEmotion].label
                        : '아직 분석된 기록이 없어요'}
                    </strong>
                  </div>
                </section>

                <section className="report-chart-card">
                  <div className="report-card-heading">
                    <div>
                      <p className="eyebrow">EMOTION CHANGE</p>
                      <h2>감정 변화 그래프</h2>
                    </div>
                    <span>점수 0~5</span>
                  </div>

                  <div className="chart-legend">
                    {emotionKeys.map((emotion) => (
                      <span key={emotion} style={{ color: emotionInfo[emotion].color }}>
                        <i style={{ backgroundColor: emotionInfo[emotion].color }} />
                        {emotionInfo[emotion].label}
                      </span>
                    ))}
                  </div>

                  <div className="report-chart-area">
                    <svg
                      className="emotion-line-chart"
                      viewBox="0 0 320 168"
                      role="img"
                      aria-label={`최근 ${reportTrend.days}일 감정 점수 변화 그래프`}
                    >
                    {[0, 1, 2, 3, 4, 5].map((score) => {
                      const y = 16 + ((5 - score) / 5) * 124
                      return (
                        <g key={score}>
                          <line x1="26" x2="306" y1={y} y2={y} className="chart-grid-line" />
                          <text x="3" y={y + 4} className="chart-axis-label">{score}</text>
                        </g>
                      )
                    })}
                    {emotionKeys.map((emotion) => (
                      <polyline
                        key={emotion}
                        points={makeLinePoints(reportTrend.trends, emotion)}
                        fill="none"
                        stroke={emotionInfo[emotion].color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {reportTrend.trends.map((trend, index) => {
                      const graphWidth = 280
                      const graphLeft = 26
                      const interval = reportTrend.trends.length > 1
                        ? graphWidth / (reportTrend.trends.length - 1)
                        : graphWidth
                      const x = graphLeft + interval * index
                      const hitAreaWidth = Math.max(interval, 18)

                      return (
                        <rect
                          key={trend.date}
                          x={x - hitAreaWidth / 2}
                          y="16"
                          width={hitAreaWidth}
                          height="124"
                          fill="transparent"
                          onMouseEnter={() => setHoveredReportIndex(index)}
                          onMouseLeave={() => setHoveredReportIndex(null)}
                        />
                      )
                    })}
                    </svg>

                    <div className={`chart-date-labels days-${reportTrend.days}`}>
                      {reportTrend.trends.map((trend, index) => (
                        <span key={trend.date}>
                          {reportTrend.days === 7 || index % 5 === 0
                            ? trend.date.slice(5).replace('-', '/')
                            : ''}
                        </span>
                      ))}
                    </div>

                    {hoveredReport && (() => {
                      const maxScore = Math.max(...Object.values(hoveredReport.scores))
                      const graphX = reportTrend.trends.length > 1
                        ? 8.125 + (hoveredReportIndex! / (reportTrend.trends.length - 1)) * 87.5
                        : 50
                      const tooltipLeft = Math.max(22, Math.min(78, graphX))
                      const tooltipTop = 16 + ((5 - maxScore) / 5) * 124

                      return (
                        <div
                          className="report-chart-tooltip report-chart-tooltip-floating"
                          style={{ left: `${tooltipLeft}%`, top: `${tooltipTop}px` }}
                        >
                          <strong>{hoveredReport.date}</strong>
                          <div>
                            {emotionKeys.map((emotion) => (
                              <span key={emotion} style={{ color: emotionInfo[emotion].color }}>
                                <i style={{ backgroundColor: emotionInfo[emotion].color }} />
                                {emotionInfo[emotion].label} {hoveredReport.scores[emotion]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </section>

                <section className="report-score-card">
                  <div className="report-card-heading">
                    <div>
                      <p className="eyebrow">AVERAGE SCORES</p>
                      <h2>기간 평균 점수</h2>
                    </div>
                  </div>
                  <div className="report-score-list">
                    {emotionKeys.map((emotion) => (
                      <div className="report-score-row" key={emotion}>
                        <span>{emotionInfo[emotion].icon} {emotionInfo[emotion].label}</span>
                        <span className="report-score-track">
                          <i
                            style={{
                              width: `${reportAverageScores[emotion] * 20}%`,
                              backgroundColor: emotionInfo[emotion].color,
                            }}
                          />
                        </span>
                        <strong>{reportAverageScores[emotion].toFixed(1)}</strong>
                      </div>
                    ))}
                  </div>
                </section>

              </>
            )}
          </section>
        )}

        {view === 'list' && (
          <section className="page-section">
            <p className="eyebrow">MY ARCHIVE</p><h1>기록 달력</h1>

            {isLoadingDiaries && <p>일기를 불러오는 중이에요...</p>}
            {diaryLoadError && <p className="login-error">{diaryLoadError}</p>}

            {!isLoadingDiaries && !diaryLoadError && (
              <>
                <section className="calendar-card" aria-label="일기 기록 달력">
                  <div className="calendar-header">
                    <button
                      type="button"
                      aria-label="이전 달"
                      onClick={() => setCalendarMonth((month) =>
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )}
                    >
                      ‹
                    </button>
                    <strong>{formatMonth(calendarMonth)}</strong>
                    <button
                      type="button"
                      aria-label="다음 달"
                      onClick={() => setCalendarMonth((month) =>
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )}
                    >
                      ›
                    </button>
                  </div>

                  <div className="calendar-weekdays" aria-hidden="true">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
                  </div>

                  <div className="calendar-grid">
                    {calendarDates.map((day, index) => {
                      if (day === null) {
                        return <span className="calendar-empty" key={`empty-${index}`} />
                      }

                      const date = new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        day,
                      )
                      const dateKey = toDateKey(date)
                      const diaries = diariesByDate[dateKey] ?? []
                      const isToday = dateKey === toDateKey(new Date())
                      const isSelected = dateKey === selectedCalendarDate

                      return (
                        <button
                          className={`calendar-day${diaries.length > 0 ? ' has-diary' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                          type="button"
                          key={dateKey}
                          onClick={() => setSelectedCalendarDate(dateKey)}
                          aria-label={`${dateKey}, 기록 ${diaries.length}개`}
                        >
                          <span>{day}</span>
                          {diaries.length > 0 && <small>{diaries.length}</small>}
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="calendar-records section-block">
                  <div className="section-heading">
                    <h2>
                      {selectedCalendarDate
                        ? new Date(`${selectedCalendarDate}T00:00:00`).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                        })
                        : '날짜를 선택해 주세요'}
                    </h2>
                  </div>

                  {!selectedCalendarDate && <p>달력의 날짜를 누르면 그날 작성한 기록을 볼 수 있어요.</p>}
                  {selectedCalendarDate && selectedDateDiaries.length === 0 && <p>이 날짜에는 작성한 일기가 없어요.</p>}

                  <div className="diary-list">
                    {selectedDateDiaries.map((diary) => (
                      <button
                        type="button"
                        className="diary-card"
                        key={diary.id}
                        onClick={() => openDetail(diary.id)}
                      >
                        <span className="emotion-icon small">📖</span>
                        <span className="diary-card-copy">
                          <small>{new Date(diary.createdAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}</small>
                          <strong>{diary.title ?? '제목 없는 일기'}</strong>
                        </span>
                        <span className="arrow">›</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="search-section section-block">
                  <div className="section-heading">
                    <div><p className="eyebrow">SEARCH ARCHIVE</p><h2>기록 검색</h2></div>
                  </div>

                  <div className="diary-search-controls">
                    <input
                      type="search"
                      value={searchKeyword}
                      onChange={(event) => setSearchKeyword(event.target.value)}
                      placeholder="제목 또는 내용 검색"
                      aria-label="일기 키워드 검색"
                    />
                    <select
                      value={searchEmotion}
                      onChange={(event) => setSearchEmotion(event.target.value as Emotion | '')}
                      aria-label="감정 필터"
                    >
                      <option value="">모든 감정</option>
                      {emotionKeys.map((emotion) => (
                        <option key={emotion} value={emotion}>{emotionInfo[emotion].label}</option>
                      ))}
                    </select>
                  </div>

                  {isLoadingFilteredDiaries && <p>기록을 검색하는 중이에요...</p>}
                  {filteredDiaryError && <p className="login-error">{filteredDiaryError}</p>}
                  {!isLoadingFilteredDiaries && !filteredDiaryError && filteredDiaries.length === 0 && (
                    <p>조건에 맞는 기록이 없어요.</p>
                  )}

                  <div className="diary-list">
                    {!isLoadingFilteredDiaries && !filteredDiaryError && filteredDiaries.map((diary) => (
                      <button
                        type="button"
                        className="diary-card"
                        key={diary.id}
                        onClick={() => openDetail(diary.id)}
                      >
                        <span className="emotion-icon small">📖</span>
                        <span className="diary-card-copy">
                          <small>{new Date(diary.createdAt).toLocaleDateString('ko-KR')}</small>
                          <strong>{diary.title ?? '제목 없는 일기'}</strong>
                          <span>상세 화면에서 감정 분석 결과를 확인해요.</span>
                        </span>
                        <span className="arrow">›</span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
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
                                          <p>대표 감정 강도 {latestAnalysis.intensity} / 5</p>
                                      </div>
                                  </div>

                                  <p className="feedback">{latestAnalysis.feedback}</p>

                                  <section className="emotion-score-table" aria-label="감정별 점수">
                                      <p className="score-table-title">감정별 점수</p>

                                      {(Object.keys(emotionInfo) as Emotion[]).map((emotion) => {
                                          const info = emotionInfo[emotion]
                                          const score = latestAnalysis.scores[emotion] ?? 0

                                          return (
                                              <div className="emotion-score-row" key={emotion}>
                                                  <span className="score-emotion-label">
                                                      <span>{info.icon}</span>
                                                      {info.label}
                                                  </span>

                                                  <span className="score-track" aria-hidden="true">
                                                      <span
                                                          className="score-fill"
                                                          style={{ width: `${score * 20}%`, backgroundColor: info.color }}
                                                      />
                                                  </span>

                                                  <strong className="score-value">{score} / 5</strong>
                                              </div>
                                          )
                                      })}
                                  </section>

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
