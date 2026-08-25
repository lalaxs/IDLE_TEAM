# Equipment Icon Generation Prompts

- Mode: built-in `image_gen`
- Style input: `references/equipment-hero-style-reference.png`
- Generated: 2026-07-31
- Output: one independent chroma-key source per item

Every item used the following complete prompt skeleton. The per-item `Primary request`, `Subject`, and `Composition` values are listed in the tables below.

```text
Use case: stylized-concept
Asset type: H5 idle RPG game equipment icon
Input image: Image 1 is the sole style reference sheet made from current in-game heroes. Use only its thick rounded warm-dark outlines, simplified rounded shapes, flat-color density, restrained highlights, and hand-drawn asymmetry. Do not copy a character.
Primary request: Generate exactly one original <NAME> equipment icon.
Subject: <SUBJECT>
Composition: one complete isolated <ITEM TYPE>, centered, <COMPOSITION>, 74–80% canvas coverage, generous padding, nothing cropped.
Style: ultra-simple cute fantasy game icon matching the reference characters; very thick rounded warm dark-brown outline; minimal inner lines; 3–5 clean mostly-flat colors; at most one simple hard-edged shade or highlight; soft slightly irregular hand-drawn silhouette.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for later removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: exactly one item; complete silhouette; crisp separated edges; no character, mannequin, hands, text, letters, logo, watermark, UI, frame, ground, cast shadow, contact shadow, glow cloud, particles, extra equipment, collage, icon sheet, rarity treatment, realistic material rendering, complex gradients, sharp thin linework, filigree, blood, damage, nicks, or tiny repeating patterns. Do not use #ff00ff anywhere in the item.
```

## Weapons

| ID | NAME | SUBJECT | COMPOSITION |
|---|---|---|---|
| `weapon_guard_blade` | 守望短刃 (Watchguard Short Blade) | A compact broad single-edged short sword with a rounded guard and short wrapped grip; steel gray blade, muted grass-green guard accent, warm ivory grip accent; simple friendly fantasy proportions. | Tilted gently from lower-left to upper-right. |
| `weapon_ranger_bow` | 林风短弓 (Forest Breeze Short Bow) | A compact wooden short bow with rounded leaf-shaped limb tips and exactly one simple taut string; warm wood brown, muted forest green, tiny warm-gold binding. | Tilted gently from lower-left to upper-right. |
| `weapon_oak_staff` | 橡木法杖 (Oak Staff) | A short thick oak staff with a rounded acorn-shaped head and one small leaf accent; warm wood brown, muted grass green, amber-gold acorn cap. | Tilted gently from lower-left to upper-right. |
| `weapon_storm_hammer` | 雷纹短锤 (Storm Mark Hammer) | A compact one-handed hammer with a rounded-square head and exactly one simple lightning mark; iron gray, muted lightning blue, warm-gold binding, short brown grip. | Tilted gently from lower-left to upper-right. |
| `weapon_sun_scepter` | 晨辉权杖 (Morning Radiance Scepter) | A short ceremonial scepter with one clean circular sun-ring head and rounded handle; warm ivory, muted gold, small coral-red center. | Tilted gently from lower-left to upper-right. |
| `weapon_frost_branch` | 霜枝法杖 (Frost Branch Staff) | A compact cool-gray branch staff with one simple forked ice-crystal head; pale blue, ice white, cool gray, tiny muted brown grip. | Tilted gently from lower-left to upper-right. |
| `weapon_raven_blades` | 暮鸦双刃 (Dusk Raven Twin Blades) | Exactly two matching short daggers crossed into one compact emblem-like pair; rounded silver-gray blades, dark-violet guards, charcoal grips; both complete and clearly separate. | Crossed symmetrically with slight hand-drawn irregularity. |
| `weapon_thorn_spear` | 荆棘短枪 (Thorn Short Spear) | A compact short spear with one broad leaf-shaped point and exactly one simple thorn-vine wrap; warm wood brown shaft, forest-green wrap, coral-red binding, pale steel tip. | Tilted gently from lower-left to upper-right. |

## Armor

| ID | NAME | SUBJECT | COMPOSITION |
|---|---|---|---|
| `armor_travel_cloak` | 远行斗篷 (Traveler Cloak) | One complete short travel cloak with broad rounded shoulders, a high simple collar, and one large circular clasp; coral red fabric, warm brown collar, warm ivory clasp. | Front-facing, upright and slightly asymmetrical; no body or mannequin. |
| `armor_scale_vest` | 青鳞甲衣 (Verdant Scale Vest) | A short sleeveless vest with broad rounded shoulders and exactly three oversized scale plates; muted teal-green, deep green, tiny warm-gold clasp. | Front-facing and upright; no body or mannequin. |
| `armor_guard_mail` | 守望链甲 (Watchguard Mail) | A compact rounded-shoulder mail shirt simplified into exactly three large overlapping armor panels, not tiny chain links; steel gray, muted steel blue, warm ivory trim. | Front-facing and upright; no body or mannequin. |
| `armor_leaf_robe` | 林叶法袍 (Forest Leaf Robe) | A short broad robe with a rounded collar, wide simple hem, and exactly one large leaf-shaped collar piece; forest green, warm ivory, warm wood brown belt. | Front-facing and upright; no body or mannequin. |
| `armor_dawn_cuirass` | 晨曦胸甲 (Dawn Cuirass) | A rounded compact breastplate with broad shoulder caps and exactly one simple sun disk at the chest; warm ivory, muted gold, small coral-red center. | Front-facing and upright; no body or mannequin. |
| `armor_frost_mantle` | 霜纹披肩 (Frost Pattern Mantle) | One broad rounded shoulder mantle with a high soft collar and exactly one large ice-crystal clasp; pale blue, ice white, cool gray; no fur texture. | Front-facing and upright; no body or mannequin. |
| `armor_shadow_tunic` | 暮影短衣 (Dusk Shadow Tunic) | One compact high-collar short tunic with a simple diagonal overlap and exactly one silver-gray fastening tab; dark violet, charcoal, muted silver gray. | Front-facing and upright; no body or mannequin. |
| `armor_thorn_bark` | 荆木护甲 (Thorn Bark Armor) | A compact vest made from exactly three large rounded bark plates with one simple green leaf clasp; warm wood brown, forest green, sand yellow; no woodgrain texture. | Front-facing and upright; no body or mannequin. |

## Accessories

| ID | NAME | SUBJECT | COMPOSITION |
|---|---|---|---|
| `accessory_leaf_charm` | 新芽护符 (New Sprout Charm) | A short pendant cord holding exactly two broad rounded green leaves and one small warm-gold connector; grass green, dark green, warm gold, warm brown cord. | Upright and enlarged so the two-leaf silhouette is clear. |
| `accessory_sun_ring` | 晨光指环 (Morning Light Ring) | One thick rounded gold finger ring shown at a gentle three-quarter angle, with exactly one small circular sun disk setting; muted warm gold, ivory highlight, coral-red center. | Upright and enlarged, with the hole and sun setting clearly visible. |
| `accessory_rune_stone` | 古纹石 (Ancient Rune Stone) | One chunky rounded gray stone tablet with exactly one large simple diamond-shaped rune inset; stone gray, dark violet rune, small pale-blue accent; no text or letters. | Upright and enlarged, with a slightly irregular rounded rock silhouette. |
| `accessory_wind_feather` | 迅风羽饰 (Swift Wind Feather) | One single broad rounded ivory feather tied with one short forest-green cord and a small warm-brown bead; minimal feather divisions, no loose strands. | Tilted gently from lower-left to upper-right and enlarged. |
| `accessory_ember_beads` | 余烬念珠 (Ember Prayer Beads) | One short accessory made from exactly three oversized round beads connected together and one simple flame-drop pendant; molten orange, coral red, warm brown cord; no necklace loop. | Upright and enlarged, with three beads and one pendant clearly readable. |
| `accessory_frost_bell` | 霜铃坠 (Frost Bell Pendant) | One short pendant with a single round pale-blue bell, one large simple ice-crystal clapper visible below, and a short cool-gray loop; pale blue, ice white, cool gray. | Upright and enlarged so the bell and crystal clapper are clear. |
| `accessory_raven_badge` | 暮鸦徽记 (Dusk Raven Badge) | One chunky round dark-violet badge with exactly one simplified charcoal feather laid across it and one small silver-gray rim accent; an abstract feather emblem, not a bird. | Upright and enlarged, with a compact circular silhouette. |
| `accessory_storm_drum` | 雷鸣鼓符 (Thunder Drum Charm) | One tiny round hand-drum charm with a thick violet body, warm-gold rim, one simple lightning-blue knot below, and a short brown hanging loop; no drumsticks. | Upright and enlarged so the drum and knot are clear. |

`weapon_guard_blade` received one calibration edit request: change only the soft blade shading into cleaner flat-color regions while preserving the exact silhouette, position, scale, outline, colors, chroma background, and all avoid constraints.
