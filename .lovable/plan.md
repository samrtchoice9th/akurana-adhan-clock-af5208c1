

# Settings Page Enhancements

## 1. Collapsible Category Dropdowns

Convert each settings card (Account, Location, Color Theme, Design Style, Adhan Voice Alert, Notifications, Privacy) into collapsible/accordion sections using the existing `Collapsible` component. Each section header shows the category title with a chevron indicator; content is hidden by default (except Account).

**File**: `src/pages/Settings.tsx`
- Import `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible`
- Wrap each Card's content in a Collapsible, keeping the CardHeader as the trigger
- Add ChevronDown icon that rotates when expanded

## 2. User Reviews / Feedback Forum

Add a new "Reviews & Feedback" collapsible section in Settings where authenticated users can:
- Submit a review (text message + optional rating 1-5 stars)
- See their own past reviews and admin replies

**Database**: New `user_reviews` table:
```sql
CREATE TABLE public.user_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  rating integer DEFAULT 5,
  admin_reply text,
  admin_replied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Users can read own reviews
CREATE POLICY "Users read own reviews" ON public.user_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can insert own reviews
CREATE POLICY "Users insert own reviews" ON public.user_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admins can read all reviews
CREATE POLICY "Admins read all reviews" ON public.user_reviews
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Admins can update (reply)
CREATE POLICY "Admins update reviews" ON public.user_reviews
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
```

**Settings UI** (`src/pages/Settings.tsx`):
- New collapsible "Reviews & Feedback" section (only shown when logged in)
- Star rating selector (1-5)
- Text input for review message
- Submit button
- List of user's own reviews with any admin replies shown below each

## 3. Admin Panel — Reviews Tab

**File**: `src/pages/Admin.tsx`
- Add a new "Reviews" tab alongside Excel Upload, Hijri Control, Hadith
- Shows all user reviews with user name (from profiles), rating, message, date
- Each review has a reply textarea + "Send Reply" button
- Reply saves to `admin_reply` and `admin_replied_at` columns

## Files to Change

| File | Change |
|------|--------|
| DB migration | Create `user_reviews` table with RLS |
| `src/pages/Settings.tsx` | Wrap all cards in Collapsible components; add Reviews section |
| `src/pages/Admin.tsx` | Add Reviews tab for viewing and replying to user feedback |

