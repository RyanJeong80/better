# Better — 프로젝트 가이드

두 사진을 업로드하면 다른 사람들이 투표하는 소셜 비교 투표 앱.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript + React 19 |
| Database | Supabase (PostgreSQL) + Drizzle ORM |
| Auth | Supabase Auth (이메일/비밀번호) |
| Storage | Supabase Storage (`battle-images` 버킷) |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Validation | Zod |
| Icons | Lucide React |
| Deployment | Vercel |

---

## 환경 변수

`.env.local` 파일에 아래 값 필요:

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
DATABASE_URL=postgresql://[user]:[password]@[host]/[db]
```

---

## 초기 셋업 체크리스트

- [ ] `.env.local` 값 입력
- [ ] `npm run db:generate && npm run db:migrate` 실행
- [ ] Supabase Storage에서 `battle-images` 버킷 생성 (public)
- [ ] Supabase Realtime에서 `votes` 테이블 활성화

---

## 디렉토리 구조

```
app/
├── layout.tsx                  # 루트 레이아웃 (폰트, 메타데이터)
├── globals.css                 # 전역 스타일 (Tailwind v4 테마, CSS 변수)
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (main)/
│   ├── layout.tsx              # Header + BottomNav
│   ├── page.tsx                # 홈 (기능 카드)
│   ├── battles/
│   │   ├── new/page.tsx        # 배틀 생성 (로그인 필요)
│   │   └── [id]/page.tsx       # 배틀 상세
│   ├── explore/page.tsx        # 랜덤 배틀 탐색
│   ├── hot/page.tsx            # 좋아요 Top 100
│   ├── ranking/page.tsx        # 유저 랭킹
│   └── profile/page.tsx        # 내 프로필 (로그인 필요)
└── api/auth/callback/route.ts  # Supabase OAuth 콜백

actions/
├── auth.ts                     # signIn, signUp, signOut
├── battles.ts                  # createBattle, getRandomBattle, getBattles
├── votes.ts                    # castVote, submitVote, getVoteCounts
└── likes.ts                    # toggleLike

components/
├── auth/                       # LoginForm, SignupForm
├── battles/                    # BattleVote, CreateBattleForm, MyBetterCard, RandomBetterViewer
├── home/                       # AnimatedWord
├── layout/                     # Header, BottomNav
└── ranking/                    # RankingView

lib/
├── db/
│   ├── schema.ts               # Drizzle 스키마
│   └── index.ts                # Drizzle 인스턴스 (lazy proxy)
└── supabase/
    ├── client.ts               # 브라우저용 클라이언트
    └── server.ts               # 서버용 클라이언트

hooks/
└── use-realtime-votes.ts       # Supabase Realtime 실시간 투표 수

types/index.ts                  # VoteChoice, BattleWithStats 등
proxy.ts                        # 인증 미들웨어 (Next.js 16)
```

---

## DB 스키마

```
users       id, email, name, avatarUrl, createdAt
battles     id, userId(FK), title, imageAUrl, imageADescription, imageBUrl, imageBDescription, createdAt, closedAt
votes       id, battleId(FK), voterId(FK), choice(A|B), reason, createdAt
likes       id, battleId(FK), userId(FK), createdAt
```

---

## 라우트 보호

`proxy.ts` (Next.js 16에서 `middleware.ts` 대신 사용, export 함수명도 `proxy`):

- **보호 경로**: `/battles/new`, `/profile` → 미인증 시 `/login` 리다이렉트
- **Auth 경로**: `/login`, `/signup` → 인증 상태 시 `/` 리다이렉트
- Supabase 미연결 시 인증 체크 건너뜀 (개발 편의)

---

## 주요 패턴

### Server Action 폼
```tsx
// useActionState (React 19) + useFormStatus 패턴
const [state, action] = useActionState(signIn, null)
// action 시그니처: (prevState, formData) => Promise<State>
```

### 실시간 투표
```tsx
// BattleVote (클라이언트) + useRealtimeVotes 훅
const { voteCounts } = useRealtimeVotes(battleId, initialCounts)
```

### 이미지
```tsx
// Next.js <img> 직접 사용 (next.config.ts에 supabase.co remotePatterns 등록됨)
<img src={imageUrl} alt="..." />
```

### DB 연결
```ts
// lib/db/index.ts — Proxy로 lazy 초기화 (DATABASE_URL 없어도 앱 실행 가능)
```

---

## 폰트 설정

`next/font/google`으로 자체 호스팅 (런타임 Google 서버 요청 없음):

| 언어 | 폰트 | 로드 방식 |
|------|------|-----------|
| 영어 | Plus Jakarta Sans | `next/font/google` |
| 한국어 | Pretendard Variable | CDN (`cdn.jsdelivr.net/npm/pretendard`) |
| 일본어 | M PLUS Rounded 1c | `next/font/google` |
| 중국어 | Noto Sans SC | `next/font/google` |

CSS 변수: `--font-plus-jakarta`, `--font-m-plus`, `--font-noto-sc`
fallback chain: `var(--font-plus-jakarta), 'Pretendard Variable', var(--font-m-plus), var(--font-noto-sc), sans-serif`

---

## 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run db:generate  # Drizzle 마이그레이션 파일 생성
npm run db:migrate   # 마이그레이션 실행
npm run db:studio    # Drizzle Studio 열기
```

---

## 구현 현황

### 완료
- 인증 (이메일/비밀번호 로그인·회원가입·로그아웃)
- 배틀 생성 (이미지 2장 업로드 + 제목/설명)
- A/B 투표 (중복 방지, 이유 입력 옵션)
- 실시간 투표 수 (Supabase Realtime)
- 랜덤 탐색 (본인 배틀·이미 투표한 배틀 제외)
- 좋아요 토글 + Hot 100 랭킹
- 유저 랭킹 (참여 수 / 투표 적중률)
- 프로필 (내 배틀, 통계, 받은 투표 이유)
- 모바일 반응형 (하단 네비게이션)
- Supabase 미연결 시 목 데이터로 graceful degradation

### 미구현
- 배틀 삭제 / 마감 (`closedAt` 필드 있으나 미사용)
- 유저 검색 / 팔로우
- 신고·모더레이션
- 배틀 카테고리·태그
