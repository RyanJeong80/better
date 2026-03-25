import { NextRequest, NextResponse } from 'next/server'
import * as deepl from 'deepl-node'

// DeepL target language code 매핑
const LOCALE_TO_DEEPL: Partial<Record<string, deepl.TargetLanguageCode>> = {
  en: 'en-US',
  ja: 'ja',
  zh: 'zh',
  es: 'es',
  fr: 'fr',
}

// 모듈 레벨 in-memory 캐시: "text\x00target" → translated
const cache = new Map<string, string>()

let translator: deepl.Translator | null = null
function getTranslator() {
  if (!translator) {
    const key = process.env.DEEPL_API_KEY
    if (!key) throw new Error('DEEPL_API_KEY not set')
    translator = new deepl.Translator(key)
  }
  return translator
}

export async function POST(req: NextRequest) {
  let body: { texts: string[]; target: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { texts, target } = body

  if (!Array.isArray(texts) || typeof target !== 'string') {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  const deeplTarget = LOCALE_TO_DEEPL[target]
  // 한국어이거나 지원하지 않는 언어면 원문 그대로 반환
  if (!deeplTarget) {
    return NextResponse.json({ translations: texts })
  }

  if (!process.env.DEEPL_API_KEY) {
    return NextResponse.json({ translations: texts })
  }

  const results: string[] = new Array(texts.length)
  const toTranslate: { index: number; text: string }[] = []

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i]
    if (!text) {
      results[i] = text
      continue
    }
    const cacheKey = `${text}\x00${deeplTarget}`
    const cached = cache.get(cacheKey)
    if (cached !== undefined) {
      results[i] = cached
    } else {
      toTranslate.push({ index: i, text })
    }
  }

  if (toTranslate.length > 0) {
    try {
      const tr = getTranslator()
      const translated = await tr.translateText(
        toTranslate.map((t) => t.text),
        null, // 소스 언어 자동 감지
        deeplTarget,
      )
      const translatedArr = Array.isArray(translated) ? translated : [translated]
      for (let j = 0; j < toTranslate.length; j++) {
        const { index, text } = toTranslate[j]
        const result = translatedArr[j]?.text ?? text
        cache.set(`${text}\x00${deeplTarget}`, result)
        results[index] = result
      }
    } catch (e) {
      console.error('[/api/translate]', (e as Error)?.message)
      // 실패 시 원문 사용
      for (const { index, text } of toTranslate) {
        results[index] = text
      }
    }
  }

  return NextResponse.json({ translations: results })
}
