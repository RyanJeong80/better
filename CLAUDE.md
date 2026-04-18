# Touched — 프로젝트 가이드

두 사진을 업로드하면 다른 사람들이 투표하는 소셜 비교 투표 앱.
앱 이름: **Touched** (이전: Better)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript + React 19 |
| Database | Supabase (PostgreSQL) + Drizzle ORM |
| Auth | Supabase Auth (이메일/비밀번호 + Google OAuth) |
| Storage | Supabase Storage (`battle-images` 버킷) |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS v4 + shadcn/ui |
| i18n | next-intl (6개 언어: ko, en, ja, zh, es, fr) |
| Icons | Lucide React |
| Deployment | Vercel |
| PWA | @ducanh2912/next-pwa |
| Native | Capacitor (Android/iOS) |
| Translation | DeepL API (`deepl-node`) |

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

# DeepL 번역 API
DEEPL_API_KEY=your_deepl_api_key

# 관리자 페이지
ADMIN_PASSWORD=your_admin_password          # 서버 전용 (API 라우트 인증)
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password  # 클라이언트 (어드민 페이지 로그인 체크)
```

---

## 초기 셋업 체크리스트

- [ ] `.env.local` 값 입력
- [ ] 마이그레이션: `drizzle/run-in-supabase-sql-editor.sql` 을 Supabase SQL Editor에서 실행
- [ ] 텍스트 전용 터치 컬럼 마이그레이션 (아래 참고)
- [ ] Supabase Storage에서 `battle-images` 버킷 생성 (public)
- [ ] Supabase Realtime에서 `votes` 테이블 활성화
- [ ] `public/icons/` 에 아이콘 파일 배치 (icon-192x192.png, icon-512x512.png, icon-1024x1024.png)

---

## 디렉토리 구조

```
app/
├── layout.tsx                  # 루트 레이아웃 (폰트, 메타데이터, PWA)
├── globals.css                 # 전역 스타일
├── privacy/page.tsx            # 개인정보처리방침 (/privacy)
├── admin/
│   ├── layout.tsx              # pass-through (루트 레이아웃 상속)
│   └── page.tsx                # 관리자 패널 (비밀번호 보호, 클라이언트 전용)
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx         # 개인정보처리방침 동의 체크박스 포함
├── (main)/
│   ├── layout.tsx              # pass-through
│   ├── page.tsx                # 홈 (4패널 스와이프: 랜덤/Hot/랭킹/프로필)
│   ├── battles/
│   │   ├── new/page.tsx        # 터치 생성 (로그인 필요)
│   │   └── [id]/page.tsx       # 터치 상세
│   ├── explore/page.tsx        # 랜덤 터치 탐색
│   ├── hot/page.tsx            # 좋아요 Top 100
│   ├── ranking/page.tsx        # 유저 랭킹
│   └── profile/page.tsx        # 내 프로필 (로그인 필요)
└── api/
    ├── auth/callback/route.ts          # Supabase OAuth 콜백
    ├── translate/route.ts              # DeepL 번역 API
    ├── user/profile/route.ts           # 프로필 데이터
    ├── user/profile/voted/route.ts     # 내가 투표한 터치 목록 (VotedBattle[])
    ├── user/profile/liked/route.ts     # 내가 좋아요한 터치 목록 (LikedBattle[])
    ├── panels/hot/route.ts             # Hot 패널 데이터
    └── admin/
        ├── auth/route.ts               # 관리자 비밀번호 검증 (POST)
        ├── users/route.ts              # 가상 유저 CRUD (GET/POST/DELETE)
        ├── votes/route.ts              # 더미 투표 생성 (POST)
        ├── battles/route.ts            # 터치 목록 조회(GET) + 샘플 생성(POST)
        └── stats/route.ts              # 통계 대시보드 (GET)

actions/
├── auth.ts                     # signIn, signUp, signOut, signInWithGoogle
├── battles.ts                  # createBattle, getRandomBattle, getBattles, deleteBattle, saveBattle
├── votes.ts                    # castVote, submitVote, getVoteCounts
└── likes.ts                    # toggleLike, getMyLikedBattleIds

components/
├── auth/                       # LoginForm, SignupForm
├── battles/                    # BattleVote, CreateBattleForm, CreateModal, MyBetterCard, RandomBetterViewer
├── home/                       # HomeBetterViewer, HotPanelClient, SplashScreen 등
├── layout/                     # SwipeSections (실제 네비바), VirtualUserBadge (미사용 Header도 존재)
├── profile/                    # ProfilePanelClient, ProfileBetterList, VotedBetterList, LikedBetterList
└── ranking/                    # RankingView

lib/
├── db/
│   ├── schema.ts               # Drizzle 스키마
│   └── index.ts                # Drizzle 인스턴스 (lazy proxy)
├── constants/
│   ├── categories.ts           # BetterCategory, CATEGORY_MAP, CATEGORY_FILTERS
│   └── text-colors.ts          # TEXT_BG_COLORS, getTextColorIdx
└── supabase/
    ├── client.ts               # 브라우저용 클라이언트
    └── server.ts               # 서버용 클라이언트

hooks/
└── use-realtime-votes.ts       # Supabase Realtime 실시간 투표 수

public/
├── manifest.json               # PWA 매니페스트
├── favicon-16x16.png
├── favicon-32x32.png
└── icons/
    ├── icon-192x192.png
    ├── icon-512x512.png
    └── icon-1024x1024.png

capacitor.config.ts             # Capacitor 설정 (Android/iOS)
android/                        # Android 네이티브 프로젝트
ios/                            # iOS 네이티브 프로젝트
proxy.ts                        # 인증 미들웨어 (Next.js 16)
```

---

## DB 스키마

```
users       id, email, name, avatarUrl, createdAt
betters     id, userId(FK), title, description,
            imageAUrl, imageADescription,
            imageBUrl, imageBDescription,
            imageAText, imageBText, isTextOnly,   ← 텍스트 전용 컬럼
            category, closedAt, winner, createdAt
votes       id, betterId(FK), voterId(FK), choice(A|B), reason, createdAt
likes       id, betterId(FK), userId(FK), createdAt
userStats   userId(FK), totalVotes, accuracyRate, 카테고리별 정확도...
```

### 텍스트 전용 터치 마이그레이션 (미실행 시 실행 필요)

```sql
ALTER TABLE betters
ADD COLUMN IF NOT EXISTS image_a_text text,
ADD COLUMN IF NOT EXISTS image_b_text text,
ADD COLUMN IF NOT EXISTS is_text_only boolean NOT NULL DEFAULT false;
```

### description 컬럼 마이그레이션 (미실행 시 실행 필요)

```sql
ALTER TABLE betters
ADD COLUMN IF NOT EXISTS description text;
```

---

## 라우트 보호

`proxy.ts` (Next.js 16에서 `middleware.ts` 대신 사용, export 함수명도 `proxy`):

- **보호 경로**: `/battles/new`, `/profile` → 미인증 시 `/login` 리다이렉트
- **Auth 경로**: `/login`, `/signup` → 인증 상태 시 `/` 리다이렉트
- `/privacy` — 공개 접근 가능
- `/admin` — **Supabase 세션 처리 완전 제외** (matcher에서도 제외). 자체 비밀번호로 보호 (sessionStorage)
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

### 텍스트 전용 터치 색상
```ts
// lib/constants/text-colors.ts
// UUID에서 결정론적으로 색상 인덱스 도출 (DB 컬럼 없이)
getTextColorIdx(id, 0 | 1)  // side: 0=A, 1=B
```

### 번역 (DeepL)
```ts
// app/api/translate/route.ts
// POST { texts: string[], target: string }
// 모듈 레벨 Map 캐시, 실패 시 원문 반환

// 배치 구성 (배틀 1개당 4개 텍스트):
// [title, imageADescription/imageAText, imageBDescription/imageBText, description]
// 인덱스: i*4+0, i*4+1, i*4+2, i*4+3
// → hot-panel-client.tsx, random-better-viewer.tsx 동일 순서
```

### 좋아요 상태 영속성 (RandomBetterViewer)
```ts
// components/battles/random-better-viewer.tsx
// 스와이프 후 돌아와도 좋아요 상태가 초기화되지 않도록 useRef<Map> 사용
const likedMap = useRef<Map<string, boolean>>(new Map())
const likeCountMap = useRef<Map<string, number>>(new Map())
const [, setLikeStateVersion] = useState(0) // Map 변경 시 re-render 트리거

// 마운트 시 서버에서 전체 좋아요 ID 로드
useEffect(() => {
  getMyLikedBattleIds().then(ids => {
    ids.forEach(id => likedMap.current.set(id, true))
    setLikeStateVersion(v => v + 1)
  })
}, [])

// 파생값 (매 렌더마다 Map에서 읽음)
const isLiked = battle ? (likedMap.current.get(battle.id) ?? battle.isLiked) : false
const likeCount = battle ? (likeCountMap.current.get(battle.id) ?? battle.likeCount) : 0
// handleNext/handlePrev에서 setIsLiked/setLikeCount 제거 — Map이 단일 출처
```

### CSS transform 안 fixed 포지셔닝
```tsx
// SwipeSections가 transform: translateX() 사용 → position:fixed 요소가 뷰포트 기준 아님
// 해결: createPortal(dialog, document.body) 사용
import { createPortal } from 'react-dom'
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
{mounted && createPortal(<Dialog />, document.body)}
```

### 관리자 페이지 (/admin)
```
접근: NEXT_PUBLIC_ADMIN_PASSWORD 클라이언트 직접 비교 → sessionStorage('admin_authed'='1')
API 인증: Authorization: Bearer {password} 헤더 → ADMIN_PASSWORD 서버 비교
가상 유저: public.users에 email='virtual_*@touched.local' 패턴으로 INSERT
          auth.users 없이 public.users만 생성 (Supabase 인증 불필요)
세션 보호: proxy.ts에서 /admin 완전 제외 (Supabase 쿠키 간섭 방지)
이동: router.push('/') 사용 (window.location.href는 SSR 세션 손실 가능)

터치 관리 섹션:
- GET /api/admin/battles: 전체 터치 + users 조인(userName, userCountry, imageAUrl, imageBUrl)
- DELETE /api/admin/battles: DB 삭제(CASCADE) + Storage 이미지 삭제(SUPABASE_SERVICE_ROLE_KEY 필요)
- 가상 유저 목록에서 유저명 클릭 → 해당 유저 터치만 필터 (touchFilterUserId 상태 공유)

가상 유저 프로필:
- GET /api/admin/profile?userId=xxx (admin 인증): 임의 유저의 UserProfileData 반환
- profile-panel-client.tsx: sessionStorage('admin_virtual_user') 감지 → admin profile API 호출
- 가상 유저 모드: 아바타/이름 정적 표시, 로그아웃 버튼 숨김, 탭은 '내 터치'만 표시
```

### 가상 유저 선택 및 전파
```ts
// sessionStorage 키: 'admin_virtual_user'
// { id, name, country }
// 이벤트: window.dispatchEvent(new Event('adminUserChanged'))
// 구독처: swipe-sections.tsx (네비바 배지), create-modal.tsx (모달 배너)

// 만들기 폼에서 가상 유저 ID 주입 (create-battle-form.tsx handleSubmit)
const virtualUserJson = sessionStorage.getItem('admin_virtual_user')
const adminPw = sessionStorage.getItem('admin_password')
if (virtualUserJson && adminPw) {
  formData.set('virtualUserId', JSON.parse(virtualUserJson).id)
  formData.set('adminToken', adminPw)
}

// saveBattle (actions/battles.ts)에서 토큰 검증
// useVirtualUser=true이면 Supabase auth 로그인 체크 우회 가능
const useVirtualUser = virtualUserId && adminToken &&
  (adminToken === ADMIN_PASSWORD || adminToken === NEXT_PUBLIC_ADMIN_PASSWORD)
if (!user && !useVirtualUser) redirect('/login')
```

### 삭제 기능 패턴
```ts
// actions/battles.ts — deleteBattle(id)
// 1. 소유권 확인 (userId 매칭)
// 2. DB 삭제 (CASCADE → votes, likes 자동 삭제)
// 3. Storage 이미지 삭제 (URL에서 경로 추출)
// 반환: { success: true } | { error: string }
```

---

### 프로필 탭 구조 (5탭)
```
ProfilePanelClient 탭 순서:
  내 터치 (touches) → ProfileBetterList
  내가 투표한 (voted) → VotedBetterList  ← /api/user/profile/voted
  좋아요한 터치 (liked) → LikedBetterList ← /api/user/profile/liked
  팔로잉 (following)
  팔로워 (followers)

탭 스타일: #D4C4B0 배경 pill 컨테이너, 활성 탭 흰색 pill
```

### 터치 생성 (closedAt)
```ts
// create-battle-form.tsx
// DURATION_PRESETS: 1/3/7/14일 + 직접입력(1~90일), 기본값 7일
// handleSubmit에서 closedAt 계산 후 formData에 포함
const closedAt = new Date()
closedAt.setDate(closedAt.getDate() + durationDays)
formData.set('closedAt', closedAt.toISOString())

// saveBattle (actions/battles.ts)에서 파싱 후 DB insert
const closedAt = closedAtStr ? new Date(closedAtStr) : null
```

### UI 스타일 원칙
```
- 모달/폼 내 버튼은 Tailwind 클래스 대신 inline style 사용
  (Tailwind primary 색상이 테마에 따라 흰 배경에 흰 텍스트로 보일 수 있음)
- 활성 버튼: backgroundColor '#3D2B1F', color '#ffffff'
- 비활성/조건미충족 버튼: backgroundColor '#D4C4B0', color '#3D2B1F'
- 미리보기 하단 sticky 버튼 컨테이너: backgroundColor '#EDE4DA', borderTop '1px solid #D4C4B0'

- 앱 최상단 TOUCHED 로고 (components/layout/swipe-sections.tsx):
  fontWeight: 700 (Bold), letterSpacing: '0.15em', color: '#3D2B1F', fontSize: '20px'
```

---

## 홈 화면 구조 (4패널 스와이프)

`components/layout/swipe-sections.tsx`:
- 패널 0: 랜덤 터치 (RandomBetterViewer)
- 패널 1: Hot Touched (HotPanelClient)
- 패널 2: 랭킹 (RankingView)
- 패널 3: 프로필 (ProfilePanelClient)
- 하단 고정 인디케이터: `position: fixed` (transform 영향 받지 않도록 SwipeSections 외부)
- 코멘트 입력 시 인디케이터 숨김 (`hideIndicator` prop)

---

## PWA 설정

- `next.config.ts`: `@ducanh2912/next-pwa` (개발 환경 비활성)
- `public/manifest.json`: name "Touched", theme_color "#ffffff"
- `app/layout.tsx`: manifest, appleWebApp, icons, viewport(themeColor) 설정
- 빌드 시 `public/sw.js`, `public/workbox-*.js` 자동 생성 (.gitignore 권장)

---

## Capacitor 설정

```ts
// capacitor.config.ts
appId: 'com.touched.app'
appName: 'Touched'
webDir: 'out'
server.url: 'https://better-ivory.vercel.app'  // 웹뷰로 Vercel 앱 로드
plugins.SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: '#EDE4DA',
  androidSplashResourceName: 'splash',
  showSpinner: false,
}
```

```bash
npm run cap:sync     # npx cap sync
npm run cap:android  # Android Studio 열기
npm run cap:ios      # Xcode 열기
```

스플래시 이미지 경로:
- Android: `android/app/src/main/res/drawable/splash.png`
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`

---

## 개인정보처리방침

- 경로: `/privacy` (`app/privacy/page.tsx`)
- 6개 언어 지원 (`messages/*.json`의 `privacy` 네임스페이스)
- 프로필 패널 하단에 링크
- 회원가입 폼에 동의 체크박스 (미동의 시 버튼 비활성)

---

## 폰트 설정

`next/font/google`으로 자체 호스팅:

| 언어 | 폰트 | 로드 방식 |
|------|------|-----------|
| 영어 | Plus Jakarta Sans | `next/font/google` |
| 한국어 | Pretendard Variable | CDN (`cdn.jsdelivr.net/npm/pretendard`) |
| 일본어 | M PLUS Rounded 1c | `next/font/google` |
| 중국어 | Noto Sans SC | `next/font/google` |

---

## 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run db:generate  # Drizzle 마이그레이션 파일 생성
npm run db:studio    # Drizzle Studio 열기
npm run cap:sync     # Capacitor 동기화
npm run cap:android  # Android Studio 열기
npm run cap:ios      # Xcode 열기
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
- 텍스트 전용 터치 (isTextOnly, imageAText, imageBText)
- A/B 투표 (중복 방지, 이유 입력 옵션)
- 실시간 투표 수 (Supabase Realtime)
- 랜덤 탐색 (본인 터치·이미 투표한 터치 제외, sessionStorage로 중복 방지)
- 좋아요 토글 + Hot 100 랭킹 + 좋아요 상태 스와이프 후 유지 (useRef Map)
- 유저 랭킹 (참여 수 / 투표 적중률)
- 프로필 5탭 (내 터치 / 투표한 터치 / 좋아요한 터치 / 팔로잉 / 팔로워)
- 터치 배틀 description 필드 (생성 폼, 랜덤뷰어, Hot 패널, DeepL 번역 포함)
- 투표 기간 선택 (1/3/7/14일 프리셋 + 직접입력) → closedAt DB 저장
- 마감일 카드 표시 (내 터치, 투표한 터치, 좋아요한 터치 카드)
- 4패널 스와이프 홈 (랜덤/Hot/랭킹/프로필)
- 자동 번역 (DeepL, 한국어 외 언어에서 제목·설명·배틀설명 번역, 배틀당 4텍스트 배치)
- 6개 언어 i18n (ko, en, ja, zh, es, fr)
- PWA (manifest, service worker, iOS 최적화)
- Capacitor Android/iOS 네이티브 빌드 준비
- 개인정보처리방침 페이지 (/privacy)
- 모바일 반응형 (하단 네비게이션)
- 이미지 업로드 시 canvas 리사이징 (1280px, JPEG 0.82)
- 관리자 페이지 (/admin): 가상 유저 생성/관리, 전체 터치 관리(삭제·검색·카테고리·유저 필터), 더미 투표 생성, 샘플 터치 일괄 생성, 통계 대시보드

### 미구현
- 터치 마감 처리 로직 (closedAt DB에는 저장되나 자동 마감·winner 결정 미구현)
- 유저 검색 / 팔로우
- 신고·모더레이션
- 계정 탈퇴 기능

---

## 주요 버그 수정 이력

### DB 연결
- **증상**: Vercel에서 INSERT 쿼리 `Failed query` / 로컬에서 `EHOSTUNREACH`
- **원인**: Supabase 직접 연결(5432)은 IPv6 전용 → 로컬·Vercel 일부 리전 미지원
- **해결**: 로컬·Vercel 모두 Transaction Pooler URL(포트 6543) 사용
- `lib/db/index.ts` 옵션: `prepare: false`(PgBouncer 호환), `ssl: false`(Pooler는 SSL 불필요)

### public.users FK 제약
- **증상**: 투표·좋아요·터치 생성 시 FK constraint 오류
- **원인**: OAuth 로그인 시 `public.users`에 유저가 생성되지 않음
- **해결**:
  1. Supabase SQL Editor에서 `auth.users` INSERT 트리거 생성
  2. 모든 Server Action에 user upsert 추가 (non-fatal)
  3. OAuth 콜백에서 `onConflictDoUpdate`로 name/avatarUrl 갱신

### Supabase Storage RLS
- **증상**: 이미지 업로드 시 "new row violates row-level security policy"
- **해결**: SQL Editor에서 `storage.objects`에 정책 추가
  ```sql
  CREATE POLICY "authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'battle-images');
  CREATE POLICY "public read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'battle-images');
  ```

### position:fixed + CSS transform
- **증상**: SwipeSections의 transform 안에서 fixed 다이얼로그 클릭 불가
- **해결**: `createPortal(dialog, document.body)` + `mounted` state로 SSR 대응

### 텍스트 전용 터치 DB 오류
- **증상**: `image_a_text`, `image_b_text`, `is_text_only` 컬럼 없을 때 `Failed query`
- **해결**: `deleteBattle`에서 `isTextOnly` 컬럼 select 제거, URL 포함 여부로 이미지 삭제 판단

---

### 어드민 → 앱 이동 시 Supabase 세션 손실
- **증상**: `/admin`에서 앱으로 이동 시 로그인 상태가 끊김
- **원인 1**: `proxy.ts`가 `/admin` 방문 시 `supabase.auth.setAll`로 쿠키를 재작성하면서 세션 충돌
- **원인 2**: `window.location.href = '/'` 전체 리로드 시 SSR에서 세션 쿠키를 못 읽는 경우 발생
- **원인 3**: 어드민 페이지 비밀번호 확인이 서버 API 호출이어서 불필요한 세션 처리 발생
- **해결**:
  1. `proxy.ts` 초반에 `/admin` 경로 early return 추가 + matcher에서 `admin` 제외
  2. `window.location.href` → `router.push('/')` 교체 (클라이언트 내비게이션으로 세션 유지)
  3. 비밀번호 확인을 `NEXT_PUBLIC_ADMIN_PASSWORD` 클라이언트 직접 비교로 변경

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
