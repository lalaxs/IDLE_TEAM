# 青丘远征｜五人小队放置 RPG H5 Demo

面向手机竖屏浏览器的完整单机 Demo。玩家管理五名英雄，在不中断自动战斗的情况下完成升级、换装、阵容、商店、召唤与关卡推进。

## 当前内容

- 第一章“青丘边境”12 关，每关三波，包含普通怪、精英和独立 Boss；
- 8 名英雄，具有不同属性、攻击距离、主动技能和被动；
- 行走、遇怪、普攻、技能、受击、死亡、Boss 入场、胜负与战利品演出；
- 武器、护甲、护符及副武/头盔/手套/鞋/戒指/护腕/耳环，10 槽全开；底座浮动 + 暗黑不朽式随机词条 + 战斗特性；
- 英雄 1–20 级成长、背包、装备比较和溢出处理；
- 每日冒险商店、固定 Demo 召唤序列、离线收益；
- 阵容编辑、章节选择、新手引导、设置、减弱动效与音效；
- `localStorage` 存档、损坏恢复和不可用时静默降级；
- 360×640、390×844、430×932 手机尺寸和桌面居中预览。

## 本地运行

```bash
npm install
npm run dev
```

浏览器访问终端给出的本地地址。生产构建：

```bash
npm run build
npm run preview
```

## 测试

```bash
npm run test:run
npm run test:e2e
```

Playwright 首次运行前如未安装浏览器：

```bash
npx playwright install chromium
```

## 调试模式

访问 `/?debug=1` 可显示战斗状态、FPS、随机种子，并提供清除敌人、击倒全队、增加金币和宝石的验收操作。调试层不会出现在普通入口，也不会改变存档结构。

## 工程结构

- `src/simulation`：固定步长、可设种子的纯 TypeScript 战斗规则；
- `src/app`：玩家状态、Action、战斗会话和运行时编排；
- `src/phaser`：战场、角色、跳字、投射物和一次性演出；
- `src/ui`：移动端 DOM UI、页面、抽屉和弹层；
- `src/progression`：英雄、装备、掉落、商店与离线收益；
- `src/persistence`：存档 Schema、修复与防抖写入；
- `public/assets`：独立 SVG 角色和分层场景资产；
- `tests`：规则、集成、UI、资产和多尺寸浏览器测试。

完整产品与技术规格见 [设计规格](docs/superpowers/specs/2026-07-31-mature-mobile-h5-demo-design.md)，
装备词条对标见 [暗黑不朽对照规格](docs/superpowers/specs/2026-08-10-equipment-affix-diablo-immortal-design.md)，
实施任务见 [实施计划](docs/superpowers/plans/2026-07-31-mature-mobile-h5-demo-implementation.md)。
