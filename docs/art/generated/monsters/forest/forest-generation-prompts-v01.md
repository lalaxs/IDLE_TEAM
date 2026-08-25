# 青丘边境森林区域怪物生成提示词 v01

- 生成方式：内置 ImageGen
- 输出：8 张 1024 × 1024 单角色概念图
- 色键：纯色 `#ff00ff`
- 清单：`docs/art/requirements/forest-monster-concept-manifest-v01.json`

## 共同提示词

```text
Use case: stylized-concept
Asset type: isolated enemy character concept for a mobile H5 idle RPG
Input images:
- Image 1 is the approved grassland monster contact sheet. Match its character proportions, visual hierarchy, thick warm near-black rounded outlines, flat color blocks, restrained hard-edged shading, friendly original fantasy tone, and three-quarter gameplay view. Do not copy any depicted creature.
- Image 2 is the hero style master. Use only its line weight, rounded shape language, and simplified color treatment. Do not copy characters, clothing, weapons, emblems, or poses.
- Image 3 is the approved forest background contact sheet. Use only its deep wood, moss green, muted woodland green, damp earth, and blue-gray creek-stone palette.
Primary request: Create one completely original forest enemy as a single isolated full-body character.
Style/medium: polished 2D mobile game character concept; large rounded hand-drawn shapes; thick warm near-black rounded outline; flat opaque color areas; one restrained hard-edged shadow shape per major mass; no gradients or realistic texture.
Composition/framing: single character only, centered, three-quarter view facing slightly right, full anatomy visible, generous padding, readable at 120 px, no crop.
Scene/backdrop: a perfectly flat solid #ff00ff chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Lighting/mood: soft diffuse neutral character lighting; sturdy woodland creature tone; not cute mascot art and not grim horror.
Constraints: do not use #ff00ff anywhere in the subject; crisp separated edges; no cast shadow; no contact shadow; no reflection; no text; no numbers; no UI; no frame; no watermark; no scenery; no platform; no particles; no tiny foliage; no fine bark noise; no realistic fur; no metallic shine; no cinematic effect; no third-party game design.
```

## E05 荆棘獾

```text
Subject: a low broad badger-like forest creature with a blunt rounded snout, four very short sturdy legs, two large cream facial bands, small amber oval eyes, and one continuous belt of five to seven thick blunt branch thorns growing across its back.
Detail level: normal enemy; exactly two dominant anchors—the broad badger body with cream face bands, and the single back thorn belt.
Color palette: dark brown body, gray-brown upper back, cream facial stripes, muted moss-green tips, dry branch brown, warm near-black outline.
Avoid: quills covering the whole body, long realistic fur, armor, clothing, weapon, leaf clutter, porcupine silhouette, open snarling mouth, more than seven thorns.
```

## E06 苔背蛙

```text
Subject: a round squat forest frog with a broad closed mouth line, wide webbed front feet, two short folded hind legs, small amber oval eyes, a pale yellow-green belly, and one single large rounded blue-gray creek stone embedded on its back under one simple moss patch.
Detail level: normal enemy; exactly two dominant anchors—the round frog body and the single moss-covered creek stone.
Color palette: deep leaf green, muted moss green, blue-gray stone, pale yellow-green belly, amber eyes, warm near-black outline.
Avoid: many warts, many stones, mushroom growth, long tongue, open mouth, realistic wet skin, tiny plants, armor, crown, weapon.
```

## E07 暮翼蝠

```text
Subject: a compact forest bat suspended in a stable low hover, with one continuous wide crescent wing silhouette, broad simple wing membranes divided by only two thick ribs per side, a small rounded body, two large leaf-shaped ears, short feet tucked close, and two amber oval eyes.
Detail level: normal enemy; exactly two dominant anchors—the broad continuous wings and the leaf-shaped ears.
Color palette: deep blue-gray body, muted purple-gray inner wings, gray-green membranes, amber eyes, warm near-black outline.
Avoid: realistic fur, skeletal thin fingers, torn wings, vampire clothing, fangs, blood, horror pose, separate swarm, particles, ground shadow.
```

## E08 盘根卫

```text
Subject: an elite forest root guardian with a heavy rounded root-knot torso, two oversized spiral root arms ending in simple three-root fists, two short root feet, a low recessed head with amber oval eyes, and one broad asymmetrical moss shoulder band.
Detail level: elite enemy; larger and denser than E05–E07, with three major masses but clearly less complex and smaller than the Bosses.
Color palette: deep wood brown, damp earth brown, muted moss green, dark forest green, amber eyes, warm near-black outline.
Avoid: cylindrical cut stump body, flat cut stump head, many thin roots, vines, leaves covering the face, stone armor, weapon, humanoid clothing, ornate details.
```

## B05 林口哨卫

```text
Subject: a broad heavy forest gate sentry grown from an old hollow stump, with a wide hollow-stump torso, a small watchful wooden head nested inside the upper wood collar, two layered shoulder boughs on each side, huge thick branch forearms with blocky knuckles, wide root feet, a restrained moss mantle, amber oval eyes, and six to nine large carved natural wood plates.
Boss hierarchy: clearly 1.6 times the visual mass and substantially more detailed than the normal enemies; complexity comes from large readable wood layers, not tiny bark lines.
Color palette: deep wood brown, fresh broken-wood tan, muted moss green, dark forest green, amber eyes, warm near-black outline.
Avoid: the torso hollow becoming a second face, watchtower architecture, roof, weapon, shield, armor clothing, many leaves, fine bark noise, thin limbs, generic tree-man silhouette, E08 spiral arms.
```

## B06 暗溪巨蛙

```text
Subject: a huge deep-green creek frog Boss with an extra-wide square-rounded head, layered pale throat plates, massive webbed forelimbs, folded muscular hind legs, a broken asymmetrical blue-gray creek-stone carapace fused over its shoulders and back, three thick moss ridges, amber eyes under heavy brow plates, and several large wart-like armor pads.
Boss hierarchy: broad low silhouette with more layered anatomy and stone structure than E06; complex but readable at 120 px.
Color palette: deep forest green, dark teal-green, blue-gray creek stone, muted moss green, pale yellow-green throat, amber eyes, warm near-black outline.
Avoid: a single round pebble like E06, many tiny warts, crown, tongue, open mouth, realistic wet gloss, symmetrical stone shell, turtle shape, weapon, water splash, particles.
```

## B07 缠根树怪

```text
Subject: a large asymmetric forest tree beast with a split leaning trunk core trapped inside a cage of six to eight thick looping roots, two long root-lattice arms ending in heavy four-root palms, broad planted root feet, a broken forked crown, three large moss masses, several large exposed pale wood breaks, and deep-set amber oval eyes.
Boss hierarchy: taller and more complex than B05, with a vertical root-cage silhouette and long open-lattice arms; use large readable structures instead of thin vines.
Color palette: deep wood brown, wet earth brown, muted moss green, dark forest green, pale broken wood, amber eyes, warm near-black outline.
Avoid: hollow stump torso, cylindrical body, short blocky branch arms, many thin vines, leaf canopy, weapon, runes, humanoid armor, facial mouth, horror spikes.
```

## B08 碑背巨蜥

```text
Subject: a muscular low giant forest lizard Boss with a broad square head, heavy jaw plates, four thick powerful legs with wide claws, broad blue-gray stone-scaled shoulders, a single blank broken half-stele fused lengthwise along its back, a few large moss patches around the stone seams, amber oval eyes, and one thick sweeping tail fully inside the frame.
Boss hierarchy: heavy wide silhouette with layered stone plates, body folds, and large claws; more detailed than B04 while remaining readable and original.
Color palette: deep blue-gray skin, warm-gray old stone, dark forest green, damp earth brown, muted moss green, amber eyes, warm near-black outline.
Avoid: B04's twin sails, olive body palette, wedge-shaped pointed head, horns, spikes, writing or symbols on the stele, rider saddle, crocodile snout, armor equipment, tiny scales, magical glow.
```

