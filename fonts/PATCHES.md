# Croatian display glyph correction

The original Cinzel Latin-ext file contains Croatian Đ/đ (`U+0110`/`U+0111`),
but their macron components are placed above D/d rather than across the stem.
The result resembles D with an overbar at normal UI sizes. This is glyph geometry,
not missing Unicode coverage, encoding corruption or CSS small-cap substitution.

Only the `Dcroat` and `dcroat` component positions have been changed, using the
font's existing horizontal stroke at the middle of the letter. All other glyph
outlines, every advance width and all Unicode coverage remain unchanged. The
internal derivative family name is **Tavern Cinzel**. CSS retains its `Cinzel`
alias to keep the established display styling and existing fallback behavior.

The upstream SIL OFL reserves **Cinzel Decorative**, not the CSS alias used here.
Full copyright/license terms are in `OFL-Cinzel.txt`. This derivative does not use
the reserved name. No external font request is added at runtime.

- Source: https://github.com/NDISCOVER/Cinzel
- Original bundled SHA-256: `6ec952a839edaadbfe17dfe61f3d28208c06bd12dee62b874570a99557be0678`
- Corrected bundled SHA-256: `8bd06c9013828191e3022ee293376be7c02d4404ba85cbcb00ca1a9dd16764c6`
- Modification: Trivia Tavern Croatian crossbar correction, November 2026.

`tools/fix-croatian-font.py` reproduces the correction from the original bundled
file using FontTools and Brotli. It rejects unrelated font builds. The browser
regression `tests/browser-croatian-font.cjs` verifies the corrected letters have
real mid-letter crossbars, preserve D/d widths and no longer add an overbar above
the capital/small-cap height. Other Croatian accents remain distinct.
