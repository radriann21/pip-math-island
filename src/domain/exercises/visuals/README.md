# Exercise visuals

Pure functions that return **trusted markup strings** (inline SVG or small HTML snippets). They have no
DOM, React or global state; the presentation layer renders them with `dangerouslySetInnerHTML`. The output
only ever contains numbers and generator-controlled text, never user input.

The markup references styling and assets that the presentation layer must provide.

## CSS classes

| Class | Used by | Purpose |
| --- | --- | --- |
| `xx` | `items` (cross) | Cross-out stroke over subtracted items |
| `dot-v` | `dotsArray` | Dot in a multiplication array |
| `plate` | `plates` | Empty plate (division sharing) |
| `shape` | `polygon`, `rectangle`, `triangle`, `box`, `shapeDrawing` | Filled geometric figure |
| `lbl` | `rectangle`, `triangle`, `box` | Side-length label text |
| `clk-f`, `clk-n`, `hand`, `hand m` | `clock` | Clock face, numerals, hour hand and minute hand |
| `coin`, `coin-t`, `bill`, `bill-t` | `coins` | Coins and bills with their value text |
| `seq` (with `b` and `b.q`) | `sequenceBoxes` | Row of sequence boxes; `.q` is the empty one |
| `fr`, `box`, `op`, `tag`, `eq`, `prompt` | `../markup` | Fraction, empty box, operator, price tag, visual row, large prompt line |

## SVG sprite symbols (must exist in the page's `<defs>`)

`#i-apple`, `#i-balloon`, `#i-cookie`, `#i-starc` (used through `<use href="#i-...">` by `items`).

## SVG patterns (`<defs>`)

`#pgH`, `#pgT`, `#pgO` fill the hundreds, tens and ones blocks of `baseTenBlocks`.

## CSS custom properties

`--violet`, `--card`, `--ink`, `--accent` (fractions, bars, clock, angle and triangle strokes).

## Locale

`triangle` and `sequenceBoxes` take a `Locale` because they print words or locale-formatted numbers.
All other helpers are language-neutral.
