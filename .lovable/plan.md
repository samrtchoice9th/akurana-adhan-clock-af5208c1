

# Add Full Adhkar Text — Tap to Read

## What

When a user taps on an adhkar item's label/heading in the checklist, open a dialog/sheet showing the **full Arabic text** of that dhikr so they can read and recite it.

## How

1. **Expand ADHKAR_ITEMS data** — Add a `fullArabic` field to each item containing the complete Arabic dua text (not just the short reference). This is the full recitation text from the PDF.

2. **Add a reading dialog** — When the user taps the label text (not the checkbox), open a `Dialog` showing:
   - Title (English label)
   - Full Arabic text in large, readable font (right-to-left)
   - A "Done" button to close

3. **UI changes in IbadahDayDetail.tsx**:
   - Make the label text clickable (separate from the checkbox tap target)
   - Add state for `activeAdhkarItem` to track which item's full text to show
   - Render a simple Dialog with the full Arabic content

## Files to Modify

| File | Change |
|------|--------|
| `src/components/IbadahDayDetail.tsx` | Add `fullArabic` to ADHKAR_ITEMS, add reading dialog state, make labels clickable |

## Full Arabic Texts (from the PDF)

Each item will have the complete dua text. For example:
- **Sayyidul Istighfar**: اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ
- And so on for all 10 items

