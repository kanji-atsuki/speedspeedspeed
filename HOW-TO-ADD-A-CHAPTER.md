# Adding a new chapter

1. Make a new file in `chapters/`, for example `01.md`, and paste the chapter text in.
2. Open `chapters/chapters.json` and add an entry to the `chapters` list (don't forget the comma after the previous one):

```json
{
  "number": 1,
  "title": "the chapter title (or leave empty for just 'Chapter 1')",
  "file": "01.md",
  "date": "2026-10-27",
  "summary": "optional one-liner shown on the dashboard",
  "note": "optional author's note shown at the top",
  "endNote": "optional note at the bottom",
  "tags": ["tumblr-style tag commentary", "i'm so sorry"]
}
```

3. Upload/push. The new chapter shows up on her dashboard with a blue **NEW** tag.

## Formatting cheat sheet

| You type | You get |
|---|---|
| `*text*` | italics |
| `**text**` | bold |
| `~~text~~` | strikethrough |
| `^^text^^` | tiny text |
| `---` on its own line | scene break ✦✦✦ |
| `> text` | indented quote / letter |
| `-> text <-` | centered line |
| `# Heading` | heading |
| a ```` ```chat ```` block with `name: message` lines | text-message/chat post |

Every line is its own paragraph, so pasting straight from Google Docs works. Quotes get curled and `--` becomes an em dash automatically.

## Preview on your computer

Double-click `preview.bat`. It opens http://localhost:8080 in your browser. Close the black window to stop it.

