// Résumé PDF — ADR-0002.
//
// @react-pdf/renderer emits real, selectable text in a single column with standard section
// headings: the layout ATS parsers handle best. No tables, no text-in-images, no multi-column.
import { Document, Link, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import type { Resume } from '../domain/schemas'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', lineHeight: 1.35 },
  name: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  contact: { fontSize: 9, color: '#333', marginBottom: 8 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 3, borderBottom: '0.75pt solid #000', paddingBottom: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  bold: { fontFamily: 'Helvetica-Bold' },
  bullet: { flexDirection: 'row', marginLeft: 8 },
  dot: { width: 8 },
  bulletText: { flex: 1 },
  entry: { marginBottom: 5 },
})

const dates = (start: string, end: string) => (start ? `${start} – ${end || 'Present'}` : end)

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.dot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </>
  )
}

export function ResumeDocument({ resume: r }: { resume: Resume }) {
  const contact = [r.basics.email, r.basics.phone, r.basics.location].filter(Boolean)
  return (
    <Document title={`${r.basics.name || 'Résumé'}`} author={r.basics.name} creator="job-search-harness">
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{r.basics.name}</Text>
        <Text style={s.contact}>
          {contact.join('  |  ')}
          {r.basics.links.map((l) => (
            <Text key={l}>
              {'  |  '}
              <Link src={l.startsWith('http') ? l : `https://${l}`}>{l.replace(/^https?:\/\//, '')}</Link>
            </Text>
          ))}
        </Text>

        {r.summary ? (
          <>
            <Text style={s.h2}>SUMMARY</Text>
            <Text>{r.summary}</Text>
          </>
        ) : null}

        {r.experience.length > 0 && <Text style={s.h2}>EXPERIENCE</Text>}
        {r.experience.map((e, i) => (
          <View key={i} style={s.entry} wrap={false}>
            <View style={s.row}>
              <Text style={s.bold}>
                {e.title} — {e.company}
              </Text>
              <Text>{dates(e.start, e.end)}</Text>
            </View>
            {e.location ? <Text>{e.location}</Text> : null}
            <Bullets items={e.bullets} />
          </View>
        ))}

        {r.projects.length > 0 && <Text style={s.h2}>PROJECTS</Text>}
        {r.projects.map((p, i) => (
          <View key={i} style={s.entry} wrap={false}>
            <Text style={s.bold}>{p.name}</Text>
            <Bullets items={p.bullets} />
          </View>
        ))}

        {r.education.length > 0 && <Text style={s.h2}>EDUCATION</Text>}
        {r.education.map((e, i) => (
          <View key={i} style={s.entry} wrap={false}>
            <View style={s.row}>
              <Text style={s.bold}>
                {e.school}
                {e.degree ? ` — ${e.degree}` : ''}
              </Text>
              <Text>{dates(e.start, e.end)}</Text>
            </View>
            <Bullets items={e.details} />
          </View>
        ))}

        {r.skills.length > 0 && <Text style={s.h2}>SKILLS</Text>}
        {r.skills.map((g, i) => (
          <Text key={i}>
            <Text style={s.bold}>{g.group}: </Text>
            {g.items.join(', ')}
          </Text>
        ))}
      </Page>
    </Document>
  )
}

export async function resumePdfBlob(resume: Resume): Promise<Blob> {
  return pdf(<ResumeDocument resume={resume} />).toBlob()
}
