# App Store / TestFlight submission guide

Practical checklist for submitting the Calm AI iOS app (repo `kalm-mobile`, Expo). Facts below
come from the code and docs in both repos; anything marked **OWNER** is a decision only you
can make. Last reviewed 2026-11-17.

## 1. Store listing

| Field            | Suggestion                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| App name         | `Calm AI` (30 char limit; check availability)                                                                       |
| Subtitle         | `Check-ins, calming exercises` (30 chars; avoid "therapy", "treatment")                                             |
| Promotional text | `Somewhere to start at 2am. Chat or talk, track your mood, try a guided exercise.`                                  |
| Keywords         | `wellness,mood,journal,breathing,anxiety,calm,check-in,mindfulness,stress` (100 chars; do not use competitor names) |
| Category         | Primary **Health & Fitness**; secondary Lifestyle                                                                   |
| Support URL      | https://calmai.site/privacy (for now; replace with a real support page)                                             |
| Marketing URL    | https://calmai.site                                                                                                 |
| Privacy Policy   | https://calmai.site/privacy                                                                                         |

Description must say plainly: wellness support, **not therapy, not a diagnosis, not emergency
care**, and that the companion is an AI. Do not claim to treat, cure or diagnose depression,
anxiety or any condition, and do not call the PHQ-9/GAD-7 a "test for depression".

### Apple guidelines that matter for mental-health apps

- 1.4.1 / 5.1.3: no diagnosis or treatment claims; health data not used for advertising or
  shared with data brokers (true: we sell nothing and show no ads).
- Crisis resources must be easy to find. In the app: the login screen has a "Crisis resources"
  link and the crisis page needs no sign-in. Web: https://calmai.site/crisis.
- 1.2 user-generated content / AI chat: reviewers expect safeguards. Ours: every message is
  screened for crisis language before the companion replies; minors need guardian approval.
- 5.1.1(v): in-app account deletion is required. It exists: Profile, Your data & privacy.
- 4.8 Sign in with Apple is required when other third-party sign-in (Google) is offered. It is
  offered.
- Describe the AI honestly in the review notes (see section 5).

### Age rating (recommendation)

Answer the questionnaire truthfully: no violence, gambling, sexual content or alcohol/drugs
content in the app itself; "medical or wellness topics" and an unrestricted AI chat are the
answers that raise the rating. Minimum signup age is **13** (enforced from date of birth), and
13 to 17 need a parent or guardian approval, which suggests **12+/13+**. Expect Apple to
calculate a final rating of 13+ or 16+ (older questionnaire: 12+ or 17+). **Recommend:** answer
honestly and accept the calculated result. Do not lower answers to get a lower rating, and keep
the in-app age gate at 13. If the result is 17+/18+ the guardian flow still works but fewer
teens can install: that is acceptable.

## 2. App Privacy ("nutrition label") answers

Derived from the data flows in code. All data below is **linked to the user's identity**,
used for **App Functionality** (and Account Management / Product Personalization where
noted), and **not used for tracking**. Select "No" to "Do you or your third-party partners use
data for tracking?".

| Apple data type                  | Collected | What it is                                                                                                    |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| Contact Info: Email Address      | Yes       | Account email                                                                                                 |
| Contact Info: Name               | Yes       | Preferred name                                                                                                |
| Health & Fitness: Health         | Yes       | Mood logs, PHQ-9/GAD-7 answers, exercise completions                                                          |
| Sensitive Info                   | Yes       | Mental-health information shared in chat and check-ins                                                        |
| User Content: Other User Content | Yes       | Chat messages, summaries, journal entries, support messages                                                   |
| User Content: Audio Data         | Yes       | Voice notes are sent for transcription; live-call audio is streamed to the voice provider, not recorded by us |
| Identifiers: Device ID           | Yes       | Push notification token                                                                                       |
| Identifiers: User ID             | Yes       | Account id                                                                                                    |
| Other: date of birth             | Yes       | Choose "Other User Contact/Personal info" if offered, else mention under Sensitive Info. Used for age gating  |

Not collected: location, contacts, photos, browsing history, financial info, advertising data.
**Verify before submitting:** if the mobile app ships any analytics or crash-reporting SDK
(none was found in the web code; check `kalm-mobile/package.json`), add "Usage Data" and
"Diagnostics" accordingly.

Third parties that receive data (for your own records; Apple does not list them): Supabase
(EU, Frankfurt), OpenRouter and its model provider, OpenAI (voice), Resend (email), Vercel
(hosting), Apple/Google push services.

## 3. Export compliance

`ITSAppUsesNonExemptEncryption=false` is already set. That is correct only while the app
uses just standard HTTPS/OS-provided encryption. Re-check if any custom crypto is added.

## 4. Screenshots checklist

- [ ] 6.9-inch iPhone (1320x2868 or 1290x2796): required, 3 to 10 images
- [ ] 6.5-inch iPhone (1284x2778 or 1242x2688): required if 6.9 not provided
- [ ] iPad screenshots only if `supportsTablet` is true in `app.json`
- [ ] No device frames with other brands, no placeholder text, no real user data
- [ ] Show: chat, exercises, mood/progress, safety/crisis screen, live call setup
- [ ] No claims of diagnosis or cure in captions
- [ ] App icon 1024x1024, no transparency, no rounded corners

## 5. Review notes template (App Store Connect, "Notes")

```
Calm AI is an AI wellness companion (not therapy, no diagnosis, not emergency care).
Sign-in normally uses an emailed link, which you cannot open, so please use the
password sign-in:

  1. On the welcome screen tap "Sign in with password" (below the Google/Apple buttons).
  2. Email:    <DEMO_EMAIL>
     Password: <DEMO_PASSWORD>
  The account is already set up (onboarding complete), so you land on Home.

Features: text chat with an AI companion, voice notes, live voice call (needs a
microphone), mood check-ins, guided exercises, account deletion at
Profile > Your data & privacy.

Safety: every message is screened for crisis language before the AI answers; crisis
resources are one tap away and need no sign-in (login screen > Crisis resources).
Users under 18 need parent/guardian approval; under 13 cannot sign up.

Sign in with Apple is offered alongside Google. No in-app purchases in this version.
Contact: <OWNER_REVIEW_CONTACT_NAME>, <OWNER_PHONE>, <OWNER_EMAIL>
```

Replace the angle-bracket values. The app's own password flow has no sign-up or reset UI by
design; the demo user is created by you in Supabase.

### Creating the demo user (instructions only, do it yourself in Supabase)

1. Supabase dashboard, Authentication, Users, **Add user, Create new user**. Enter the demo
   email and a strong password. Tick **Auto Confirm User** so no email confirmation is needed.
2. Use an adult date of birth for this user so the guardian-consent flow does not block chat.
3. Pre-complete onboarding. Easiest: sign in once yourself on a test device with this account
   and finish onboarding with an adult date of birth (this fills every required profile
   field the right way, including the consent records).
   Fallback via SQL editor, only if you cannot sign in: find the user id with
   `select id from auth.users where email = '<DEMO_EMAIL>';`, then inspect the real
   onboarding fields with `select * from public.profiles where id = '<USER_ID>';` and compare
   them with a profile of a user who has finished onboarding; copy the same columns
   (onboarding completion flag, date of birth, preferred name, consent timestamps). Do not
   guess column names: check `src/lib/onboarding.functions.ts` for exactly what
   `completeOnboarding` writes.
4. Confirm: sign out, then sign in with the email and password in the app and reach Home
   without any prompts. Send one chat message to confirm the AI replies (production keys
   `OPENROUTER_API_KEY` and `OPENAI_API_KEY` must be set).
5. Keep the account on the free plan. Do not leave real data in it. After approval you can
   rotate the password or delete the user.

Password sign-in must be enabled: Authentication, Providers, Email, with "Enable Email
provider" on (password sign-in uses the same provider).

## 6. Items the owner must decide

- **Governing law / jurisdiction** clause for the Terms. Deliberately left out of the public
  page until you choose it. Get legal advice, then add a section to `src/routes/terms.tsx`.
- **Data controller**: the legal entity name and a postal address. The privacy policy page
  currently names no entity. Several stores and some laws (GDPR Art. 13) require the
  controller's identity and contact details; add them to `src/routes/privacy.tsx`.
- **Contact email**: the pages say "through Support in the app". Apple requires a working
  support URL; consider adding a public support email or page before launch.
- **Retention windows**: the policy says data is kept until you delete it. The draft policy
  in `docs/DATA_RETENTION.md` (26 months for chats, etc.) is not applied. If you apply it,
  update the privacy page to match before the change takes effect.
- **Data processing agreements** with Supabase, OpenRouter (and upstream model provider),
  OpenAI, Resend; confirm each one's no-training/zero-retention terms and that the policy
  wording stays true.
- **Teen availability** and the final age-rating choice.
- **Paid plans**: the Terms say prices are announced before launch. If you add in-app
  purchases, Apple requires StoreKit for digital goods and the privacy/label answers change.
- **Translations**: the new pages are English only.

## 7. Before you submit

- [ ] `https://calmai.site/privacy` and `/terms` load without signing in (production deploy)
- [ ] Mobile `EXPO_PUBLIC_WEB_BASE` points at `https://calmai.site` in the production build
- [ ] Demo user created, password sign-in tested from a fresh install
- [ ] Sign in with Apple works on a real device build; Google works; email link works
- [ ] Account deletion tested end to end on a throwaway account
- [ ] Push notification permission text and capability set correctly in `app.json`
- [ ] Microphone permission string explains the voice feature
- [ ] Crisis resources reachable signed out; crisis flow tested in chat
- [ ] Supabase redirect URL `kalm://auth-callback` allowed (see mobile README)
- [ ] App Privacy answers entered (section 2) and match the privacy page
- [ ] Age rating questionnaire answered; guardian-consent flow tested with a 15-year-old DOB
- [ ] Review notes filled in with real demo credentials and contact
- [ ] Screenshots uploaded (section 4); version, build number and copyright set
- [ ] Upload build via EAS, add to TestFlight, test on at least two devices and iOS versions
- [ ] Production environment variables set in Vercel (see `docs/LAUNCH_CHECKLIST.md`)
