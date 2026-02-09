

# Akurana Prayer Time App — Implementation Plan

## Overview
A two-page prayer time display app for Akurana, Sri Lanka mosque. Dark-themed, mobile-first, manually-driven data for the full year 2026. Powered by Supabase for data storage.

---

## Page 1: Prayer Time Display (User Page)

### Header Section
- **Live clock** — large digital time display (updates every second)
- **Gregorian date** — e.g. "Monday, February 9, 2026"
- **Hijri date** — text from database, e.g. "Sha'bān 1447"

### Next Prayer Highlight Box
- Large highlighted card with yellow/green border showing:
  - "Next" badge + prayer name + countdown ("in 2h 29m")
  - Adhan time (large, green text)
  - Iqamath time (large, yellow text)

### Prayer List
Six rows in fixed order: **Subah, Sunrise, Luhar, Asr, Magrib, Isha**
- Each row shows: icon, prayer name, Adhan time (green), Iqamath time (yellow)
- Sunrise shows only one time (no Iqamath)
- The "next prayer" row gets a highlighted border/background
- All times displayed as plain text from database

### Auto-Update Behavior
- App checks system date on load and periodically
- Fetches matching date record from Supabase
- If no data found → displays "Prayer times not available for this date"
- Next prayer detection compares current time against stored text times

---

## Page 2: Admin Data Entry

### Access
- Simple password gate (hardcoded or stored in Supabase) — enter password to access admin panel

### Entry Form
- **Date picker** — select a specific date (YYYY-MM-DD format, 2026 only)
- **Hijri date** — text input for the Islamic date
- **Prayer time fields** — for each of the 6 prayers:
  - Subah: Adhan + Iqamath
  - Sunrise: Time only
  - Luhar: Adhan + Iqamath
  - Asr: Adhan + Iqamath
  - Magrib: Adhan + Iqamath
  - Isha: Adhan + Iqamath
- All fields are **text inputs** (e.g. "5:10 AM")

### Admin Controls
- **Save** — inserts new date record or updates existing with confirmation
- **Load existing** — selecting a date that already has data pre-fills the form for editing
- **No delete** unless explicitly confirmed with a dialog

---

## Database (Supabase)

### Table: `prayer_times`
| Column | Type |
|---|---|
| id | uuid (primary key) |
| date | date (unique) |
| hijri_date | text |
| subah_adhan | text |
| subah_iqamath | text |
| sunrise | text |
| luhar_adhan | text |
| luhar_iqamath | text |
| asr_adhan | text |
| asr_iqamath | text |
| magrib_adhan | text |
| magrib_iqamath | text |
| isha_adhan | text |
| isha_iqamath | text |

---

## Design
- **Black background**, white text
- **Green** for Adhan times and prayer names
- **Yellow** for Iqamath times
- **Green/yellow bordered card** for next prayer highlight
- Large, readable fonts throughout
- Mobile-first layout matching the uploaded reference image
- Minimal animations (fade/highlight transitions only)

