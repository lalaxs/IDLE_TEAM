# 青丘边境草地区域怪物生成提示词 v01

## 输入图片职责

- `hero-style-master-v1.png`：权威风格参考，仅用于角色比例、粗轮廓、脸部简化、平涂方式与细节密度。
- `boss_b01_moss_crown_guardian_concept_v01_preview.jpg`：辅助怪物参考，仅用于 Boss 体量和怪物渲染密度；不得复制其苔冠、断枝、石碑肩甲或整体剪影。

## 共同提示词

```text
Use case: stylized-concept
Asset type: original monster concept art for the mobile H5 idle RPG “青丘远征”
Input images:
- Image 1 is the authoritative style reference for compact proportions, outline weight, face simplicity, flat-color rendering, and detail density. Do not copy any pictured hero.
- Image 2 is a supporting reference only for Boss scale and restrained monster rendering density. Do not copy its tree crown, moss placement, stone shoulder, or silhouette.

Create one completely original fantasy monster from the grassland section of the map region “青丘边境”.

Style:
- casual hand-drawn sticker-like fantasy game piece matching Image 1
- compact oversized head or dominant body mass, no neck, very short limbs
- extra-thick warm near-black outlines with rounded line ends
- simple flat color blocks, at most one hard-edged shadow per major form
- only two or three large visual anchors; clear at 96–120 px
- front three-quarter view facing right, full body, neutral combat-ready pose
- centered with generous padding; no scenery, floor plane, cast shadow, UI, frame, text, logo, or watermark
- original generic fantasy language with no Warcraft-specific symbols, creatures, armor, runes, or copied silhouettes

Background:
- perfectly flat solid #ff00ff chroma-key background for later removal
- one uniform color with no shadow, gradient, texture, reflection, halo, floor, or lighting variation
- do not use #ff00ff anywhere in the subject

Avoid:
polished anime chibi, realistic anatomy, realistic fur or bark, hair strands, dense leaves,
tiny costume details, layered armor, metallic reflections, painterly shading, cinematic lighting,
complex gradients, excessive spikes, glowing runes, text, logo, watermark, other characters.
```

## E01 嫩枝精

```text
Subject:
- a small neutral grassland twig sprite
- pear-shaped pale wood body that also serves as its oversized head
- exactly two broad fresh-green leaves on top
- exactly two black oval eyes; no mouth, nose, eyebrows, teeth, or expression lines
- two round branch hands with no fingers and two tiny root feet
- no weapon, vines, flowers, fruit, armor, or extra foliage

Palette: pale warm wood brown, fresh leaf green, dark leaf green, near-black outline.
Scale: normal enemy, visually smaller and simpler than the reference heroes.
```

## E02 红帽菌兽

```text
Subject:
- a small neutral mushroom creature
- one wide muted brick-red mushroom cap as the dominant silhouette
- compact warm cream fungus body beneath the cap
- exactly two black oval eyes on the cream body; no face on the cap
- two round hands and two tiny feet
- no mouth, nose, eyebrows, teeth, cap spots, spores, extra mushrooms, weapon, or clothing

Palette: muted brick red, warm cream, earthy brown, near-black outline.
Scale: normal enemy, visually smaller and simpler than the reference heroes.
```

## E03 灰壳甲虫

```text
Subject:
- a small fantasy beetle with simplified toy-like anatomy
- round warm-gray stone-like shell as the dominant silhouette
- warm brown underside, one short restrained front horn
- four simplified visible legs only
- exactly two small amber oval eyes
- no realistic mandibles, wing detail, shell cracks, spikes, metal armor, or extra leg detail

Palette: warm gray stone, earthy brown, small amber eye accent, near-black outline.
Scale: normal enemy, low and compact rather than tall.
```

## E04 老桩卫

```text
Subject:
- a compact elite stump guardian
- flat-cut stump head with exactly two large growth-ring shapes
- thick branch arms, short trunk body, two root feet
- exactly two amber oval eyes; no mouth, nose, eyebrows, teeth, or expression lines
- one small leaf shoot as the only foliage
- no shield, weapon, vines, mushrooms, carved symbols, armor, or glowing cracks

Palette: deep bark brown, warm light growth-ring brown, restrained moss-leaf green, amber eyes, near-black outline.
Scale: elite enemy, approximately 25% broader than E01–E03 but clearly smaller and simpler than a Boss.
```

## B01 刺根兽

```text
Subject:
- a low broad quadruped Boss built from one large root bulb
- one small fresh sprout crest
- two heavy short forelimbs ending in rounded root fists with one short thorn each
- two thick rear root legs
- exactly two amber oval eyes recessed into the root bulb
- no visible mouth, tusks, antlers, armor, long vines, flowers, or stone parts

Palette: deep root brown, warm wood brown, fresh sprout green, amber eyes, near-black outline.
Scale: Boss, wide and heavy with a silhouette clearly larger than normal enemies.
Stage motif: new roots forcing their way through the soft ground of “新芽小径”.
```

## B02 大伞菌母

```text
Subject:
- a broad heavy mushroom Boss with one enormous muted ochre-red umbrella cap
- thick warm-cream stalk body
- two rounded pouch-like fungus arms and exactly three short feet
- exactly two black oval eyes on the stalk body
- no humanoid femininity, breasts, crown, face on the cap, cap spots, spores, extra mushrooms, clothing, or staff

Palette: muted ochre red, warm cream, earthy gill brown, near-black outline.
Scale: Boss, very wide cap and heavy body but still compact.
Stage motif: one damp lower edge of the cap, expressed only as a darker flat color block for “蘑菇浅滩”.
```

## B03 岩背甲虫

```text
Subject:
- a wide low fantasy beetle Boss with simplified toy-like anatomy
- exactly three large layered gray rock plates across the back
- two heavy broad forelegs and two smaller rear legs
- one restrained wedge-shaped front horn
- exactly two amber oval eyes
- visually distinct from E03 through a much wider body, layered shell, and heavy front silhouette
- no realistic mandibles, many legs, metal armor, spikes, lava cracks, crystals, or glowing runes

Palette: medium gray stone, deep gray stone, compact earthy-brown underside, amber eyes, near-black outline.
Scale: Boss, wide and low with substantial mass.
Stage motif: layered slope stones forming the back armor of “石甲坡地”.
```

## B04 风铃木卫

```text
Subject:
- an awakened old bridge-post guardian
- one broad aged wooden post body with a flat wooden brow
- two long but thick branch arms and two short post-like feet
- exactly two amber oval eyes; no mouth, nose, eyebrows, teeth, or expression lines
- exactly two hanging wooden seed pods that suggest wind chimes without using metal bells
- no literal building, bridge deck, ropes across the body, text carvings, glowing runes, weapons, crown, stone shoulder, or copied tree-guardian silhouette

Palette: aged wood brown, muted gray-green, restrained ochre-yellow seed pods, amber eyes, near-black outline.
Scale: Boss, tall-wide rectangular silhouette with heavy arms.
Stage motif: weathered bridge timber and two wind-moved seed pods for “风语栈桥”.
```
