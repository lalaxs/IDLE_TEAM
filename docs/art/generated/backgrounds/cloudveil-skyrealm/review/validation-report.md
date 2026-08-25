# 云岚天境背景资产验证报告

- 验证日期：2026-08-01
- 生成方式：内置 ImageGen
- 章节范围：第四章 `4-1`～`4-12`
- 设计规格：`docs/superpowers/specs/2026-08-01-cloudveil-skyrealm-map-background-art-design.md`
- 生成清单：`docs/art/requirements/cloudveil-background-generation-manifest-v01.json`

## 交付统计

| 类型 | 数量 | 尺寸 | 模式 | 结果 |
|---|---:|---|---|---|
| 战斗背景母图 | 12 | 1672×941 | RGB PNG | 通过 |
| 无节点章节地图 | 1 | 1672×941 | RGB PNG | 通过 |
| 色键前景源图 | 3 | 1672×941 | RGB PNG | 通过 |
| 透明前景运行图 | 3 | 1672×941 | RGBA PNG | 通过 |
| 区域联系表 | 3 | 1120×850 | RGB JPEG | 通过 |
| 全章总览 | 1 | 1360×1070 | RGB JPEG | 通过 |
| 前景透明预览 | 1 | 2280×542 | RGB PNG | 通过 |

## 视觉审核

- 云岚高原、浮石风谷和天穹古城保持同一低侧视相机、连续地面基线、圆润大形、暖黑描边和柔和手绘纹理；
- 色彩从灰青天空、暖象牙云海和灰薄荷草地，推进到板岩紫峡谷，再进入暖白石城、暗青铜绿与克制旧金，区域差异清晰且风格统一；
- 12 张战斗图均保留中央约 58% 的低对比交战区，白岩、断桥、浮石、根系、营地与建筑构件位于两侧或上方远景；
- 云海只位于远景和悬崖外侧，所有战斗场景都保留连续、坚实、可读的落脚地面；
- 断索云桥的桥头和粗绳停留在左侧边缘，没有形成跨越中央安全区的遮挡；
- 全章没有角色、怪物、文字、数字、UI、徽标、水印、宗教图案、翅膀、星图、魔法阵、传送门或发光核心；
- 章节地图按左侧云岚高原、中部浮石风谷、右侧天穹古城推进，天然道路连续，且不含节点、圆圈、椭圆台座、圆点、虚线、旗帜、锁或文字。

## 前景 Alpha 验证

检测区域为画布横向 `38%`～`62%`，有效像素定义为 alpha 大于 `16`。

| 文件 | 非透明包围框 | 顶部左/右 alpha | 中央有效像素占比 | 结果 |
|---|---|---:|---:|---|
| `fg_cloud_highlands_occlusion_v01.png` | `(0, 604, 1672, 941)` | 0 / 0 | 0.000000% | 通过 |
| `fg_floating_valley_occlusion_v01.png` | `(0, 364, 1672, 941)` | 0 / 0 | 0.000000% | 通过 |
| `fg_sky_city_occlusion_v01.png` | `(0, 425, 1672, 933)` | 0 / 0 | 0.000000% | 通过 |

三张前景在中央检测区没有有效像素，因此满足中央占比不超过 `0.1%` 的验收上限。色键源图经本地软边、去洋红溢色流程转换为具有真实 alpha 通道的 RGBA 运行图。

## 审核产物

- `review/cloud_highlands_contact_sheet_v01.jpg`
- `review/floating_valley_contact_sheet_v01.jpg`
- `review/sky_city_contact_sheet_v01.jpg`
- `review/chapter_background_overview_v01.jpg`
- `review/foreground_occlusion_preview_v01.png`

## 生产记录

- 使用内置 ImageGen 生成全部背景母图、章节地图与前景色键源图，没有使用 CLI 图像生成回退；
- 白岩梯田、云帆营地和青铜风廊的初始宽度存在 1～2 px 偏差，已统一规范化为 1672×941；
- 云岚高原第一版前景的中央有效像素占比为 0.192929%，超过 0.1% 上限；通过定向重绘把两侧簇群外移后降至 0%；
- 三个区域分别制作独立透明前景遮挡层，便于在敌人与英雄上方形成真实景深遮挡。

## 验证命令

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
npm run test:run
git diff --check
```

另使用 Pillow/JSON 断言核对：13 张母图全部为 1672×941 RGB、3 张运行时前景全部为 1672×941 RGBA、4 张 JPEG 审核图存在、13 个清单条目状态全部为 `approved`、资产提示词标题数量为 16，以及三张前景的顶部透明角和中央 Alpha 限制。

## 运行时接入边界

本次只交付美术与审核资产，没有覆盖 `public/assets/backgrounds/*.svg`，没有修改 `src/assets/manifest.ts`、`src/phaser/BattleScene.ts`、章节数据、存档或数值。后续接入建议把不透明背景置于角色下方，透明前景置于深度 `300`，技能与投射物置于 `350`～`400`，跳字与胜利粒子置于 `500` 以上；章节地图的节点、锁定状态、进度与标题继续由运行时 UI 叠加。
