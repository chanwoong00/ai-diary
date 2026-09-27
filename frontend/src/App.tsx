import { FormEvent, useMemo, useState } from 'react'
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

type View = 'home' | 'list' | 'write' | 'detail'

export default function App() {
  const [diaries, setDiaries] = useState<Diary[]>(initialDiaries)
  const [view, setView] = useState<View>('home')
  const [selectedId, setSelectedId] = useState(1)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const selectedDiary = diaries.find((diary) => diary.id === selectedId) ?? diaries[0]
  const recentDiaries = useMemo(() => diaries.slice(0, 3), [diaries])

  function openDetail(id: number) {
    setSelectedId(id)
    setView('detail')
  }

  function saveDiary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return

    const diary: Diary = {
      id: Date.now(),
      title: title.trim(),
      content: content.trim(),
      createdAt: new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date()).replace(/\. /g, '. ').replace(/\.$/, ''),
      emotion: 'CALM',
      intensity: 3,
    }

    setDiaries((previous) => [diary, ...previous])
    setTitle('')
    setContent('')
    setSelectedId(diary.id)
    setView('detail')
  }

  function deleteDiary() {
    setDiaries((previous) => previous.filter((diary) => diary.id !== selectedDiary.id))
    setView('list')
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <button className="brand" onClick={() => setView('home')} aria-label="홈으로 이동">
          <span className="brand-mark">✦</span>
          <span>AI Diary</span>
        </button>
        <button className="profile-button" aria-label="프로필">민</button>
      </header>

      <section className="content">
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
            <div className="diary-list">{diaries.map((diary) => <DiaryCard key={diary.id} diary={diary} onClick={() => openDetail(diary.id)} />)}</div>
          </section>
        )}

        {view === 'write' && (
          <section className="page-section">
            <button className="back-button" onClick={() => setView('home')}>← 돌아가기</button>
            <p className="eyebrow">NEW DIARY</p><h1>오늘을 기록해요</h1>
            <form className="diary-form" onSubmit={saveDiary}>
              <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="오늘을 한마디로 표현하면?" maxLength={255} /></label>
              <label>내용<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="오늘 있었던 일과 마음을 자유롭게 적어주세요." rows={10} /></label>
              <p className="form-note">저장 후 AI가 감정과 짧은 피드백을 준비해요.</p>
              <button className="primary-button" type="submit">일기 저장하기 <span>→</span></button>
            </form>
          </section>
        )}

        {view === 'detail' && selectedDiary && (
          <section className="page-section detail-page">
            <button className="back-button" onClick={() => setView('list')}>← 목록으로</button>
            <p className="eyebrow">{selectedDiary.createdAt}</p><h1>{selectedDiary.title}</h1>
            <p className="diary-content">{selectedDiary.content}</p>
            <section className="analysis-card">
              <p className="eyebrow">AI EMOTION ANALYSIS</p>
              <div className="analysis-header"><span className="emotion-icon">{emotionInfo[selectedDiary.emotion].icon}</span><div><strong>{emotionInfo[selectedDiary.emotion].label}</strong><p>감정 강도 {selectedDiary.intensity} / 5</p></div></div>
              <p className="feedback">오늘의 기록에서 차분하게 상황을 돌아보려는 마음이 느껴져요. 스스로에게도 충분히 다정한 하루였으면 해요.</p>
            </section>
            <button className="delete-button" onClick={deleteDiary}>이 일기 삭제하기</button>
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
