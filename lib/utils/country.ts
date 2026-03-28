export function countryToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''
  const base = 0x1F1E6 - 65
  return (
    String.fromCodePoint(base + code.toUpperCase().charCodeAt(0)) +
    String.fromCodePoint(base + code.toUpperCase().charCodeAt(1))
  )
}

export type CountryOption = { code: string; name: string; nameEn: string }

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'KR', name: '한국',       nameEn: 'Korea' },
  { code: 'US', name: '미국',       nameEn: 'United States' },
  { code: 'JP', name: '일본',       nameEn: 'Japan' },
  { code: 'CN', name: '중국',       nameEn: 'China' },
  { code: 'TW', name: '대만',       nameEn: 'Taiwan' },
  { code: 'HK', name: '홍콩',       nameEn: 'Hong Kong' },
  { code: 'GB', name: '영국',       nameEn: 'United Kingdom' },
  { code: 'FR', name: '프랑스',     nameEn: 'France' },
  { code: 'DE', name: '독일',       nameEn: 'Germany' },
  { code: 'ES', name: '스페인',     nameEn: 'Spain' },
  { code: 'IT', name: '이탈리아',   nameEn: 'Italy' },
  { code: 'PT', name: '포르투갈',   nameEn: 'Portugal' },
  { code: 'NL', name: '네덜란드',   nameEn: 'Netherlands' },
  { code: 'SE', name: '스웨덴',     nameEn: 'Sweden' },
  { code: 'NO', name: '노르웨이',   nameEn: 'Norway' },
  { code: 'DK', name: '덴마크',     nameEn: 'Denmark' },
  { code: 'FI', name: '핀란드',     nameEn: 'Finland' },
  { code: 'CH', name: '스위스',     nameEn: 'Switzerland' },
  { code: 'BE', name: '벨기에',     nameEn: 'Belgium' },
  { code: 'AT', name: '오스트리아', nameEn: 'Austria' },
  { code: 'PL', name: '폴란드',     nameEn: 'Poland' },
  { code: 'RU', name: '러시아',     nameEn: 'Russia' },
  { code: 'AU', name: '호주',       nameEn: 'Australia' },
  { code: 'NZ', name: '뉴질랜드',   nameEn: 'New Zealand' },
  { code: 'CA', name: '캐나다',     nameEn: 'Canada' },
  { code: 'MX', name: '멕시코',     nameEn: 'Mexico' },
  { code: 'BR', name: '브라질',     nameEn: 'Brazil' },
  { code: 'AR', name: '아르헨티나', nameEn: 'Argentina' },
  { code: 'SG', name: '싱가포르',   nameEn: 'Singapore' },
  { code: 'TH', name: '태국',       nameEn: 'Thailand' },
  { code: 'VN', name: '베트남',     nameEn: 'Vietnam' },
  { code: 'PH', name: '필리핀',     nameEn: 'Philippines' },
  { code: 'ID', name: '인도네시아', nameEn: 'Indonesia' },
  { code: 'MY', name: '말레이시아', nameEn: 'Malaysia' },
  { code: 'IN', name: '인도',       nameEn: 'India' },
  { code: 'TR', name: '터키',       nameEn: 'Turkey' },
  { code: 'SA', name: '사우디아라비아', nameEn: 'Saudi Arabia' },
  { code: 'AE', name: '아랍에미리트', nameEn: 'UAE' },
  { code: 'ZA', name: '남아프리카',  nameEn: 'South Africa' },
  { code: 'EG', name: '이집트',     nameEn: 'Egypt' },
  { code: 'NG', name: '나이지리아',  nameEn: 'Nigeria' },
]
