# 80 名职业英雄直生图最终复查报告

> 日期：2026-07-31  
> 状态：通过  
> 权威参考：[`hero-style-master-v1.png`](../../../references/hero-style-master-v1.png)

## 1. 交付统计

| 资产 | 数量 | 位置 |
|---|---:|---|
| 1024 × 1024 透明 PNG 母版 | 80 | `docs/art/generated/heroes/master/` |
| 512 × 512 透明 WebP 运行时图 | 80 | `docs/art/generated/heroes/runtime/` |
| 256 × 256 透明 WebP 头像 | 80 | `docs/art/generated/heroes/portraits/` |
| 96 × 96 透明 PNG 可读性预览 | 80 | `docs/art/generated/heroes/previews/` |
| 职业联系表 | 13 | `docs/art/generated/heroes/review/class-*-contact-sheet.png` |
| 80 人总览 | 1 | `docs/art/generated/heroes/review/all-heroes-contact-sheet.png` |

覆盖 13 个职业、40 个专精，男性和女性各一张，共 80 张最终角色。

## 2. 生产方式声明

- 80 名最终角色均使用内置图像生成工具逐张、独立、完整生成。
- 每个最终角色都使用项目权威标准图作为唯一图像风格参考。
- 没有使用基础身体、装备图层、模块库、部件替换、角色拼接或多人设定板。
- 男女角色分别完整生成，没有在同一画布生成后裁切。
- 本地处理只完成纯色背景去除、透明方形归一化、尺寸导出和联系表制作，没有重新绘制、换装或拼接角色内容。

## 3. 自主复查与修订

### 3.1 生成阶段重做

| 角色 | 原因 | 处理 |
|---|---|---|
| `wa-pro-m` | 第一版接近正面，护甲内部细节过多 | 整张重新生成；收紧侧身、纯色块和无铆钉约束 |
| `pa-pro-f` | 第一版脸部与马尾朝向画面左侧，违背全队朝右规范 | 整张重新生成；锁定脸向右、马尾向左、盾牌在右、战锤在左 |
| `wl-dem-m` | 第一版出现真实恶魔角，违背普通人类种族限制 | 整张重新生成；明确普通人耳、普通发型、无角和无非人特征 |
| `wl-dem-f` | 第一版出现真实恶魔角，违背普通人类种族限制 | 整张重新生成；明确普通人耳、普通发型、无角和无非人特征 |

旧版恶魔学识术士色键原图保存在 `review/rejected/`，不属于最终资产。

### 3.2 背景处理修订

最初的洋红色软蒙版与去溢色参数会压低红色、橙色、紫色和肤色。该问题在男性火焰法师的职业联系表中被发现。

最终对全部 80 张重新执行：

```text
border auto-key
hard tolerance 24
edge contract 1 px
no despill
```

该方案只移除与边缘背景颜色接近的像素，保留主体原始配色。归一化到 1024 方形画布时使用高质量缩放，使硬色键边缘在最终尺寸获得自然抗锯齿。

### 3.3 宽角色构图修订

男性守护德鲁伊的锤盾轮廓较宽，初次归一化后主体高度为 67.1%，低于 68% 下限。归一化器的安全主体宽度由 900 调整为 920 像素，并增加回归测试；最终主体没有触边，完整保留武器和盾牌。

## 4. 视觉复查结论

复查使用 13 张职业联系表、1 张 80 人总览和可疑角色全尺寸图。

全部最终角色满足：

- 单张只出现一名完整角色；
- 朝右三分之四侧身，脸部保留两只椭圆眼睛；
- 圆脸、大头、隐藏颈部、短小躯干和极短腿；
- 不绘制嘴、鼻、眉毛、睫毛和手指；
- 手部为圆形，线条粗、圆、连续；
- 武器完整且克制，没有遮挡主要脸部；
- 专精通过武器、配色、护甲轮廓和一个小型魔法符号辨识；
- 特殊种族只用于恶魔猎手、德鲁伊、唤魔师和萨满祭司；
- 普通人类职业没有误用特殊种族特征；
- 没有角色板、拆件、额外装备展示、第二角色、文字、水印或 UI；
- 没有复制第三方命名角色、具体套装、神器、阵营纹章或商标。

## 5. 自动验证

验证器检查：

- 清单包含 80 个唯一角色和 40 组男女专精；
- 王国人 54 张、特殊种族 26 张；
- 80 张母版均为 1024 × 1024 RGBA PNG；
- 四角透明，主体不触边，高度位于 68%–84%；
- 80 张运行时图、头像和预览可解码、尺寸正确且包含透明通道；
- 80 个角色均存在明确的人工复查通过记录。

最终结果：

```text
Validation summary: 80/80 masters, 80/80 runtime,
80/80 portraits, 80/80 previews, 80/80 approved
All hero assets passed validation.
```

## 6. 未解决问题

无。

## 7. 可复现资料

- 美术设计规范：`docs/superpowers/specs/2026-07-31-direct-generated-class-hero-art-design.md`
- 生产计划：`docs/superpowers/plans/2026-07-31-direct-generated-class-hero-art-production.md`
- 80 项清单：`docs/art/requirements/direct-generated-hero-manifest.json`
- 提示词结构：`docs/art/requirements/direct-generated-hero-prompts.md`
- 复查状态：`docs/art/generated/heroes/review/review-status.json`
- 资产验证器：`scripts/art/validate_hero_assets.py`
- 透明资产归一化器：`scripts/art/process_hero_asset.py`
- 联系表生成器：`scripts/art/build_hero_contact_sheets.py`
