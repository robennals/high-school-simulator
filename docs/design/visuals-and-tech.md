# Visuals and tech

**Summary.** Simple, bright, low-poly 3D in the browser with three.js, in the
spirit of Polytopia. All the game rules live in a pure simulation core that can
run without any graphics, so we can test whether students behave like real
people before building the player experience.

## Look

- **Style:** low-poly, flat-shaded, bright palette. No textures.
- **Campus as a cutaway diorama** (no roofs, so you see inside): a hallway with
  eight classrooms, the cafeteria with round tables, gym, behind the gym,
  library, theater, band room, robotics lab, courtyard with flagpole, and the
  soccer field with goals and bleachers. Every area has a floating label that
  stays the same size on screen.
- **The camera goes where you are**, and the light follows the time of day:
  the campus as you arrive (morning), the hallway and courtyard before school
  (students stand in the groups the simulation put them in), the cafeteria at
  lunch, wherever you went after school (teams and clubs at practice, the crowd
  behind the gym) in late-afternoon light, and the empty campus at dusk.
- **Title screen:** a crest logo — gold shield with a schoolhouse, a "HIGH
  SCHOOL" ribbon, "SIMULATOR" in outlined letters — over the whole campus,
  slowly orbiting.
- **Students as chunky, simple figures.** Variety comes from clothing color and
  style, hair shape and color, height by grade, and small props that hint at
  activities (backpack, instrument case, jersey). The goal is enough variety to
  recognize about 50 people.
  - **Shirt color is the crowd** (sporty red, preppy blue, alt charcoal, artsy
    purple, techy teal, low-key beige), and the same color is used for the
    look's name everywhere in the interface.
  - **Pants or a skirt shows boy or girl**: straight pant legs for boys, a
    flared skirt for girls, both the same dark color so they don't compete
    with the shirt. The flare is wide enough to see from the overhead camera.
  - **People you've met** carry a name tag and a ring at their feet: green if
    they like you, red if they don't, blue otherwise.
- **Camera:** angled overhead view with orbit and zoom.
- **Moving:** click on the map to walk quickly to a spot, or click a person to
  walk up to them. Reaching them opens the card game. Hovering over a person
  shows their notebook card.
- **Movement:** students walk between places on their schedules. Who clusters at
  which lunch table shows the groups visually.
- **Speech:** from a distance, small icons show which card someone played; the
  conversation view shows full text.
- **UI:** an HTML layer on top for cards, notebook and debrief.
- **Effort cap until we know it's fun:** simple walk and bob movement, no rigged
  animation, no detailed models.

## Architecture

- **TypeScript, Vite, three.js;** vitest for tests.
- **`sim/`** — pure and deterministic (seeded random numbers), no browser code.
  All the rules live here.
- **`headless/`** — a Node runner that plays a semester with no player, prints
  metrics, and writes a plain-English event log.
- **Observer view** — the 3D view can watch a headless run before the player
  exists.
- **`game/`** — the player layer: schedule, decision points, card UI, notebook,
  debrief.
- **`content/`** — card definitions, example lines, names and topics, as data
  files.

**Performance:** 800 students × roughly 20 events a day × a handful of witnesses
each is small for a browser. The simulation can move to a Web Worker if needed.
