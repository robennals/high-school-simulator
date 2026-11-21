# Decisions made while writing the design

Each item lists the choice made and the alternative rejected, for review.

1. **Simulate all 800 students at the same level of detail.** Rejected:
   detailed simulation of the player's grade with a cheap approximation for the
   others. Same-detail is simpler and avoids two rule sets. Revisit if it is
   slow.
2. **Feeder middle schools; the player arrives knowing almost nobody.** Matches
   the target audience (kids from small schools or homeschool). Rejected:
   everyone starting fresh, which is unrealistic and removes existing cliques.
3. **Five private judgments (affection, trust, respect, fear, familiarity) plus
   a public stance.** Rejected: one "liking" number plus status. The split is
   what makes fragile power, preference falsification and cascades possible.
   "Respect" covers both admired abilities and being useful to me; these could
   be split later.
4. **Status is computed from public deference, PageRank-style, with a
   prestige-versus-fear foundation.** Rejected: status as a stat that actions
   add to directly.
5. **Groups emerge from community detection on who hangs out with whom and are
   never labeled.** Rejected: predefined cliques (jocks, nerds…), which would
   make the game scripted and wouldn't teach reading groups.
6. **Your deck is built from your time investments.** Rejected: one fixed deck
   for everyone. This ties the time budget and the card game into one system.
7. **Low composure and energy add weak cards to your hand.** Rejected: a
   penalty to success rates. Weak cards make the effect visible and teach that
   being rattled narrows your options.
8. *(Replaced by 29.)* **Online group chats are not a player feature.** Students spread gossip
   online offscreen (faster, permanent). Rejected: playable group chats (which
   would encourage being online) and no online layer at all (unrealistic about
   how fast stories spread).
9. **Conversations are turn-based, with no timers.** Rejected: real-time
   pressure. Thinking matters more than reflexes, as in chess.
10. **Play speed comes from routines plus decision points.** Rejected: playing
    every slot of every day by hand.
11. **Prototype scope: one fall semester, four activities** (soccer, band,
    drama, robotics). Rejected: a full year in the prototype.
12. **Manipulation is tuned to lose over a semester, verified by strategy
    bots.** Rejected: hard-coded penalties for "bad" cards, which would feel
    preachy and unrealistic.
13. **Card lines are pre-written (AI-generated offline and reviewed), many
    variants per card.** Rejected: dialogue generated live at play time.

## Made while building the no-player simulation

14. *(Replaced by 34.)* **A fifth activity, quiz bowl (academics).** Rejected: four activities,
    where academics had no public showcase and was the only ability that
    hurt your status.
15. **The pep band plays at soccer games.** Rejected: one band concert a
    semester, which left athletes with six public moments to everyone
    else's one and made athletics the best ability.
16. **Status is one school-wide number for now.** Rejected (for now): each
    student holding their own estimate of everyone's status, as the design
    describes. Simpler to tune first; per-student estimates come back when
    the player's fog needs them.
17. **Bullying motivation peaks in the upper-middle of the ladder** and is
    near zero at the bottom and the very top, plus each bully learns from
    their own success rate. Rejected: motivation that is highest at the
    bottom, which made the lowest-status kids the biggest bullies — the
    opposite of the research.
18. **Time spent together builds trust; shared interests and opinions speed
    up liking.** Rejected: trust only from specific cards (share, help,
    defend), which made friendships decay over the semester.
19. **Each student holds at most about 150 opinions, and bystanders only
    notice strangers doing something notable** (or famous students).
    Rejected: everyone having an opinion of everyone, which was unrealistic
    and slow.
20. **Status foundation splits three ways: liked, admired, feared.**
    Rejected: two ways (regard versus fear), which lumped liking and
    admiration together.
21. **Schoolwork versus popularity:** each school night is study or
    something else (see 29); grades below the parents' bar risk a
    week of grounding; current knowledge (ability plus grades) drives being
    asked for help in class, which peaks around exams. Rejected: grades as a
    background stat with no social trade-off.
22. **Every way to spend time has several benefits and costs** (now a design
    pillar). Rejected: activities that only give skill and respect.
23. **Fitness and poise are new per-student stats.** Fitness (from sports)
    gives more energy, faster stress recovery and steadier composure. Poise
    (from drama) steadies you when challenged in public. Rejected: putting
    these straight into the athletics and arts abilities, which would
    blur "good at the sport" with "benefits of doing it".
24. **Activities have side effects as data**: what each practice builds,
    crunch weeks, and home-practice nights. Rejected: special cases in the
    daily code for each activity.
25. **The rule-breaking crowd is abstract: skipping class and sneaking off
    behind the gym. Drugs are never named or shown.** Fits the 11+ audience
    while keeping the real dynamic (easy acceptance, fast bonding, low
    respect, risk of trouble). Rejected: naming vaping or drugs.
26. **Rule-breaking is a per-student stat that drifts toward close
    friends' level each week**, and it lowers the chance of studying. This is
    how friends pull each other in (or out). Rejected: a fixed trait.
27. **Bullying follows the research but mostly backfires** (Rob's call).
    Strategic put-downs tempt the upper-middle and grow with insecurity
    (having just slipped); stressed, sensitive kids sometimes lash out at
    whoever has been hurting them. A put-down only lands if most of the
    audience laughs, it earns fear rather than respect, and onlookers'
    sympathy costs the bully more. Rejected: bullying as a viable
    climbing strategy, which would teach kids to do it.
28. **Standing up for someone is a risky contest.** Whether the bully backs
    off depends on the defender's standing and composure versus the
    bully's, how many people present are on the defender's side, and luck.
    If it backfires, the bully turns on the defender (occasionally with a
    shove). Either way the target trusts the defender a lot (more if they
    took a hit), the bully holds a grudge and is more likely to target the
    defender later, and onlookers who like the target respect the
    defender. Rejected: defending as a sure win.
29. **Evenings are homework, friends, practicing a skill, rest, or the phone.**
    The phone gives a short-term lift (a little stress relief, catching up on
    stories, light contact) and is always worse over a semester: it builds a
    habit, costs sleep and adds stress, makes studying less likely and less
    effective, and builds no trust. Checked by running the same school with
    and without phones: the 50 heaviest users end with lower grades, more
    stress, fewer friends and lower status in every seed. Rejected: no phone
    at all (Rob's alternative), and a phone that was a fair trade.
30. **Clothes: a look and an optional shirt.** A look (sporty, preppy, alt,
    artsy, techy, plain) signals belonging; a shirt about a team, movie, pop
    star, game, band or show is a public opinion — an opener with fans,
    out-group to mockers. Each student keeps their own taste and only
    switches to their close friends' look when most of them share it.
    Rejected: copying the most common look among everyone you watch, which
    collapsed the school into one look (182 of 200 preppy in one run).
31. **A phone habit follows you into conversations:** people with a habit
    sometimes check their phone instead of talking, and the others feel a
    little less close (research on phones during conversation, Przybylski &
    Weinstein 2013). Added because, without it, heavy users' status and
    friendships weren't reliably worse. It lowered average close friends for
    everyone from about 4.8 to 3.3–3.8 (still in the 3–6 target) and
    produced a few isolated students. Rejected: leaving the phone's
    social cost to chance.
32. **Activities pay off by how good you are at them.** The weakest third of
    a team gets half the fitness or poise benefit and some stress from
    struggling; quiz bowl's grade boost grows with academic ability.
    Studying adds a little stress; practicing a skill and playing music at
    home are a little calming; drama's poise makes walking up to people
    easier. Rejected: benefits that are the same for everyone, which made
    soccer the best choice for 42% of students regardless of skill and left
    band and drama beaten on every outcome.
33. **Shirts make the right people approach you.** Fans of a wearer's shirt
    are drawn to their lunch table, more likely to start a class chat with
    them, and find joining easy because the shirt is their opener; people
    who mock the topic are put off. Rejected: shirts that only helped the
    wearer approach others, which left the risk of starting a conversation
    on the wearer.
34. **No quiz bowl: academics earns standing by helping people** (Rob's
    call). Struggling students ask the classmate nearby who knows the work
    best, more often around exams. Rejected: a public academic competition,
    which isn't how being good at school earns standing in real schools.
35. **Help creates a favor owed.** The helped person defers to the helper in
    public, prefers to sit with them, and is more likely to defend them;
    the debt fades and defending pays it down. Without this, dropping quiz
    bowl made academics hurt status (correlation −0.14 to −0.30); with it,
    −0.06 to +0.25 across three seeds. A first version overshot (+0.43 to
    +0.56, about 25 help requests per student a semester) and was toned
    down to about 8.
36. **Checking your phone mid-conversation costs a little more liking**
    (raised after the favor change erased heavy phone users' status gap in
    one seed). Heavy users now end with lower status than the same students
    without phones in all three seeds.
37. **A look's signal fades as it spreads**: its weight is (1 − share of
    students wearing it)³. Same-look warmth, table preference and joining
    all scale with it; non-conformists leave a look worn by over 30% of the
    school; conformists adopt common looks less readily. Across five seeds
    no look went above 30% of the school (before, one run reached 42%, and
    an earlier version 91%). Rejected: a fixed value for matching a look,
    which pulled the school toward one style.
38. **Repetition wears out, at different rates.** Each repeat of the same
    evening in the last six cuts its payoff: homework by a little (0.15 per
    repeat), practice and rest by more (0.5), the same friends by a lot
    (0.7, averaged over everyone in the group). Rejected: one rate for
    everything, which made diligent students' grades fall and roughly
    doubled groundings.
39. **Things feed each other:** tired students talk less, and an evening out
    costs energy the next day (more for introverts). Rejected: energy that
    only mattered when nearly empty.
40. **No pass, no play:** grades below 0.22 bench you from your activity
    until they recover. **Falling behind is stressful:** a school night
    without homework while grades are near the parents' bar adds stress.
41. **The strategy experiment tests mixes**, including an "adaptive" plan
    that studies when grades slip, rests when worn down, and otherwise
    alternates friends and practice — a stand-in for a thinking player.
42. **The strategy experiment scores grades by what they do for you**: a lot
    up to comfortably above your parents' bar, little beyond (Rob's "no
    easy winning strategy"). Rejected: raw grades, under which "always
    study" was the best plan for 28% of students.
43. **Luck has its own seed.** `eventSeed` controls what happens during the
    semester, separately from `seed`, which builds the school, so the same
    students can be run with different luck.
44. **Trust from time at school tops out at 0.25; closeness beyond that
    needs private time** (hangouts, weekends) or costly signals. Average
    close friends went from about 4.0 to 3.7–4.0. Rejected: unlimited trust
    from lunch and class, which made evenings with friends nearly
    worthless for friendship.
45. **Grades only rise on nights you study**, toward what your ability
    allows; nights without homework let them slide slowly toward a floor.
    Both directions are slower than before. A test enforces "never rise
    on their own". Rejected: grades drifting toward a target either way,
    which let non-studying students' grades climb.
46. **Parents ground less often** (weekly chance 0.04–0.16 when grades are
    below their bar, down from 0.1–0.5), as do teachers who catch students
    skipping. Groundings went from about 380 to 61–88 a semester.
47. **Soccer is a little less of a stress cure, and practice is physically
    tiring** (less energy that evening). It went from best-for 39% to 34%.
48. **Deference from inside your own group counts half toward status**, so
    a clique can't make itself popular. Fixed the rule-breaking crowd's
    status being propped up by its own members.
49. **Grudges and debts after defending are stronger**: the bully likes the
    defender much less and targets grudges harder; the person defended
    owes the defender, which makes them likelier to defend back.
50. **Style counts less in first impressions** (it gave the biggest status
    edge of any ability).
51. **Put-downs are recorded by the bully's status at the time, split into
    strategic and lashing out.** Confirms the research pattern: strategic
    put-downs peak in the upper-middle and drop at the very top; lashing
    out comes from the bottom.
52. **Evening hangouts need real close friends**: someone you like
    (affection above 0.4) and trust (above 0.2), who likes you back (above
    0.3) and is free that night. Without one, a friends evening isn't an
    option. Rejected: anyone you mildly like. Evenings with friends fell
    from about 12% to 8% of evenings; average close friends from 3.9–4.0 to
    3.6–3.8.
53. **The storyteller's first batch is ten events that change what's worth
    doing** (see [storyteller](storyteller.md#whats-built-first-batch)).
    Personal events find the player about four times as often as a
    simulated student. Rejected: player-only scripted events, which
    wouldn't change the simulated world.
54. **Grades still only rise from schoolwork during events.** Doing your
    share of a group project counts as schoolwork; coasting earns nothing
    from the others' work. A friend helping you study makes your own study
    nights go further for a week, but gives nothing unless you study.
    Tests enforce both.
55. **The game is called High School Simulator** (Rob's call), and its first
    screen is titled "Create your profile."
56. **Clothes are a daily choice, not part of your profile** (Rob's call).
    Each morning you pick a look and a shirt; the game shows how common
    each look is (you can see what people wear). Simulated students'
    weekly outfit changes never override the player's choice.
57. **A whole-campus 3D view, with the camera following the player's day**
    (Rob's call). Rooms are cutaways with no roofs. Two new beats show
    where you are — "Before school" (hallway groups) and "After school"
    (where you went) — each one extra click. Rejected: a cafeteria-only
    scene.
58. **The logo is an SVG crest drawn in code** (gold shield, schoolhouse,
    ribbon, wordmark), so there are no image files to manage. Rejected: a
    plain text title.
59. **The player picks their seat in each class** (Rob's call): all six on
    the first day, then any morning. Classrooms now have 36 desks (6×6) for
    about 25 students, with students placed at random desks, so open desks
    are spread around the room. This gives everyone slightly fewer desk
    neighbors; close friends per student stayed at 3.2–3.6. Rejected:
    picking a seat every class every day (too many clicks), and swapping
    with someone already sitting there.
60. **Walking to class is one choice a day, before 1st period** (Rob's
    call): pick a classmate or walk alone; a yes leads to a two-turn
    conversation. Rejected: a walk between every period (six more
    decisions a day). The morning is now split into the hallway hangout,
    then the walk, then classes (same order as before for the
    simulation).
61. **Every social decision is the player's; classwork isn't played**
    (Rob's principle, now a design pillar). Newly the player's: which
    group to join before school, one whisper-or-focus moment in morning
    and in afternoon classes, who to hang with at practice, which friends
    to call, and Saturday invitations. The player's character no longer
    starts class chats on autopilot (others can still talk to them).
    Rejected: a decision in every one of the six classes (too many
    clicks).
62. **The hallway and courtyard have 20 standing spots, not 12.** With 12
    spots of ten for 200 students, the overflow formed groups of 16–22
    that the player could never join. Close friends per student stayed at
    3.4–3.7.
63. **Everyone wears a shirt, and there are four kinds: plain, funny
    graphic tee, fan shirt, hoodie** (Rob: no "no shirt" option; shirts
    should make people more or less likely to talk to you, with real
    trade-offs). A graphic tee makes people 1.5× as likely to approach
    you and a hoodie half as likely; a fan shirt pulls fans in strongly
    and pushes people who mock the thing away. More approaches mean more
    class chats, and each class chat costs both people a little focus.
    Rejected: a shirt that only helps (it would become everyone's
    default), and flavor-only shirts with no effect on who approaches.
64. **A fan shirt has to go with your look** (Rob: "it seems weird to be
    sporty with a band on it"). Each look allows one or two shirt topics;
    the low-key look allows all six. Simulated students wear their favorite
    among the topics that fit their look. Rejected: adding new opinion
    topics so every look gets two (sporty has only the school team), since
    new topics would change how opinions spread across the whole school.
65. **The conversation screen shows people, and cards show lines** (Rob:
    "it doesn't tell me anything about the person I'm picking"; tips only
    behind a help icon; openers about someone's shirt or a topic you know).
    Each person is a card with a portrait, their clothes, how well you know
    them, your read, and what you've heard them say they love. Cards show
    the line you'd say; a "?" shows the tip. An opener card about the person
    you picked comes from their fan shirt, a topic you heard them love, an
    interest you heard them talk about, or a funny tee. Openers are Asks
    that land better on someone who cares about the subject. Rejected:
    letting the player see someone's real opinions (they're hidden; you only
    learn what people say in front of you).
66. **The tutorial is a coach on a real first day** (Rob: walk the player
    through the first day; make clear how everything works, why there's
    strategy, and how to think about decisions). Four welcome pages, then
    a non-blocking coach card at each step of day one with "how it works",
    "why it matters" and "how to think about it". After day one it only
    appears the first time something new happens. Rejected: a separate
    scripted tutorial level (the player would lose their character and have
    to start over), and coach advice that names the best choice (there
    isn't one; the coach asks questions instead).
67. **Before school, nobody is put in a group for you** (Rob: "I need to
    actually walk up to people… some people should be standing, looking
    awkward and lost"). The hallway has 100 standing spots instead of 20, so
    people can stand alone; standing alone is a single option in each
    student's choice (otherwise 100 empty spots outvoted every group);
    groups get less attractive as they grow; and walking up to strangers
    scores lower in the hallway than at lunch. The player starts inside the
    front doors and clicks people on the map (or a list) to walk over;
    someone on their own is easier to join. Close friends per student,
    mutual friendships and same-gender friendships are unchanged (3.9–4.3,
    65–67%, 71–72%).
68. **Lines come from a response graph** (Rob: "the things you say
    shouldn't sound like a total non sequitur"). Each card has lines for
    each kind of thing it can follow (a question to you, an opinion, a
    personal share, a joke…), opinions agree or disagree with one said a
    line or two earlier, and topic changes get a lead-in. Your cards aim at
    whoever spoke last by default. Rejected: changing which card the
    simulation plays to make conversations flow (that would change the
    social model; the graph only changes the words).
69. **Lunch tables and hallway groups are described by what you can see**
    (Rob: "+7 you don't know" for every table is useless when you know
    nobody). Strangers are summed up by look and gender ("4 preppy boys, a
    sporty girl, 2 more · 2 in Starfall movies shirts"), after the names of
    anyone you know.
70. **The player plays every after-school conversation** (Rob: "when it
    goes to different places like band practice, there has to be a social
    element there as well… decide who to talk to and what to talk about").
    At practice and behind the gym, the simulation forms the groups without
    the player and hands them to the game; the player picks one (list or
    map) and plays it. Hanging out with friends is a longer private
    conversation. Before, practice was a one-on-one chat played on top of
    a conversation the simulation had already played for the player
    (counted twice), and hanging out or going behind the gym had no
    conversation at all.
71. **Every card shows when it works and when it backfires** (Rob: "every
    card has a [use] and disadvantage in situations where you shouldn't play
    it… like a Pokémon or other card game, except aligned with real social
    behavior"). The "?" on a card shows "Good:" and "Bad:" lines that
    describe what the simulation actually does; How to Play gains two pages
    on card strategy. The one card with no real downside — an invite that
    leaves an easy out — now warms the other person a little less when they
    say yes (it shows less interest). Rejected: inventing new downsides the
    simulation doesn't model, which would make the tips lie.
72. **You see ♥ like and ★ respect live, once people show it** (Rob: "a
    simpler version where, rather than the current [reveal] every Sunday,
    you see live how people are liking or disliking you… more like a
    conventional card game… some people, you don't know whether they like
    you because they haven't revealed it… you don't necessarily know who
    knows what"). Each person's card shows ♥ and ★ (−100 to 100) with the
    change from your last move. A person shows "?" until they react visibly,
    speak to you, or you know them well. What people will do, secondhand
    gossip, and who knows what stay hidden; the weekly recap now shows the
    bigger picture (including what happened behind your back) instead of
    being the only place feelings are revealed. Rejected: showing every
    student's numbers from the start (no mystery left in meeting people).
73. **You pick each class's seat when you first walk in** (Rob: choosing all
    six at once "is boring and it's not clear why it matters"). The game
    runs classes one period at a time; the first time you enter a class you
    pick a desk, and the panel names anyone there you met earlier that day.
74. **Look names are written in their shirt color everywhere** (Rob: "you
    shouldn't have to mouse over everyone… tell by their shirt color… write
    the words like 'preppy' in the relevant color"). Every look word in
    lists, cards, the feed and tooltips is colored with a dot matching the
    shirts in the 3D school; the hallway, lunch and practice screens show a
    key to the colors.
75. **Shirt cards show how many people come up to you** (Rob: the
    difference between a plain tee and a hoodie wasn't clear). Each card has
    a four-dot scale: hoodie 1 (fewer people), plain 2 (the usual), graphic
    3 (more of everyone), fan 4 (lots of fans, fewer of everyone else), then
    the upside and downside.
76. **Boys wear pants, girls wear skirts** (Rob: to make it easier to tell
    boys from girls at a glance). Both are one dark color for everyone, so
    shirt color stays the only clue to someone's crowd; the skirt flares wide
    enough to show from above. Rejected: coloring the legwear by gender
    (a second color code competing with shirt color).
77. **The card game has real rules** (Rob: "I shouldn't be able to 'laugh
    along' or 'really listen' if nobody else has said anything yet… there
    should be some clear logic about how you get particular cards and
    whether you spend them or keep them"). Your deck is built from who you
    are; you're dealt five, a played card is spent, unplayed cards stay,
    and you draw one a turn. Responses (laugh along, really listen, agree,
    push back, answer…) aren't in the deck: they appear only after someone
    says something, answer that line, and last one turn. Rejected: a fresh
    random hand every turn (nothing to plan, nothing to save).
78. **A sentence-level reply graph** (Rob: "record a graph of sentences that
    make sense in response to other sentences"). Specific lines list the
    lines that answer them, per kind of card; the kind-level graph is the
    fallback. A test fails if any line in the graph can't actually be said.
79. **Responses are cards in your hand that you can only play when they
    apply** (Rob: "they are just other cards you have, but ones you use in
    a different way"). They're greyed out with what they need until the
    right line comes, and spent when played.
80. **You get cards by changing who you are** (Rob: "a coherent way you get
    more cards… that fits with the rest of the logic of the game"). Your
    collection is computed from your skills, hobbies, opinions, close
    friends, personality and the stories you know, so practicing, making
    friends and hearing gossip all grow your deck; the Notebook shows each
    card and why you have it. Rejected: card rewards or a card shop (a
    separate economy with no link to the social simulation).
81. **How to Play is the rulebook; the tutorial teaches it as you play**
    (Rob: "the tutorial needs to explain a lot more of the game mechanics…
    it's not clear the relationship between tutorial and how to play"). The
    rules are written once (`rules.ts`) in twelve chapters; How to Play
    shows them as a book with chapters down the side; every coach tip links
    to its chapter, and new tips explain the hand, response cards, openers,
    ♥ and ★, and how you get more cards the first time each comes up.
    Rejected: keeping a separate short picture guide (two sources of truth
    that drift apart).
82. **Energy is what cards cost** (Rob: "should energy fit more
    consistently into the game? Like some things require spending energy
    cards and some things give you energy… kind of like pokemon cards?";
    chose the recommended option). Cards cost 0–2 ⚡ from a visible pool of
    20; personality shifts the cost of things said to the whole group; close
    friends, jokes that land and rest give ⚡ back; being put down takes
    it. Low energy now limits what you can afford instead of randomly
    dealing blanks; "Um…" blanks come only from stress. The player's moves
    no longer also drain energy through the old hidden formula (simulated
    students still use it). Deferred: favors as a second resource you earn
    by helping people and spend with a "Call in a favor" card.
83. **Shirts change who approaches you and who teases you** (Rob: "T shirts
    in general make it easier for people to approach you, but also easier
    for people to tease you… different t-shirts make conversation easier
    with different kinds of people. Hoodie gets you less people talking to
    you, but also less teasing"; "funny graphic tee is also an opener"). A
    funny tee draws people who like funny, outgoing people; a fan tee draws
    fans. Simulated students who are drawn often open by asking about the
    shirt; edgy people tease funny tees, and people who can't stand a fan
    shirt's topic mock it. Hoodie wearers get approached and teased less;
    plain tees are never teased for the shirt. Rejected (briefly built, then
    removed): a card your own shirt adds to your deck — shirts work through
    other people.
84. **The opening hand is a plain random six** (Rob: "sometimes maybe you
    just don't have anything to say and it's awkward"). No guaranteed
    playable cards; a free **Stay quiet** lets you pass a turn.
85. **The card rules spec** (`card-rules-spec.md`) replaces the earlier
    proposal, with Rob's answers: Bond −5…15 (try it); fog of war over other
    people's Bonds and over Respect (shown as of when you last saw them);
    each moment whoever wants to speak most does (Stay quiet / Say something
    / Jump in) instead of fixed turns; any story can be shared and every
    listener gets a copy; Ask out only works if they like you enough and a
    public no costs Respect; other students' personalities are random and
    hidden, and their picks have randomness. Recommended and written in, for
    review: no hand — you can use any card you own, each copy once a day, so
    gaining a card never makes your other cards harder to reach.
86. **Respect for you is visible; one Energy meter; breaking up** (Rob:
    "people's respect for you should be visible… what you can't see is
    their respect for each other"; "do we need both energy and nerve?";
    "breaking up should be a thing"). Respect for you is always shown; other
    people's Respect for each other is under the fog of war. Energy and
    Nerve merge into one 0–12 meter: bold cards cost more, success refunds
    some, failure costs extra. Going out gives +1⚡ a morning and backup in
    put-downs but needs weekly upkeep; Break up is a card (played by you, or
    on you when the Bond drops below 8) that costs Bond with them and their
    friends; asking out someone else while going out is two-timing.
    Rejected: keeping Nerve as a second meter (realistic but doubles what
    you track, and the two mostly move together).
87. **No two-timing; pushing back against meanness; simulator first** (Rob:
    "don't allow two-timing at all"; "do we still have ways to use gossip to
    gang up on someone who has been using mean dominance to gain status?";
    "do we think the card game rules approach is going to adequately
    simulate real social outcomes?"). Ask out can't be played while going
    out. New cards Call out (needs a true story of a mean act) and Don't
    laugh, and a Standing together rule: three or more people pushing back
    in a week drop the person a Standing step — research on dominance finds
    coalitions and reputation, not lone defenders, are what check it. The
    card rules get a headless simulator and must pass the realism and
    strategy checks before the game screens change.
