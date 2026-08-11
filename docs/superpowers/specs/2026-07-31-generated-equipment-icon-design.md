# 生成式装备图标设计规范

- 版本：1.0
- 状态：已确认，直接执行
- 日期：2026-07-31
- 适用范围：背包、商店、装备详情与战利品展示

## 1. 目标

为《青丘远征》制作 24 件可进入实际掉落与商店系统的装备图标：

- 8 件武器；
- 8 件护甲；
- 8 件饰品。

图标必须与当前游戏角色具有同一画风：粗圆深色轮廓、圆润简化造型、少量纯色色块、轻微手绘不对称。装备不是角色素材的裁切，而是根据现有角色的造型语言重新设计的原创物件。

## 2. 权威风格参考

生成前把以下当前游戏角色整理成一张不改动原图的参考板：

| 角色 | 参考重点 |
|---|---|
| H01 洛恩 | 草绿护甲、米白金属、盾牌轮廓 |
| H03 米娅 | 橙红色块、木杖与火焰 |
| H04 诺拉 | 米白法袍、暖金法器 |
| H05 塔林 | 森林绿、木质短弓 |
| H06 乌鸦 | 暗紫服装、银灰短刃 |
| H08 海泽 | 紫色衣装、木石法杖 |

参考板只用于线条粗度、圆角、简化程度、色块数量与配色关系，不复制角色身份、姿势或完整装备。

## 3. 统一视觉语言

- 每件装备单独生成一张 1024 × 1024 原图。
- 主体居中，完整可见，占画布高度或宽度约 68%–82%。
- 四周留足安全边距，不触碰画布。
- 外轮廓为暖深褐近黑色，粗、圆、连续。
- 内部分隔线明显少于外轮廓，不能形成密集纹样。
- 每件装备使用 3–5 个纯色色块。
- 每件装备最多一块简单硬边暗面或高光。
- 允许圆润轻微不对称，禁止规整机械图标感。
- 禁止渐变、写实金属、皮革纹理、复杂反射、发光云、投影、地面、文字、边框、UI、品质光效、Logo 和水印。
- 武器采用轻微对角构图；护甲以正面完整轮廓为主；饰品居中并放大主要结构。
- 品质继续由现有卡片边框和底色表达，图标本体不制作普通、优良、稀有、史诗变体。

## 4. 装备清单

### 4.1 武器

| ID | 名称 | 主要轮廓 | 配色 |
|---|---|---|---|
| `weapon_guard_blade` | 守望短刃 | 宽短单刃、圆护手 | 钢灰、草绿、米白 |
| `weapon_ranger_bow` | 林风短弓 | 叶尖弓臂、单根弦 | 木棕、森林绿、暖金 |
| `weapon_oak_staff` | 橡木法杖 | 粗木杖、橡果形杖头 | 木棕、草绿、琥珀 |
| `weapon_storm_hammer` | 雷纹短锤 | 方圆锤头、单枚雷纹 | 铁灰、闪电蓝、暖金 |
| `weapon_sun_scepter` | 晨辉权杖 | 圆环杖头、短柄 | 象牙白、暖金、珊瑚红 |
| `weapon_frost_branch` | 霜枝法杖 | 分叉冰枝杖头 | 冷灰、浅蓝、冰白 |
| `weapon_raven_blades` | 暮鸦双刃 | 两把交叉短匕首 | 暗紫、银灰、炭黑 |
| `weapon_thorn_spear` | 荆棘短枪 | 叶形枪尖、单段荆棘 | 木棕、森林绿、珊瑚红 |

### 4.2 护甲

| ID | 名称 | 主要轮廓 | 配色 |
|---|---|---|---|
| `armor_travel_cloak` | 远行斗篷 | 圆肩披风、大领扣 | 珊瑚红、木棕、米白 |
| `armor_scale_vest` | 青鳞甲衣 | 短甲衣、三片大鳞 | 青绿、深绿、暖金 |
| `armor_guard_mail` | 守望链甲 | 圆肩胸甲、三块甲片 | 钢灰、钢蓝、米白 |
| `armor_leaf_robe` | 林叶法袍 | 宽下摆、单枚叶领 | 森林绿、米白、木棕 |
| `armor_dawn_cuirass` | 晨曦胸甲 | 圆胸甲、单枚日轮 | 象牙白、暖金、珊瑚红 |
| `armor_frost_mantle` | 霜纹披肩 | 圆肩披肩、冰晶领扣 | 浅蓝、冰白、冷灰 |
| `armor_shadow_tunic` | 暮影短衣 | 高领短衣、斜襟 | 暗紫、炭黑、银灰 |
| `armor_thorn_bark` | 荆木护甲 | 三片圆木甲、叶扣 | 木棕、森林绿、沙黄 |

### 4.3 饰品

| ID | 名称 | 主要轮廓 | 配色 |
|---|---|---|---|
| `accessory_leaf_charm` | 新芽护符 | 双叶吊坠 | 草绿、暖金、木棕 |
| `accessory_sun_ring` | 晨光指环 | 厚圆环、单枚日点 | 暖金、象牙白、珊瑚红 |
| `accessory_rune_stone` | 古纹石 | 圆角石片、单枚菱纹 | 石灰、暗紫、浅蓝 |
| `accessory_wind_feather` | 迅风羽饰 | 一根粗羽、短系绳 | 米白、森林绿、木棕 |
| `accessory_ember_beads` | 余烬念珠 | 三枚大珠与火滴坠 | 熔橙、珊瑚红、木棕 |
| `accessory_frost_bell` | 霜铃坠 | 圆铃、冰晶铃舌 | 浅蓝、冰白、冷灰 |
| `accessory_raven_badge` | 暮鸦徽记 | 圆徽与单片黑羽 | 暗紫、炭黑、银灰 |
| `accessory_storm_drum` | 雷鸣鼓符 | 小圆鼓与雷形系结 | 紫色、暖金、闪电蓝 |

## 5. 生成与透明化

每件装备使用同一完整提示词骨架，只替换装备名称、轮廓和配色：

```text
Use case: stylized-concept
Asset type: H5 idle RPG game equipment icon
Input image: Image 1 is the sole style reference sheet made from current in-game heroes. Use only its thick rounded warm-dark outlines, simplified rounded shapes, flat-color density, restrained highlights, and hand-drawn asymmetry. Do not copy a character.
Primary request: Generate exactly one original <装备名称> equipment icon.
Subject: <主要轮廓与配色>
Composition: one complete isolated item, centered, lightly diagonal for weapons, front-facing for armor, centered enlarged form for accessories, 68–82% canvas coverage, generous padding.
Style: ultra-simple cute fantasy game icon matching the reference characters; very thick rounded outline; minimal inner lines; 3–5 flat colors; at most one simple hard-edged shade or highlight.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for later removal.
Constraints: exactly one item; complete silhouette; no character, hands, text, logo, watermark, UI, frame, ground, cast shadow, glow cloud, particles, extra equipment, collage, icon sheet, rarity treatment, realistic material rendering or gradients. Do not use #ff00ff in the item.
```

输出结构：

```text
docs/art/generated/equipment/
├── references/equipment-hero-style-reference.png
├── chroma/<id>_source_v01.png
├── master/<id>_master_v01.png
├── previews/<id>_preview_v01.png
└── review/equipment-contact-sheet.png

public/assets/equipment/<id>.webp
```

透明化使用平坦洋红背景和本地色键移除。母版保留 1024 × 1024 透明 PNG；运行时图为 256 × 256 透明 WebP；预览图为 42 × 42 PNG。

## 6. 游戏接入

- `ItemDefinition.icon` 保存 `/assets/equipment/<id>.webp` 路径。
- 背包、商店和装备详情统一渲染 `<img>`，使用空 `alt`，可访问名称继续由按钮或卡片文本提供。
- 背包图标显示约 42 px。
- 商店图标显示约 56 px。
- 装备详情图标显示约 72 px。
- 24 件装备全部进入当前随机掉落、离线奖励和每日商店候选池。
- 现有数值、品质、特性与槽位逻辑不改变。

## 7. 验收

机器检查：

- 装备总数为 24，且每个槽位正好 8 件；
- ID、名称与图片路径均唯一；
- 24 张母版均为 1024 × 1024 且含透明通道；
- 24 张运行时图均为 256 × 256 且含透明通道；
- 四角透明，主体不触边，Alpha 主体非空；
- 24 张运行时路径均可从 `public` 读取；
- 构建与现有测试通过。

视觉检查：

- 每张图只有一件完整装备；
- 外轮廓粗、圆、连续；
- 3–5 个主要色块，无写实纹理或复杂渐变；
- 42 px 下能识别装备类型和主要轮廓；
- 与参考角色并排时不显得来自另一套游戏；
- 24 件之间没有明显重复轮廓或错误配件。
