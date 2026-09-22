# 横版分层场景与模块化前景工作流

## 1. 适用范围

本流程用于制作横版战斗场景的以下资源：

- 天空、远景、后缘植被、道路地表等分层长图；
- 草地、矮灌木、石块、蘑菇等可独立循环的宽幅前景片段；
- 需要首尾循环、视差滚动并叠加角色的 H5 战斗背景。

当前样板已扩展为第一章三套区域地图。现有 UI、战斗交互和存档不属于本流程。

### 章节地图数量约束

- 每章最多制作 **3 套**分层地图，分别覆盖前 4 关、中间 4 关和后 4 关；不再为 12 个关卡逐关制作背景变体。
- 同一区域的 4 关复用同一套天空、远景、后缘植被、道路和模块化前景规则。
- 区域之间允许共用天空与通用前景模块；道路、远景和后缘层负责建立区域辨识。
- 每个区域最多替换 2 个模块化前景，其余沿用章节通用素材。优先替换一个简单植被片和一个复杂地貌片，既有区域差异，也不把前景扩成逐关素材库。
- 关卡名、敌人和 Boss 负责逐关差异。设计 demo 阶段不为每关增加独立地标、背景配置或存档字段。

第一章映射：

| 关卡 | 区域地图包 | 主要差异层 |
|---|---|---|
| `1-1`～`1-4` | `qingqiu_meadow_preview` | 明亮草地、暖赭道路、嫩绿林带 |
| `1-5`～`1-8` | `qingqiu_forest` | 深青森林、密一些的后缘树木、林间道路 |
| `1-9`～`1-12` | `qingqiu_ruins` | 雾青远景、灰石遗迹、苍白树木与苔草道路 |

## 2. 最终视觉标准

- 厚而圆润的深色轮廓，低饱和黄绿色、橄榄绿、暖赭色与灰石色。
- 地表与后景相接的最上沿必须使用连续、明显的深橄榄色粗描边；不能出现只有色块而轮廓缺失的区段。
- 后缘中景不是无描边剪影层。所有能在道路上方看见的树、岩肩、沙丘、墙体、柱梁和灌木都必须有完整、连续的深色圆描边；母图外轮廓视觉粗度约 `6～8 px`，缩放到 `1720×560` 后仍要清楚，但必须轻于地表和前景，不能只靠相邻色块区分形体。
- 远侧中景使用约 `5～7 px`、对比略低的同色系深描边建立空气透视；可辨识的山、塔、城墙和浮岩仍须有轮廓，不使用完全无边的大色块。云、雾和天空不描重边。
- 线宽层级固定为：远侧中景 `5～7 px`、后缘中景 `6～8 px`、地表交界 `10～14 px`、前景 `10～14 px` 或略重。不能因为“统一画风”把所有层画成相同粗度。
- 使用大色块和少量硬边暗面，不使用写实纹理、噪点或细碎笔触。
- 道路中央保持低对比，角色落脚区不能被地表细节或前景物件打断。
- 道路地表总高度统一占母图约 68%～75%，最上沿平均落在画布顶部以下约 25%～32%；第一章后续区域以 `road_meadow_mid_matte_v08.png` 为纵向构图基准，不能退回只占下半幅的矮地表。
- 后缘植被层的有效绘制内容需覆盖画布高度约 78%～84%；触顶树干应越过上边界，树基与灌木向下延伸到道路草坡后方，不能用大面积透明留白代替实际内容。
- 后缘层的大树只承担中景节奏，单根树干横向体量不应接近前景框景；在保持高度的前提下，树干宽度宜比贴边大树缩小约四分之一，并略向画布外侧退，让灌木继续承担与地表的衔接。
- 每片前景通过底部重叠形成一组，但保留叶片层次、局部空隙和不对称高低差；不能融合成平整绿带。
- 游戏中每片约占 40%～55% 屏宽，可见高度覆盖战斗区底部约四分之一至三分之一；同一屏通常出现 1～2 片。
- 轮廓在缩放到运行尺寸后仍要明显粗于地表线条，不能呈现缩小图标的细边感。
- 前景只遮挡角色脚部附近，不遮挡主要动作、血条或敌我辨识。

### 地表细节预算

现有道路的整体密度已经可用。下一次优化只追加少量细节：

- 每条完整道路最多再增加 3～4 个小型地表点缀；
- 优先使用低矮草簇、小蘑菇或单块圆石，三类混合，不连续重复同一种；
- 任意一屏新增点缀不超过 2 个；
- 左右接缝各 10% 区域不放独特物件；
- 中央约 70% 的主要行走带继续保持安静。

## 3. 目录与规格

```text
public/assets/backgrounds/roads/
├── concepts/
│   └── chapter_XX/*_prompts.md          # 长期保留的最终提示词与参数记录
└── runtime/<layer-pack>/
    ├── sky.webp
    ├── distant.webp
    ├── rear.webp
    ├── road_vNN.webp                   # 1720×560
    └── foreground/
        └── *_vNN.webp                  # 288×192
```

制作期间可把 `*_matte_vNN.png`、`*_source_vNN.png`、合成预览和素材板暂存在对应 `concepts` 目录；正式资源通过验收并登记到清单后，这些过程图片不纳入长期资源，只保留提示词记录和 `runtime` 中实际引用的 WebP。

当前青丘三套区域地图共用以下模块化前景：

| 名称 | 用途 |
|---|---|
| `grass_clump` | 少量高草叶向低草自然收束的简单片段 |
| `shrub_clump` | 高草与大块灌木叶团组成的繁复片段 |
| `stone_cluster` | 圆润石块、高草和少量叶片组成的中等片段 |
| `mushroom_cluster` | 蘑菇、高草和圆叶组成的中等片段 |

森林区域将简单草片替换为大型蕨叶簇，将繁复灌木片替换为盘根倒木簇；石块与蘑菇继续复用青丘通用素材。

遗迹区域将简单草片替换为苔石残碑簇，将繁复灌木片替换为枯藤断柱簇；石块与蘑菇继续复用青丘通用素材。

## 4. 生成阶段：使用纯色底

生成时不要求模型直接输出透明像素。所有待抠取资源使用浓洋红背景：

```text
#FF00FF
```

模型可能让纯色底出现轻微色差，导出程序会按颜色距离识别背景。工作图必须满足：

- 背景只有洋红色，不包含棋盘格、地面、天空、投影或光晕；
- 主体与洋红色有足够颜色差；
- 主体完整、居中，四周留出安全边距；
- 每片前景必须是一个完整组合：元素在底部自然搭接，但上部轮廓彼此可辨，不能是分离小图标，也不能是整屏长条；
- 主体视觉宽高比约 1.5～1.9，横跨画布 70%～82%，高度占画布 68%～82%；
- 使用非对称构图：一侧有少量高叶片或主形体，另一侧由较低元素自然收束；
- 底部接地点完整，不裁切轮廓。

### 道路提示词模板

```text
Use case: stylized-concept
Asset type: layered road/ground artwork for a 2D H5 side-scrolling battle scene
Input image: use the approved Qingqiu road only as the style and composition reference
Primary request: create one continuous broad walkable road and grass embankment; preserve a calm central landing lane and slow irregular upper silhouette
Style: low-saturation hand-painted cartoon, large matte color shapes, rounded dark-green outline, restrained detail
Top contour: redraw the complete terrain-to-backdrop boundary as one continuous dark-olive rounded outline, visually 10–14 px thick on a 2172×724 master; repair every pale, weak or missing segment, including grass, shrub and rock silhouettes
Detail budget: sparse grouped grass, mushrooms and rounded stones; no more than two accents in one viewport; keep the central 70% quiet
Seam rule: keep the leftmost and rightmost 10% calm, level-compatible and free of unique objects
Backdrop: perfectly uniform #FF00FF chroma-magenta
Avoid: transparency grid, sky, distant scenery, foreground framing, characters, UI, text, dense grass blades, pebbles, noise, realistic texture, high saturation
```

### 模块化前景提示词模板

```text
Use case: stylized-concept
Asset type: reusable wide 2D foreground occluder patch for a side-scrolling game
Input image: the approved Qingqiu road is style reference only
Primary request: one layered <草叶与低草/灌木与高草/石块与高草/蘑菇与圆叶> foreground cluster
Style: low-detail hand-painted cartoon; muted Qingqiu palette; large matte color blocks; materially thick, smooth and rounded dark outline that stays bold at 288×192
Composition: landscape canvas; subject spans 70%–82% of the width and 68%–82% of the height; visual width-to-height ratio 1.5–1.9; asymmetrical silhouette with tall forms on one side and lower forms tapering away; bottom overlaps connect the group while upper shapes retain small gaps and clear layers; complete bottom contact edge; generous safe margin; no cropping
Backdrop: perfectly uniform flat #FF00FF; no gradient, texture, glow, vignette, transparency or checkerboard
Avoid: full-screen scenery strip, smooth continuous hedge, flat sod band, isolated icon, detached object row, symmetry, text, logo, watermark, excessive small detail
```

不同片段分别调用一次生成；不要在一张图内排素材表，也不要要求模型生成整屏循环长条。

### 后缘植被提示词模板

```text
Use case: precise-object-edit
Asset type: wide rear-vegetation layer for a 2D H5 side-scrolling game
Input image: use the approved rear layer as the edit target and preserve its horizontal composition
Primary request: keep the left and right tree anchors, shrub spacing and central 45% opening; extend tree trunks beyond the top crop and extend root shoulders, shrub masses and tree bases downward so painted vegetation covers 78%–84% of the canvas height
Style: low-saturation Qingqiu cartoon; large matte shapes; every visible tree, rock, terrain shoulder, wall, column, beam and shrub has a complete continuous rounded deep-olive outline, visually 6–8 px on the 2172×724 master and clearly lighter than the road and foreground; at most one broad shadow patch per major form
Seam rule: keep the leftmost and rightmost 10% simple and height-compatible
Backdrop: fully opaque, uniform #FF00FF; keep only a 12%–18% bottom safety band
Avoid: missing or thin contour segments, pure color-block boundaries, uniform scaling, filled combat center, road, ground plane, sky, distant scenery, characters, UI, text, tiny leaf detail, realistic bark, transparency or checkerboard
```

## 5. 去底与运行资源导出

### 道路

```powershell
python scripts/art/process_road_matte.py `
  --matte public/assets/backgrounds/roads/concepts/<road>_matte_vNN.png `
  --source public/assets/backgrounds/roads/concepts/<road>_source_vNN.png `
  --runtime public/assets/backgrounds/roads/runtime/<layer-pack>/road_vNN.webp `
  --ground-top-ratio 0.32
```

`--ground-top-ratio` 按每列首个可见地表像素的中位数，将地表上沿归一到指定画布高度；青丘三套区域统一使用 `0.32`。它只在导出阶段纵向整理地表，不改变运行时图层位置。

后缘植被同样使用 `process_road_matte.py` 去除洋红底并统一导出到 1720×560；导出后其 Alpha 包围盒高度必须达到运行图的 78%～84%。

### 模块化前景

```powershell
python scripts/art/process_foreground_matte.py `
  --matte public/assets/backgrounds/roads/concepts/foreground/<prop>_matte_vNN.png `
  --source public/assets/backgrounds/roads/concepts/foreground/<prop>_source_vNN.png `
  --runtime public/assets/backgrounds/roads/runtime/<layer-pack>/foreground/<prop>_vNN.webp
```

处理器统一完成：

1. 按洋红颜色距离提取主体；
2. 将边缘向内收缩 1 像素，去掉生成图的染色边；
3. 生成约 1 像素的连续抗锯齿 Alpha；
4. 将主体内部颜色向透明边缘延展，消除亮边、黑边和洋红边；
5. 使用预乘 Alpha 缩放并导出无损 WebP。

模块化前景会被标准化到 576×384 母图，主体基线位于 `y=360`；运行图为 288×192。程序按纹理真实宽高比显示，并让接地点略低于屏幕底边，形成自然裁切的前景遮挡。

## 6. 程序接入

1. 在 `src/assets/manifest.ts` 登记区域分层包；同章通用天空与前景模块可直接复用路径。
2. `getBattleAssetRequests` 只加载当前分层场景需要的模块化前景。
3. `BattleBackgroundView` 使用独立图片对象摆放片段，不把它们重新合成为长条。
4. 当前区域地图的前景循环宽度约为 4.6 屏，视差系数为 `1.22`。
5. 每次进入分层场景时，仅生成一次装饰布局；场景运行和窗口变化期间保持不变，不写入存档。
6. 布局从“简单草片重复两份 + 岩石 + 蘑菇 + 灌木”的素材袋中打乱抽取，使简繁内容都有稳定出现机会，又不形成固定顺序。
7. 相邻中心间距在约 0.36～0.92 屏之间变化；缩放、水平翻转独立变化，不使用等距网格。

### 视觉位置与景深滚动

- 分层场景的地表层向画面下方偏移约 `5%` 视口高度，模块化前景基线仍向下偏移约 `10%`；这是渲染层构图偏移，不修改角色落脚点、碰撞、战斗数值或存档。
- 景深滚动只跟随已经平滑处理的英雄镜头行进量；背景使用关卡内单调递增的视觉位置，阵型调整或英雄倒下不会让场景倒卷，进入下一关时随战斗视图一起复位。
- 当前差速为：天空 `0.03×`、远景 `0.12×`、后缘植被 `0.32×`、道路地表 `1.00×`、前景 `1.22×`。天空近似固定，远景缓慢，中景可辨，地表作为基准，前景略快。
- 带触顶树干的后缘植被层使用 `1.18×` 等比超扫，把素材上边界藏到视口外；超扫只负责隐藏裁切边，不能替代 78%～84% 的有效绘制高度。
- 差速只属于 Phaser 表现层。关卡进度仍由模拟层提供，表现层不反向写入规则，也不增加存档字段。
- 未拆层的旧关卡合成图保持静止；单张不可平铺图片不做取模滚动，避免移动到边界后突然跳回。

道路与背景层继续使用双图镜像循环作为样板方案。正式长卷替换时，优先改成真正首尾无缝的 A/B 段，模块化前景流程无需变化。

## 7. 验收

### 文件检查

- 道路运行图：1720×560 RGBA WebP。
- 长图导出先按运行画布宽高比居中裁切，再等比缩放到 1720×560；禁止直接改变横纵比例。
- 模块化前景母图：576×384 RGBA PNG；运行图：288×192 RGBA WebP。
- Alpha 同时包含 0、255 和少量过渡值。
- 所有 `alpha > 0` 的可见像素中不存在洋红残留。
- 母图与运行图均未裁切主体和接地点，主体内部没有意外断开的孤立块。

### 实机检查

- 在天空、远山和道路合成后检查地表上沿：轮廓连续、粗细稳定、深色清楚，无只有色块的缺线区段，也无亮边、黑边或毛刺。
- 单独检查后缘中景：所有露出地表的树、岩肩、沙丘、墙柱和灌木均有连续圆描边；运行尺寸下不能退化成纯色块，也不能粗到与地表、前景等权。
- 观察至少两个前景循环位置，确认没有整条图重复或突然跳回。
- 一屏前景约 1～2 个，中央交战区仍清楚。
- 每片前景在正常画面中约占 40%～55% 屏宽，可见轮廓抬高到战斗区底部约四分之一至三分之一，且不形成平整连续绿带。
- 连续重新进入场景至少观察三次：简繁组合、左右翻转、缩放和间隔有明显变化，没有平均排布或固定重复节拍。
- 石块、灌木和蘑菇片只遮挡画面最底部，不盖住血条或角色主体。
- 左右循环接缝无露底、跳色或物件截断。
- 从 `0%` 推进到约 `40%` 后，对照同一处场景：天空仅轻微移动，远景小幅移动，后缘植被明显移动，道路与前景形成清楚的速度差；所有层都连续、无跳回。

### 项目检查

```powershell
npm run test:run -- tests/assets/assets.test.ts
npm run build
```

只有资源、实机画面和构建三项都通过，才将新版本写入正式资源清单。

### 交付清理

资源清单确认后，以 `src/assets/manifest.ts` 为实际使用来源：

- 保留清单引用的 `runtime/**/*.webp`；
- 保留 `concepts/**/*.md` 中的最终提示词、生成参数和区域说明；
- 删除 `concepts` 中的纯色底图、透明母图、候选版本、素材板和合成预览；
- 删除未被清单引用的旧运行版本，避免后续误用；
- 最后运行资源清单测试，确认所有正式路径存在且没有引用被误删。
