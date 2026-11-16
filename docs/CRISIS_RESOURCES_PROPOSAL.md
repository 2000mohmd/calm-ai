# Crisis and mental-health helplines: UNVERIFIED proposals

**Status: UNVERIFIED. Do not insert anything below into `public.care_resources` or the code until the owner has called each number and confirmed it works, who answers, the hours and the languages.**

These were gathered by web search on 2026-11-16 (the "last verified" column is the date the source was read, not a phone test). Only a few entries come from an official or WHO page; most come from directories or news, which is why confidence is mostly medium or low. Two official pages could not be opened during research (WHO EMRO directory returned HTTP 502; the Lebanese Ministry page host did not resolve), so those must be re-checked by hand. Where no reliable source was found, this document says so rather than guessing.

Confidence: **high** = official/primary source states it; **medium** = reputable secondary source or conflicting details; **low** = directory or old article only.

## Suggested insert shape (for after verification)

```sql
insert into public.care_resources
  (region, resource_type, name, contact_or_url, description, sort_order, is_active)
values
  ('LB', 'crisis_line', '<name>', '<number or url>', '<hours, languages, one line>', 10, true);
```

Use `is_active = false` until verified. Confirm the allowed `resource_type` values and the `region` convention (country code vs language) against existing rows before inserting.

## Lebanon (priority)

| Service                                                                                                                                    | Number / URL  | Hours                                                                             | Languages       | Source                                                                                                                                                                                                                          | Last verified                     | Confidence                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| National Lifeline, emotional support and suicide prevention (Embrace with the Ministry of Public Health, National Mental Health Programme) | 1564          | Ministry and Embrace say 24/7; older material says about 12:00 to 05:30. Confirm. | Arabic, English | https://mophweb.intouchmena.com/en/Pages/0/75325/1564-the-lifeline ; https://www.annahar.com/article/833319-embrace-the-first-suicide-prevention-hotline-in-lebanon ; https://findahelpline.com/organizations/the-lifeline-1564 | 2026-11-16 (search snippets only) | high (number), medium (hours)                                 |
| Emergency numbers (one guide lists these; it is a referral line, not an emergency service)                                                 | 112, 125, 140 | n/a                                                                               | n/a             | https://www.therapyroute.com/article/suicide-hotlines-and-crisis-lines-in-lebanon-by-therapyroute                                                                                                                               | 2026-11-16                        | low (verify against an official civil-defence/Red Cross page) |

Also check https://www.embracelebanon.org for the current number and hours.

## Saudi Arabia

| Service                                                                                                                                                  | Number / URL | Hours                | Languages    | Source                                                                                                                                                   | Last verified | Confidence                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------- |
| Ministry of Health 937 call centre (general health line; third-party sites call it a mental health line, the Ministry's own pages do not clearly say so) | 937          | 24/7, toll free      | Multilingual | https://www.moh.gov.sa/en/Ministry/Forms/CommunicationCenter937/Documents/937.pdf                                                                        | 2026-11-16    | medium (exists), low (as a mental health service) |
| Mental health / suicide prevention helpline listed as National Center for Mental Health Promotion                                                        | 920033360    | 24/7 per directories | not stated   | https://progress.guide/atlas/asia/saudi-arabia/ ; https://www.therapyroute.com/article/suicide-hotlines-and-crisis-lines-in-saudi-arabia-by-therapyroute | 2026-11-16    | low (no government page found)                    |
| Ambulance                                                                                                                                                | 997          | 24/7                 | n/a          | same therapyroute page                                                                                                                                   | 2026-11-16    | low                                               |

## United Arab Emirates

| Service                                                                                                            | Number / URL            | Hours                                                  | Languages       | Source                                                                                                                                                                                                     | Last verified | Confidence |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------- |
| National Mental Health Support Line "800 HOPE" (National Programme for Happiness and Wellbeing; calls or WhatsApp) | 800 4673                | Conflicting: 8am to 8pm daily vs 9am to 9pm Sun to Thu | Arabic, English | https://www.thenationalnews.com/uae/health/coronavirus-uae-sets-up-free-national-helpline-to-support-mental-health-1.1021577 ; https://www.dubaione.ae/content/dubaione/en-ae/programs/28/HotlineHope.html | 2026-11-16    | medium     |
| Abu Dhabi, Department of Health "Sakina"                                                                           | 800 725462 (800-SAKINA) | not stated                                             | not stated      | https://gulfnews.com/lifestyle/you-do-not-have-to-cope-alone-10-free-uae-mental-health-services-1.500462890                                                                                                | 2026-11-16    | low        |
| Dubai "Itma'en"                                                                                                    | 800 506                 | not stated                                             | not stated      | same Gulf News page                                                                                                                                                                                        | 2026-11-16    | low        |

## Qatar

| Service                                                                                         | Number / URL      | Hours          | Languages  | Source                                                        | Last verified                                    | Confidence |
| ----------------------------------------------------------------------------------------------- | ----------------- | -------------- | ---------- | ------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| National Mental Health Helpline (Primary Health Care Corporation), listed in WHO EMRO directory | 16000 (toll free) | 07:00 to 22:00 | not stated | https://www.emro.who.int/mnh/get-connected/get-connected.html | 2026-11-16 (via search summary; page not opened) | medium     |

## Egypt

| Service                                                                         | Number / URL | Hours                                                           | Languages | Source                                                                                                                                                               | Last verified | Confidence             |
| ------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------- |
| Ministry of Health mental health hotline (General Secretariat of Mental Health) | 08008880700  | historically limited hours (2015 launch); current hours unknown | Arabic    | https://www.dailynewsegypt.com/?p=113314                                                                                                                             | 2026-11-16    | low (2015-era article) |
| Mental health support number cited by WHO Egypt (Aug 2023)                      | 16328        | unknown                                                         | Arabic    | cited in the epinews item https://epinews.emphnet.net/en/news/egypt-expands-mental-health-services-nationwide-through-new-initiative (confirm on the WHO Egypt page) | 2026-11-16    | low to medium          |
| Ministry line reported to route to the nearest facility                         | 0220816831   | unknown                                                         | Arabic    | https://cairoscene.com/Buzz/hotlines-for-pysch-support-duting-quarantine                                                                                             | 2026-11-16    | low                    |
| Emergency health services                                                       | 123          | 24/7                                                            | n/a       | https://cairoscene.com/in-depth/we-tried-12-emergency-numbers                                                                                                        | 2026-11-16    | low                    |

## Jordan

| Service                                                               | Number / URL                     | Hours              | Languages  | Source                                                    | Last verified | Confidence |
| --------------------------------------------------------------------- | -------------------------------- | ------------------ | ---------- | --------------------------------------------------------- | ------------- | ---------- |
| JCPA Hotline (phone and SMS support; not confirmed as government-run) | **number not found in research** | 24/7 per directory | not stated | https://findahelpline.com/organizations/jcpa-hotline-jcpa | 2026-11-16    | low        |

No Ministry of Health mental health hotline was found. Check https://www.emro.who.int/mnh/get-connected/get-connected.html (WHO directory) and the JCPA site directly.

## Kuwait

No reliable number found. WHO EMRO says hotline/online psychosocial services exist under the Ministry of Health and Ministry of Justice (Instagram account @kcmh mentioned) but gives no phone number. Source: https://www.emro.who.int/mnh/get-connected/get-connected.html. Owner should obtain the number from the Ministry of Health directly.

## Bahrain

No reliable number found. Findahelpline lists Bahrain suicide-related helplines (https://findahelpline.com/countries/bh) and one directory mentions Shamsaha (volunteer emotional support), but the number was not legible in the results. Verify via the findahelpline page and the Ministry of Health.

## Oman

No dedicated mental health or suicide helpline found; one directory states there is none (https://www.therapyroute.com/article/suicide-hotlines-and-crisis-lines-in-oman-by-therapyroute) and lists 9999 as the emergency number (low confidence). An Oman Observer opinion piece also asks whether one is needed (https://www.omanobserver.om/article/1130893/opinion/oman/do-we-need-a-helpline-for-suicide-in-oman). Do not add a mental health line; at most the emergency number after verification.

## Iraq

No dedicated helpline found. A directory snippet gives 911 / 122 for emergencies (low confidence, source: therapyroute Iraq listing surfaced in search; not independently confirmed). Verify with the Ministry of Health before use.

## Recommendations

1. Lebanon 1564 is the strongest candidate; call it, confirm 24/7 hours, then add.
2. UAE 800 4673 and Qatar 16000 are next; confirm hours by calling.
3. Treat Saudi, Egypt, Jordan, Kuwait, Bahrain, Oman and Iraq as unresolved until an official ministry page or a test call confirms them. The app already falls back to local emergency number plus findahelpline.com, which is safer than an unverified number.
4. Re-fetch https://www.emro.who.int/mnh/get-connected/get-connected.html manually; it was the most authoritative regional directory and could not be opened here.
