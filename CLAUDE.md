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

# Transaction Pooler (로컬 + Vercel 공통)
# 로컬 IPv6 문제로 Direct Connection(5432) 사용 불가 → 6543 사용
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

# Direct connection — drizzle-kit 전용 (실제 마이그레이션은 SQL Editor에서 직접 실행)
DIRECT_DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

---

## 초기 셋업 체크리스트

- [ ] `.env.local` 값 입력
- [ ] 마이그레이션: `drizzle/run-in-supabase-sql-editor.sql` 을 Supabase SQL Editor에서 실행
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
│   │   ├── new/page.tsx        # 터치 생성 (로그인 필요)
│   │   └── [id]/page.tsx       # 터치 상세
│   ├── explore/page.tsx        # 랜덤 터치 탐색
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
npm run db:generate  # Drizzle 마이그레이션 파일 생성 (파일만 생성, DB 미적용)
npm run db:studio    # Drizzle Studio 열기
```

> **마이그레이션 실행 방법**
> `npm run db:migrate` 는 로컬 IPv6 문제 + Transaction Pooler 제약으로 사용 불가.
> 스키마 변경 시:
> 1. `npm run db:generate` 로 SQL 파일 생성
> 2. 생성된 `drizzle/NNNN_xxx.sql` 내용을 [Supabase SQL Editor](https://supabase.com/dashboard/project/bdhgfivommfztnhrrtjc/sql/new) 에서 직접 실행

---

## 구현 현황

### 완료
- 인증 (이메일/비밀번호 로그인·회원가입·로그아웃)
- Google OAuth 로그인 (Supabase Auth)
- 터치 생성 (이미지 2장 클라이언트 직접 업로드 → URL만 Server Action에 전달)
- A/B 투표 (중복 방지, 이유 입력 옵션)
- 실시간 투표 수 (Supabase Realtime)
- 랜덤 탐색 (본인 터치·이미 투표한 터치 제외, sessionStorage로 중복 방지)
- 좋아요 토글 + Hot 100 랭킹 ("Hot100에 추천하기" 문구 포함)
- 유저 랭킹 (참여 수 / 투표 적중률)
- 프로필 (내 터치, 통계, 받은 투표 이유)
- 모바일 반응형 (하단 네비게이션)
- 홈 피처 카드 전체 클릭 가능 (제목·썸네일·내용 모두 링크)
- 이미지 업로드 시 canvas 리사이징 (1280px, JPEG 0.82) + blob URL 메모리 관리
- 업로드 성공 후 홈 자동 리다이렉트 (메모리 해제)

### 미구현
- 터치 삭제 / 마감 (`closedAt` 필드 있으나 미사용)
- 유저 검색 / 팔로우
- 신고·모더레이션
- 터치 카테고리·태그

---

## 주요 버그 수정 이력 (Vercel 배포)

### DB 연결
- **증상**: Vercel에서 INSERT 쿼리 `Failed query` / 로컬에서 `EHOSTUNREACH`
- **원인**: Supabase 직접 연결(5432)은 IPv6 전용 → 로컬·Vercel 일부 리전 미지원
- **해결**: 로컬·Vercel 모두 Transaction Pooler URL(포트 6543) 사용
- `lib/db/index.ts` 옵션: `prepare: false`(PgBouncer 호환), `ssl: false`(Pooler는 SSL 불필요)
- 마이그레이션만 Direct Connection 필요 → SQL Editor에서 직접 실행

### public.users FK 제약
- **증상**: 투표·좋아요·터치 생성 시 FK constraint 오류
- **원인**: OAuth 로그인 시 `public.users`에 유저가 생성되지 않음
- **해결**:
  1. Supabase SQL Editor에서 `auth.users` INSERT 트리거 생성 (아래 참고)
  2. `actions/battles.ts`, `actions/votes.ts`, `actions/likes.ts`에 user upsert 추가 (실패해도 non-fatal)
  3. `app/api/auth/callback/route.ts`에서 `onConflictDoUpdate`로 name/avatarUrl 갱신

### Supabase Storage RLS
- **증상**: 이미지 업로드 시 "new row violates row-level security policy"
- **해결**: SQL Editor에서 `storage.objects`에 정책 추가
  ```sql
  CREATE POLICY "authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'battle-images');
  CREATE POLICY "public read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'battle-images');
  ```

---

## Supabase 트리거 (auth.users → public.users 자동 동기화)

SQL Editor에서 실행:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
