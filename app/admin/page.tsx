'use client'

import { useEffect, useRef, useState } from 'react'
import { LEVEL_LIST } from '@/lib/level'
import { CATEGORIES, CATEGORY_FILTERS } from '@/lib/constants/categories'

// ─── Types ────────────────────────────────────────────────────────

type VirtualUser = {
  id: string
  name: string
  country: string | null
  avatarUrl: string | null
  email: string
  level: number
  levelName: string
}

type Stats = {
  totalBattles: number
  totalVotes: number
  totalRealUsers: number
  totalVirtualUsers: number
  categoryBreakdown: Record<string, number>
  recentBattles: { id: string; title: string; category: string; createdAt: string }[]
}

type SelectedVirtualUser = {
  id: string
  name: string
  country: string | null
}

// ─── Country Options ──────────────────────────────────────────────

const COUNTRIES = [
  { code: 'KR', label: '한국', flag: '🇰🇷' },
  { code: 'US', label: '미국', flag: '🇺🇸' },
  { code: 'JP', label: '일본', flag: '🇯🇵' },
  { code: 'CN', label: '중국', flag: '🇨🇳' },
  { code: 'GB', label: '영국', flag: '🇬🇧' },
  { code: 'DE', label: '독일', flag: '🇩🇪' },
  { code: 'FR', label: '프랑스', flag: '🇫🇷' },
  { code: 'BR', label: '브라질', flag: '🇧🇷' },
  { code: 'AU', label: '호주', flag: '🇦🇺' },
  { code: 'CA', label: '캐나다', flag: '🇨🇦' },
  { code: 'ES', label: '스페인', flag: '🇪🇸' },
  { code: 'IT', label: '이탈리아', flag: '🇮🇹' },
]

function countryFlag(code: string | null) {
  if (!code) return ''
  return COUNTRIES.find(c => c.code === code)?.flag ?? ''
}

// ─── Styles ───────────────────────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: '#EDE4DA', padding: '24px 16px', fontFamily: 'inherit' } as React.CSSProperties,
  card: { background: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid #D4C4B0' } as React.CSSProperties,
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#3D2B1F', marginBottom: 16 } as React.CSSProperties,
  label: { fontSize: 13, fontWeight: 600, color: '#5C4033', display: 'block', marginBottom: 4 } as React.CSSProperties,
  input: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D4C4B0', fontSize: 14, color: '#3D2B1F', background: '#FAF6F1', outline: 'none', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D4C4B0', fontSize: 14, color: '#3D2B1F', background: '#FAF6F1', outline: 'none', boxSizing: 'border-box' as const },
  primaryBtn: { backgroundColor: '#3D2B1F', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  secondaryBtn: { backgroundColor: '#D4C4B0', color: '#3D2B1F', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  dangerBtn: { backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  successBtn: { backgroundColor: '#22C55E', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  row: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' } as React.CSSProperties,
  fieldGroup: { display: 'flex', flexDirection: 'column' as const, flex: 1, gap: 4 },
  msg: (ok: boolean) => ({ fontSize: 13, color: ok ? '#16A34A' : '#DC2626', marginTop: 8 } as React.CSSProperties),
  statBox: { background: '#FAF6F1', borderRadius: 12, padding: '16px 20px', flex: 1, textAlign: 'center' as const, border: '1px solid #E5D8CC' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { padding: '8px 10px', textAlign: 'left' as const, borderBottom: '2px solid #E5D8CC', color: '#5C4033', fontWeight: 600 },
  td: { padding: '8px 10px', borderBottom: '1px solid #F0E8E0', color: '#3D2B1F' },
}

// ─── Main ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [authError, setAuthError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_authed')
    if (saved === '1') setAuthed(true)
    setChecking(false)
  }, [])

  async function handleLogin() {
    setAuthError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      sessionStorage.setItem('admin_authed', '1')
      sessionStorage.setItem('admin_password', pw)
      setAuthed(true)
    } else {
      setAuthError('비밀번호가 틀렸습니다')
    }
  }

  if (checking) return null

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#EDE4DA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: 320, border: '1px solid #D4C4B0', boxShadow: '0 4px 20px rgba(61,43,31,0.10)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#3D2B1F', marginBottom: 4 }}>관리자 패널</div>
          <div style={{ fontSize: 13, color: '#8C6E5D', marginBottom: 24 }}>Touched Admin</div>
          <label style={S.label}>비밀번호</label>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ ...S.input, marginBottom: 12 }}
            placeholder="관리자 비밀번호 입력"
            autoFocus
          />
          {authError && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{authError}</div>}
          <button onClick={handleLogin} style={{ ...S.primaryBtn, width: '100%', padding: '11px 0' }}>
            입장
          </button>
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}

// ─── Dashboard ────────────────────────────────────────────────────

function AdminDashboard() {
  const [virtualUsers, setVirtualUsers] = useState<VirtualUser[]>([])
  const [selectedVU, setSelectedVU] = useState<SelectedVirtualUser | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  function api(url: string, options?: RequestInit) {
    const pw = sessionStorage.getItem('admin_password') ?? ''
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pw}`,
        ...(options?.headers ?? {}),
      },
    })
  }

  async function loadUsers() {
    const res = await api('/api/admin/users')
    const data = await res.json()
    setVirtualUsers(data.users ?? [])
  }

  async function loadStats() {
    setStatsLoading(true)
    const res = await api('/api/admin/stats')
    const data = await res.json()
    setStats(data)
    setStatsLoading(false)
  }

  useEffect(() => {
    loadUsers()
    loadStats()
    const raw = sessionStorage.getItem('admin_virtual_user')
    if (raw) {
      try { setSelectedVU(JSON.parse(raw)) } catch {}
    }
  }, [])

  function selectVU(u: VirtualUser) {
    const vu = { id: u.id, name: u.name, country: u.country }
    setSelectedVU(vu)
    sessionStorage.setItem('admin_virtual_user', JSON.stringify(vu))
    window.dispatchEvent(new Event('admin_virtual_user_changed'))
  }

  function clearVU() {
    setSelectedVU(null)
    sessionStorage.removeItem('admin_virtual_user')
    window.dispatchEvent(new Event('admin_virtual_user_changed'))
  }

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#3D2B1F' }}>관리자 패널</div>
            <div style={{ fontSize: 13, color: '#8C6E5D' }}>Touched Admin Dashboard</div>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_authed')
              sessionStorage.removeItem('admin_password')
              window.location.reload()
            }}
            style={S.secondaryBtn}
          >
            로그아웃
          </button>
        </div>

        {/* 현재 작성자 */}
        <CurrentAuthorCard selected={selectedVU} onClear={clearVU} />

        {/* 가상 사용자 관리 */}
        <VirtualUserSection
          users={virtualUsers}
          onCreated={loadUsers}
          onDeleted={loadUsers}
          onSelect={selectVU}
          selectedId={selectedVU?.id}
          api={api}
        />

        {/* 더미 투표 생성 */}
        <DummyVoteSection api={api} />

        {/* 샘플 데이터 일괄 생성 */}
        <SampleDataSection api={api} virtualUsers={virtualUsers} onCreated={loadStats} />

        {/* 통계 대시보드 */}
        <StatsDashboard stats={stats} loading={statsLoading} onRefresh={loadStats} />
      </div>
    </div>
  )
}

// ─── Current Author Card ──────────────────────────────────────────

function CurrentAuthorCard({ selected, onClear }: { selected: SelectedVirtualUser | null; onClear: () => void }) {
  return (
    <div style={{ ...S.card, background: selected ? '#3D2B1F' : '#fff', border: selected ? 'none' : '1px solid #D4C4B0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: selected ? '#D4C4B0' : '#8C6E5D', marginBottom: 4 }}>
            현재 작성자
          </div>
          {selected ? (
            <div style={{ fontSize: 18, fontWeight: 700, color: '#EDE4DA' }}>
              {selected.name} {countryFlag(selected.country)}
            </div>
          ) : (
            <div style={{ fontSize: 15, color: '#8C6E5D' }}>실제 로그인 계정</div>
          )}
        </div>
        {selected && (
          <button onClick={onClear} style={{ backgroundColor: '#EDE4DA', color: '#3D2B1F', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            초기화
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Virtual User Section ─────────────────────────────────────────

function VirtualUserSection({
  users, onCreated, onDeleted, onSelect, selectedId, api,
}: {
  users: VirtualUser[]
  onCreated: () => void
  onDeleted: () => void
  onSelect: (u: VirtualUser) => void
  selectedId?: string
  api: (url: string, options?: RequestInit) => Promise<Response>
}) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('KR')
  const [levelName, setLevelName] = useState('실버')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) { setMsg({ ok: false, text: '닉네임을 입력하세요' }); return }
    setLoading(true); setMsg(null)
    const res = await api('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), country, levelName }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ ok: true, text: `"${data.user.name}" 생성 완료!` })
      setName('')
      onCreated()
    } else {
      setMsg({ ok: false, text: data.error ?? '오류 발생' })
    }
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 가상 유저를 삭제할까요?`)) return
    await api(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    onDeleted()
  }

  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>가상 사용자 관리</div>

      {/* Create form */}
      <div style={{ background: '#FAF6F1', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #E5D8CC' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#5C4033', marginBottom: 12 }}>가상 사용자 생성</div>
        <div style={S.row}>
          <div style={S.fieldGroup}>
            <label style={S.label}>닉네임</label>
            <input value={name} onChange={e => setName(e.target.value)} style={S.input} placeholder="김패션" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
        </div>
        <div style={S.row}>
          <div style={S.fieldGroup}>
            <label style={S.label}>국적</label>
            <select value={country} onChange={e => setCountry(e.target.value)} style={S.select}>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
              ))}
            </select>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>레벨</label>
            <select value={levelName} onChange={e => setLevelName(e.target.value)} style={S.select}>
              {LEVEL_LIST.map(l => (
                <option key={l.levelKey} value={l.levelName}>{l.emoji} {l.levelName}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleCreate} disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.6 : 1 }}>
          {loading ? '생성 중...' : '생성하기'}
        </button>
        {msg && <div style={S.msg(msg.ok)}>{msg.text}</div>}
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#8C6E5D', fontSize: 14 }}>
          생성된 가상 유저가 없습니다
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>닉네임</th>
              <th style={S.th}>국적</th>
              <th style={S.th}>레벨</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ background: u.id === selectedId ? '#FFF8F0' : undefined }}>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {u.avatarUrl && <img src={u.avatarUrl} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />}
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                    {u.id === selectedId && (
                      <span style={{ fontSize: 10, background: '#3D2B1F', color: '#EDE4DA', borderRadius: 6, padding: '1px 6px' }}>선택됨</span>
                    )}
                  </div>
                </td>
                <td style={S.td}>{countryFlag(u.country)} {u.country ?? '—'}</td>
                <td style={S.td}>{LEVEL_LIST.find(l => l.level === u.level)?.emoji ?? ''} {u.levelName ?? '아이언'}</td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => onSelect(u)}
                      style={u.id === selectedId ? S.secondaryBtn : S.successBtn}
                    >
                      {u.id === selectedId ? '선택됨' : '선택'}
                    </button>
                    <button onClick={() => handleDelete(u.id, u.name ?? '')} style={S.dangerBtn}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Dummy Vote Section ───────────────────────────────────────────

function DummyVoteSection({ api }: { api: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [battleId, setBattleId] = useState('')
  const [count, setCount] = useState('50')
  const [ratioA, setRatioA] = useState('60')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!battleId.trim()) { setMsg({ ok: false, text: '터치 ID를 입력하세요' }); return }
    const n = parseInt(count)
    if (!n || n < 1 || n > 1000) { setMsg({ ok: false, text: '투표 수는 1~1000 사이로 입력하세요' }); return }
    const a = parseInt(ratioA)
    if (isNaN(a) || a < 0 || a > 100) { setMsg({ ok: false, text: 'A 비율은 0~100 사이로 입력하세요' }); return }

    setLoading(true); setMsg(null)
    const res = await api('/api/admin/votes', {
      method: 'POST',
      body: JSON.stringify({ battleId: battleId.trim(), count: n, ratioA: a }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ ok: true, text: `투표 ${data.created}개 생성! (A: ${data.aCount}, B: ${data.bCount})` })
      setBattleId('')
    } else {
      setMsg({ ok: false, text: data.error ?? '오류 발생' })
    }
    setLoading(false)
  }

  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>더미 투표 데이터 생성</div>
      <div style={S.row}>
        <div style={S.fieldGroup}>
          <label style={S.label}>터치 ID (UUID)</label>
          <input value={battleId} onChange={e => setBattleId(e.target.value)} style={S.input} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </div>
      </div>
      <div style={S.row}>
        <div style={S.fieldGroup}>
          <label style={S.label}>투표 수</label>
          <input type="number" value={count} onChange={e => setCount(e.target.value)} style={S.input} min={1} max={1000} />
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>A 비율 (%)</label>
          <input type="number" value={ratioA} onChange={e => setRatioA(e.target.value)} style={S.input} min={0} max={100} placeholder="60 → A:B = 60:40" />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.6 : 1 }}>
        {loading ? '생성 중...' : '투표 생성'}
      </button>
      {msg && <div style={S.msg(msg.ok)}>{msg.text}</div>}
    </div>
  )
}

// ─── Sample Data Section ──────────────────────────────────────────

function SampleDataSection({
  api, virtualUsers, onCreated,
}: {
  api: (url: string, options?: RequestInit) => Promise<Response>
  virtualUsers: VirtualUser[]
  onCreated: () => void
}) {
  const [category, setCategory] = useState('all')
  const [count, setCount] = useState('5')
  const [vuId, setVuId] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Auto-select from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('admin_virtual_user')
    if (raw) {
      try { setVuId(JSON.parse(raw).id) } catch {}
    }
  }, [])

  async function handleSubmit() {
    if (!vuId) { setMsg({ ok: false, text: '가상 유저를 선택하세요' }); return }
    const n = parseInt(count)
    if (!n || n < 1 || n > 14) { setMsg({ ok: false, text: '개수는 1~14 사이로 입력하세요' }); return }

    setLoading(true); setMsg(null)
    const res = await api('/api/admin/battles', {
      method: 'POST',
      body: JSON.stringify({ category: category === 'all' ? null : category, count: n, virtualUserId: vuId }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ ok: true, text: `샘플 터치 ${data.created}개 생성 완료!` })
      onCreated()
    } else {
      setMsg({ ok: false, text: data.error ?? '오류 발생' })
    }
    setLoading(false)
  }

  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>샘플 데이터 일괄 생성</div>
      <div style={S.row}>
        <div style={S.fieldGroup}>
          <label style={S.label}>작성자 (가상 유저)</label>
          <select value={vuId} onChange={e => setVuId(e.target.value)} style={S.select}>
            <option value="">-- 선택 --</option>
            {virtualUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} {countryFlag(u.country)}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={S.row}>
        <div style={S.fieldGroup}>
          <label style={S.label}>카테고리</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={S.select}>
            {CATEGORY_FILTERS.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>개수 (최대 14)</label>
          <input type="number" value={count} onChange={e => setCount(e.target.value)} style={S.input} min={1} max={14} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#8C6E5D', marginBottom: 12 }}>
        이미지: picsum.photos 사용 (seed 기반 고정 이미지)
      </div>
      <button onClick={handleSubmit} disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.6 : 1 }}>
        {loading ? '생성 중...' : '생성하기'}
      </button>
      {msg && <div style={S.msg(msg.ok)}>{msg.text}</div>}
    </div>
  )
}

// ─── Stats Dashboard ──────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  fashion:    { label: '패션/코디', emoji: '👗' },
  appearance: { label: '외모비교', emoji: '💄' },
  love:       { label: '라이벌',   emoji: '💕' },
  shopping:   { label: '쇼핑/투자', emoji: '💰' },
  food:       { label: '음식/맛집', emoji: '🍽️' },
  it:         { label: 'IT/전자',  emoji: '📱' },
  decision:   { label: '고민/결정', emoji: '🤔' },
}

function StatsDashboard({ stats, loading, onRefresh }: { stats: Stats | null; loading: boolean; onRefresh: () => void }) {
  if (loading) {
    return (
      <div style={S.card}>
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#8C6E5D' }}>통계 로딩 중...</div>
      </div>
    )
  }

  const maxCategoryCount = stats ? Math.max(...Object.values(stats.categoryBreakdown), 1) : 1

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={S.sectionTitle as React.CSSProperties & { marginBottom: number }}>통계 대시보드</div>
        <button onClick={onRefresh} style={S.secondaryBtn}>새로고침</button>
      </div>

      {/* Stat boxes */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={S.statBox}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3D2B1F' }}>{stats?.totalBattles ?? 0}</div>
          <div style={{ fontSize: 12, color: '#8C6E5D', marginTop: 2 }}>총 터치</div>
        </div>
        <div style={S.statBox}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3D2B1F' }}>{stats?.totalVotes ?? 0}</div>
          <div style={{ fontSize: 12, color: '#8C6E5D', marginTop: 2 }}>총 투표</div>
        </div>
        <div style={S.statBox}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3D2B1F' }}>{stats?.totalRealUsers ?? 0}</div>
          <div style={{ fontSize: 12, color: '#8C6E5D', marginTop: 2 }}>실제 유저</div>
        </div>
        <div style={S.statBox}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3D2B1F' }}>{stats?.totalVirtualUsers ?? 0}</div>
          <div style={{ fontSize: 12, color: '#8C6E5D', marginTop: 2 }}>가상 유저</div>
        </div>
      </div>

      {/* Category bar chart */}
      {stats && Object.keys(stats.categoryBreakdown).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5C4033', marginBottom: 10 }}>카테고리별 터치 수</div>
          {Object.entries(stats.categoryBreakdown).map(([cat, cnt]) => {
            const meta = CATEGORY_META[cat] ?? { label: cat, emoji: '?' }
            const pct = Math.round((cnt / maxCategoryCount) * 100)
            return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 70, fontSize: 12, color: '#5C4033', flexShrink: 0 }}>
                  {meta.emoji} {meta.label}
                </div>
                <div style={{ flex: 1, background: '#F0E8E0', borderRadius: 6, height: 18, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, background: '#3D2B1F', height: '100%', borderRadius: 6, minWidth: cnt > 0 ? 4 : 0 }} />
                </div>
                <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: '#3D2B1F', textAlign: 'right' }}>{cnt}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent battles */}
      {stats && stats.recentBattles.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5C4033', marginBottom: 10 }}>최근 등록된 터치</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>제목</th>
                <th style={S.th}>카테고리</th>
                <th style={S.th}>등록일</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBattles.map(b => {
                const meta = CATEGORY_META[b.category] ?? { label: b.category, emoji: '?' }
                return (
                  <tr key={b.id}>
                    <td style={S.td}>
                      <a href={`/battles/${b.id}`} target="_blank" rel="noreferrer" style={{ color: '#3D2B1F', textDecoration: 'underline' }}>
                        {b.title}
                      </a>
                    </td>
                    <td style={S.td}>{meta.emoji} {meta.label}</td>
                    <td style={S.td}>{new Date(b.createdAt).toLocaleDateString('ko-KR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
