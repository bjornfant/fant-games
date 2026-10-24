# Station Aegis 5 – Midjourney-prompter

Tema: övergiven brutalistisk rymdstation. Stil: Dune (monumental, torr, ockra och rost) blandat med StarCraft (industriellt, slitet, neonglöd).

Prompterna är på engelska eftersom Midjourney förstår det bäst. `[REF]` är länken till `art/aegis5-reference.png` efter att du laddat upp den i Midjourney. `[STYLE]` är länken till den stilbild du väljer i steg 1.

Parametrarna nedan är de jag känner till för V7 (`--ar`, `--style raw`, `--stylize`, `--iw`, `--sref`, `--sw`, `--no`). Skiljer sig din version, så justera bara parametrarna och behåll textdelen.

## Färgpalett (använd samma ord i alla prompter)

- Mörk bas: basalt, nästan svart `#1c1a1f`
- Ockra `#c8923a`, rost `#8a4b2a`, sand `#d9c39a`
- Energi: cyan `#3ec5ff` och orange `#ff9f43`, bara som glödande detaljer
- Varningsmarkeringar: sparsamt, gult och svart

## Regler för att allt ska hänga ihop

1. **Ljuset kommer från övre vänstra hörnet** i alla bilder. Skriv det i varje prompt.
2. **Inga kastade skuggor** i delbilderna. Spelet lägger på skuggor själv.
3. **Bakgrunden ska vara lugn.** Bollen måste synas. Håll mitten mörk och lågkontrastig, och lägg detaljerna längs kanterna. Starka färger sparas till spelets objekt och lampor.
4. **Generera lampor släckta.** Glöd och tänd/släckt gör jag i kod. Du behöver alltså bara släckta lägen.
5. **Delar på platt bakgrund.** Be om `solid magenta background` (lättast att ta bort), och ta bort bakgrunden med remove.bg eller `rembg`. Midjourney ger ingen genomskinlighet.
6. **Generera stort, skala ned.** Midjourney ger ofta mer upplösning än jag behöver. Upscala och skala ner till målstorleken i tabellen.

---

## Steg 1 – Hitta stilen

Kör denna först och välj den bild du gillar bäst. Den länken blir `[STYLE]` för allt annat.

```
concept art, interior of an abandoned brutalist space station, monumental concrete
and ochre metal walls, rusted plates, huge pipes, cyan and orange energy conduits
glowing in the dark, desert-colored dust, gritty industrial sci-fi, Dune meets
StarCraft, cinematic lighting from the upper left, highly detailed --ar 16:9
--style raw --stylize 250 --v 7
```

Kör gärna 2–3 varianter och byt "Dune meets StarCraft" mot "more Dune" eller "more StarCraft" för att se vilken riktning du föredrar.

---

## Steg 2 – Bordets bakgrund (tomt)

Ladda upp `art/aegis5-reference.png`, klistra in länken först och lägg stilbilden som `--sref`.

```
[REF] top-down orthographic view of an empty pinball playfield inside a brutalist
space station, worn ochre and rust metal plates, riveted panels, subtle engraved
circuit lines, dark basalt center for readability, low contrast in the middle,
detail concentrated along the edges, a faint circular reactor core engraving
near the top, subtle cyan and orange conduit lines, lighting from the upper left,
no characters, no text, no flippers, no balls, no bumpers, no ramps --ar 2:5
--style raw --stylize 150 --iw 1.5 --sref [STYLE] --sw 200 --v 7
```

Tips:
- Är bakgrunden för detaljrik och bollen skulle försvinna: sänk `--stylize` och lägg till `muted, low contrast, smooth` i texten.
- Följer den layouten för löst: höj `--iw` till 2 (i V7 går skalan upp till 3).
- Välj en bild, upscala (Subtle) och spara som `background.png`.
- Fyra zoner och deras tema, om du vill göra zonerna olika. Lägg till i prompten:
  - Kupol högst upp: `a glowing reactor core engraving, concentric rings`
  - Mitten: `command bridge panels, hazard markings`
  - Nederkant: `emergency airlock floor, yellow and black warning stripes, worn`

---

## Steg 3 – Delar (alla på platt magenta bakgrund)

Lägg `--sref [STYLE]` på alla. Alla vinklar är rakt uppifrån.

### Pop-bumper (3 st, olika färgring)

```
single pinball pop bumper, top-down orthographic view, circular brutalist ochre metal
cap with a dark center and a glowing cyan ring (unlit), riveted base, lighting from
the upper left, no cast shadow, isolated on a solid magenta background, game asset
--ar 1:1 --style raw --sref [STYLE] --v 7
```

Upprepa med `orange ring` och `pink ring` för bumper 2 och 3 (ringfärgen kan också bytas i koden).

### Flipper

Flippern ritas pekande åt **höger** (vänster flipper). Den högra speglar jag i koden.

```
single pinball flipper, top-down orthographic view, tapered elongated paddle pointing
right with a round pivot disc at the left end, brutalist worn ochre metal with rust
edges, a thin cyan inlay line along the center, lighting from the upper left, no cast
shadow, isolated on a solid magenta background, game asset --ar 5:1 --style raw
--sref [STYLE] --v 7
```

### Slingshot (sidostudsare)

```
single pinball slingshot kicker, top-down orthographic view, right-angled triangular
brutalist metal block with a rubber-like dark kick edge on the diagonal, rivets, worn
ochre and rust, lighting from the upper left, no cast shadow, isolated on a solid
magenta background, game asset --ar 1:1 --style raw --sref [STYLE] --v 7
```

### Dropmål och stand-up-mål

```
single pinball drop target, top-down orthographic view, small rectangular armored
plate with a glowing cyan strip (unlit), ochre metal frame, rivets, lighting from the
upper left, no cast shadow, isolated on a solid magenta background, game asset
--ar 4:1 --style raw --sref [STYLE] --v 7
```

För stand-up-målen: byt `drop target` mot `standup target`, och `--ar 1:3` (smalare).

### Spinner

```
single pinball spinner gate, top-down orthographic view, thin metal paddle on a small
axle with two support brackets, brutalist ochre metal, lighting from the upper left,
no cast shadow, isolated on a solid magenta background, game asset --ar 5:1 --style raw
--sref [STYLE] --v 7
```

### Airlock (lås för multiball)

```
single round airlock hatch for a pinball table, top-down orthographic view, circular
heavy blast door half open revealing a dark pit, hazard-striped rim in yellow and
black, brutalist metal, lighting from the upper left, no cast shadow, isolated on a
solid magenta background, game asset --ar 1:1 --style raw --sref [STYLE] --v 7
```

### Kula

```
single polished steel ball, top-down orthographic view, mirror metal reflecting a
dim sci-fi station interior with faint cyan and orange reflections, lighting from the
upper left, isolated on a solid magenta background, game asset --ar 1:1 --style raw
--v 7
```

### Emblem (stjärna i mitten, "AEGIS 5")

```
circular emblem for a space station, a shield with the number 5, engraved into
brutalist ochre metal, top-down orthographic view, subtle cyan engraving lines,
worn, lighting from the upper left, no text other than the number 5, isolated on a
solid magenta background --ar 1:1 --style raw --sref [STYLE] --v 7
```

### Startfjäder (plunger)

```
single pinball plunger with a coiled spring and a round knob, top-down orthographic
view, brutalist ochre metal, lighting from the upper left, no cast shadow, isolated on
a solid magenta background, game asset --ar 1:3 --style raw --sref [STYLE] --v 7
```

---

## Steg 4 – Texturer (ramper, väggar, kanter)

Rampernas form ritar jag i kod. Du bidrar med texturer att lägga på dem.

```
seamless tileable texture, brushed ochre steel plates with rust streaks and rivets,
top-down, subtle yellow and black hazard stripe on one edge, lighting from the upper
left, no text --ar 1:1 --style raw --tile --sref [STYLE] --v 7
```

Skapa tre varianter: `ramp surface` (ramper), `wall rail` (smal list, `--ar 8:1`) och `outer frame` (ytterkant).

---

## Steg 5 – Display, bakgrundsbilder och logotyp

### DMD-ram (displayen ovanför bordet)

```
rectangular frame for a retro dot-matrix display, brutalist ochre metal bezel with
rivets and a dark empty screen area in the center, front view, cyan status LEDs
(unlit), sci-fi, lighting from the upper left, isolated on a solid magenta background
--ar 4:1 --style raw --sref [STYLE] --v 7
```

### Titelbild och bordsval

```
cinematic poster art for a pinball game called "Station Aegis 5", a huge brutalist
space station against a dust-colored planet, glowing cyan reactor core, dramatic
lighting, Dune meets StarCraft, no text --ar 16:9 --style raw --stylize 300
--sref [STYLE] --v 7
```

Game over-bild: byt till `a darkened station with flashing red emergency lights, abandoned`.

---

## Steg 6 – Rörlig bakgrund (loopande video)

Animera delar av bakgrundsbilden. Beskär en del (t.ex. kupolen) och använd "animera" i Midjourney med låg rörelse.

| Loop | Bild att utgå från | Rörelse (skriv i prompten) |
|---|---|---|
| Reaktorpuls | kupolen högst upp | `the reactor core slowly pulses with cyan light, subtle` |
| Rymd genom fönster | en utsparing i mitten | `slow drift of stars and a distant planet, very slow` |
| Varningsljus | nederkanten | `amber warning lights slowly blink, subtle` |

Mål: 6–8 sekunder, tyst. Komprimera för webben, till exempel så här:

```
ffmpeg -i in.mp4 -vf scale=540:-2 -c:v libvpx-vp9 -b:v 0 -crf 36 -an out.webm
```

Gör loopen sömlös. Om Midjourney inte har ett loop-läge i din version kan jag blanda ihop slutet och början i koden.

---

## Filnamn och målstorlek (så att jag kan koppla in dem)

Lägg färdiga filer i `art/source/` med dessa namn.

| Fil | Målstorlek (px) | Antal |
|---|---|---|
| `background.png` | 1024 × 2560 (gärna 2× = 2048 × 5120) | 1 |
| `bumper1.png`, `bumper2.png`, `bumper3.png` | 112 × 112 | 3 |
| `flipper.png` (pekar åt höger) | 200 × 40 | 1 |
| `flipper_mid.png` (kortare, valfri) | 150 × 34 | 0–1 |
| `sling.png` | 130 × 230 | 1 |
| `drop.png`, `standup.png` | 60 × 20 och 16 × 48 | 2 |
| `spinner.png` | 80 × 16 | 1 |
| `airlock.png` | 100 × 100 | 1 |
| `ball.png` | 64 × 64 | 1 |
| `emblem.png` | 120 × 120 | 1 |
| `plunger.png` | 50 × 120 | 1 |
| `tex_ramp.png`, `tex_rail.png`, `tex_frame.png` | 512 × 512 (sömlösa) | 3 |
| `dmd_frame.png` | 800 × 200 | 1 |
| `title.png`, `gameover.png` | 1600 × 900 | 2 |
| `loop_reactor.webm`, `loop_space.webm`, `loop_warning.webm` | 540 × ca 1350 | 0–3 |

Börja med bakgrund, bumper, flipper och kula. Då kan jag kontrollera att allt passar tillsammans innan resten genereras.
