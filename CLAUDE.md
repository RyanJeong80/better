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
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx         # 개인정보처리방침 동의 체크박스 포함
├── (main)/
│   ├── layout.tsx              # Header + BottomNav
│   ├── page.tsx                # 홈 (4패널 스와이프: 랜덤/Hot/랭킹/프로필)
│   ├── battles/
│   │   ├── new/page.tsx        # 터치 생성 (로그인 필요)
│   │   └── [id]/page.tsx       # 터치 상세
│   ├── explore/page.tsx        # 랜덤 터치 탐색
│   ├── hot/page.tsx            # 좋아요 Top 100
│   ├── ranking/page.tsx        # 유저 랭킹
│   └── profile/page.tsx        # 내 프로필 (로그인 필요)
└── api/
    ├── auth/callback/route.ts  # Supabase OAuth 콜백
    ├── translate/route.ts      # DeepL 번역 API
    ├── user/profile/route.ts   # 프로필 데이터
    └── panels/hot/route.ts     # Hot 패널 데이터

actions/
├── auth.ts                     # signIn, signUp, signOut, signInWithGoogle
├── battles.ts                  # createBattle, getRandomBattle, getBattles, deleteBattle
├── votes.ts                    # castVote, submitVote, getVoteCounts
└── likes.ts                    # toggleLike

components/
├── auth/                       # LoginForm, SignupForm
├── battles/                    # BattleVote, CreateBattleForm, MyBetterCard, RandomBetterViewer
├── home/                       # HomeBetterViewer, HotPanelClient, SplashScreen 등
├── layout/                     # Header, BottomNav, SwipeSections
├── profile/                    # ProfilePanelClient, ProfileBetterList
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
betters     id, userId(FK), title, imageAUrl, imageADescription,
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

---

## 라우트 보호

`proxy.ts` (Next.js 16에서 `middleware.ts` 대신 사용, export 함수명도 `proxy`):

- **보호 경로**: `/battles/new`, `/profile` → 미인증 시 `/login` 리다이렉트
- **Auth 경로**: `/login`, `/signup` → 인증 상태 시 `/` 리다이렉트
- `/privacy` — 공개 접근 가능
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

### 삭제 기능 패턴
```ts
// actions/battles.ts — deleteBattle(id)
// 1. 소유권 확인 (userId 매칭)
// 2. DB 삭제 (CASCADE → votes, likes 자동 삭제)
// 3. Storage 이미지 삭제 (URL에서 경로 추출)
// 반환: { success: true } | { error: string }
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
- 좋아요 토글 + Hot 100 랭킹
- 유저 랭킹 (참여 수 / 투표 적중률)
- 프로필 (내 터치, 통계, 받은 투표 이유, 삭제 기능, 마감일 표시)
- 4패널 스와이프 홈 (랜덤/Hot/랭킹/프로필)
- 자동 번역 (DeepL, 한국어 외 언어에서 제목·설명 번역)
- 6개 언어 i18n (ko, en, ja, zh, es, fr)
- PWA (manifest, service worker, iOS 최적화)
- Capacitor Android/iOS 네이티브 빌드 준비
- 개인정보처리방침 페이지 (/privacy)
- 모바일 반응형 (하단 네비게이션)
- 이미지 업로드 시 canvas 리사이징 (1280px, JPEG 0.82)

### 미구현
- 터치 마감 (`closedAt` 필드 있으나 마감 처리 로직 미구현)
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
