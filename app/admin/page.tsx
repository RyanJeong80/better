'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LEVEL_LIST } from '@/lib/level'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'

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

type AdminTouchItem = {
  id: string
  title: string
  category: string
  createdAt: string
  imageAUrl: string
  imageBUrl: string
  userId: string
  userName: string | null
  userCountry: string | null
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

  function handleLogin() {
    const adminPw = process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.trim()
    const input = pw.trim()
    if (!adminPw) {
      setAuthError('환경변수 NEXT_PUBLIC_ADMIN_PASSWORD가 설정되지 않았습니다')
      return
    }
    if (input !== adminPw) {
      setAuthError('비밀번호가 틀렸습니다')
      return
    }
    sessionStorage.setItem('admin_authed', '1')
    sessionStorage.setItem('admin_password', input)
    setAuthed(true)
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
  const router = useRouter()
  const [virtualUsers, setVirtualUsers] = useState<VirtualUser[]>([])
  const [selectedVU, setSelectedVU] = useState<SelectedVirtualUser | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [touchFilterUserId, setTouchFilterUserId] = useState<string | null>(null)

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

  function saveVU(u: VirtualUser) {
    const vu = { id: u.id, name: u.name, country: u.country }
    setSelectedVU(vu)
    sessionStorage.setItem('admin_virtual_user', JSON.stringify(vu))
    window.dispatchEvent(new Event('adminUserChanged'))
  }

  function selectOnly(u: VirtualUser) {
    saveVU(u)
  }

  function selectAndGo(u: VirtualUser) {
    saveVU(u)
    router.push('/')
  }

  function clearVU() {
    setSelectedVU(null)
    sessionStorage.removeItem('admin_virtual_user')
    window.dispatchEvent(new Event('adminUserChanged'))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EDE4DA' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 56,
        backgroundColor: '#3D2B1F',
      }}>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#EDE4DA' }}>🔐 TOUCHED 관리자</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/')}
            style={{ backgroundColor: '#EDE4DA', color: '#3D2B1F', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            🏠 앱으로 가기
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('admin_authed'); sessionStorage.removeItem('admin_password'); window.location.reload() }}
            style={{ backgroundColor: 'rgba(237,228,218,0.15)', color: '#EDE4DA', border: '1px solid rgba(237,228,218,0.3)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Current author banner */}
      {selectedVU && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px', backgroundColor: '#FF6B35', color: '#fff',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            ✏️ 현재 작성자: {selectedVU.name} {countryFlag(selectedVU.country)}
          </span>
          <button
            onClick={clearVU}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            초기화
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* 가상 사용자 관리 */}
        <VirtualUserSection
          users={virtualUsers}
          onCreated={loadUsers}
          onDeleted={loadUsers}
          onSelectOnly={selectOnly}
          onSelectAndGo={selectAndGo}
          selectedId={selectedVU?.id}
          onFilterTouches={setTouchFilterUserId}
          api={api}
        />

        {/* 전체 터치 관리 */}
        <TouchManageSection
          api={api}
          filterUserId={touchFilterUserId}
          onClearFilter={() => setTouchFilterUserId(null)}
          onDeleted={loadStats}
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

// ─── Virtual User Section ─────────────────────────────────────────

function VirtualUserSection({
  users, onCreated, onDeleted, onSelectOnly, onSelectAndGo, selectedId, onFilterTouches, api,
}: {
  users: VirtualUser[]
  onCreated: () => void
  onDeleted: () => void
  onSelectOnly: (u: VirtualUser) => void
  onSelectAndGo: (u: VirtualUser) => void
  selectedId?: string
  onFilterTouches: (userId: string | null) => void
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
                    <button
                      onClick={() => onFilterTouches(u.id)}
                      style={{ fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#3D2B1F', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
                      title="이 유저의 터치만 필터"
                    >
                      {u.name}
                    </button>
                    {u.id === selectedId && (
                      <span style={{ fontSize: 10, background: '#3D2B1F', color: '#EDE4DA', borderRadius: 6, padding: '1px 6px' }}>선택됨</span>
                    )}
                  </div>
                </td>
                <td style={S.td}>{countryFlag(u.country)} {u.country ?? '—'}</td>
                <td style={S.td}>{LEVEL_LIST.find(l => l.level === u.level)?.emoji ?? ''} {u.levelName ?? '아이언'}</td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onSelectAndGo(u)}
                      style={{ backgroundColor: '#3D2B1F', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      선택 후 앱으로 →
                    </button>
                    <button
                      onClick={() => onSelectOnly(u)}
                      style={{ backgroundColor: u.id === selectedId ? '#FF6B35' : '#D4C4B0', color: u.id === selectedId ? '#fff' : '#3D2B1F', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {u.id === selectedId ? '✓ 선택됨' : '선택만'}
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

// ─── Touch Manage Section ─────────────────────────────────────────

function TouchManageSection({
  api, filterUserId, onClearFilter, onDeleted,
}: {
  api: (url: string, options?: RequestInit) => Promise<Response>
  filterUserId: string | null
  onClearFilter: () => void
  onDeleted: () => void
}) {
  const [allTouches, setAllTouches] = useState<AdminTouchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function loadAllTouches() {
    setLoading(true)
    const res = await api('/api/admin/battles')
    const data = await res.json()
    setAllTouches(data.battles ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAllTouches() }, [])

  async function handleDelete(touchId: string, title: string) {
    if (!confirm(`"${title}"을 삭제할까요? 투표, 좋아요도 모두 삭제됩니다.`)) return
    setMsg(null)
    const res = await api('/api/admin/battles', {
      method: 'DELETE',
      body: JSON.stringify({ id: touchId }),
    })
    if (res.ok) {
      setMsg({ ok: true, text: '삭제 완료' })
      loadAllTouches()
      onDeleted()
    } else {
      const data = await res.json()
      setMsg({ ok: false, text: data.error ?? '삭제 오류' })
    }
  }

  const filtered = allTouches.filter(t => {
    if (filterUserId && t.userId !== filterUserId) return false
    if (catFilter !== 'all' && t.category !== catFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return t.title.toLowerCase().includes(q) || (t.userName ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const catMeta = CATEGORY_META

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={S.sectionTitle as React.CSSProperties & { marginBottom: number }}>🗂️ 전체 터치 관리 ({filtered.length}/{allTouches.length})</div>
        <button onClick={loadAllTouches} style={{ ...S.secondaryBtn, padding: '5px 12px', fontSize: 12 }} disabled={loading}>
          {loading ? '로딩...' : '새로고침'}
        </button>
      </div>

      {filterUserId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 12px', background: '#FFF0E8', borderRadius: 8, border: '1px solid #FF6B35' }}>
          <span style={{ fontSize: 13, color: '#FF6B35', fontWeight: 600 }}>
            유저 필터 적용 중
          </span>
          <button onClick={onClearFilter} style={{ fontSize: 12, background: 'none', border: 'none', color: '#FF6B35', cursor: 'pointer', fontWeight: 700 }}>✕ 해제</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="제목 또는 유저명 검색..."
          style={{ ...S.input, flex: 1 }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...S.select, width: 'auto', flexShrink: 0 }}>
          <option value="all">전체</option>
          {Object.entries(catMeta).map(([key, meta]) => (
            <option key={key} value={key}>{meta.emoji} {meta.label}</option>
          ))}
        </select>
      </div>

      {msg && <div style={{ ...S.msg(msg.ok), marginBottom: 10 }}>{msg.text}</div>}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#8C6E5D', fontSize: 14 }}>
          {loading ? '로딩 중...' : '터치가 없습니다'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.map(t => {
            const meta = catMeta[t.category] ?? { label: t.category, emoji: '?' }
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 4px', borderBottom: '1px solid #F0E8E0',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3D2B1F', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, background: '#F0E8E0', borderRadius: 4, padding: '1px 5px', color: '#5C4033', flexShrink: 0 }}>
                      {meta.emoji} {meta.label}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8C6E5D', marginTop: 3 }}>
                    👤 {t.userName ?? '—'} {countryFlag(t.userCountry)}
                    {'  '}
                    {new Date(t.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(t.id, t.title)}
                  style={{ ...S.dangerBtn, marginLeft: 8, flexShrink: 0, fontSize: 12, padding: '5px 10px' }}
                >
                  🗑️ 삭제
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Dummy Vote Section ───────────────────────────────────────────

type TouchItem = { id: string; title: string; category: string }

function DummyVoteSection({ api }: { api: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [touches, setTouches] = useState<TouchItem[]>([])
  const [battleId, setBattleId] = useState('')
  const [count, setCount] = useState('50')
  const [ratioA, setRatioA] = useState('60')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [touchesLoading, setTouchesLoading] = useState(false)

  async function loadTouches() {
    setTouchesLoading(true)
    const res = await api('/api/admin/battles')
    const data = await res.json()
    setTouches(data.battles ?? [])
    setTouchesLoading(false)
  }

  useEffect(() => { loadTouches() }, [])

  async function handleSubmit() {
    if (!battleId) { setMsg({ ok: false, text: '터치를 선택하세요' }); return }
    const n = parseInt(count)
    if (!n || n < 1 || n > 1000) { setMsg({ ok: false, text: '투표 수는 1~1000 사이로 입력하세요' }); return }
    const a = parseInt(ratioA)
    if (isNaN(a) || a < 0 || a > 100) { setMsg({ ok: false, text: 'A 비율은 0~100 사이로 입력하세요' }); return }

    setLoading(true); setMsg(null)
    const res = await api('/api/admin/votes', {
      method: 'POST',
      body: JSON.stringify({ battleId, count: n, ratioA: a }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ ok: true, text: `투표 ${data.created}개 생성! (A: ${data.aCount}, B: ${data.bCount})` })
    } else {
      setMsg({ ok: false, text: data.error ?? '오류 발생' })
    }
    setLoading(false)
  }

  const catMeta = CATEGORY_META

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={S.sectionTitle as React.CSSProperties & { marginBottom: number }}>더미 투표 데이터 생성</div>
        <button onClick={loadTouches} style={{ ...S.secondaryBtn, padding: '5px 12px', fontSize: 12 }} disabled={touchesLoading}>
          {touchesLoading ? '로딩...' : '목록 새로고침'}
        </button>
      </div>
      <div style={S.row}>
        <div style={S.fieldGroup}>
          <label style={S.label}>터치 선택 ({touches.length}개)</label>
          <select
            value={battleId}
            onChange={e => setBattleId(e.target.value)}
            style={S.select}
            disabled={touchesLoading}
          >
            <option value="">-- 터치 선택...</option>
            {touches.map(t => {
              const meta = catMeta[t.category] ?? { label: t.category, emoji: '?' }
              return (
                <option key={t.id} value={t.id}>
                  {meta.emoji} [{meta.label}] {t.title} ({t.id.slice(0, 8)}…)
                </option>
              )
            })}
          </select>
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
