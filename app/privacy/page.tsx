import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata() {
  const t = await getTranslations('privacy')
  return { title: `${t('title')} — Touched` }
}

export default async function PrivacyPage() {
  const t = await getTranslations('privacy')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-background)',
        padding: '0 16px',
        display: 'flex', alignItems: 'center', height: 52,
        gap: 12,
      }}>
        <Link
          href="/"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid var(--color-border)',
            color: 'var(--color-foreground)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
          {t('title')}
        </h1>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 80px' }}>
        {/* 인트로 */}
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-foreground)', marginBottom: 6 }}>
          {t('lastUpdated')}
        </p>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-foreground)', marginBottom: 32 }}>
          {t('intro')}
        </p>

        {/* 섹션 공통 스타일 */}
        {[
          {
            title: t('s1Title'),
            content: (
              <ul style={ulStyle}>
                {(t.raw('s1Items') as string[]).map((item, i) => (
                  <li key={i} style={liStyle}><span style={dotStyle} />{item}</li>
                ))}
              </ul>
            ),
          },
          {
            title: t('s2Title'),
            content: (
              <ul style={ulStyle}>
                {(t.raw('s2Items') as string[]).map((item, i) => (
                  <li key={i} style={liStyle}><span style={dotStyle} />{item}</li>
                ))}
              </ul>
            ),
          },
          {
            title: t('s3Title'),
            content: <p style={bodyStyle}>{t('s3Text')}</p>,
          },
          {
            title: t('s4Title'),
            content: (
              <>
                <p style={{ ...bodyStyle, marginBottom: 8 }}>{t('s4Intro')}</p>
                <ul style={ulStyle}>
                  {(t.raw('s4Items') as string[]).map((item, i) => (
                    <li key={i} style={liStyle}><span style={dotStyle} />{item}</li>
                  ))}
                </ul>
              </>
            ),
          },
          {
            title: t('s5Title'),
            content: (
              <ul style={ulStyle}>
                {(t.raw('s5Items') as string[]).map((item, i) => (
                  <li key={i} style={liStyle}><span style={dotStyle} />{item}</li>
                ))}
              </ul>
            ),
          },
          {
            title: t('s6Title'),
            content: (
              <>
                <p style={bodyStyle}>{t('s6Text')}</p>
                <a
                  href={`mailto:${t('contactEmail')}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 10, fontSize: '0.88rem', fontWeight: 600,
                    color: '#6366F1', textDecoration: 'none',
                  }}
                >
                  ✉ {t('contactEmail')}
                </a>
              </>
            ),
          },
        ].map(({ title, content }, idx) => (
          <div key={idx} style={sectionStyle}>
            <div style={sectionNumberStyle}>{idx + 1}</div>
            <div style={{ flex: 1 }}>
              <h2 style={sectionTitleStyle}>{title}</h2>
              {content}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  display: 'flex', gap: 14, marginBottom: 28,
  paddingBottom: 28, borderBottom: '1px solid var(--color-border)',
}

const sectionNumberStyle: React.CSSProperties = {
  flexShrink: 0, width: 24, height: 24, borderRadius: 6,
  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  color: 'white', fontSize: '0.7rem', fontWeight: 800,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginTop: 2,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem', fontWeight: 800,
  color: 'var(--color-foreground)', marginBottom: 10, marginTop: 0,
}

const bodyStyle: React.CSSProperties = {
  fontSize: '0.875rem', lineHeight: 1.7,
  color: 'var(--color-muted-foreground)', margin: 0,
}

const ulStyle: React.CSSProperties = {
  margin: 0, padding: 0, listStyle: 'none',
  display: 'flex', flexDirection: 'column', gap: 6,
}

const liStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 8,
  fontSize: '0.875rem', lineHeight: 1.6,
  color: 'var(--color-muted-foreground)',
}

const dotStyle: React.CSSProperties = {
  flexShrink: 0, width: 5, height: 5, borderRadius: '50%',
  background: '#8B5CF6', marginTop: 8,
}
