

# Break Down Morning/Evening Adhkar into Individual Checklist Items

## What We're Doing

Replace the two simple Morning/Evening Adhkar toggles with a detailed checklist of individual dhikr items extracted from the uploaded PDF. Each item can be checked off independently.

## Adhkar Items (from the PDF's Sahih section)

### Both Morning & Evening:
1. **Sayyidul Istighfar** — سيد الاستغفار
2. **Subhanallahi wa bihamdihi** (100x) — سبحان الله وبحمده
3. **La ilaha illallah wahdahu...** (100x/10x) — لا إله إلا الله وحده لا شريك له
4. **Asbahna/Amsayna Dua** — اللهم بك أصبحنا / أمسينا
5. **Allahumma inni as'alukal aafiyah** — اللهم إني أسألك العافية
6. **Allahumma aalimal ghayb** — اللهم عالم الغيب والشهادة
7. **Asbahna ala fitratil Islam** — أصبحنا على فطرة الإسلام
8. **Subhanallahi wa bihamdihi adada khalqihi** (3x) — سبحان الله وبحمده عدد خلقه
9. **Bismillahilladhi la yadurru** (3x) — بسم الله الذي لا يضر مع اسمه شيء

### Evening Only:
10. **A'udhu bikalimatillah** — أعوذ بكلمات الله التامات

## Data Storage Approach

Instead of adding 10+ individual columns, use a **JSONB column** `adhkar_checklist` to store completed items flexibly. This avoids excessive schema changes and allows easy future additions.

```json
{
  "morning": ["sayyidul_istighfar", "subhanallah_100", "la_ilaha_illallah_100"],
  "evening": ["sayyidul_istighfar", "audhu_bikalimatillah"]
}
```

The existing `morning_adhkar` and `evening_adhkar` boolean columns remain for backward compatibility but won't be shown in the UI anymore.

## Database Migration

```sql
ALTER TABLE public.ramadan_ibadah_logs
  ADD COLUMN IF NOT EXISTS adhkar_checklist jsonb DEFAULT '{"morning":[],"evening":[]}'::jsonb;
```

## Scoring Update

Currently morning + evening adhkar = 6 points (3 each). With the checklist approach:
- 10 total items across morning/evening
- Each checked item = ~0.6 points, keeping total adhkar contribution at 6 points
- Or simplify: if ≥5 items checked = 6 pts, ≥3 items = 4 pts, ≥1 = 2 pts

## Files to Modify

| File | Change |
|------|--------|
| DB migration | Add `adhkar_checklist` JSONB column |
| `src/hooks/useIbadah.ts` | Add `adhkar_checklist` to interface, update scoring logic |
| `src/components/IbadahDayDetail.tsx` | Replace morning/evening toggles with expandable checklist sections showing each dhikr with Arabic text and Tamil label |

## UI Design

In the IbadahDayDetail dialog, the "Daily Adhkar" section becomes two collapsible sub-sections:

**☀️ Morning Adhkar** (expandable)
- ☐ Sayyidul Istighfar
- ☐ Subhanallahi wa bihamdihi (100x)
- ☐ La ilaha illallah... (100x)
- ... (9 items)

**🌙 Evening Adhkar** (expandable)  
- ☐ Sayyidul Istighfar
- ☐ A'udhu bikalimatillah
- ... (10 items)

Each item shows the short Tamil/English label. The Arabic text shown as smaller subtitle.

