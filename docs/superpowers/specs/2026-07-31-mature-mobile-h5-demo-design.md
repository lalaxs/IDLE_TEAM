# 五人小队放置 RPG：成熟手机 H5 Demo 设计规格

> **文档性质：** 项目唯一权威的产品、战斗、系统、UI 与技术交接规格  
> **版本：** 1.1  
> **日期：** 2026-07-31（1.1 修订 2026-08-10）  
> **状态：** 已批准执行  
> **批准方案：** 方案 A｜成熟竖切 Demo  
> **目标终端：** 手机浏览器竖屏 H5，桌面浏览器仅作为兼容预览

## 0. 权威性

本文件取代 `2026-07-31-core-game-framework-design.md` 的 1.0 原型范围。
旧文件继续保留作为框架研究记录；冲突时一律以本文件为准。

**1.1 修订：** 第 9 章装备改为「暗黑不朽式」三层结构（底座 + 随机词条 + 特性）。  
**1.2 修订：** 随机词条属性轴改对齐 TBH 材料效果，见 `2026-08-11-equipment-affix-tbh-design.md`。  
词条池、部位限制与区间的详细对照见
`2026-08-10-equipment-affix-diablo-immortal-design.md`；与本章冲突时，以本章产品边界为准，
数值表以对照规格为准。

继续制作的 Agent 必须：

1. 先阅读本文件，再阅读当前实施计划；涉及词条数值时同时阅读不朽对照规格；
2. 不恢复 92 张模块化种族与专精美术路线；
3. 不复制同类游戏的角色、技能名称、UI 素材或专有数值；
4. 同类产品只用于验证自动战斗、放置成长、装备决策和移动端反馈规律；
5. 未列入本文件的联网、支付、广告、社交和长期运营系统不得擅自加入；
6. 不得回退到「仅四维固定面板、无词条池」的旧装备模型。

## 1. 产品目标

### 1.1 产品定义

- 单机、竖屏、移动端优先的 H5 放置 RPG。
- 玩家管理五名英雄组成的自由小队。
- 英雄持续自动移动、寻敌、普攻、施放技能和推进关卡。
- 玩家在战斗不中断的情况下处理阵容、英雄、装备、商店和章节。
- 首版交付一章 12 关的完整可玩内容和第二章预告卡。
- 首版 SVG 是可交付视觉资产，不以“灰盒占位”标准降低完成度。
- 所有数据保存在本地，不要求注册、登录或联网服务。

### 1.2 玩家核心循环

```text
进入游戏
  ↓
领取离线收益
  ↓
观看小队自动行走和战斗
  ↓
击败敌人、Boss，获得金币与装备
  ↓
比较并装备战利品、升级英雄、调整阵容
  ↓
提升战力并推进下一关
  ↓
失败后继续积累，调整配置，再次突破
```

### 1.3 首版完成标准

首版只有同时满足下列条件才算成熟 Demo：

- 首屏加载后 3 秒内出现可运行的战斗；
- 行走、遇怪、交战、技能、受击、死亡、胜负、掉落和转场均有完整表现；
- 8 名英雄拥有不同基础属性、攻击距离、主动技能和被动能力；
- 12 关可以完整推进，失败可以稳定重试；
- 装备具有明确槽位、品质、底座属性、随机词条、战斗特性和比较流程；
- 英雄升级、金币消耗、离线收益、英雄解锁和基础商店形成闭环；
- 所有已设计 UI 页面具有真实交互，不使用纯静态占位页；
- 刷新或关闭页面后，本地存档可以正确恢复；
- 360 × 640 至 430 × 932 的常见竖屏尺寸无阻塞布局问题；
- 中低端移动设备保持可读、可点和可持续运行；
- 最终提供可公开访问的 H5 地址。

## 2. 首版范围

### 2.1 必须实现

- 一章 12 关，3 个普通敌人、1 个精英、1 个 Boss；
- 8 名英雄，初始拥有 6 名，另 2 名通过召唤解锁；
- 五人实时自动战斗；
- 三波制关卡、Boss 胜利、全队失败重试；
- 10 个装备位全开掉落、**10 个品质**（凡品→混元；同底板可出全品阶）；
- 装备三层属性：槽位底座、品质随机词条、传奇及以上固定橘字；
- 物法 `school` 软分类（可混穿）+ 主题套装 2/4/6；
- 英雄 1–20 级成长；
- 背包、装备、升级、阵容编辑；
- 英雄列表与详情；
- 基础英雄召唤；
- 基础冒险商店；
- 章节与关卡选择；
- 最长 8 小时的离线收益；
- 新手引导、设置、音效开关、减弱动效；
- 本地存档与损坏恢复；
- 调试面板、自动化测试、手机浏览器试玩。

### 2.2 明确不实现

- 账号、服务器、云存档和跨设备同步；
- 支付、广告、礼包和真实货币；
- PvP、公会、排行榜、好友和聊天；
- 正式概率抽卡、保底宣传或商业化卡池；
- 宠物、符文、天赋树、套装和装备强化；
- 装备洗练 / 重铸、传奇宝石、Item Rank（对标不朽有、本 Demo 不做）；
- 多章节剧情、任务系统、成就和活动；
- 骨骼动画、逐帧角色动画和复杂粒子系统；
- 多路线寻路、物理碰撞和多层地形；
- 多语言。

## 3. 手机 H5 技术基线

### 3.1 固定技术栈

- Phaser `3.90.0`；
- TypeScript 严格模式；
- Vite；
- 原生 DOM + CSS；
- Vitest；
- Playwright；
- `localStorage`；
- 独立 SVG 纹理；
- Web Audio API 生成或播放轻量音效。

选择 Phaser 3.90 而不是 Phaser 4，是为了保留成熟的 Phaser 3 生态与
Canvas/WebGL 兼容路径。首版不得使用自定义渲染管线、着色器或重型插件。

### 3.2 浏览器目标

- iOS Safari 14 及以上；
- Android Chrome 90 及以上；
- 基于同等级 Chromium 的 Android WebView；
- 当前主流微信内置浏览器；
- 桌面 Chrome、Edge、Safari 的当前稳定版本。

构建目标为 `es2018`，并使用 Vite legacy 插件为不支持现代模块的目标生成兼容包。
如果 WebGL 初始化失败，Phaser 使用 Canvas 回退；若两者均失败，显示可理解的兼容提示。

### 3.3 屏幕与触控

- 设计基准：`390 × 844`；
- 最小验证：`360 × 640`；
- 最大手机验证：`430 × 932`；
- 桌面端将手机画布居中，最大宽度 `430 px`；
- 支持 `env(safe-area-inset-*)`；
- 不依赖 hover；
- 主要可点击区域最小 `44 × 44 CSS px`；
- 禁止页面双击缩放和横向滚动；
- 输入控件使用 `touch-action: manipulation`；
- 横屏时显示旋转设备提示，不重排成桌面游戏布局。

## 4. 架构与数据流

### 4.1 模块边界

```text
静态定义数据
    │
    ▼
GameStore ──> BattleSimulation ──> 可序列化 BattleSnapshot
    ▲                 │                         │
    │                 └────> 一次性 GameEvent ─┤
    │                                           ▼
UI Action ─────────────────────────────> Phaser BattleView
    │
    ├──────────────────────────────────> DOM UI
    └──────────────────────────────────> SaveRepository
```

- `GameStore` 拥有玩家持久数据和当前 UI 状态；
- `BattleSimulation` 拥有战斗单位、计时、目标、技能、波次和结果；
- `BattleSnapshot` 是渲染器每帧读取的权威状态；
- `GameEvent` 只驱动跳字、闪光、音效和掉落飞行动画；
- Phaser 对象、DOM 节点和 Tween 永远不是规则状态；
- UI 只能派发明确 Action，不能跨模块直接写多个字段。

### 4.2 必须存在的核心目录

```text
src/
├── app/
│   ├── GameApp.ts
│   ├── GameStore.ts
│   ├── actions.ts
│   └── events.ts
├── assets/
│   └── manifest.ts
├── content/
│   ├── heroes.ts
│   ├── skills.ts
│   ├── enemies.ts
│   ├── stages.ts
│   ├── items.ts
│   └── shop.ts
├── simulation/
│   ├── BattleSimulation.ts
│   ├── TargetingSystem.ts
│   ├── MovementSystem.ts
│   ├── CombatSystem.ts
│   ├── SkillSystem.ts
│   ├── StatusSystem.ts
│   ├── WaveSystem.ts
│   ├── RewardSystem.ts
│   ├── RandomSource.ts
│   └── types.ts
├── phaser/
│   ├── PhaserGame.ts
│   ├── BootScene.ts
│   ├── BattleScene.ts
│   ├── SceneBridge.ts
│   └── views/
├── ui/
│   ├── AppShell.ts
│   ├── BattleHUD.ts
│   ├── PartyNameplates.ts
│   ├── InventoryPanel.ts
│   ├── ItemDetailSheet.ts
│   ├── ShopPanel.ts
│   ├── HeroPanel.ts
│   ├── ChapterPanel.ts
│   ├── FormationEditor.ts
│   ├── HeroPickerSheet.ts
│   ├── SummonModal.ts
│   ├── OfflineRewardModal.ts
│   ├── SettingsModal.ts
│   └── TutorialOverlay.ts
├── persistence/
│   ├── SaveRepository.ts
│   ├── schema.ts
│   └── migrations.ts
├── audio/
│   └── AudioManager.ts
└── debug/
    └── DebugOverlay.ts
```

### 4.3 资产键

业务代码只能引用 `manifest.ts` 中的稳定键，不能直接引用路径。
例如：

```ts
export const ASSET_KEYS = {
  heroLorne: "hero_h01_lorne",
  enemySprout: "enemy_e01_sprout",
  backgroundSky: "bg_ch1_sky",
  itemWeapon: "item_weapon",
} as const;
```

## 5. 战斗模拟

### 5.1 固定时间模型

- 逻辑步长：`50 ms`，即每秒 20 步；
- 渲染目标：60 FPS；
- 1× 时每秒执行 20 个逻辑步；
- 2× 时按两倍速度累积逻辑时间，每帧仍最多补算 5 步；
- 超出补算上限的积压时间直接丢弃，不追赶后台时间；
- 页面隐藏后停止实时模拟并记录 `lastActiveAt`；
- 页面恢复时只计算离线收益，不补演战斗；
- 所有随机行为使用可注入、可设种子的 `RandomSource`。

### 5.2 战场

- 逻辑宽度：1000；
- 英雄出生：`x = 90–190`；
- 敌人出生：`x = 820–940`；
- 英雄向右，敌人向左；
- 锁定摄像机，不滚动、不缩放；
- `y` 只用于视觉错位和深度排序；
- 逻辑距离只使用 `abs(source.x - target.x)`；
- 单位不互相形成不可通过的实体墙；
- 同队单位允许错位重叠，敌我接战点保留最小 24 单位间距。

### 5.3 单位状态

```ts
type UnitState = {
  id: string;
  team: "heroes" | "enemies";
  sourceId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  critChance: number;
  attackRange: number;
  moveSpeed: number;
  attackIntervalMs: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
  targetId: string | null;
  shield: number;
  statuses: StatusInstance[];
  alive: boolean;
};
```

### 5.4 伤害与治疗

```text
rawDamage = attack - defense × 0.55
variance = random(0.92, 1.08)
normalDamage = max(1, round(rawDamage × variance))
criticalDamage = round(normalDamage × 1.50)
```

- 默认暴击率 5%；
- 护盾先于生命承受伤害；
- 伤害减免在防御公式后乘算；
- 治疗不受防御影响；
- 溢出治疗仅在技能明确允许时转为护盾；
- 原型不加入命中、闪避、元素抗性和持续伤害。

### 5.5 状态效果

首版只实现四种状态：

```ts
type StatusKind = "stun" | "slow" | "haste" | "damageReduction";

type StatusInstance = {
  kind: StatusKind;
  sourceId: string;
  magnitude: number;
  remainingMs: number;
};
```

- `stun`：不能移动、普攻或施法；
- `slow`：降低移动速度和攻击速度；
- `haste`：提高攻击速度；
- `damageReduction`：按比例降低最终伤害；
- 同类状态保留幅度更高者并刷新时长，不叠加倍乘；
- 状态在固定逻辑步中递减。

### 5.6 目标策略

- `nearestEnemy`：横向距离最近的存活敌人；
- `lowestHpEnemy`：生命百分比最低的存活敌人；
- `lowestHpAlly`：生命百分比最低且未满血的友军；
- `frontmostEnemy`：最接近己方出生区域的敌人。

目标死亡或离场后，在下一逻辑步重新选取。

### 5.7 战斗中管理操作

- 更换阵容：保存后在 `400 ms` 反馈结束时重置当前关至第 1 波；
- 选择其他已解锁关卡：立即重置到目标关第 1 波；
- 英雄升级或换装：实时更新存活单位属性并保持当前生命百分比；
- 攻击间隔变化：当前冷却按新旧间隔比例折算；
- 打开普通页签、抽屉或弹窗：模拟继续；
- 打开设置：模拟继续；
- 页面隐藏、系统冻结或调试暂停：模拟停止。

## 6. 战斗状态与演出

### 6.1 状态机

```text
boot
  → waveIntro
  → advancing
  → engaging
  → waveClear
  → nextWave / bossIntro
  → victory / defeat
  → stageTransition / retry
```

### 6.2 行走

- 波次生成后，敌我双方从出生点向接战区域移动；
- 角色整体 SVG 上下浮动 2–3 px，周期 `360 ms`；
- 身体按移动方向前后倾斜不超过 `3°`；
- 脚底每 `420 ms` 生成一个低透明尘点；
- 单位进入射程后在 `120 ms` 内停止并切换待机；
- 减弱动效模式只保留平滑位移，不浮动、不产生尘点。

### 6.3 遇怪与波次

- 波次开始显示 `第 N 波` 标签 `650 ms`；
- 敌人以 `60 ms` 间隔依次落位；
- 普通波不暂停；
- Boss 波显示名称横幅、暗角和轻微镜头震动，总时长 `700 ms`；
- Boss 入场后才开始技能计时。

### 6.4 普攻

- 近战：前冲 6–10 px，命中点产生短线或星形；
- 远程：生成箭矢、法球或闪电投射物；
- 攻击前摇 `120–220 ms`，命中反馈 `70–110 ms`，回位 `120–180 ms`；
- 命中时目标闪亮 `70 ms`，普通震动不超过 1 px；
- 暴击使用更大的跳字、金色星点和 2 px 短震；
- 同时跳字超过 20 个时合并低优先级数字。

### 6.5 技能

- 施法前显示职业色预兆 `100–160 ms`；
- 技能总演出控制在 `350–650 ms`；
- 范围技能必须有可读的圆环、扇形或直线范围；
- 治疗使用绿色数字和向上粒点；
- 控制技能在目标脚下显示状态图标；
- 技能演出不能冻结全场，也不能遮挡姓名血条。

### 6.6 受击与死亡

- 受击：后退 3 px、闪亮一次；
- 生命低于 25%：姓名板填充改为珊瑚红；
- 死亡：停止逻辑行为，`320 ms` 下沉并淡出；
- 不显示尸体，不阻挡其他单位；
- 英雄死亡后对应姓名板变暗并显示复活等待图标。

### 6.7 胜利、失败和战利品

胜利顺序：

1. Boss 死亡；
2. `250 ms` 后显示“胜利”；
3. 金币数字飞向顶栏；
4. 装备卡从战场中央弹出；
5. 装备图标沿曲线飞入背包页签；
6. 若背包中出现更强装备，显示红点；
7. `1.2 s` 后进入下一关。

失败顺序：

1. 最后一名英雄死亡；
2. 显示“挑战失败”与本关积累摘要；
3. 保留已经获得的金币和装备；
4. `1.5 s` 后恢复英雄并从第 1 波重试；
5. 连续失败 3 次后提示“升级或更换装备”，但不强制打开页面。

## 7. 关卡与敌人

### 7.1 章节

**产品主线规划：至少 10 章**（见 `2026-08-10-tbh-grade-and-set-design.md` §0.4）。  
每章建议 12 关；全局 `stage` 连续编号。

| 章 | 名称 | 工程状态（当前） |
|---:|---|---|
| 1 | 青丘林地（现用：青丘边境） | 已实现 |
| 2 | 霜风谷（现用：霜原） | 已实现 |
| 3 | 赤沙荒地（现用：赤沙古道） | 已实现 |
| 4 | 雷崖高地（现用：苍雷云海） | 已实现 |
| 5 | 黑水湿地 | 规划 |
| 6 | 燃烧荒地 | 规划 |
| 7 | 暗潮海岸 | 规划 |
| 8 | 哀嚎丘陵 | 规划 |
| 9 | 石牙山脉 | 规划 |
| 10 | 北风关隘 | 规划 |

命名对齐魔兽中文区域感（见装备规格 §0.4）。Ch1–4 展示字符串可稍后统一替换。  
**混元**不自然掉落，仅合成（§0.5）。

- Demo 可继续以 Ch1 或 Ch1–4 为可玩切片；**装备/掉落/美术按 10 章锚点设计**，不为「只有 4 章」收缩内容表。  
- 每关 3 波；第 3 波 Boss；通关后可回刷。

### 7.2 敌人成长

```text
globalStageIndex = stage
stagePower = 1.16 ^ (globalStageIndex - 1)
enemyHp = round(baseHp × stagePower)
enemyAttack = round(baseAttack × stagePower ^ 0.82)
enemyDefense = round(baseDefense × stagePower ^ 0.72)
```

### 7.3 敌人定义

| ID | 名称 | HP | 攻击 | 防御 | 间隔 | 距离 | 特点 |
|---|---|---:|---:|---:|---:|---:|---|
| E01 | 小树怪 | 320 | 55 | 10 | 1500 | 55 | 均衡近战 |
| E02 | 蘑菇怪 | 240 | 74 | 8 | 1250 | 65 | 快速攻击 |
| E03 | 石甲虫 | 520 | 45 | 30 | 1700 | 50 | 高生命高防御 |
| E04 | 木桩精英 | 900 | 82 | 34 | 1450 | 60 | 每 4 次攻击获得 20% 减伤 2 秒 |
| B01 | 古树守卫 | 1800 | 98 | 42 | 1600 | 80 | Boss 技能与狂暴 |

Boss 技能：

- `根须重击`：每 5 秒攻击最靠前的两名英雄，造成 130% 攻击伤害并眩晕 0.8 秒；
- `古树狂暴`：生命首次低于 30% 时获得 25% 攻速，持续到战斗结束。

### 7.4 波次生成

- 第 1 波：`3 + floor((stage - 1) / 4)` 名普通敌人；
- 第 2 波：第 1 波数量 + 1；第 4 关起加入 1 名精英；
- 第 3 波：Boss；第 7 关起加入 1 名普通随从，第 10 关起加入 2 名；
- E01 从第 1 关出现；
- E02 从第 2 关出现；
- E03 从第 3 关出现；
- 普通敌人按照关卡种子稳定混合。

## 8. 英雄与技能

### 8.1 英雄成长

- 等级上限 20；
- 英雄升级只消耗金币；
- 初始均为 1 级；
- 每级属性：

```text
maxHp(level) = round(baseHp × 1.12 ^ (level - 1))
attack(level) = round(baseAttack × 1.10 ^ (level - 1))
defense(level) = round(baseDefense × 1.09 ^ (level - 1))
upgradeGold(level → level + 1) = round(80 × 1.48 ^ (level - 1))
```

### 8.2 首发英雄

| ID | 名称 | 职业 | HP | 攻击 | 防御 | 间隔 | 距离 | 移速 |
|---|---|---|---:|---:|---:|---:|---:|---:|
| H01 | 洛恩 | 盾卫 | 1500 | 90 | 65 | 1400 | 65 | 90 |
| H02 | 布兰 | 狂战 | 1150 | 125 | 35 | 900 | 60 | 100 |
| H03 | 米娅 | 火法 | 780 | 155 | 18 | 1450 | 270 | 75 |
| H04 | 诺拉 | 牧师 | 900 | 70 | 25 | 1600 | 250 | 72 |
| H05 | 塔林 | 游侠 | 850 | 120 | 22 | 1000 | 290 | 80 |
| H06 | 乌鸦 | 刺客 | 820 | 145 | 25 | 850 | 55 | 120 |
| H07 | 塞拉 | 冰法 | 800 | 130 | 20 | 1300 | 250 | 76 |
| H08 | 海泽 | 萨满 | 1050 | 105 | 38 | 1200 | 150 | 85 |

初始解锁 H01–H06；默认上阵 H01–H05。

### 8.3 技能定义

所有主动技能自动施放。冷却在 Boss 入场动画完成或单位生成后开始。

#### H01 洛恩

- 主动 `盾角冲击`：冷却 6 秒；对最近敌人造成 180% 攻击伤害，眩晕 1.2 秒。
- 被动 `坚守`：生命低于 40% 时获得 15% 伤害减免。

#### H02 布兰

- 主动 `三段裂击`：冷却 5.5 秒；连续造成 3 次 70% 攻击伤害。
- 被动 `血性`：生命低于 45% 时获得 25% 攻速。

#### H03 米娅

- 主动 `爆燃火球`：冷却 6.5 秒；目标受到 190% 攻击伤害，90 范围内其他敌人受到 90%。
- 被动 `余烬`：每次技能命中使下一次普攻伤害提高 35%。

#### H04 诺拉

- 主动 `晨光治愈`：冷却 5.5 秒；治疗生命百分比最低的友军，治疗量为
  `max(攻击 × 2.6, 目标最大生命 × 12%)`。
- 被动 `余辉`：溢出治疗转为护盾，护盾最多为目标最大生命的 10%。

#### H05 塔林

- 主动 `穿林箭`：冷却 5 秒；目标受到 210% 攻击伤害，目标后方最近敌人受到 100%。
- 被动 `连射节奏`：每 4 次普攻获得 20% 攻速，持续 2.5 秒。

#### H06 乌鸦

- 主动 `影袭处决`：冷却 5.5 秒；突进到最低生命敌人并造成 240% 攻击伤害；
  目标生命低于 35% 时额外提高 80%。
- 被动 `猎残`：优先选择生命百分比最低的敌人。

#### H07 塞拉

- 主动 `霜环`：冷却 6.5 秒；90 范围内敌人受到 150% 攻击伤害并减速 30%，持续 3 秒。
- 被动 `寒意`：被塞拉减速的敌人额外降低 10% 攻速。

#### H08 海泽

- 主动 `跃动雷链`：冷却 5.5 秒；首个目标受到 120% 攻击伤害，最多跳跃 3 次，
  后续每次造成前一次的 75%。
- 被动 `战鼓图腾`：施放技能后，全队获得 10% 攻速，持续 3 秒。

## 9. 装备、掉落与背包

> **对标：** Diablo Immortal（《暗黑破坏神：不朽》）三层结构 + TBH 风多阶品质与件数套装。  
> **详表：** `2026-08-10-equipment-affix-diablo-immortal-design.md`（14 词条、部位矩阵、区间）。  
> **品质 / 套装 / 长线：** `2026-08-10-tbh-grade-and-set-design.md`（**分档底板**：掉落窗 + min/max 品阶 + baseTier；十色；物法可混穿；套装；主线/秘境/每日/爬塔；美术约 240 张一图一件）。

### 9.1 装备位

运行时槽位枚举含 10 槽（主武/副武/头盔/护甲/手套/鞋/戒指/护腕/护符/耳环），
**十槽均有掉落定义**（详见 `2026-08-10-ten-slot-equipment-expansion-design.md`）：

- 旧三槽 `main_weapon` / `armor` / `amulet`：每槽 20 件（Ch1×8 + 区域×4×3）；
- 新七槽：每槽 16 件（每章 4 件）；
- 掉落先均匀抽槽，再抽定义，保证十槽频率接近。

规则：

- 装备带物/法 `school` 分类（筛选/推荐）；**不硬限制穿戴**，可混穿；
- 装备实例具有唯一 ID；
- **同 definition 固定名+图**；品阶仅在该件 `minGrade～maxGrade` 内；低档装（如铁剑）仅前期掉且到不了高品；
- 内容约 **240** 定义（10×2×12），按 `baseTier` 分档；超长主线换代 + 秘境/每日/爬塔（见装备规格 §0 / §2 / §8 美术）；
- 新七槽图标本波为占位复用，正式美术按 §8 一件一图替换。

首版基础装备定义（章节扩展见各区域装备规格）：

| 槽位 | definitionId | 显示名 |
|---|---|---|
| 主武器 | `weapon_guard_blade` | 守望短刃 |
| 主武器 | `weapon_ranger_bow` | 林风短弓 |
| 主武器 | `weapon_oak_staff` | 橡木法杖 |
| 主武器 | `weapon_storm_hammer` | 雷纹短锤 |
| 护甲 | `armor_travel_cloak` | 远行斗篷 |
| 护甲 | `armor_scale_vest` | 青鳞甲衣 |
| 护甲 | `armor_guard_mail` | 守望链甲 |
| 护甲 | `armor_leaf_robe` | 林叶法袍 |
| 护符 | `accessory_leaf_charm` | 新芽护符 |
| 护符 | `accessory_sun_ring` | 晨光指环 |
| 护符 | `accessory_rune_stone` | 古纹石 |
| 护符 | `accessory_wind_feather` | 迅风羽饰 |

同槽位定义只影响名称、图标、`school` 与掉落展示；**同一 definition 可掷全部 10 品阶**；数值由关卡/可选 itemLevel、品质、底座浮动与词条决定。

### 9.2 三层属性模型

| 层 | 对标不朽 | 本项目字段 | 规则 |
|---|---|---|---|
| 底座 | Base Item Damage / Life / Armor | `stats` | 槽位锁类型；数值 = 预算系数 × `[0.85, 1.15]` |
| 词条 | TBH 材料属性轴（掉落随机） | `affixes[]` | 品质定条数；武器/护甲/饰品组池无放回抽取；见 TBH 词条规格 |
| 传奇 | Legendary skill-changing effect | `traitId` | **仅史诗**；按 `definitionId` 固定映射，不随机 |

品质（**完整 10 阶**，详见 `2026-08-10-tbh-grade-and-set-design.md`；下表为摘要）：

| 品质 | 本作名 | 倍率 | 词条数 | 传奇特效 |
|---|---|---:|---:|---|
| common | 凡品 | 1.00 | 0 | 无 |
| uncommon | 良品 | 1.25 | 1 | 无 |
| rare | 珍品 | 1.55 | 2 | 无 |
| epic | 传奇 | 2.00 | 3 | **固定**绑定 `definitionId` |
| immortal | 传世 | 2.55 | 3 | 有 |
| arcane | 灵蕴 | 3.25 | 4 | 有 |
| transcendent | 超然 | 4.10 | 4 | 有 |
| astral | 星穹 | 5.20 | 4 | 有 |
| sacred | 神辉 | 6.60 | 5 | 有 |
| primordial | 混元 | 8.40 | 5 | 有 |

套装：主题具名套装（同套同 `school`），定义挂 `setId`，已装备 2/4/6 件激活 Bonus（与品质并行，不绑死章节）。9 合 1 升品为 Phase B（升 grade，不强制改装备名）。

### 9.3 属性预算与底座

```text
itemBudget = round(12 × 1.18 ^ (stage - 1) × rarityMultiplier)
inherentFactor ∈ [0.85, 1.15]

主武器攻击 = round(itemBudget × inherentFactor)
护甲生命 = round(itemBudget × 8 × inherentFactor)
护甲防御 = round(itemBudget × 0.45 × inherentFactor)
护符：50% 攻击 = round(itemBudget × 0.55 × inherentFactor)
      50% 生命 = round(itemBudget × 3 × inherentFactor)
```

**攻速不再出现在底座随机里**；攻速只作为词条池条目（TBH Attack Speed）。

### 9.4 随机词条（摘要）

实现文件：`src/content/affixes.ts`；规格：`2026-08-11-equipment-affix-tbh-design.md`。

- 共 21 条：TBH 核心（攻/血/防 flat 与 %、攻速、暴击/暴伤、冷却缩减、击中回血、生命偷取、每秒回血、减伤、闪避、格挡、移速、物理/法术伤）+ 普攻伤 / 技能伤；
- 同件装备同类词条不重复；
- 部位按 TBH 武器 / 护甲 / 饰品三组映射十槽；
- 区间相对比例锚定不朽 Bonus Attributes，绝对值按三槽 Demo 缩放。

装备比较分数只用于 UI 推荐：

```text
itemScore =
  attack × 3 +
  maxHp × 0.10 +
  defense × 2 +
  attackSpeedPct × 8 +          // 仅底座遗留攻速（若有）
  Σ(affixValue × affixScoreWeight) +
  traitScore
```

普通/优良无传奇；稀有无传奇分；史诗且有 `traitId` 时 `traitScore = 60`。
真实战斗不读取 `itemScore`；一键换装只比较同槽位分数。

### 9.5 传奇特效（对标不朽 Legendary Power）

> **权威修订：** `2026-08-10-legendary-power-diablo-immortal-alignment.md`  
> 已废除「章节装备稀有/史诗 50% 区域特性」规则。

- 仅 **史诗（epic）** 写入 `traitId`；
- `traitId` 由装备定义固定映射（`getLegendaryTraitId`），同一 `definitionId` 永远同一橘字；
- 稀有及以下只有底座 + 词条；
- 霜咬 / 沙痕 / 雷铭等原「区域特性」改为对应章节装备在史诗时的固定传奇特效；
- 效果数值仍按史诗档（原 epic 高档）结算。

效果一览（史诗触发）：

武器系示例：

- `锐利`：技能伤害 +12%；
- `迅捷`：普攻速度 +12%；
- `处决`：对生命低于 35% 的目标伤害 +18%；
- `霜咬` / `沙痕` / `雷铭`：见各章节装备规格中的战斗效果（现为固定橘字）。

护甲系示例：

- `坚韧`：最大生命 +12%；
- `守护`：每波首次受击获得最大生命 12% 护盾；
- `荆棘`：近战反弹攻击力 12%；
- `雪护` / `蜃护` / `云障`：章节固定传奇。

护符及其他槽：见 `TRAIT_DEFINITIONS` 与 `legendaryPowers.ts`。

### 9.6 掉落

- 普通敌人：18% 装备掉率；
- 精英：100% 掉落 1 件；
- Boss：100% 掉落 1 件，25% 概率额外掉落 1 件；
- 普通敌人金币：`round(5 × stagePower ^ 0.65)`；
- 精英金币：普通敌人的 5 倍；
- Boss 金币：普通敌人的 12 倍。

品质概率：

| 关卡 | 普通 | 优良 | 稀有 | 史诗 |
|---|---:|---:|---:|---:|
| 1–4 | 78% | 20% | 2% | 0% |
| 5–8 | 65% | 28% | 6% | 1% |
| 9–12 | 50% | 35% | 12% | 3% |

### 9.7 背包

- 容量 40；
- 更换装备后旧装备返回背包；
- 背包满时，普通装备自动换算为其预算 4 倍金币；
- 非普通装备进入最多 10 件的溢出区；
- 溢出区满时停止生成装备并显示提示，不吞掉已有装备；
- 支持按品质、槽位和战力排序；
- 支持一键整理和一键为指定英雄装备更高战力物品；
- 缺 `affixes` 时按 `[]` 解析；不做跨版本字段迁移。

## 10. 英雄解锁、商店与离线收益

### 10.1 召唤

- 初始宝石 300；
- 单次召唤 100 宝石；
- 五次召唤 450 宝石；
- 首次有效召唤固定解锁 H07；
- 第二次有效召唤固定解锁 H08；
- 之后抽到已拥有英雄时转为 20 英雄印记；
- 印记在 Demo 中只显示，不继续实现升星；
- 首次通关每关获得 20 宝石；
- 召唤不是商业概率系统，UI 必须标注“Demo 固定解锁序列”。

### 10.2 冒险商店

- 每个本地自然日生成 4 个商品；
- 3 件随机装备使用金币购买；
- 1 个 50 宝石商品使用金币购买；
- 商品品质不超过当前关卡可掉落品质；
- 装备售价为 `round(itemBudget × 25)` 金币；
- 50 宝石售价为 `1200 + highestClearedStage × 120` 金币；
- 已购买商品当日售罄；
- 提供一次免费的手动刷新；
- 不加入付费刷新。

### 10.3 离线收益

- 通关 1-3 后解锁；
- 最短结算 5 分钟；
- 最长结算 8 小时；
- 以历史最高关卡计算：

```text
offlineGoldPerMinute = 20 + highestStage × 12
offlineGearPerHour = min(3, 0.8 + highestStage × 0.12)
```

- 离线装备数量按固定种子随机取整；
- 离线装备品质使用历史最高关卡的品质表，但史诗概率减半；
- 回到前台时先启动战斗，再弹出离线收益弹窗；
- 玩家点击“一键领取”后加入背包和金币；
- 背包溢出遵守同一规则。

## 11. UI 信息架构与交互

### 11.1 固定首页结构

从上至下：

1. 顶栏；
2. Phaser 战场；
3. 五人整块血量姓名板；
4. 当前功能面板；
5. 底部导航。

底部导航固定为：

1. 背包；
2. 商店；
3. 英雄；
4. 关卡。

切换页签不重建 Phaser 场景，不暂停模拟。

### 11.2 顶栏

- 当前关卡；
- 金币与宝石；
- 1× / 2×；
- 设置。

点击货币只显示来源说明，不跳转到付费页面。

### 11.3 姓名血条

- 五块横向排列；
- 整块卡片以填充表现生命；
- 低于 25% 改为珊瑚红；
- 死亡时变暗；
- 显示姓名和技能冷却环；
- 点击任意姓名板进入阵容编辑；
- 长按显示当前属性摘要；
- 不显示坦克、治疗、前排或后排标签。

### 11.4 背包页

- 网格展示完整背包；
- 顶部显示容量、筛选和整理；
- 点击装备打开底部详情表；
- 详情分开展示底座属性、随机词条、特性、战力与换装对比；
- 点击“装备”后打开英雄选择；
- 装备成功显示属性变化和短震动；
- 更强装备使背包页签出现红点。

### 11.5 商店页

- 四个商品卡；
- 显示价格、品质和剩余状态；
- 点击商品打开确认表；
- 金币不足时按钮禁用并说明来源；
- 免费刷新使用后禁用；
- 当日售罄状态可以恢复。

### 11.6 英雄页

- 显示 8 名英雄，未解锁英雄展示剪影和解锁方式；
- 点击英雄进入详情；
- 详情包含属性、等级、装备、主动技能、被动技能；
- 升级按钮显示当前费用和升级后的属性；
- 已满级时按钮替换为“已达上限”；
- 不在英雄页直接修改阵容位置。

### 11.7 关卡页

- 第一章卡显示 12 个关卡的完成状态；
- 已解锁关卡可点击重刷；
- 当前关高亮；
- 锁定关卡显示解锁条件；
- 第二章显示预告与 Demo 完成说明；
- 切换关卡前显示简短确认，确认后立即重置战斗。

### 11.8 阵容编辑

```text
点击姓名板
  → 阵容编辑
  → 点击五个等价位置之一
  → 半屏英雄选择抽屉
  → 选择英雄
  → 保存
  → 重置当前关并应用新阵容
```

- 不允许重复英雄；
- 至少保留 1 名英雄；
- 位置不代表站位；
- 阵容顺序只影响出生时的轻微 `y` 偏移；
- 保存按钮仅在阵容合法且有变化时启用。

### 11.9 召唤

- 从英雄选择抽屉或英雄页进入；
- 全屏覆盖，但战斗模拟继续；
- 关闭后返回原上下文；
- 召唤演出 `1.2–1.8 s`，减弱动效时缩短为 `300 ms`；
- 结果卡显示英雄、职业、攻击距离与技能摘要；
- 新英雄解锁后立即可用于阵容选择。

### 11.10 设置

- 音效开关；
- 减弱动效；
- 清除存档；
- 版本号；
- 清除存档必须二次确认；
- 清除后重新生成默认存档并回到 1-1。

### 11.11 新手引导

首次进入只展示五步：

1. 自动战斗正在进行；
2. 点击姓名板可以更换阵容；
3. 战利品会进入背包；
4. 装备和升级可以突破 Boss；
5. 关卡页可以回刷。

引导不暂停战斗，可跳过，完成状态写入存档。

## 12. SVG 与视觉表现

### 12.1 角色 SVG

- 每名角色是一张完整独立 SVG；
- `viewBox="0 0 128 128"`；
- 1.45–1.65 头身；
- 头部占总高 58%–64%；
- 角色朝右三分之四侧身；
- 两只黑色椭圆眼睛；
- 无嘴、鼻子和眉毛；
- 粗深棕轮廓；
- 4–6 个纯色色块；
- 武器不遮脸；
- 英雄、敌人和 Boss 在 80–120 px 高度仍能识别。

Phaser 将 SVG 加载为静态纹理。运行时动画只变换整张 Sprite；
不得尝试访问 SVG 内部 `<g>` 做肢体动画。

### 12.2 场景

- 天空、远山、地面、道路、前景装饰分层；
- 使用低饱和大色块；
- 背景不包含高频纹理；
- 战斗中心保持低对比；
- Boss 入场才允许短暂暗角。

### 12.3 UI 主题

```css
:root {
  --ink: #3a302b;
  --cream: #f7efd9;
  --paper: #e5dac3;
  --coral: #d96f5f;
  --green: #7f9b63;
  --green-light: #c7d9aa;
  --blue: #78add6;
  --yellow: #f1c85d;
  --purple: #a96fd0;
  --panel-radius: 14px;
  --outline: 3px;
}
```

必须使用明确的游戏字体层级，不使用通用后台管理界面风格。

## 13. 音频

- 第一次用户触摸后解锁 AudioContext；
- 默认音效开启，浏览器拒绝时静默降级；
- 首版至少包含：普攻、命中、技能、治疗、掉落、胜利、失败、按钮；
- 同类音效在 `80 ms` 内合并，避免重叠爆音；
- 页面隐藏时静音；
- 设置中可关闭；
- 不实现背景音乐和配音。

## 14. 存档

### 14.1 类型

```ts
type EquipmentSlot =
  | "main_weapon"
  | "off_hand"
  | "helmet"
  | "armor"
  | "gloves"
  | "boots"
  | "ring"
  | "bracer"
  | "amulet"
  | "earring";
/** 10 阶：见 2026-08-10-tbh-grade-and-set-design.md（凡品→混元） */
type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "immortal"
  | "arcane"
  | "transcendent"
  | "astral"
  | "sacred"
  | "primordial";

type AffixRoll = {
  affixId: string;
  value: number;
};

type InventoryItem = {
  instanceId: string;
  definitionId: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  stage: number;
  stats: Partial<{
    attack: number;
    maxHp: number;
    defense: number;
    attackSpeedPct: number; // legacy only
  }>;
  affixes: AffixRoll[];
  traitId: string | null;
};

type HeroProgress = {
  heroId: string;
  unlocked: boolean;
  level: number;
  marks: number;
  equipment: Record<EquipmentSlot, string | null>;
};
```ts
type EquipmentSlot = "weapon" | "armor" | "accessory";
/** 10 阶：见 2026-08-10-tbh-grade-and-set-design.md（凡品→混元） */
type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "immortal"
  | "arcane"
  | "transcendent"
  | "astral"
  | "sacred"
  | "primordial";

type InventoryItem = {
  instanceId: string;
  definitionId: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  stage: number;
  stats: Partial<{
    attack: number;
    maxHp: number;
    defense: number;
    attackSpeedPct: number;
  }>;
  traitId: string | null;
};

type HeroProgress = {
  heroId: string;
  unlocked: boolean;
  level: number;
  marks: number;
  equipment: Record<EquipmentSlot, string | null>;
};

type ShopOfferState =
  | {
      offerId: string;
      kind: "equipment";
      item: InventoryItem;
      priceGold: number;
      sold: boolean;
    }
  | {
      offerId: string;
      kind: "gems";
      gemAmount: 50;
      priceGold: number;
      sold: boolean;
    };

type SaveDataV1 = {
  version: 1;
  updatedAt: number;
  lastActiveAt: number;
  currentStage: number;
  highestUnlockedStage: number;
  highestClearedStage: number;
  gold: number;
  gems: number;
  summonCount: number;
  roster: Record<string, HeroProgress>;
  party: [string | null, string | null, string | null, string | null, string | null];
  inventory: InventoryItem[];
  overflow: InventoryItem[];
  shop: {
    dateKey: string;
    freeRefreshUsed: boolean;
    offers: ShopOfferState[];
  };
  tutorialCompleted: boolean;
  settings: {
    battleSpeed: 1 | 2;
    soundEnabled: boolean;
    reducedMotion: boolean;
  };
};
```

默认新存档：当前关 `1`、最高解锁关 `1`、最高通关关 `0`、金币 `0`、宝石
`300`、召唤次数 `0`、H01–H06 已解锁、H01–H05 上阵、空背包。

### 14.2 保存规则

- 存档键：`idle-rpg-save-v1`；
- 任何持久变化先更新内存，再进入 500 ms 防抖保存；
- 关卡胜利、页面隐藏和关闭前立即刷新；
- 不保存半场单位与动画，重新打开从当前关第 1 波开始；
- JSON 解析、版本校验或字段修复失败时备份损坏文本并生成默认存档；
- localStorage 不可用时切换内存存档并显示“本次进度无法永久保存”；
- 清除存档必须二次确认。

## 15. 事件和 Action

核心 Action：

```ts
type GameAction =
  | { type: "ui:selectTab"; tab: "inventory" | "shop" | "heroes" | "stages" }
  | { type: "battle:setSpeed"; speed: 1 | 2 }
  | { type: "party:replace"; slot: number; heroId: string | null }
  | { type: "party:save" }
  | { type: "hero:levelUp"; heroId: string }
  | { type: "item:equip"; heroId: string; itemId: string }
  | { type: "stage:select"; stage: number }
  | { type: "shop:buy"; offerId: string }
  | { type: "shop:refresh" }
  | { type: "summon:single" }
  | { type: "summon:five" }
  | { type: "offline:claim" }
  | { type: "settings:update"; patch: Partial<SaveDataV1["settings"]> };
```

核心事件除移动、攻击、伤害、治疗、死亡、波次、胜负和掉落外，还必须包含：

- `skill:started`；
- `skill:resolved`；
- `status:applied`；
- `loot:revealed`；
- `hero:leveled`；
- `item:equipped`；
- `hero:unlocked`；
- `save:failed`。

## 16. 性能、降级与可访问性

- 同屏单位不超过 15；
- 同屏跳字不超过 20；
- 同屏特效不超过 25；
- 模拟单步目标低于 3 ms；
- 首次 JS + CSS 压缩后目标低于 1.5 MB，不含 Phaser；
- 单个 SVG 不超过 80 个可见节点；
- 战斗资产总解码纹理目标低于 32 MB；
- DOM 常驻区域不超过屏幕高度 52%；
- 普通战斗不允许大面积遮挡战场中央；
- `prefers-reduced-motion` 首次启动时映射到减弱动效设置；
- 所有按钮有可见按下、禁用和焦点状态；
- 图标按钮具有 `aria-label`；
- 文字与背景满足可读对比；
- 关键结果不能只依赖颜色表达。

## 17. 调试

访问 `?debug=1` 显示：

- 模拟 FPS、渲染 FPS和单步耗时；
- 当前随机种子；
- 单位坐标、射程、目标和冷却；
- 当前关卡、波次、战斗状态；
- 手动下一波、击杀敌人、击杀全队；
- 增加金币、宝石、装备；
- 解锁英雄；
- 清空或导出存档。

调试工具不得进入普通 UI，也不得改变非调试模式的存档结构。

## 18. 测试与验收

### 18.1 单元测试

必须覆盖：

- 近、中、远程单位进入不同射程后停止；
- 目标死亡后重选；
- 伤害、暴击、护盾和治疗公式；
- 四种状态的应用、刷新和到期；
- 8 个主动技能的目标和结果；
- 8 个被动的触发条件；
- Boss 技能和狂暴；
- 波次、胜利、失败和关卡推进；
- 阵容合法性；
- 升级费用和属性成长；
- 装备预算、底座浮动、词条生成、特性和换装；
- 词条部位限制与品质条数；
- 背包、溢出和自动换金币；
- 掉落概率使用固定种子可复现；
- 召唤固定解锁序列；
- 商店日刷新与购买；
- 离线收益上下限；
- 存档默认值、损坏恢复和防抖。

### 18.2 集成测试

- GameStore Action 只产生一次预期状态变化；
- BattleSnapshot 可以驱动渲染创建、更新和移除单位；
- 事件不会重复播放一次性演出；
- 阵容保存后重置当前关；
- 换装与升级保持当前生命百分比；
- 关卡切换重置战斗；
- 后台恢复不补算战斗，只产生离线收益。

### 18.3 手机 H5 试玩

至少验证：

- 360 × 640；
- 390 × 844；
- 430 × 932；
- 桌面 1440 × 900；
- iOS 风格安全区；
- 单指触控；
- 无 hover 时所有功能可达；
- 首屏 3 秒内开始战斗；
- 连续自动运行 15 分钟无阻塞；
- 1× / 2× 切换；
- 连续推进三关；
- 连续失败三次；
- 完整掉落、装备、升级、换阵容流程；
- 召唤 H07、H08；
- 离线收益领取；
- 刷新页面后恢复；
- 减弱动效；
- WebGL 与 Canvas 回退；
- 无未处理控制台错误。

## 19. 实施里程碑

### 里程碑 0：规格与工程基础

- 固定依赖版本；
- 建立目录、类型、数据和测试环境；
- 建立资产清单、Store、Action、事件、存档和调试壳；
- 建立手机 H5 外壳、Canvas 和 DOM 分层。

### 里程碑 1：完整战斗竖切

- H01–H05；
- E01–E03 与 B01；
- 行走、射程、普攻、受击、死亡；
- 三波、Boss、胜负、重试；
- 完整基础演出和音效；
- 姓名血条、速度、关卡顶栏。

### 里程碑 2：技能与战利品

- 8 名英雄与全部技能；
- E04 与 Boss 技能；
- 掉落、装备生成、背包；
- 胜利与战利品飞入动画；
- 换装与比较。

### 里程碑 3：完整管理 UI

- 四底部页签；
- 商店；
- 英雄详情与升级；
- 关卡选择；
- 阵容编辑与英雄抽屉；
- 召唤；
- 设置和新手引导。

### 里程碑 4：成长、离线与存档

- 12 关数据；
- 成长数值；
- 宝石和英雄解锁；
- 离线收益；
- 存档错误恢复；
- 第二章预告与 Demo 完成状态。

### 里程碑 5：手机打磨与发布

- 响应式、安全区、触控和可访问性；
- 性能和资源压缩；
- 全量自动测试；
- 多尺寸浏览器试玩；
- 生产构建；
- 部署并交付线上 H5。

## 20. 最终验收清单

- [ ] 一章 12 关可以从头推进到 Demo 完成；
- [ ] 8 名英雄均有可见差异和有效技能；
- [ ] 任意合法五人组合都能战斗；
- [ ] 行走、遇怪、普攻、技能、死亡、胜负和掉落表现完整；
- [ ] Boss 有独立入场、技能和狂暴；
- [ ] 装备、背包、换装、比较和溢出有效；
- [ ] 英雄升级和金币消耗有效；
- [ ] H07、H08 可以通过召唤解锁；
- [ ] 商店可以买入和刷新；
- [ ] 离线收益可以领取；
- [ ] 所有 UI 页面和弹层可以完成真实流程；
- [ ] 本地存档稳定；
- [ ] 360 px 宽手机无阻塞；
- [ ] 触控反馈清楚且无 hover 依赖；
- [ ] 连续运行 15 分钟无阻塞；
- [ ] 自动测试通过；
- [ ] 生产构建通过；
- [ ] 线上 H5 地址可访问。
