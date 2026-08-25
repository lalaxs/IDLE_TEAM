# 青丘边境森林区域怪物生成提示词 v02

- 返工目标：整体更可爱、更圆润、更简单
- 生成方式：内置 ImageGen
- 色键：纯色 `#ff00ff`
- 权威角色风格：`grassland-monsters-contact-sheet-v04.png`
- 仅用于色板：`forest_contact_sheet_v01.jpg`
- 禁止参考：森林 v01 角色图

## 共同提示词

```text
Use case: stylized-concept
Asset type: isolated cute enemy character concept for a casual mobile H5 idle RPG
Input images:
- Image 1 is the authoritative approved grassland monster sheet. Match its cute rounded proportions, large oval eyes, short limbs, simple thick warm near-black outlines, flat opaque color blocks, very low detail density, and friendly three-quarter game-character view. Do not copy any depicted creature.
- Image 2 is the forest environment palette reference only. Use its muted moss green, deep wood brown, blue-gray creek stone, and damp earth colors. Do not copy scenery.
Primary request: Create one completely original forest enemy with a cute readable silhouette.
Shape language: head occupies roughly one third to one half of the character; round belly; short limbs; broad soft corners; friendly alert expression; closed mouth or one short mouth line; no angry brow.
Rendering: polished flat 2D mobile game art; one simple hard-edged shadow per major body mass; no gradients; no realistic anatomy; no surface noise.
Composition: one centered full-body character, three-quarter view facing slightly right, generous padding, readable at 120 px.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key field; uniform color only, no floor or shadow.
Constraints: do not use #ff00ff inside the subject; no text, UI, frame, watermark, scenery, particles, equipment, symbols, tiny leaves, dense bark lines, repeated stone plates, fine roots, realistic muscles, fangs, snarling, horror pose, or third-party game design.
```

## E05 荆棘獾

```text
Subject: a round plump little forest badger with an oversized head, tiny rounded ears, very short legs, large cream face bands, big amber oval eyes, and exactly three rounded blunt thorn buds growing from one simple brown strip on its back.
Maximum structure count: two dominant anchors—the cream badger face and the three blunt thorn buds.
Expression: curious and alert, closed mouth.
Avoid: long body, realistic fur, many thorns, sharp quills, bark armor, angry eyes, muscular legs.
```

## E06 苔背蛙

```text
Subject: a cute large-headed round frog with a tiny body, four short rounded webbed feet, a pale belly, big amber oval eyes, one short mouth line, and one single smooth blue-gray creek stone worn like a soft mossy cap on its back.
Maximum structure count: two dominant anchors—the round frog head and the single moss-stone cap.
Expression: calm and slightly curious.
Avoid: many stones, warts, strong jaw, muscular limbs, layered throat plates, realistic wet skin, open mouth.
```

## E07 暮翼蝠

```text
Subject: a cute floating forest bat with a round ball-shaped body, two short broad rounded wings, two oversized leaf-shaped ears, tiny tucked feet, and big amber oval eyes.
Maximum structure count: two dominant anchors—the short wide wings and the large leaf ears.
Expression: curious, no mouth or only one tiny closed mouth line.
Avoid: long wingspan, skeletal fingers, realistic fur, torn membranes, fangs, angry eyes, horror pose.
```

## E08 盘根卫

```text
Subject: a cute elite root guardian with a round root-ball body, two short oversized mitten-shaped root arms, two tiny root feet, big amber oval eyes, and one simple moss-and-two-leaf tuft on top.
Maximum structure count: three large anchors—the round root ball, mitten root arms, and single moss-leaf tuft.
Expression: gentle but sturdy, closed mouth.
Avoid: spiral carvings, long arms, dense roots, bark grooves, root cage, realistic wood grain, armor plates.
```

## B05 林口哨卫

```text
Subject: a cute round Boss shaped like a broad barrel stump, with a large friendly wooden face, big amber oval eyes, a shallow open wood ring around the top of its head, two very short thick branch arms with simple mitten ends, two broad root feet, and one smooth moss shoulder cape.
Maximum structure count: four large anchors—barrel stump, shallow hollow crown ring, short branch arms, moss cape.
Boss hierarchy: larger than E08 through body mass, but only slightly more detailed than the grassland Bosses.
Expression: watchful and calm, one short closed mouth line.
Avoid: nested second head, fortress shape, repeated wood plates, carved spirals, many cut branches, giant fists, angry brow, realistic bark.
```

## B06 暗溪巨蛙

```text
Subject: a cute chubby giant frog Boss with an oversized rounded head, very large amber oval eyes, a wide pale belly, two big rounded webbed hands, short folded legs, exactly three smooth blue-gray creek stones on its back, and one simple moss eyebrow band.
Maximum structure count: four large anchors—big frog head, wide belly, large webbed hands, three-stone back.
Boss hierarchy: clearly larger than E06, but keep anatomy simple and friendly.
Expression: determined but not angry, one short closed mouth line.
Avoid: dozens of stones, wart clusters, muscle anatomy, stone brow plates, snarling smile, layered throat armor, realistic wet skin.
```

## B07 缠根树怪

```text
Subject: a cute low four-legged root beast Boss with a round wooden core, a large rounded head integrated into the front of the body, big amber oval eyes, exactly three thick smooth roots hugging around the core like broad bands, four short root paws, and one small moss patch on top.
Maximum structure count: four large anchors—low beast body, round wood core, three embracing root bands, short root paws.
Boss hierarchy: wide and heavy, distinct from B05's upright barrel stump.
Expression: quiet and curious, no mouth or one short mouth line.
Avoid: humanoid tree form, long lattice arms, split sharp crown, pale broken spikes, dense root cage, many moss clumps, angry face.
```

## B08 碑背巨蜥

```text
Subject: a cute round-headed short-legged giant lizard Boss with big amber oval eyes, a compact plump body, four chunky little feet, one thick short curved tail, exactly one blank rounded broken stele carried naturally on its back, exactly three large smooth blue-gray stone scales around the stele base, and one small moss patch.
Maximum structure count: four large anchors—round lizard head, short chunky legs, one rounded stele, three large stone scales.
Boss hierarchy: heavier than B04 but simpler and cuter than forest v01; the blank stele is the single stage landmark.
Expression: alert and friendly, closed mouth.
Avoid: crocodile snout, realistic teeth, dozens of scales, muscular limbs, tall sharp stele, writing or symbols, armor, spikes, sails, angry eye.
```

