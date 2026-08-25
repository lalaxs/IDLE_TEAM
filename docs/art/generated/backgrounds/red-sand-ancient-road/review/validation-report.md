# 赤沙古道背景资产验证报告

- 验证日期：2026-08-01
- 生成方式：内置 ImageGen
- 章节范围：第三章 `3-1`～`3-12`
- 设计规格：`docs/superpowers/specs/2026-08-01-red-sand-ancient-road-map-background-art-design.md`
- 生成清单：`docs/art/requirements/red-sand-background-generation-manifest-v01.json`

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

- 赤沙驿道、风蚀峡谷和沉沙古城保持相同低侧视相机、连续地面基线、圆润大形和暖黑粗描边语言；
- 色彩从柔和赭黄和灰粉，推进至陶土红，再进入灰米砂岩、暗青绿与克制氧化铜，区域差异清晰但不跳风格；
- 12 张战斗图均保留中央约 58% 的低对比交战区，主要路桩、断轮、石柱、营地与古城建筑位于两侧或上方远景；
- 巨柱门廊已进行一次定向清理，移除进入中央安全区的横梁；
- 全章没有角色、怪物、文字、数字、UI、徽标、水印、骷髅、宗教符号、魔法阵或传送门；
- 沙地采用大块风纹与低频纹理，没有密集沙粒、写实扬尘或高饱和橙黄整屏；
- 章节地图按左侧赤沙驿道、中部风蚀峡谷、右侧沉沙古城推进，天然道路连续且不含节点、圆圈、椭圆台座、虚线、旗帜、锁或文字。

## 前景 Alpha 验证

检测区域为画布横向 `38%`～`62%`，有效像素定义为 alpha 大于 `16`。

| 文件 | 顶部左/右 alpha | 中央有效像素占比 | 结果 |
|---|---:|---:|---|
| `fg_red_dunes_occlusion_v01.png` | 0 / 0 | 0.000000% | 通过 |
| `fg_wind_canyon_occlusion_v01.png` | 0 / 0 | 0.000000% | 通过 |
| `fg_sunken_city_occlusion_v01.png` | 0 / 0 | 0.000000% | 通过 |

三张前景在中央检测区没有有效像素，因此也自然满足“中央少量像素只允许位于底部 36 px”的上限。色键使用边缘自动取样、软蒙版和去洋红溢色输出。

## 审核产物

- `review/red_dunes_contact_sheet_v01.jpg`
- `review/wind_canyon_contact_sheet_v01.jpg`
- `review/sunken_city_contact_sheet_v01.jpg`
- `review/chapter_background_overview_v01.jpg`
- `review/foreground_occlusion_preview_v01.png`

## 验证命令

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
npm run test:run
git diff --check
```

另使用 Pillow/JSON 断言核对：13 张母图全部为 1672×941 RGB、3 张运行时前景全部为 1672×941 RGBA、4 张 JPEG 审核图存在、13 个清单条目状态全部为 `approved`，以及三张前景的顶部透明角和中央 Alpha 限制。

## 运行时接入边界

本次没有覆盖 `public/assets/backgrounds/*.svg`，没有修改 `src/assets/manifest.ts`、`src/phaser/BattleScene.ts`、章节数据、存档或数值。后续接入建议把不透明背景置于角色下方，透明前景置于深度 `300`，技能与投射物置于 `350`～`400`，跳字与胜利粒子置于 `500` 以上。
