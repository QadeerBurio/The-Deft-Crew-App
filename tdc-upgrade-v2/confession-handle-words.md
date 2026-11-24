# Confession handles: word list for the owner's sign-off (P4a)

Handles are `adjective-noun-number`, e.g. `chill-samosa-343`, `ziddi-kitab-512`. One per student, stable, unique,
never the name or e-mail. **Off until you approve this list** (`config/confessionHandles.js`, `APPROVED = false`):
until then every confession is "anon." as today, even with `confessionsV2` on.

64 adjectives × 64 nouns × 876 numbers ≈ 3.6 million handles.

## Rules applied (owner P4a #6)

- Nothing religious, sectarian, ethnic, political, sexual or insulting, in English or Roman Urdu.
- Left out on purpose: skin-tone and colour words that can read as race (kala, gora, black, white, brown); animals
  that are insults in Urdu (ullu / owl, gadha / donkey, bandar / monkey, kutta / dog, suar / pig); the cow
  (religious); "garam" / "hot"; brand names; class words ("wala"); words that judge a person (pagal, sust, nalaik,
  moti…); words with a slang second meaning (spicy, mast, rangeen).
- Numbers 100–999 except: **786** and **313** (religious), **666** (religious), **420** ("cheat"), **455** (reads
  "ass"), and every number containing **69**.
- Every handle is also run through the confession word filter (the profanity list + the admin's banned words) before
  it's given, as a whole and word by word. Adding a word to the admin's banned words stops new handles with it.

## Adjectives (64)

**English (38):** chill, sleepy, curious, brave, quiet, sunny, lucky, cosmic, fuzzy, witty, clever, mellow, bold,
swift, gentle, happy, calm, bright, golden, silver, misty, breezy, cozy, nerdy, snappy, zesty, jolly, plucky, cheerful,
dreamy, sparkly, crispy, tiny, mighty, stellar, electric, minty, rapid

**Roman Urdu (26):** ziddi (stubborn, playful), khush (happy), nayab (rare), thanda (cool), pyara (sweet), chhota
(small), bara (big), neela (blue), peela (yellow), hara (green), sunehra (golden), hoshiyar (smart), bahadur (brave),
sharmila (shy), chulbula (playful), nirala (unique), albela (carefree), masoom (innocent), tez (quick), dheema (slow,
calm), anokha (unusual), zabardast (great), kamaal (amazing), jugaari (resourceful), befikr (carefree), chamakta
(shining)

## Nouns (64)

**English (38):** notebook, project, deadline, lab, canteen, hostel, library, backpack, laptop, marker, stapler,
calculator, pixel, comet, rocket, cactus, panda, tiger, fox, penguin, koala, otter, sparrow, robin, falcon, lantern,
compass, teacup, cookie, donut, pancake, pretzel, mango, kite, planet, meteor, sunflower, pebble

**Roman Urdu (26):** chai, samosa, pakora, jalebi, golgappa, paratha, kulfi, rickshaw, patang (kite), sitara (star),
badal (cloud), titli (butterfly), tota (parrot), koel (cuckoo), mor (peacock), bulbul, chirya (sparrow), kitab (book),
qalam (pen), basta (school bag), chashma (glasses), chabi (key), lassi, nimko, chaat, chandni (moonlight)

## Words I'd like you to look at closely

- **ziddi** (stubborn): it's the plan's own example and is usually playful, but some may read it as a mild jab.
- **masoom** (innocent): fine on its own; worth a check in combinations.
- **chhota / bara** (small / big): neutral words, but they're size words next to a person's handle.

To approve: tell me "approve the handle list" (with any words to remove or add). I'll set `APPROVED = true` in one
commit, and handles then appear for students who have `confessionsV2` on.
