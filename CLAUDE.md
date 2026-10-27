# I am Speed — fanfic site

A tumblr-styled, iPhone-first static site for a fanfic ("I am Speed", Leon Kennedy + Roronoa Zoro x reader, reader is named Ai) that the user is writing as a late birthday gift for a friend. ~14 chapters total, posted one at a time as they're finished.

- **Live:** https://kanji-atsuki.github.io/speedspeedspeed/
- **Repo:** https://github.com/kanji-atsuki/speedspeedspeed (public, GitHub Pages serves `main` branch root, ~1 min to go live after a push)
- No build step. Plain `index.html` + `style.css` + `app.js`; chapters are fetched at runtime.

## The usual job: adding / updating a chapter

The user drops raw chapter text in the project root (e.g. `chap 2.txt`) or pastes it in chat. Then:

1. Create `chapters/NN.md` (two-digit number, `02.md`, `03.md`…).
   - Remove the leading chapter-number line (e.g. `02.`) — the site shows "Chapter N" itself.
   - **Never change the user's wording**, including typos and slang (it's their voice). Only add formatting:
     - inner thoughts / internal monologue → `*italics*` (e.g. `*ohmygod i’m screwed…*`)
     - standalone emphasis lines (phone screen text, big reactions) → `-> centered <-`, optionally `**bold**`
     - fix only mechanical paste issues, like two quotes jammed together (`"a.""b."` → `"a." "b."`), since that breaks the smart-quote logic
   - Do this with a script that asserts each replacement matches exactly once, not by retyping the text.
   - A literal asterisk needs escaping: `f\*ck`.
2. Add an entry to `chapters/chapters.json` → `chapters` (fields: `number`, `title`, `file`, `date` YYYY-MM-DD, `summary`, `note` (a/n at top), `endNote`, `tags` — tags are tumblr-style commentary).
3. Preview if useful (see below), then commit and push to `main`.

**Work-in-progress chapters:** a half-finished chapter gets the `"wip"` tag and `"endNote": "to be continued… this chapter is still being written ⚡"`. When the user finishes it: replace the `.md` with the full text, remove the `wip` tag and endNote, and add `"updated": "YYYY-MM-DD"` — that shows her an **UPDATED** pill even though she already read the first half.

Chapter 1 (`01.md`) is currently a WIP as of 2026-10-27. The user asked to delete the paragraph starting "And then, because you were sitting on an elevated piece of concrete…" (a draft duplicate of "And right away you found the problem with lifting one foot…"). If they send a finished version from their own draft file and that paragraph is still in it, leave it out.

## Formatting the renderer understands (app.js `render`/`inline`)

Every non-empty line is its own paragraph. `*it*`, `**b**`, `***b+i***`, `~~s~~`, `^^small^^`, `---` scene break (✦✦✦), `> quote`, `-> centered <-`, `# heading`, ```` ```chat ```` block with `name: msg` lines. Straight quotes are auto-curled, `--` → em dash, `...` → ….

## User preferences (decided — don't re-ask)

- Keep it light: **no** full-screen "new chapter" reveal/intro animation (it was built, then removed on request). The only "new" signal is the small NEW/UPDATED pill and the unread dot in the masterpost.
- No birthday-themed extras; the birthday has passed.
- Don't split a chapter the user gave as one piece (chapter 0 contains both their "0." and "1." sections, joined with a `---` break).
- Raw draft `.txt` files (`fanfic.txt`, `chap*.txt`) stay local — they're in `.gitignore`.
- Avatar is `avatar.jpg` (set via `blog.avatar` in chapters.json).
- The user hasn't said whether they want their typos fixed; don't fix them unless asked.
- **Point out mistakes, inconsistencies and typos.** When reading a chapter, flag anything that looks wrong: typos and grammar slips, duplicated or leftover draft passages, continuity errors (injuries, clothes, time of day, who's where, what a character already knows), character details that contradict canon or earlier chapters, and lines that look like they're missing words. List them for the user with a short quote of each spot and the suggested fix. Don't change the text for these yourself; the user decides which to apply (see chapter 1's duplicate paragraph, which they asked to cut). Skip deliberate voice/slang ("asf", "gurl", "HURTED", "Bodoh").

## Story facts (keep later chapters consistent)

- Leon wears a dark navy tactical **shirt**, not a vest. Gray is coming in at one temple (not fully gray hair). Small white scar through the outer end of his right eyebrow.
- Zoro: scar over closed left eye, diagonal chest scar, three gold earrings, green outfit, three swords. Gets lost constantly; Ai navigates.
- Ai: 18 today, barefoot in pale blue pajama pants and an oversized black t-shirt, left foot cut on the concrete step; phone dead except a `00:00` display.
- During the foot-bandaging scene in chapter 1, Ai is **standing** (the user chose standing over sitting).

## Tools on this machine

- Git: `C:\Program Files\Git\cmd\git.exe`; GitHub CLI: `C:\Program Files\GitHub CLI\gh.exe` (logged in as `kanji-atsuki`). Use full paths if they're not on PATH.
- Python 3.12: `C:\Users\AC\AppData\Local\Programs\Python\Python312\python.exe`.
- Preview: `preview.bat` (serves on http://localhost:8080). Headless check: `msedge --headless=new --window-size=500,844 --screenshot=… http://127.0.0.1:8080/` (headless Edge has a ~500px minimum width; wrap in a 390px iframe for true iPhone width).
- Reader state lives in her browser's localStorage under `ias:` keys (`read`, `likes`, `pos:<id>`, `last`, `settings`).
