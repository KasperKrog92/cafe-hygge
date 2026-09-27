# Character and story bible

This is the continuing writing reference for Café Hygge. Updated 8 September
2026. **Shipped** means playable; **planned** means a direction for later work,
not a promise that a trigger or scene already exists. The invitation-waits rule
in [narrative.md](narrative.md) applies to every character.

The owner **largely accepted** the [community and character direction](plans/community-and-character-stories.md)
on 7 September 2026. It supplies the working ensemble, backstory and connected
arcs. This bible keeps concise continuity facts and distinguishes **shipped**
content from **planned direction**. Planned details remain editable when scenes
are authored; they must not be mistaken for events the player has experienced.
The [progression roadmap](progression-roadmap.md) owns build order; the
second-day visitors and the first books release (27 September) are shipped.

## Names and the neighborhood

**Owner direction, 7 September 2026:** the Copenhagen/Christianshavn inspiration
includes a community with varied backgrounds. Character names may be Danish,
international or unusually literary. The owner's name list is inspiration,
not a restriction. Write cultural and family details as part of individual
lives; names alone do not establish nationality or background.

The current working names are Tomas, Marcel, Keira, Saira, Elody, Ezra and
Antonia in place of its earlier seven names, with Calandra as Lunafreya's sister
and Ida as the librarian. These names guide new writing. The evening reader is
displayed as Antonia since 27 September; her `freya` save identity, look,
habits and history are unchanged (flags use `freya-`).

**Delivery character:** the owner subsequently chose a woman for this role.
Her working name is Keira (she/her), from the owner's reference list. Carry this
identity through future delivery art, actor data, dialogue and off-duty visits.

**First meetings — shipped 8 September:** Keira delivers the day-two table kit;
Tomas repairs the left window. Lunafreya assembles the kit. Both optional hellos
persist and return on later no-purchase visits. Work never requires dialogue.

## Keira and Tomas — the working neighbours

Keira is a woman (she/her), with dark hair in a bun, a rust jacket, ochre scarf
and navy trousers. Easy company, attentive to practical details. Her expanded
17-line hello starts with the kit's screw bag and spare screw. She knows local
doors by their quirks and photographs shopfronts, lamps and handwritten signs
for herself. Lunafreya admits repeatedly going outside to look at her own sign.
Keira will ask before photographing the café; no photograph or permission is
awarded here. She usually drinks standing up, watching the van. Lunafreya makes
room for her to return, put her coat down and sit without a delivery.

Tomas is a man (he/him), with side-parted brown hair, a short beard, blue-grey
work shirt and slate trousers. His expanded 19-line hello keeps his dry
description of moving water, then shows his interest in useful old wood and
well-placed handles. He is making a small cupboard for his daughter's new flat
and overthinking its hinges and shelves; she wants the plain version for her
towels. He has not finished it or resolved that habit. Lunafreya invites him to
return with news. These details seed the later cupboard story; his bread-making,
gifts and deeper family scenes remain planned. Neither introduction establishes
romance. Their later visits retain these looks.

Both packets live literally in `CAST.visitors[id].hello`. Trigger: stationary
job actor, or a later off-duty customer seated after ordering and collecting
coffee; visible invitations use game mode. Stable
opening nodes remain Keira `name/place/practical/laugh/welcome` and Tomas
`name/view/precise/reply/welcome`, with their original meaning and order. The
new conversation follows those five nodes, so older partial greetings resume
normally and completed introductions stay complete. Each acknowledged node saves
`<id>-hello-<node>`; final acknowledgement saves `<id>-introduced`. No choices
or purchase effects occur. Future callbacks to these new details must check
their own acknowledged nodes: an older `introduced` flag alone does not mean
the photographs or cupboard have been discussed. Off-duty opening lines adapt to the present visit;
unfinished nodes resume. Completed greetings receive familiar arrival captions.
They leave independently, and return on later café days. Keira's return with
the three little wall shelves keeps the same identity and saved hello nodes.
An unfinished hello adapts its opening to the small shelf kit and reuses the
off-duty place/practical lines; it does not replay acknowledged nodes. A completed
hello receives a familiar arrival caption. The same expanded introduction can
be finished during that job or an off-duty visit.

**First callbacks, shipped 27 September** (`CAST.visitorStories`, one story per
neighbour, offered on a later off-duty visit, seated, game mode). **Keira's
second cup** (after `keira-introduced` and her `permission` node): she has taken
her coat off and wants it noted; she passed four times this week and looked in
to see what had changed (books on the shelves, empty shelves or the window).
She asks, as promised, before photographing the café: `keira-photo-yes` (as it
is, while it's new; she takes one quiet photograph from her chair) or
`keira-photo-later` (she'll ask again; "I'm patient with doors"). Completion:
`keira-cup-done`; later arrivals note her coat off before the counter.
**Tomas's cupboard report** (after `tomas-introduced` and his `news` node): he
made the plain version, two shelves and one door, with her hinges; he decided to
believe her. The towels are in it, folded. He has moved on to bread, which is
going worse ("could have held a door open"). Completion: `tomas-cupboard-done`;
later arrivals come without a toolbox, flour on one sleeve. The printed photo,
the re-ask and bread gifts remain planned.

## Writing and choices

The café is a place to belong. People have lives beyond its door, and reveal
those lives through ordinary talk, habits and objects. Leave room for silence.
Do not turn hidden depth into a compulsory tragedy or a mystery to solve.

Lunafreya speaks as a character. Offer a choice when it establishes a preference,
a boundary, a piece of her past or a decision that someone can remember. Most
lines need no menu. Both answers deserve a warm, specific response. There are
no correct answers, approval scores, locked friendships or missed deadlines.
Choices describe her at this moment; they do not prescribe every future reply.
They may select a real gift variant, activity or explicitly chosen relationship.
Follow [the choice contract](narrative.md#6-conversations-and-the-shape-of-branching).
Distinguish fixed biography, the player's chosen interpretation, and what a
particular person has been told. Never invent a selected answer or shared
confidence when its saved evidence does not exist.

Conversations are attended, manually advanced moments. The camera moves closer,
ordinary controls and speech icons recede, and the café holds its obligations.
People breathe and blink; orders, new arrivals, departures and time wait.
Ordinary conversations can be put aside to release the hold. The owner’s
mandatory first Holger introduction is the one-time exception: “pause conversation”
returns to his counter invitation while café time and service keep waiting.
Holger remembers the exact acknowledged line and selected reply across reloads. Existing
short arc moments restart when reopened and award their result only at the end.

## Lunafreya — the keeper

**Established:** newly opening this café, living in the apartment, sharing both
places with the cat. Nervous, practical and quietly hopeful. She wants guests
to feel welcome and is learning what her own place will become. Her name and
role are fixed. She moved to a new city and apartment and opened the café within
a few days, and admits how exhausted she is on the first evening. Her existing
answers about belonging/new beginnings and books/neighbors remain authoritative.

**Planned direction:** she previously worked in a bookshop with a café and events
room. After years of organizing other people's occasions, she accepted then
withdrew from a promotion and prepared a place of her own. Planning took months;
the actual move/opening took days. Calandra is her sister in the old city.
Reveal this gradually through patron conversations, with ordinary pleasures,
humor and agency alongside her difficulty feeling welcome without being useful.
The exact scenes and wording remain to be authored. Her first disclosure, told
to Holger over his books, is only her former bookshop/café work, not the whole history.

**Voice:** concrete observations, little admissions, affection without speeches.
She can ask a direct question, admit uncertainty and set a boundary. She should
also be allowed to encourage the regulars; kindness does not run only toward her.

| Beat | Status | Memory / consequence |
| --- | --- | --- |
| First morning: cat, setup, cups, two tables, unnamed sign | Shipped | Existing first-morning checkpoint |
| First evening: apartment tour, one moving box, coat hanger and drapes | Shipped | v8 `life.homeStory`; required window/table plan in both modes, then explicit bedtime |
| Bedtime: teeth, curtains, bed and a whispered goodnight to the cat | Shipped | Saved bedtime cursor; same cat settles on the pillow |
| Why this café: a place to belong / a new beginning | Shipped, Holger introduction | `luna-beginning-belonging` / `luna-beginning-new-start` |
| First hope: a reading corner / learning neighbours' names | Shipped, Holger introduction | `luna-cafe-books` / `luna-cafe-neighbours` |
| Her old work, told to Holger | Shipped, Holger's books | She worked in a shop with books, coffee and evening readings, "mostly finding enough chairs". Choice: `luna-bookshop-fond` (leaving took long because she loved a lot of it) or `luna-bookshop-later` (most of it; the rest another day). Only Holger has heard this |
| What came before the move | Planned direction | Withdrawn promotion and a prepared move; not yet disclosed, and no invented traumatic cause |
| The old shop mug | Shipped, evening moment | The evening after she tells Holger about the shop, a box marked "kitchen" holds the shop mug she'd told herself she packed by accident; she drank the last coffee from it at closing, standing up, counting chairs. It recalls her exact answer to Holger. Choice: `luna-mug-home` (on the desk, for tea) or `luna-mug-cafe` (on the back bar; at closing she drinks the last coffee from it, standing up) |
| Calandra's first letter | Shipped, evening moment | From the third evening: "Luna. It's your sister. You know that. I'm saying it for the record." Mum and she want photos; Dad asks about the chairs; is she eating; it's quiet without her arguing with the crossword. Lunafreya writes back about the people (`calandra-told-people`) or the room (`calandra-told-place`), and leaves out the bread and cheese. The letter stays on her desk |
| Why this side of the lake, told to Marcel | Shipped, Marcel's hello | `luna-lake-tuesday` (an ordinary Tuesday imagined by the water on the viewing day) or `luna-lake-later` |
| Naming the café | Planned | Find its name through lived experience; Fleur de Lune remains provisional |

The reading-corner answer makes no purchase, price commitment or upgrade gate.
The neighbours answer never prevents buying books later.

## Holger — two doors along

**Established:** retired neighbour, formerly a seafarer on the Kattegat for
thirty years. Grey hair and beard, green jumper, muted red scarf. Espresso,
his own book, an unhurried pace. He tends the hearth when it is available.
His first visit is the first arrival at a newly opened café. He stays at the
counter until his mandatory introduction completes, teaching the player to open
and advance dialogue. The dots invitation softly blinks until first opened,
then stays steady, including on reload. Waiting consumes no café time, in idle
or game. Established furnished saves retain their optional seated version;
existing history and choices are preserved.

**Purpose:** an early friend who makes the opening feel witnessed. He notices
what Lunafreya has already done before suggesting what might come next. He
can offer an idea, a spare book or practical help, then leave the decision with
her. He is a neighbour with a life, not a tutorial dispenser or endless praise.

**Voice:** warm, dry, specific. A small story instead of a maxim. He asks
permission before a personal question and accepts a partial answer. Nautical
history appears in remembered details, not constant sailor metaphors.

**Depth:** retirement gave him time but took away everyday company. In the
first conversation he misses “some of the voices” more than the sea. This is
a seed, not an established bereavement. Do not assign a dead spouse, estranged
child or maritime disaster without a later, deliberate writing decision.

| Beat | Status | Content and continuity |
| --- | --- | --- |
| H1 — The new sign | Shipped | Mutual names, first espresso, her two choices, polishing a brass handle from nerves, galley table, missing familiar voices |
| H2 — Books with a history | Shipped | Offer recalls her hope (books or names); the crew's six books (seven counting the 1998 tide table holding the box shut). She chooses lending them to anyone or letting them stay his, kept here. Handover on a later visit, once a shelf exists |
| H3 — Keeping a fire | Planned | When a hearth is available, a small stove-at-sea story; provide another ordinary setting if it is never bought |
| H4 — The voices at the table | Planned | Lunafreya may ask about someone he mentioned or simply keep him company. Let him decide how much to tell |
| H5 — Being welcome, too | Planned | Lunafreya notices that he also needs encouragement. A reciprocal moment, not a rescue |

**H2, shipped 27 September.** Trigger: his third visit after the introduction
(game mode; ordering or seated). The `offer` packet (`holger-books-offer-`
nodes recall/recall-reply/box/count/seventh/tide/offer/choice/when/thanks)
recalls `luna-cafe-books` or `luna-cafe-neighbours` and says the books wait at
his flat if there is nowhere to put them. Choice: `holger-books-lend` (anyone
may borrow; he writes a note in each, "for anyone who stays a while") or
`holger-books-keep` (his, kept here; his name in each). Completion saves
`holger-books-promised`. The next visit after a shelf exists, he brings the
box; the `gift` packet (here/look/adventure/cookbook/what/decided/shop/worked/
readings/enjoy/choice/garden/plates/place/new/crew) tells who recommended which
book (the bosun never finished his adventure; the cook's cookbook he nearly
kept; nobody on that ship grew anything but beards) and holds Lunafreya's first
disclosure. Completion saves `holger-books-given` and hands her the box. Known
facts: the tide table from 1998 stays at his flat. Afterwards his books are
borrowed like any others, and with `keep` he sometimes reads his own.

H1 completes with `holger-introduced`. Acknowledged node flags are
`holger-introduction-node-ID` (since 11 September); IDs are `sign`, `opening`,
`neighbour`, `luna-name`, `espresso`, `why-cafe`, `beginning`, `sea-nerves`,
`cups`, `reassurance`, `hope`, `galley`, `miss-sea`, `voices`, `welcome`,
and `farewell`. The two choice pairs above are mutually exclusive
through the conversation API. The current answer is committed before its reply,
so reload cannot choose a different answer or skip the acknowledgement.
An already established café receives a “properly said hello” variation when
Holger has visited more than once. No existing relationships are reset.

## Gerda — care made tangible

**Established:** tea, knitting, a window seat, garden and winter stories. She
speaks of Erik and sometimes corrects herself into the past tense. Treat that
gently; his relationship to her and the circumstances are not yet fully authored.

**Shipped:** `gerda-scarf` grows over five café days, then waits for the reader.
Its attended payoff gives the cat a lasting scarf. Her attention to the painter
across the water can accompany the street-house story.

**Shipped 8 September — a warm place by the water:** she first enters after
the left window is repaired. She loves watching ships and knitting by the
water, but the cold forces her home earlier. Seeing the café’s clear window
prompts her first visit. She offers two rust-red pillows with cable-knit covers
she made herself, one for her and one for company. Lunafreya may accept or
say “not yet”; both are warm answers, and the offer can be reconsidered later.
Acknowledging acceptance unlocks the optional 40-coin window table/seats plan.
She also says she looks forward to the fireplace being opened. Lunafreya hopes
to remove the boards and get a fire going, leaving the shelf and little things
for later. Completing their hello unlocks the separate 30-coin reopening
project, including when the pillow offer is deferred. If the fireplace already
works, those two lines acknowledge its existing warmth instead of claiming
it is still boarded. Earlier completed introductions get a short, optional
`hearth` conversation on a later visit; existing choices never replay.

After a chosen project’s next morning, Lunafreya assembles the little table.
Gerda returns with both pillows, places them separately on the sill, orders
chamomile tea and takes a left-window perch. Her attended thank-you says that
coming home earlier has made her days smaller; this warm knitting place gives
her a bit of her day back. It introduces no new bereavement or diagnosis. The
second pillow leaves room for company, and Gerda jokes gently about counting
stitches while listening. She continues knitting here after the cat’s scarf.

The four literal packets are `CAST.gerdaWindow.hello/hearth/offer/thanks`. Acknowledged
nodes save `gerda-<packet>-<node>`; selected replies save `gerda-hello-yes/later`
or `gerda-offer-yes/later`. Final acknowledgements set `gerda-introduced`,
`gerda-pillows-accepted` and `gerda-window-thanked`. Completed placements are
`gerda-pillow-left/right`. `fireplace-unlocked` is set only on completion of
her hello or the later two-line hearth exchange, whose cursor saves
`gerda-hearth-hope/reply`. Declining keeps that visit’s invitation quiet; a
later visit can reopen the offer. Thanks can follow her into another visit
and never expires. Preexisting fully furnished window saves keep their old
seating via `gerda-window-legacy`, with no invented new dialogue history.

**Shipped 27 September — the blanket.** On a later visit after the cat's scarf
is given (decided at the door), Gerda says her needles have nothing to do and
offers a lap blanket; this time she *asks* which pattern (`gerda-blanket-reeds`,
"you'll see the lake in it", or `gerda-blanket-stars`, winter blue). Lunafreya
notices she asked instead of deciding; Gerda: "Erik used to say I knitted for
people the way other people give advice. I'm practising." Completion
`gerda-blanket-asked` starts the six-café-day arc `gerda-blanket`; she knits it
in the chosen colour and pattern. The finished blanket is presented in her own
saved scene (`blanketGift`, never a caption beat): she counted the stars (212)
or did the water twice. Lunafreya chooses where it lives: `gerda-blanket-cafe`
(over the chair nearest the fire, "for whoever gets cold") or
`gerda-blanket-home` (upstairs, for the evenings). "Erik would have said it's too
nice to use. He was wrong about that sort of thing." Completion sets
`gerda-blanket-given`; placing it is ordinary work (the `blanket` keepsake).
Erik is spoken of in the past tense; he is not yet explicitly identified.
**Planned:** Gerda making something in a colour *she* loves, and a garden story.

## Nora — attention through painting

**Established:** artist with a paint-marked satchel and smock, flat white,
small rooms and warm shadows. She once painted grand rooms. Her precise way
of looking is a form of care; avoid making every sentence a poetic aphorism.

**Shipped:** cat and hearth studies, two invited gallery unveilings. Technical
save IDs still use `lunafreya-paintings` and regular ID `lunafreya`; that is
compatibility history, never the artist's displayed name.

**Shipped 27 September — introduction** (from her second visit, seated): she
asks Lunafreya to leave a cup where the light is sitting in it. She paints; her
sketchbook is mostly the café's chairs. She used to paint big rooms for their
owners, who always asked her to leave out the cups, coats and any evidence that
somebody had been there; that is why she keeps coming back. Choice, what a
painting of this place should remember: `lunafreya-remember-start` (how it was
at the start; "nobody paints first versions") or `lunafreya-remember-people`
(an ordinary afternoon with somebody in it). Flags use her legacy regular ID.
Each answer adds a flagged sketching musing; the later painting is planned.
**Planned:** a portrait that asks Lunafreya's permission and respects
private/public display, shaped by the remembered answer.

## Kasper — the unfinished chapter

**Established:** laptop, writer, chapter seven since spring, cautious delight
in three good lines. Usually quiet. His preferred iced matcha follows menu
availability; he remains welcome in the small café with its simpler menu.

**Shipped:** autonomous writing, hesitation and occasional backstory musings.
**Shipped 27 September — introduction** (from his third visit, seated): "I fixed
the first sentence. It has caused problems for the second." Chapter seven since
spring; people have stopped asking, which is kind. He once wrote a short story
people liked; now everything has to prove it wasn't an accident. Lunafreya
doesn't ask what the novel is about. Choice: `kasper-table` (stay as long as
you like; the table doesn't mind slow chapters) or `kasper-good-lines` (tell me
when you write three good lines; he will report, and later holds up three
fingers across the room). He has not shown any writing.
**Planned:** a later invitation to share a paragraph. Finishing a manuscript must never become a timed task.
The working arc builds on an earlier successful short story, his fear of not
repeating that success, and an offered small piece shaped by a remembered
preference about endings. Sharing Lunafreya's private history requires permission.

## Antonia — a familiar ending

**Established:** evening reader, returning to a book she knows, fond of the
hearth. Quiet is comfortable to her; it is not automatically shyness or sadness.

**Shipped:** reading, dozing and small observations about her familiar book.
**Shipped 27 September — introduction:** she drives the 9A; the café is on her
way home, "dangerous for my bedtime". She is only here for the last forty pages,
again (fourth time; she likes watching them get there). Being let alone is one
of the nicest things a place can do. Choice: `freya-quiet` (Lunafreya leaves
her to it) or `freya-route` (her favourite stretch: along the water after
eleven, nobody on board, every light on, "like driving a lantern"). Each answer
adds a flagged musing.
**Planned:** a book conversation that permits keeping the ending private.

## The wider ensemble — planned direction

The longer arcs and relationship connections live in the
[accepted ensemble plan](plans/community-and-character-stories.md#3-the-ensemble).
Use this table to distinguish identities from what the runtime currently contains.

| Name | Working direction | Current implementation boundary |
| --- | --- | --- |
| Keira | Recurring delivery woman (she/her); learns to stay off duty; possible romance | Deliveries, expanded hello and her second cup (coat off; photograph permission) are shipped; the printed photograph, gifts and deeper scenes remain later |
| Tomas | Recurring builder; patient craft, daughter and an overcomplicated cupboard | Window repair, expanded hello and the cupboard report (plain version, towels, bread going worse) are shipped; bread gifts and deeper family scenes remain planned |
| Saira | Choir accompanist/teacher; her own quiet composition; possible romance | New named character; existing generic piano behavior is not her authored story |
| Marcel | Painter across the lake; recognizes changing places and people | Shipped as a regular (see below); the `street-house` arc is intact and he is its distant figure. Later painting and his gift remain planned |
| Birgit | Baker; shared tastes, a recipe and breakfast in someone else's place | New character; food preparation follows the menu milestone |
| Elody | Gardener; shared allotment, cuttings and ordinary pleasure in growing things | Shipped: introduction and Maud, her geranium cutting (see below); sharing her plot and later scenes remain planned |
| Ida | Librarian; welcoming book exchange and learning when to organize less | Shipped: introduction and the exchange preference (see below); the fuller exchange, Gerda's sign and her bookplates remain planned |
| Ezra | Young adult student with imaginary bus maps; possible later colleague | New character; friendship precedes any future shared-work implementation |
| Calandra | Lunafreya's sister; brings old and new lives together through an invited visit | First letter shipped (evening moment); later letters, the visit and shared home scenes remain to implement |

Keira, Nora, Kasper and Saira are the working adult romance candidates. Specific
routes and household outcomes remain later writing work. Friendship, employment,
housing and romance are separate decisions; no current interaction is reclassified
as a date or commitment by adopting this plan.

## Marcel, Ida and Elody — the neighbourhood, shipped 27 September

Newer faces keep a rhythm and start after the café's first days: Marcel from
day 4 on even days, Ida from day 5 every third day, Elody from day 6 on odd
days. Their saved hellos use `CAST.introductions` like the other regulars.

**Marcel** (he/him; short dark hair, beard, painter's cream jacket, slate
trousers; cappuccino; likes a window perch) is the man on the ladder across the
water. One presence: he comes in only once the left window is clear and only
when he could not be painting (rain or the light gone, or once the facade is
done); while he sits inside, the far-bank figure is not drawn, the ladder stands
empty and the facade's finishing invitation waits. His hello (first visit)
acknowledges the facade as it actually is ("I'm the one on the ladder" or "I
was ... a while back now"), says they have been watching each other's progress,
and asks why this side of the lake. **Lunafreya's second disclosure:**
`luna-lake-tuesday` (on the viewing day she sat by the water with a coffee and
imagined an ordinary Tuesday here) or `luna-lake-later` ("I'll tell you when
I've worked it out"). Only Marcel has heard it. The facade is terracotta.

**Ida** (she/her; auburn hair in a bun, deep red cardigan, ochre scarf; cinnamon
latte; reads extremely melodramatic novels, currently a lighthouse keeper in
love with a shipwreck, "metaphorically, mostly") works at the library on the
corner and reads spines as a professional failing. Her hello follows the
actual shelf (or its absence) and offers to help people swap books. Choice:
`ida-exchange-loose` (no labels; she tries not to alphabetise when nobody is
looking) or `ida-exchange-notes` (a few handwritten notes, which then peek out of
every third book). She means to lend Lunafreya the lighthouse book.

**Elody** (she/her; dark curly hair, green work jacket, rust scarf; a cardamom
bun; keeps rainfall in a notebook) tends an allotment she now shares with the
slugs. Her hello (second visit) notices the café's plant, or kindly notes there
is none yet, and offers a geranium cutting: `elody-cutting-cafe` (the counter)
or `elody-cutting-home` (the windowsill upstairs). On a later visit she brings
**Maud** in a hand-labelled pot, sets her on the counter as she orders and
presents her in a short saved scene (`CAST.regularStories.elody`, `maud`); an
ignored Maud goes home with her and comes back. Placing Maud is ordinary work
(the `cutting` keepsake): between the cash tin and the cake stand, or on the
bedroom windowsill when Lunafreya settles for the evening.

## The cat — company without explanation

**Established:** one cat across café and apartment. Explores, rests, seeks laps
and affection. Lunafreya's first confidant. It has no spoken human dialogue.
**Shipped:** first-morning hug, daily routines, Gerda's scarf.
**Planned:** let routines acknowledge new objects and growing familiarity;
never hunger penalties, neglect guilt or compulsory petting.

## Maintaining the bible

When shipping a beat, add its trigger, saved decisions and any new established
facts here. Keep implementation details in narrative/architecture documentation.
Read earlier choices before writing callbacks. Separate possibilities from
canon, and never describe planned content as already playable.

### Conversation presentation and voices

Invitations are icon bubbles above the other character. Lunafreya walks over
before speaking unless they are already close. Dialogue and both reply choices
use the intro's actual canvas bubble renderer, attached to the current speaker.
A chosen reply is spoken by Lunafreya before its acknowledgement. There is no
bottom dialogue panel. Text reveals gradually, with a manual reveal/continue
control; choices, revealing and leaving never auto-select a reply.

Voice differences are deliberately small synthesized variations, not recorded
speech or caricatures: Lunafreya retains the intro voice; Holger is lower,
warmer and slightly slower. Gerda is gently lower and slower; Nora slightly
brighter and quicker; Kasper lower and nearly the same pace; Freya softly muted.
Keira is lightly brighter and quicker; Tomas lower and measured. Calandra's
letter reads brisk and bright (pace 0.92), as her sister hears it. Every named
character has dialogue sounds through the same volume and mute controls.
These profiles are ready for their authored conversations. Existing third-person
arc narration remains unvoiced. Speech shares the existing dialogue volume,
mute and instant-text settings, and stops when the page is hidden.


First-morning spatial continuity (8 September): the cat's bed is tucked against
the right-window wall beside Lunafreya's coffee station. The existing line now
calls it a sheltered spot beside her; it does not promise heat from the still
unused fireplace. Dialogue order, remembered choices and the later hug remain.
