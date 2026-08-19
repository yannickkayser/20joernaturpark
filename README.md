# Naturpark Our — 20 Joer Geschicht

A scroll-driven timeline telling the story of Naturpark Our (Luxembourg), from the 1964
German-Luxembourgish nature park treaty to the ongoing 2025–2035 renewal.

https://yannickkayser.github.io/20joernaturpark/


*Static HTML/CSS/JS · no build step · no dependencies*

---

## What's inside

A two-way toggle lets visitors pick their level of detail:

| Tab | Items | What it shows |
|---|---|---|
| **Zeitleiste** | 44 | The key milestones and curated highlights, chronologically |
| **Alles entdecken** | 38 | Every researched project, festival, and excursion |

A hidden-gem button (bottom-left) surfaces a handful of archive finds that don't fit neatly on
the dated timeline.

## Running locally

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

(Needs `http://`, not `file://` — images, CSS, and JS load via relative paths.)

## Structure

```
index.html          the whole page
css/timeline.css     styling
js/timeline.js       scroll tracking, tier toggle, gem modal
content/images/      97 photos, logos, and document scans
```

## Deploying

**Settings → Pages → Deploy from a branch → `main` / `(root)`.** Live in a minute or two.
`.nojekyll` is already included so GitHub skips Jekyll processing.

## Credits & license

Code is free to reuse (MIT-style). **Photos, logos, and scans are not** — they're © Naturpark
Our and the credited photographers below, used here with permission:

Aloyse Lieners, Anna Molzahn, Caroline Martin, Franz Karacson, George Kieffer, Joelle Mathias,
Laura Londono, Laurent Blum, Liz Hacken, Luc Jacobs, Michel Meyers, Patricia Lefèbre, Pierre Haas,
Pol Bourkel, Raymond Clement, Vincenzo Cardile, Visit Eislek, and the European Union.
