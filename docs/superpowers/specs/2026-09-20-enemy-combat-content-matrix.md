# 十章敌人战斗内容矩阵

- 版本：1.1
- 日期：2026-09-20
- 状态：完整内容规格，待运行时接入与数值回归
- 适用范围：主线 10 章、30 个区域、120 个关卡
- 内容规模：E01～E120、30 只主线区域 Boss、Normal～Torment 难度技能位
- 系统依据：[敌人战斗差异化系统设计](2026-09-20-enemy-combat-behavior-system-design.md)

## 0. 交付结论

本矩阵把主线敌人内容补齐到配置级：

- 30 个区域均有 `N1 / N2 / N3 / E1 / B1` 五个明确槽位；
- E01～E120 均有基础目标、行为模板、触发参数和战斗读点；
- 30 只主线区域 Boss 均有一个招牌主动与一个 50% 生命阶段；
- 120 关均能由四种区域内关卡模板唯一展开，包含五个小怪遭遇、精英位置、Boss 轮换与随从数量；
- Nightmare、Hell、Torment 分别补到 3、4、5 个 Boss 技能位；
- 普通怪不做 120 套孤立脚本，所有能力来自有限的可复用行为族，差异主要由职责、参数、目标和编队组合产生。

这份文档是内容源，不修改 `src/content/enemies.ts` 中已经存在的基础生命、攻击、防御、攻击间隔、射程、移速、类型与元素。美术轮廓和名称继续以各章节怪物阵容文档为准；战斗行为冲突时以本矩阵为准，第一章更详细的表现与验收仍以系统设计文档第 8 节为准。

## 1. 内容数据口径

### 1.1 固定槽位

| 槽位 | 数量 | 行为预算 | 主职责 |
|---|---:|---|---|
| N1 | 30 | 0 个行为 | 区域基线、让玩家读取新生态 |
| N2 | 30 | 1 个轻行为 | 快攻、突进、游击或目标变化 |
| N3 | 30 | 0～1 个轻行为 | 高防、远程、控制或支援 |
| E1 | 30 | 1 个机制包 | 放大区域机制，必须有预警或状态图标 |
| B1 | 30 | 1 个主动 + 1 个阶段 | 区域记忆点与第二阶段压力 |

每个敌人的配置入口为 `combatProfileId: enemy-<小写ID>`。普通行为模板可以复用；Boss 的 `active.id` 与 `phase.id` 必须唯一。基础普攻不是技能位。

### 1.2 数值记法

- `A`：施法者当前 `attack`。
- `M`：目标 `maxHp`。
- `front1/2/3`：按来源相对方向选择最前方 1/2/3 个对方单位。
- `lowHp`：生命比例最低的单位，并列按稳定单位 ID。
- `DoT 0.10A×3/1s`：每秒一次、共 3 次，每跳造成 `0.10 × attack`。
- `shield 12%M`：以受益者最大生命为基准的护盾。
- 所有百分比状态沿用同类取最大值，不相加。

### 1.3 基础目标契约

除表内写明外，全部敌人使用 `frontmostEnemy`，移动与普攻共享 `targetId`，目标死亡后才重新获取。`low-hp-hunter` 在入场时选取 `lowestHpEnemy` 并锁定到目标死亡；不会每帧追逐新的最低血量单位。主动技能在读条开始时保存目标快照，目标死亡则跳过，不随机转移。

## 2. 可复用行为族

| 行为 ID | 适用 | 默认语义 | 参数边界 |
|---|---|---|---|
| `baseline` | N1/N3 | 仅普攻，职责完全来自基础属性和射程 | 无触发器 |
| `cadence-strike` | N2 | 每第 4 次成功普攻追加一次伤害 | `0.30～0.40A` |
| `opening-strike` | N2 | 入场后第一次成功普攻强化 | 本次总倍率 `1.25～1.30A` |
| `shell-guard` | N3 | 首次生命降至 50% 时短时减伤 | `18% / 3s` |
| `cadence-slow` | N2/N3 | 每第 4 次成功普攻给同一目标减速 | `15%～22% / 1.5～2s` |
| `low-hp-hunter` | N2/N3 | 入场锁定最低生命比例对手，目标死亡后重选 | 不附加额外伤害 |
| `split-hit` | N2/N3 | 每第 4 次普攻给第二个前排目标追加伤害 | `0.30～0.35A` |
| `cadence-break` | N3 | 每第 4 次普攻施加破甲 | `10%～12% / 2～2.5s` |
| `cadence-expose` | N3 | 每第 4 次普攻施加易伤 | `8%～10% / 2s` |
| `periodic-wound` | N2/N3 | 每第 4 次普攻施加三跳持续伤害 | 每跳 `0.10～0.12A` |
| `death-burst` | N3 | 死亡时对前排单体造成一次可见余烬伤害 | `0.35A` |
| `ally-mend` | N3 | 每第 5 次普攻治疗最低血受伤友军 | `0.45A`，不超过目标 `8%M` |
| `self-shield` | N3/E1 | 每第 5 次普攻或一次生命阈值获得护盾 | `10%～12%M`，存在时不重叠 |
| `ally-shield` | E1 | 每第 6 次普攻给自己与/或低血友军护盾 | 每个目标 `10%～12%M` |
| `ally-guard` | E1 | 每第 6 次普攻给自己与/或低血友军减伤 | `12%～15% / 2.5s` |
| `team-haste` | E1 | 每第 6 次普攻给自己和最多两名友军加速 | `12%～14% / 2.5s` |
| `elite-control` | E1 | 每第 5 次普攻后读条，对单体施加短控 | 准备 `700ms`；stun `600ms` |
| `elite-sweep` | E1 | 独立计时读条，对前 2～3 名造成伤害并可附带短减速 | `0.55～0.65A`；准备 `700～800ms`；周期 `6～7s` |
| `elite-guard` | E1 | 攻击计数后提供短时自保或小队保护 | 减伤 `15%～22%` 或护盾 `10%～12%M` |
| `elite-rally` | E1 | 攻击计数后给最多三名敌方单位一个团队增益 | 单次只提供一种增益 |
| `elite-summon` | E1 | 首次生命降至 50% 时召唤一个基础随从 | 每场一次；场上最多一个 |

`elite-control`、`elite-sweep` 和所有 Boss 主动在准备期间停止普攻；死亡或 stun 会取消。普通怪的计数行为不额外读条，只显示一次短预兆。持续伤害、友军治疗、友军目标、召唤和多目标选择按系统设计的 P1/P2 顺序接入。

## 3. 120 关投放模板

### 3.1 四种区域内关卡

每个区域四关固定使用以下模板。五个小怪遭遇数量始终为 `3 / 4 / 5 / 5 / 6`。

| 模板 | 区域内位置 | W1 | W2 | W3 | W4 | W5 | 精英 | Boss 随从 |
|---|---:|---|---|---|---|---|---|---:|
| A 教学 | 第 1 关 | `N1×2 + N2` | `N1×2 + N2×2` | `N1×2 + N2×3` | `N1×3 + N2×2` | `N1×3 + N2×3` | 无 | 0 |
| B 扩展 | 第 2 关 | `N2 + N1×2` | `N1×2 + N2 + N3` | `N1 + N2×2 + N3×2` | `N1×2 + N2 + N3×2` | `N1×2 + N2×2 + N3×2` | 无 | 1 |
| C 精英教学 | 第 3 关 | `N3 + N1 + N2` | `N1×2 + N2 + N3` | `N1 + N2×2 + N3×2` | `N1×2 + N2 + N3×2` | `E1 + N1 + N2×2 + N3×2` | W5 | 1 |
| D 区域考试 | 第 4 关 | `N1×2 + N2` | `N1 + N2×2 + N3` | `N1 + N2×2 + N3×2` | `E1 + N1 + N2 + N3×2` | `N1×2 + N2×2 + N3×2` | W4 | 2 |

种子只改变同槽单位的出生顺序、垂直偏移和同职责单位的排列，不改变职责计数。W3 或 W5 可用 15% 概率把一个重复的 N1 替换为相邻区域的 N1/N2；不能替换锚点、不能跨章、不能带入相邻区域 N3 或精英。

### 3.2 三只 Boss 的章内轮换

每章三只主线 Boss 记为 `B-R1 / B-R2 / B-R3`：

- 第一区域四关：`B-R1 → B-R2 → B-R3 → B-R1`；
- 第二区域四关：`B-R2 → B-R3 → B-R1 → B-R2`；
- 第三区域四关：`B-R3 → B-R1 → B-R2 → B-R3`。

因此第 4、8、12 关始终由所属区域 Boss 收尾；其余关让玩家在同章内复习另外两只 Boss。D 模板只应用 `finale` 参数：首次主动冷却减少 10%、不低于 4500ms，技能数量和目标规则不变。

### 3.3 30 个区域的唯一展开表

下表每一行展开为 A/B/C/D 四关，合计恰好覆盖 120 关。

| 章节区域 | 关卡 | N1 / N2 / N3 / E1 | 本区 B1 | 四关 Boss 顺序 |
|---|---|---|---|---|
| C01-R01 林地草甸 | 1-1～1-4（1～4） | E01 / E02 / E03 / E04 | B04 | B04 / B08 / B12 / B04 |
| C01-R02 幽深森林 | 1-5～1-8（5～8） | E05 / E06 / E07 / E08 | B08 | B08 / B12 / B04 / B08 |
| C01-R03 古碑遗迹 | 1-9～1-12（9～12） | E09 / E10 / E11 / E12 | B12 | B12 / B04 / B08 / B12 |
| C02-R01 冻土前哨 | 2-1～2-4（13～16） | E13 / E14 / E15 / E16 | B16 | B16 / B20 / B24 / B16 |
| C02-R02 雪松幽林 | 2-5～2-8（17～20） | E17 / E18 / E19 / E20 | B20 | B20 / B24 / B16 / B20 |
| C02-R03 极光遗迹 | 2-9～2-12（21～24） | E21 / E22 / E23 / E24 | B24 | B24 / B16 / B20 / B24 |
| C03-R01 赤沙驿道 | 3-1～3-4（25～28） | E25 / E26 / E27 / E28 | B28 | B28 / B32 / B36 / B28 |
| C03-R02 风蚀峡谷 | 3-5～3-8（29～32） | E29 / E30 / E31 / E32 | B32 | B32 / B36 / B28 / B32 |
| C03-R03 沉沙古城 | 3-9～3-12（33～36） | E33 / E34 / E35 / E36 | B36 | B36 / B28 / B32 / B36 |
| C04-R01 云崖高原 | 4-1～4-4（37～40） | E37 / E38 / E39 / E40 | B40 | B40 / B44 / B48 / B40 |
| C04-R02 风暴峡谷 | 4-5～4-8（41～44） | E41 / E42 / E43 / E44 | B44 | B44 / B48 / B40 / B44 |
| C04-R03 苍雷要塞 | 4-9～4-12（45～48） | E45 / E46 / E47 / E48 | B48 | B48 / B40 / B44 / B48 |
| C05-R01 黑水浅滩 | 5-1～5-4（49～52） | E49 / E50 / E51 / E52 | B52 | B52 / B56 / B60 / B52 |
| C05-R02 沉舟泥沼 | 5-5～5-8（53～56） | E53 / E54 / E55 / E56 | B56 | B56 / B60 / B52 / B56 |
| C05-R03 雾苇沼心 | 5-9～5-12（57～60） | E57 / E58 / E59 / E60 | B60 | B60 / B52 / B56 / B60 |
| C06-R01 焦土边原 | 6-1～6-4（61～64） | E61 / E62 / E63 / E64 | B64 | B64 / B68 / B72 / B64 |
| C06-R02 余烬裂谷 | 6-5～6-8（65～68） | E65 / E66 / E67 / E68 | B68 | B68 / B72 / B64 / B68 |
| C06-R03 烬岩荒城 | 6-9～6-12（69～72） | E69 / E70 / E71 / E72 | B72 | B72 / B64 / B68 / B72 |
| C07-R01 盐雾礁滩 | 7-1～7-4（73～76） | E73 / E74 / E75 / E76 | B76 | B76 / B80 / B84 / B76 |
| C07-R02 浪蚀岩岸 | 7-5～7-8（77～80） | E77 / E78 / E79 / E80 | B80 | B80 / B84 / B76 / B80 |
| C07-R03 潮蚀遗垒 | 7-9～7-12（81～84） | E81 / E82 / E83 / E84 | B84 | B84 / B76 / B80 / B84 |
| C08-R01 枯风荒丘 | 8-1～8-4（85～88） | E85 / E86 / E87 / E88 | B88 | B88 / B92 / B96 / B88 |
| C08-R02 旧战坡地 | 8-5～8-8（89～92） | E89 / E90 / E91 / E92 | B92 | B92 / B96 / B88 / B92 |
| C08-R03 丘墓禁地 | 8-9～8-12（93～96） | E93 / E94 / E95 / E96 | B96 | B96 / B88 / B92 / B96 |
| C09-R01 牙峰山麓 | 9-1～9-4（97～100） | E97 / E98 / E99 / E100 | B100 | B100 / B104 / B108 / B100 |
| C09-R02 晶脉矿谷 | 9-5～9-8（101～104） | E101 / E102 / E103 / E104 | B104 | B104 / B108 / B100 / B104 |
| C09-R03 石牙天脊 | 9-9～9-12（105～108） | E105 / E106 / E107 / E108 | B108 | B108 / B100 / B104 / B108 |
| C10-R01 霜旗前哨 | 10-1～10-4（109～112） | E109 / E110 / E111 / E112 | B112 | B112 / B116 / B120 / B112 |
| C10-R02 关墙雪道 | 10-5～10-8（113～116） | E113 / E114 / E115 / E116 | B116 | B116 / B120 / B112 / B116 |
| C10-R03 北风王关 | 10-9～10-12（117～120） | E117 / E118 / E119 / E120 | B120 | B120 / B112 / B116 / B120 |

### 3.4 章节编队偏置

A/B/C/D 仍是唯一基础模板，每章只增加一条轻量偏置，不另建 30 套波次脚本。偏置只替换重复槽位，不改变 `3 / 4 / 5 / 5 / 6` 数量，也不增加单位行为。

| 章节 | 轻量偏置 | 玩家主要感受 |
|---:|---|---|
| 1 | 使用标准模板 | 学习基础职责 |
| 2 | W3/W5 至少保留一个 N3，但同波 N3 不超过 2 | 减速与易伤需要清洁/续航 |
| 3 | W1/W3 各保证一个 N2，破甲怪同波不超过 2 | 承受开场压力后处理破甲窗口 |
| 4 | W3 保证 N2+N3，团队加速精英同波不带两个 N2 | 快攻与链式压力明显但不瞬间爆发 |
| 5 | 治疗型 N3 同波最多 1 个，W5 必出现一次 | 形成清晰的治疗者处理题 |
| 6 | `death-burst` 单位同波最多 1 个 | 有击杀顺序压力但不产生连锁爆炸 |
| 7 | 友军护盾来源同波最多 1 个 | 形成破盾窗口，不堆叠护盾墙 |
| 8 | 召唤来源同波最多 1 个 | 清理增援，不出现召唤海 |
| 9 | 护甲/护盾来源同波最多 1 个，破甲怪 W5 必出现 | 让破甲与护甲段形成对照 |
| 10 | W3 固定 N2+N3，W5 保持三种普通职责齐全 | 复习前九章，不引入新规则 |

## 4. 第一至第五章内容配置

表内“第 N 击”均指第 N 次成功普攻命中。精英独立计时从单位正式进入战斗状态后开始。

### 4.1 第一章：青丘林地——基础战斗词汇

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E01 嫩枝精 | N1 均衡近战 | front1 | `baseline` | 无技能图标；用于对照功能怪 |
| E02 红帽菌兽 | N2 快攻 | front1 | `cadence-strike`：第 4 击追加 `0.35A` | 红帽闪光；前排承伤与尽快击杀均有效 |
| E03 灰壳甲虫 | N3 高生命前排 | front1 | `shell-guard`：首次 50% 生命获得 `18% DR / 3s` | 壳片闭合；持续输出和破甲降低窗口损失 |
| E04 老桩卫 | E1 周期减伤 | self | `elite-guard`：第 4 击获得 `20% DR / 2s` | 树皮收紧；不与第二只减伤精英同场 |
| E05 荆棘獾 | N1 快速接敌 | front1 | `baseline`；依靠现有移速先接触前排 | 棘刺亮边但无技能图标；与 E06/E07 的行为形成对照 |
| E06 苔背蛙 | N2 节奏减速 | 当前目标 | `cadence-slow`：第 4 击施加 `slow 18% / 1.5s` | 苔泥短弧；清洁或缩短其存活时间 |
| E07 暮翼蝠 | N3 后排游击 | lowHp 锁定 | `low-hp-hunter`：无额外伤害 | 目标显示蝠翼标记；全队血线与治疗质量决定压力 |
| E08 盘根卫 | E1 单体短控 | front1 | `elite-control`：第 5 击后准备 `700ms`，stun `600ms` | 藤结读条；自动 stun 可取消 |
| E09 雾松灵 | N1 均衡近战 | front1 | `baseline` | 第三区域低压识别点 |
| E10 缚藤兽 | N2 短时牵制 | 当前目标 | `cadence-slow`：第 4 击施加 `slow 22% / 2s` | 双藤合拢；不与 E08 固定同波 |
| E11 碎碑傀 | N3 高防前排 | front1 | `baseline` | 职责来自现有高防；破甲有效 |
| E12 雾钟灵 | E1 周期护盾 | self | `self-shield`：第 5 击获得 `12%M`，存在时不重叠 | 环形声纹与护盾值；正常伤害即可削减 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B04 风帆蜥 | `b04-sail-sweep`：front3 各 `1.15A`，slow `25% / 2.2s` | 首次 5s，CD 4.5s，准备 800ms | `b04-tailwind`：永久 haste 15% | 背帆展开与扇形边缘；前排、治疗、自动控制 |
| B08 碑背巨蜥 | `b08-stone-tail`：front2 各 `1.20A`，自身 `20% DR / 2.4s` | 首次 5.5s，CD 5.2s，准备 900ms | `b08-petrify`：永久 DR 15%，与主动取较高值 | 两道石痕；持续输出和破甲 |
| B12 碑翼古鸮 | `b12-wing-pressure`：front3 各 `1.25A`，slow `22% / 2s` | 首次 5s，CD 4.8s，准备 800ms | `b12-echo`：永久 haste 18% | 三个目标圈；稳定治疗或高爆发缩短第二段 |

### 4.2 第二章：霜风谷——减速与易伤

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E13 雪耳兔 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E14 冰腹鼬 | N2 快速霜缓 | 当前目标 | `cadence-slow`：第 4 击 slow `15% / 1.5s` | 冰腹亮起；低强度、不可锁死 |
| E15 冻壳蜗 | N3 高防减速 | 当前目标 | `cadence-slow`：第 4 击 slow `20% / 2s` | 冻壳吐出霜线；破甲与清洁有效 |
| E16 霜角牦 | E1 卸力冲压 | 当前目标与 self | `elite-guard`：第 5 击使目标 slow `25% / 2s`，自身 `18% DR / 2.2s` | 钝角压低；用减速表达冲压，不改变站位 |
| E17 松果鼠 | N1 基础远程 | nearest | `baseline` | 射程本身形成差异 |
| E18 雾翅蛾 | N2 低血游击 | lowHp 锁定 | `low-hp-hunter` | 宽翼标记目标；治疗保护残血成员 |
| E19 冰芽鹿 | N3 霜露支援 | 当前目标 | `cadence-expose`：第 4 击 vulnerability `8% / 2s` | 双角结霜；清洁可移除 |
| E20 霜丝蛛 | E1 束缚护体 | front1 与 self | `elite-control`：第 5 击后准备 700ms，stun `600ms`，自身 `18% DR / 2s` | 丝圈收紧；短控与减伤是一个机制包 |
| E21 霜环雪獾 | N1 均衡前排 | front1 | `baseline` | 霜环仅作轮廓，不是隐藏光环 |
| E22 辉带岩蜥 | N2 快速分裂攻击 | front1+front2 | `split-hit`：第 4 击对第二目标追加 `0.30A` | 背带亮起；双前排分摊压力 |
| E23 冻纹龟 | N3 护卫 | self | `shell-guard`：首次 50% 生命获得 `18% DR / 3s` | 冻纹闭合；破甲有效 |
| E24 冰脊豪猪 | E1 周期减伤 | self | `elite-guard`：第 5 击获得 `22% DR / 2.5s` | 背脊外张；不实现反伤 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B16 雪岭眠熊 | `b16-snowhill-crush`：front2 各 `1.30A`，slow `25% / 2.5s` | 首次 5.4s，CD 5s，准备 900ms | `b16-snow-shed`：永久 DR 18% | 双掌锁定两名前排；破甲和持续输出 |
| B20 霜鬃猞猁 | `b20-frost-flurry`：front2 各命中两次 `0.68A` | 首次 5.2s，CD 4.8s，准备 800ms | `b20-hunt-rhythm`：永久 haste 18% | 两段爪痕间隔 250ms；治疗要覆盖连续伤害 |
| B24 极光冠鸮 | `b24-aurora-featherfall`：front3 各 `1.20A`，vulnerability `10% / 2.5s` | 首次 5.6s，CD 5.2s，准备 900ms | `b24-aurora-echo`：获得一次 `18%M` shield | 三条极光羽带；清洁易伤或提高群体续航 |

### 4.3 第三章：赤沙荒地——首击与破甲

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E25 沙耳狐 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E26 疾足沙鸵 | N2 快速突入 | front1 | `opening-strike`：第一次普攻总倍率 `1.25A` | 起跑扬沙；前排承接 |
| E27 砂钳蝎 | N3 破甲 | 当前目标 | `cadence-break`：第 4 击 armorBreak `12% / 2.5s` | 双钳合击；清洁可移除 |
| E28 驿甲犀 | E1 冲锋卸力 | front1 与 self | 第 5 击后准备 700ms，追加 `0.70A`，自身 `18% DR / 2.2s` | 鼻角贴地；不产生实时位移 |
| E29 层甲犰狳 | N1 均衡前排 | front1 | `baseline` | 基础防御承担职责 |
| E30 疾足走鹃 | N2 低血游击 | lowHp 锁定 | `low-hp-hunter` | 尾羽指向目标；无额外爆发 |
| E31 裂风颚兽 | N3 远程风压 | 当前目标 | `cadence-slow`：第 4 击 slow `15% / 1.5s` | 颈侧风孔张开 |
| E32 峡脊鬣狗 | E1 范围易伤 | front2 | 第 5 击后准备 700ms，对 front2 各 `0.55A` 并施加 vulnerability `10% / 2s` | 背鬃竖起；群体治疗与清洁 |
| E33 砂掌灵猫 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E34 铜翼幼龙 | N2 快速远程 | front1+front2 | `split-hit`：第 4 击对第二目标追加 `0.30A` | 翼缘闪动；双前排分摊 |
| E35 拱背砂鳄 | N3 高防护卫 | self | `shell-guard`：首次 50% 生命获得 `18% DR / 3s` | 拱背闭合 |
| E36 拱盾兽 | E1 群体护卫 | self+lowHp allies | `ally-guard`：第 6 击给自己和最多两名低血友军 `15% DR / 2.5s` | 拱盾展开；范围输出可降低保护收益 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B28 双丘巨驼 | `b28-dune-pressure`：front3 各 `1.15A`，armorBreak `12% / 2.5s` | 首次 5.2s，CD 4.9s，准备 850ms | `b28-hot-stride`：永久 haste 15% | 双峰起伏与沙浪；清洁破甲 |
| B32 风蚀盘羊 | `b32-horn-combo`：front2 各命中两次 `0.72A`，末击 slow `15% / 1.5s` | 首次 5.4s，CD 5s，准备 850ms | `b32-second-wind`：永久 haste 15% | 两段角痕；治疗覆盖双击 |
| B36 王庭拱背兽 | `b36-court-quake`：front3 各 `1.25A` | 首次 5.6s，CD 5.2s，准备 950ms | `b36-royal-guard`：永久 DR 18% | 地面三段砂纹；破甲与持续输出 |

### 4.4 第四章：雷崖高地——攻速窗口与链式伤害

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E37 风耳跳兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E38 云帆走兽 | N2 快攻 | 当前目标 | `cadence-strike`：第 4 击追加 `0.35A` | 背帆短闪 |
| E39 白岩甲虫 | N3 高防护卫 | self | `shell-guard`：首次 50% 生命获得 `18% DR / 3s` | 白壳闭合 |
| E40 云脊角兽 | E1 群体减伤 | self+lowHp allies | `ally-guard`：第 6 击给自己和最多两名友军 `12% DR / 2.5s` | 横角连出风幕 |
| E41 风切岩兽 | N1 远程风刃 | nearest | `baseline` | 射程形成基础差异 |
| E42 雷尾迅兽 | N2 高频追击 | 当前目标 | `cadence-strike`：第 4 击追加 `0.40A` | 分叉尾短闪 |
| E43 暴风绒蛾 | N3 减速扰乱 | 当前目标 | `cadence-slow`：第 4 击 slow `18% / 1.8s` | 翼面风纹扩散 |
| E44 风暴翼龙 | E1 范围风压 | front3 | `elite-sweep`：每 6.5s 准备 750ms，各 `0.55A` 并 slow `15% / 1.5s` | 三道风线；群体治疗 |
| E45 塔冠跃兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E46 铜足疾鸟 | N2 首击突进 | front1 | `opening-strike`：第一次普攻总倍率 `1.25A` | 铜足扬起 |
| E47 白壁盾龟 | N3 高防护卫 | self | 首次 50% 生命获得 `12%M` shield | 壳缘出现浅蓝护盾值 |
| E48 导风甲兽 | E1 群体加速 | self+lowHp allies | `team-haste`：第 6 击给自己和最多两名友军 haste `14% / 2.5s` | 导风板亮起；范围输出优先清随从 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B40 云冠狮鹫 | `b40-cloud-quake`：front2 各 `1.35A`，slow `18% / 1.8s` | 首次 5.1s，CD 4.8s，准备 850ms | `b40-dive-rhythm`：永久 haste 18% | 两个巨掌阴影；双前排与自动控制 |
| B44 雷羽巨枭 | `b44-thunder-chain`：front1 `1.15A`，其后两个目标各 `0.55A` | 首次 5.2s，CD 4.8s，准备 850ms | `b44-storm-tempo`：永久 haste 18% | 三段雷线按目标顺序亮起 |
| B48 苍雷守卫 | `b48-azure-dive`：锁定 lowHp 目标，造成 `1.45A` | 首次 5.5s，CD 5.1s，准备 900ms | `b48-wing-shield`：获得一次 `20%M` shield | 盾翼指向目标并显示雷标；治疗和护盾保护残血成员 |

### 4.5 第五章：黑水湿地——持续伤害与治疗

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E49 沼冠伏兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E50 苇尾泥蜥 | N2 快速毒击 | 当前目标 | `periodic-wound`：第 4 击施加 DoT `0.10A×3/1s` | 尾端滴落三格泥毒 |
| E51 浮壳钳虫 | N3 高防护卫 | self | 首次 50% 生命获得 `12%M` shield | 浮壳闭合；持续伤害仍可削盾 |
| E52 黑水钳兽 | E1 夹击定身 | front1 | `elite-control`：第 5 击后准备 700ms，stun `600ms` | 双钳合拢；自动 stun 可取消 |
| E53 沉舟骨卒 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E54 沉泥骨手 | N2 远程腐蚀 | 当前目标 | `periodic-wound`：第 4 击施加 DoT `0.12A×3/1s` | 泥罐破裂 |
| E55 锚盾骨卫 | N3 高防护卫 | self | `shell-guard`：首次 50% 生命获得 `18% DR / 3s` | 锚盾抬起 |
| E56 舟脊骨尉 | E1 横扫护体 | front2 与 self | 每 6.5s 准备 750ms，对 front2 各 `0.55A`，自身 `20% DR / 2.5s` | 船肋肩架展开 |
| E57 雾苇潜兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E58 雾幕绒蛾 | N2 远程扰乱 | 当前目标 | `cadence-slow`：第 4 击 slow `18% / 1.8s` | 雾翼覆盖目标脚下 |
| E59 苔甲盘兽 | N3 低频治疗 | lowHp ally | `ally-mend`：第 5 击治疗 `0.45A`，上限目标 `8%M`；无受伤友军则跳过 | 苔甲滴落绿色水珠；压制治疗者存活时间 |
| E60 沼心角兽 | E1 冲压减速 | front2 | `elite-sweep`：第 5 击后准备 700ms，各 `0.55A` 并 slow `20% / 2s` | 横角压低与泥浪线 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B52 黑水铠鳄 | `b52-mudwave-crush`：front2 各 `1.25A`，附 DoT `0.10A×3/1s` | 首次 5.3s，CD 5s，准备 900ms | `b52-low-armor`：永久 DR 18% | 两道宽泥浪；双前排与持续治疗 |
| B56 沉舟骨舵主 | `b56-helmblade-sweep`：front3 各 `1.25A` | 首次 5.4s，CD 5s，准备 900ms | `b56-rally`：自己和存活随从永久 haste 15% | 舵刃半圆预警；范围输出先清随从可削弱阶段收益 |
| B60 雾苇沼龙 | `b60-mist-tide`：锁定 lowHp 目标，造成 `1.05A` 并附 DoT `0.12A×3/1s` | 首次 5.2s，CD 4.8s，准备 850ms | `b60-marsh-hunt`：永久 haste 18% | 苇鳍指向低血目标；单体治疗和护盾更重要 |

## 5. 第六至第十章内容配置

### 5.1 第六章：燃烧荒地——灼烧与死亡余烬

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E61 焦背掘兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E62 炭鳍跃兽 | N2 快速灼击 | 当前目标 | `periodic-wound`：第 4 击施加 burn `0.12A×3/1s` | 炭鳍依次亮三段 |
| E63 渣壳钳虫 | N3 死亡余烬 | front1 | `death-burst`：死亡时造成 `0.35A`，无暴击 | 壳缝先亮后熄；保持前排血线即可 |
| E64 枯根角兽 | E1 冲压减速 | front2 | `elite-sweep`：第 5 击后准备 700ms，各 `0.55A` 并 slow `20% / 2s` | 焦根角贴地；不产生实时位移 |
| E65 孔背岩兽 | N1 远程火屑 | nearest | `baseline` | 射程承担基础差异 |
| E66 裂尾疾兽 | N2 首击突进 | front1 | `opening-strike`：第一次普攻总倍率 `1.30A` | 双尾合拢后冲出 |
| E67 冷渣甲蛾 | N3 减速扰乱 | 当前目标 | `cadence-slow`：第 4 击 slow `18% / 1.8s` | 冷渣粉尘圈 |
| E68 炉脊锤兽 | E1 范围压制 | front3 | `elite-sweep`：每 6.5s 准备 750ms，各 `0.55A` | 三个落锤圈；群体治疗 |
| E69 烬炉地精 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E70 灰刃斥候 | N2 低血游击 | lowHp 锁定 | `low-hp-hunter` | 目标显示灰刃标记；治疗保护残血成员 |
| E71 炉罐投手 | N3 范围灼烧 | front2 | 第 5 击投罐，对 front2 各造成 `0.30A` 并附 burn `0.08A×3/1s` | 地面两个灰烬圆；总伤害受普通怪上限约束 |
| E72 黑铁监工 | E1 锤击护卫 | front3 与 lowHp allies | 每 6.5s 准备 800ms，对 front3 各 `0.55A`，随后给自己和最多两名友军 `12% DR / 2.5s` | 方锤落地后肩架闭合 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B64 焦原楔兽 | `b64-scorched-crush`：front2 各 `1.30A`，附 burn `0.10A×3/1s` | 首次 5.3s，CD 5s，准备 900ms | `b64-baked-armor`：永久 DR 18% | 两道焦痕；双前排、续航与破甲 |
| B68 黯脉壳龙 | `b68-vein-quake`：front3 各 `1.25A`，附 burn `0.08A×3/1s` | 首次 5.2s，CD 4.9s，准备 900ms | `b68-rift-hunt`：永久 haste 18% | 三层甲片依次震动 |
| B72 烬炉督军 | `b72-furnace-hammer`：front1 造成 `1.55A` | 首次 5.4s，CD 5s，准备 950ms | `b72-war-order`：自己和存活随从永久 haste 18% | 单个大型炉锤圆；主坦承压，先清随从可降低号令收益 |

### 5.2 第七章：暗潮海岸——护盾与直线压力

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E73 盐甲钳兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E74 潮鳍跃兽 | N2 首击游击 | front1 | `opening-strike`：第一次普攻总倍率 `1.30A` | 双鳍向后收拢 |
| E75 盐喙喷兽 | N3 直线喷射 | front1+front2 | `split-hit`：第 4 击对第二目标追加 `0.30A` | 喙前形成一条盐雾线 |
| E76 礁盾驮兽 | E1 双目标护盾 | self+lowHp ally | `ally-shield`：第 6 击给自己和一名最低血友军各 `10%M`，存在时不重叠 | 双肩礁盾闭合；范围输出削减双方护盾 |
| E77 蚀岸颚兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E78 裂鳍疾兽 | N2 低血游击 | lowHp 锁定 | `low-hp-hunter` | 裂鳍标记目标；治疗改变威胁 |
| E79 潮幕甲蛾 | N3 远程扰乱 | 当前目标 | `cadence-slow`：第 4 击 slow `18% / 1.8s` | 潮幕落在脚下 |
| E80 岸脊锤兽 | E1 范围压制 | front3 | `elite-sweep`：每 6.5s 准备 750ms，各 `0.55A` 并 slow `15% / 1.5s` | 礁锤三段预警 |
| E81 潮垒兽卒 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E82 盐刃掠手 | N2 高频追击 | 当前目标 | `cadence-strike`：第 4 击追加 `0.40A` | 双钩刃交叉闪光 |
| E83 礁盘投手 | N3 分裂投掷 | front1+front2 | `split-hit`：第 4 击对第二目标追加 `0.35A` | 礁盘分为两道轨迹 |
| E84 沉甲护卫 | E1 小队护盾 | lowHp allies | `ally-shield`：第 6 击给两名最低血友军各 `10%M`；不足两名时只给现有目标 | 圆盾依次投出浅蓝轮廓 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B76 盐冠礁王 | `b76-saltcrown-crush`：front2 各 `1.30A`，自身获得 `12%M` shield | 首次 5.4s，CD 5.1s，准备 900ms | `b76-close-armor`：永久 DR 18% | 额板落下；破甲与稳定削盾 |
| B80 断潮壳龙 | `b80-tidebreak-quake`：front3 各 `1.25A`，slow `18% / 1.8s` | 首次 5.2s，CD 4.9s，准备 900ms | `b80-riptide-hunt`：永久 haste 18% | 壳鳍展开形成三条潮线 |
| B84 潮垒酋领 | `b84-tidewall-hammer`：front1 造成 `1.55A` | 首次 5.4s，CD 5s，准备 950ms | `b84-wall-order`：自己和存活随从各获得一次 `12%M` shield | 单个重锤圆；主坦承压，范围输出先清随从 |

### 5.3 第八章：哀嚎丘陵——有限召唤与集结

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E85 枯冠掘兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E86 风尾跃怪 | N2 首击突进 | front1 | `opening-strike`：第一次普攻总倍率 `1.30A` | 重尾后摆 |
| E87 灰喙鸣兽 | N3 远程压制 | 当前目标 | `cadence-expose`：第 4 击 vulnerability `10% / 2s` | 鸣腔扩张；清洁可移除 |
| E88 荒丘甲卫 | E1 护卫 | self+lowHp ally | `ally-guard`：第 6 击给自己和最低血友军 `15% DR / 2.5s` | 双肩甲并拢 |
| E89 残矛骨卒 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E90 灰瓮骨手 | N2 远程余烬 | 当前目标 | `periodic-wound`：第 4 击施加 DoT `0.12A×3/1s` | 灰瓮破裂 |
| E91 旧盾骨卫 | N3 高防护卫 | self | `shell-guard`：首次 50% 生命获得 `20% DR / 3s` | 旧盾抬起 |
| E92 残旗骨尉 | E1 一次集结 | self | `elite-summon`：首次 50% 生命召唤一个 `grave-squire` | 残旗展开 900ms；随从为 E89 的 50% HP、45% attack，仅普攻 |
| E93 石趾伏兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E94 环角疾兽 | N2 低血穿插 | lowHp 锁定 | `low-hp-hunter` | 断环标记目标 |
| E95 墓门偶卫 | N3 周期格挡 | self | `self-shield`：第 5 击获得 `12%M`，存在时不重叠 | 双盾臂闭合 |
| E96 断拱石将 | E1 范围震击 | front3 | `elite-sweep`：每 6.5s 准备 800ms，各 `0.60A` 并 slow `15% / 1.5s` | 半拱投下三段阴影 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B88 枯风角王 | `b88-witherhorn-sweep`：front2 各 `1.35A`，slow `18% / 1.8s` | 首次 5.2s，CD 4.9s，准备 900ms | `b88-hill-call`：召唤两个 `hill-whelp` | 双角锁定两名前排，随后出现两个入口；幼兽各为 E85 的 45% HP、40% attack，仅普攻 |
| B92 旧战骨将 | `b92-shieldline-sweep`：front2 各 `1.35A` | 首次 5.4s，CD 5s，准备 950ms | `b92-banner-call`：召唤两个 `bone-retainer` | 两道盾压线与残旗召集；随从各为 E89 的 50% HP、45% attack，仅普攻 |
| B96 墓环石王 | `b96-ringarm-crush`：front3 各 `1.35A` | 首次 5.6s，CD 5.2s，准备 1000ms | `b96-stonehold`：永久 DR 20% | 石环闭合；本 Boss 不召唤，作为章节对照战 |

召唤物不继承精英行为、难度技能或装备词条，不计入 Boss 随从上限，也不再触发召唤。召唤动画期间 Boss/精英不能普攻；召唤者死亡则尚未落地的单位取消。

### 5.4 第九章：石牙山脉——护甲段与破甲窗口

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E97 岩冠掘兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E98 钩尾跃怪 | N2 首击突进 | front1 | `opening-strike`：第一次普攻总倍率 `1.30A` | 钩尾绷直 |
| E99 震颚鸣兽 | N3 中距震波 | 当前目标 | `cadence-slow`：第 4 击 slow `18% / 1.8s` | 颚部震波圈 |
| E100 岩肩护兽 | E1 周期护卫 | lowHp ally | `ally-shield`：第 6 击给最低血友军 `12%M`，存在时不重叠 | 岩肩向目标合拢 |
| E101 灰岩矿徒 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E102 晶镐斥手 | N2 低血游击 | lowHp 锁定 | `low-hp-hunter` | 镐尖标记目标 |
| E103 矿钉掷手 | N3 远程破甲 | 当前目标 | `cadence-break`：第 4 击 armorBreak `12% / 2.5s` | 矿钉留在目标状态栏 |
| E104 石肩监工 | E1 范围破甲 | front3 | `elite-sweep`：每 6.5s 准备 800ms，各 `0.60A` 并 armorBreak `10% / 2s` | 三个矿锤圆；清洁破甲 |
| E105 锁趾伏兽 | N1 稳定前排 | front1 | `baseline` | 职责来自生命、防御与低速 |
| E106 断翼疾怪 | N2 快速切入 | front1 | `opening-strike`：第一次普攻总倍率 `1.30A` | 断翼收紧 |
| E107 峰喙哨怪 | N3 远距风压 | 当前目标 | `cadence-slow`：第 4 击 slow `20% / 2s` | 峰喙吹出窄风线 |
| E108 脊门矛卫 | E1 拦截压制 | front2 | 第 5 击后准备 750ms，对 front2 各 `0.65A` 并 slow `15% / 1.5s` | 单柄石矛横置；不改变单位坐标 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B100 裂峰牙王 | `b100-ridge-charge`：front2 各 `1.35A`，armorBreak `10% / 2s` | 首次 5.3s，CD 5s，准备 900ms | `b100-second-plate`：获得一次 `20%M` shield | 两道冲阵线，背甲裂开后重组；破甲和持续输出 |
| B104 晶脉酋长 | `b104-crystal-hammer`：front1 造成 `1.55A`，armorBreak `12% / 2.5s` | 首次 5.5s，CD 5.1s，准备 950ms | `b104-crystal-plate`：获得一次 `20%M` shield | 单个重锤圈与整块晶甲；主坦与破甲处理 |
| B108 天脊岩主 | `b108-highridge-crush`：front3 各 `1.35A`，slow `20% / 2s` | 首次 5.6s，CD 5.2s，准备 1000ms | `b108-stone-pressure`：永久 DR 20% | 双巨臂合压；破甲为主要长期对策 |

“护甲段”在主线 Normal 中使用一次性阈值护盾表达，不创建免疫阶段或必须打满的硬直条。Hell 以上才增加第二片护甲，且仍是可正常削减的盾值。

### 5.5 第十章：北风关隘——前九章组合复习

| ID | 槽位与职责 | 目标 | 行为配置 | 读点与稳定对策 |
|---|---|---|---|---|
| E109 霜额掘怪 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E110 风鳍跃怪 | N2 首击突进 | front1 | `opening-strike`：第一次普攻总倍率 `1.30A` | 风鳍后掠 |
| E111 砾尾投怪 | N3 远程破甲 | 当前目标 | `cadence-break`：第 4 击 armorBreak `12% / 2.5s` | 冻石留下一枚状态图标 |
| E112 旗肩护兽 | E1 护卫减伤 | self+lowHp ally | `ally-guard`：第 6 击给自己和最低血友军 `15% DR / 2.5s` | 旗肩板闭合 |
| E113 墙趾伏兽 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E114 铰足钩虫 | N2 高频游击 | 当前目标 | `cadence-strike`：第 4 击追加 `0.40A` | 钩足交错闪光 |
| E115 风帽咒师 | N3 后排压制 | lowHp 锁定 | `low-hp-hunter` | 风帽朝目标偏转；无额外爆发 |
| E116 关墙独眼巨人 | E1 震地推压 | front3 | `elite-sweep`：每 6.2s 准备 800ms，各 `0.65A` 并 slow `18% / 1.5s` | 单眼聚焦后出现三段地裂 |
| E117 霜鳞关卒 | N1 均衡近战 | front1 | `baseline` | 无技能图标 |
| E118 钩尾斥候 | N2 高频快攻 | 当前目标 | `cadence-strike`：第 4 击追加 `0.40A` | 刃与尾钩依次闪动 |
| E119 环刃投手 | N3 分裂投掷 | front1+front2 | `split-hit`：第 4 击对第二目标追加 `0.35A` | 环刃分成两道轨迹 |
| E120 关铠蜥尉 | E1 护卫控制 | front1 与 self | `elite-control`：第 5 击后准备 750ms，stun `600ms`，自身获得 `10%M` shield | 盾与尾合拢；自动 stun 可取消 |

| Boss | 招牌主动 | 时序 | 50% 生命阶段 | 读点与对策 |
|---|---|---|---|---|
| B112 霜垒角王 | `b112-frostwall-charge`：front2 各 `1.40A`，slow `22% / 2s` | 首次 5.2s，CD 4.9s，准备 900ms | `b112-northwind-stride`：永久 haste 18% | 两道正面霜浪；双前排、治疗与清洁 |
| B116 城脊巨蜥 | `b116-rampart-crush`：front2 各 `1.45A`，slow `20% / 2s` | 首次 5.5s，CD 5.1s，准备 950ms | `b116-wall-scale`：获得一次 `18%M` shield | 两条横向碾压线；双前排和稳定削盾 |
| B120 北风关将 | `b120-glaive-sweep`：front3 各 `1.40A` | 首次 5.4s，CD 5s，准备 950ms | `b120-tail-answer`：跨入 50% 时准备 700ms，对 front3 各 `0.85A` 并 slow `20% / 2s`，每场一次 | 关刀弧线后尾部反向预警；两个方向均有明确读条 |

第十章不新增状态种类。它只组合首击、目标锁定、破甲、减速、护盾和范围压力；同一小怪包仍遵守“最多一个控制型普通怪、最多一个精英”的规则。

## 6. Boss 难度技能位

### 6.1 解锁规则

| 难度 | 总技能位 | 新增内容 |
|---|---:|---|
| Story / Normal | 2 | 招牌主动 + 50% 生命阶段 |
| Challenge / Nightmare | 3 | 新增一个低频主动，CD 不短于 10s |
| Hell | 4 | 新增一个 70% 生命防御或节奏被动 |
| Torment | 5 | 每第三次招牌主动触发伤害回响、低血追击或自我护盾之一 |

难度提升不修改普通怪行为数量，不减少主技能读条，不随机改目标，也不增加群体眩晕。Nightmare 新主动和 Torment 追加效果都产生独立事件；Hell 被动每场只触发一次。Torment 只复用三种模板：伤害回响仅复制招牌主动伤害，不复制状态、护盾或召唤；低血追击固定在 700ms 后命中 lowHp；自我护盾固定为 `8%M` 且不重叠。

### 6.2 30 只 Boss 的追加技能

| Boss | Nightmare：第 3 槽 | Hell：第 4 槽 | Torment：第 5 槽 |
|---|---|---|---|
| B04 风帆蜥 | `b04-crosswind`：每 10s 准备 700ms，对 lowHp 造成 `0.85A` | `b04-high-sail`：70% 生命获得一次 `15%M` shield | `b04-gale-echo`：每第三次招牌主动于 700ms 后回响 40% 伤害 |
| B08 碑背巨蜥 | `b08-stone-shard`：每 10.5s 准备 750ms，对 front3 各 `0.30A` | `b08-upper-plate`：70% 生命获得一次 `15%M` shield | `b08-stone-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B12 碑翼古鸮 | `b12-night-mark`：每 10s 准备 700ms，对 lowHp 施加 vulnerability `8% / 2s` | `b12-high-echo`：70% 生命获得永久 haste 10% | `b12-night-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B16 雪岭眠熊 | `b16-snowdrift`：每 10.5s 准备 750ms，使 front3 slow `15% / 2.5s` | `b16-upper-snowpack`：70% 生命获得一次 `15%M` shield | `b16-snow-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B20 霜鬃猞猁 | `b20-iceclaw`：每 10s 准备 700ms，对 lowHp 造成 `0.90A` | `b20-high-hunt`：70% 生命获得永久 haste 10% | `b20-frost-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B24 极光冠鸮 | `b24-aurora-ring`：每 10.5s 准备 800ms，对 front3 各 `0.35A` | `b24-upper-halo`：70% 生命获得一次 `15%M` shield | `b24-aurora-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B28 双丘巨驼 | `b28-sand-mark`：每 10s 准备 700ms，对 front1 施加 armorBreak `8% / 2s` | `b28-high-stride`：70% 生命获得永久 haste 10% | `b28-dune-echo`：每第三次招牌主动回响 40% 伤害 |
| B32 风蚀盘羊 | `b32-horn-feint`：每 10s 准备 700ms，对 lowHp 造成 `0.90A` | `b32-high-wind`：70% 生命获得永久 haste 10% | `b32-horn-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B36 王庭拱背兽 | `b36-court-guard`：每 10.5s 给自己和存活随从 `10% DR / 3s` | `b36-upper-arch`：70% 生命获得一次 `15%M` shield | `b36-arch-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B40 云冠狮鹫 | `b40-cloudburst`：每 10s 准备 750ms，对 front3 各 `0.35A` | `b40-high-flight`：70% 生命获得永久 haste 10% | `b40-cloud-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B44 雷羽巨枭 | `b44-arc-bolt`：每 10s 准备 700ms，按 front1/2/3 造成 `0.60/0.30/0.30A` | `b44-high-storm`：70% 生命获得永久 haste 10% | `b44-chain-echo`：每第三次招牌主动回响 35% 伤害 |
| B48 苍雷守卫 | `b48-thunder-fan`：每 10.5s 准备 800ms，对 front3 各 `0.30A` | `b48-upper-wing`：70% 生命获得一次 `15%M` shield | `b48-wing-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B52 黑水铠鳄 | `b52-mire-bite`：每 10s 准备 700ms，对 lowHp 附 DoT `0.08A×3/1s` | `b52-upper-mudplate`：70% 生命获得永久 DR 10%，50% 阶段后由 18% 覆盖 | `b52-mud-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B56 沉舟骨舵主 | `b56-deck-guard`：每 10.5s 给自己和存活随从各 `10%M` shield | `b56-upper-hull`：70% 生命自身获得一次 `15%M` shield | `b56-blade-echo`：每第三次招牌主动回响 40% 伤害 |
| B60 雾苇沼龙 | `b60-mist-bite`：每 10s 准备 700ms，对 lowHp 附 DoT `0.08A×3/1s` | `b60-high-hunt`：70% 生命获得永久 haste 10% | `b60-mist-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B64 焦原楔兽 | `b64-ember-fan`：每 10.5s 准备 750ms，对 front3 各附 burn `0.07A×3/1s` | `b64-upper-crust`：70% 生命获得一次 `15%M` shield | `b64-crust-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B68 黯脉壳龙 | `b68-ember-vein`：每 10s 准备 750ms，对 front3 各附 burn `0.07A×3/1s` | `b68-high-rift`：70% 生命获得永久 haste 10% | `b68-rift-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B72 烬炉督军 | `b72-forge-order`：每 10.5s 给自己和存活随从 haste `10% / 3s` | `b72-upper-plate`：70% 生命获得一次 `15%M` shield | `b72-hammer-echo`：每第三次招牌主动回响 40% 伤害 |
| B76 盐冠礁王 | `b76-salt-fan`：每 10.5s 准备 750ms，对 front3 各 `0.30A` | `b76-upper-reef`：70% 生命获得一次 `15%M` shield | `b76-reef-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B80 断潮壳龙 | `b80-riptide-bite`：每 10s 准备 700ms，对 lowHp 造成 `0.85A` | `b80-high-tide`：70% 生命获得永久 haste 10% | `b80-tide-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B84 潮垒酋领 | `b84-reef-order`：每 10.5s 给自己和存活随从各 `10%M` shield | `b84-upper-wall`：70% 生命自身获得一次 `15%M` shield | `b84-hammer-echo`：每第三次招牌主动回响 40% 伤害 |
| B88 枯风角王 | `b88-dust-fan`：每 10.5s 准备 750ms，对 front3 各 `0.30A` | `b88-upper-hide`：70% 生命获得一次 `15%M` shield | `b88-hill-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B92 旧战骨将 | `b92-banner-order`：每 10.5s 给自己和存活随从 haste `10% / 3s` | `b92-upper-shield`：70% 生命获得一次 `15%M` shield | `b92-line-echo`：每第三次招牌主动回响 40% 伤害 |
| B96 墓环石王 | `b96-stone-fan`：每 10.5s 准备 800ms，对 front3 各 `0.35A` | `b96-upper-ring`：70% 生命获得一次 `15%M` shield | `b96-ring-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B100 裂峰牙王 | `b100-armor-chip`：每 10s 准备 700ms，对 front1 施加 armorBreak `8% / 2s` | `b100-upper-plate`：70% 生命获得一次 `15%M` shield | `b100-charge-echo`：每第三次招牌主动回响 35% 伤害 |
| B104 晶脉酋长 | `b104-crystal-chip`：每 10s 准备 750ms，对 front3 施加 armorBreak `8% / 2s` | `b104-upper-plate`：70% 生命获得一次 `15%M` shield | `b104-crystal-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B108 天脊岩主 | `b108-ridge-fan`：每 10.5s 准备 800ms，对 front3 各 `0.35A` | `b108-upper-ridge`：70% 生命获得一次 `15%M` shield | `b108-ridge-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B112 霜垒角王 | `b112-frost-hunt`：每 10s 准备 700ms，对 lowHp 造成 `0.90A` | `b112-upper-wall`：70% 生命获得一次 `15%M` shield | `b112-frost-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |
| B116 城脊巨蜥 | `b116-wall-fan`：每 10.5s 准备 800ms，对 front3 各 `0.35A` | `b116-upper-scale`：70% 生命获得一次 `15%M` shield | `b116-scale-guard`：每第三次招牌主动解析后获得 `8%M` shield |
| B120 北风关将 | `b120-glaive-hunt`：每 10s 准备 750ms，对 lowHp 造成 `0.90A` | `b120-upper-guard`：70% 生命获得一次 `18%M` shield | `b120-tail-pursuit`：每第三次招牌主动后 700ms 对 lowHp 造成 `0.45A` |

## 7. 配置结构与落地顺序

### 7.1 四张注册表

```ts
interface EnemyCombatContent {
  combatProfileId: string;
  basicTargetStrategy: TargetStrategy;
  targetLock: "untilDeath";
  behavior?: BehaviorDefinition;
}

interface BossCombatContent extends EnemyCombatContent {
  active: EnemyAbilityDefinition;
  phase: EnemyAbilityDefinition;
  difficultyExtensions: Partial<Record<"nightmare" | "hell" | "torment", EnemyAbilityDefinition>>;
}

interface RegionCombatContent {
  id: string;
  normalSlots: readonly [EnemyId, EnemyId, EnemyId];
  eliteId: EnemyId;
  bossId: EnemyId;
}

interface StageEncounterContent {
  stage: number;
  regionId: string;
  template: "A" | "B" | "C" | "D";
  bossId: EnemyId;
}
```

内容文件拆为：

- `enemyCombatProfiles.ts`：E01～E120；
- `bossCombatProfiles.ts`：30 只主线 Boss 的主动、阶段和难度技能；
- `regionCombatContent.ts`：30 个区域的五槽映射；
- `stageEncounterContent.ts`：120 关展开结果。

`BattleSimulation`、`MovementSystem` 和 `TargetingSystem` 只读取这些数据，不出现具体 E/B ID 分支。

### 7.2 能力接入批次

| 批次 | 章节 | 必须接通的新增通用能力 |
|---|---|---|
| P0 | 第 1 章 | 普攻计数、生命阈值、敌方读条、稳定多目标、移动/普攻同目标、shield/slow/stun/haste/DR |
| P1 | 第 2～4 章 | vulnerability、armorBreak、友军目标、分裂/链式目标、团队增益 |
| P2-A | 第 5～7 章 | periodicDamage、敌方治疗、死亡触发、友军护盾 |
| P2-B | 第 8～9 章 | 有上限的召唤、阈值护甲段 |
| P2-C | 第 10 章与高难 | 难度技能位、主技能伤害回响、完整行为统计 |

每个批次先完成一个区域的端到端接入，再批量填写同类配置。不能先复制 30 个 Boss 方法再回头抽象。

## 8. 平衡与内容验收

### 8.1 静态验收

1. E01～E120 每个 ID 在普通/精英表中恰好出现一次。
2. 30 只主线 Boss 每只恰好有一个 Normal 主动、一个 50% 阶段和三个难度扩展。
3. 每个区域恰好为 3 普通、1 精英、1 本区 Boss；每章恰好 15 个主线设计。
4. 30 只 N1 全部使用 `baseline`；其他普通怪最多一个行为。
5. 30 只精英每只只有一个机制包；不会同时携带独立控制、护盾和团队增益三套循环。
6. 120 关各自唯一映射到 A/B/C/D；第 4、8、12 关使用本区 Boss 和 D 模板。
7. 普通怪、精英、Boss 对单个目标的一次结算总伤害分别不超过 `1.35A / 1.60A / 1.60A`；Boss 范围目标不超过 3 名。
8. Normal 不出现群体 stun、沉默、反伤、无敌、复活或必须手动躲避的机制。
9. 召唤单位只能普攻，不递归召唤；同一召唤源有明确数量上限。
10. 所有目标并列按稳定 ID 收束，同一战斗输入能重放相同事件序列。

### 8.2 运行验收

- 每章选择 A/B/C/D 各一关，使用 10 个不同固定种子、标准/双前排/偏治疗三套阵容和无装备/良品两档装备，共 `10 × 3 × 2 × 4 = 240` 个场景；每个场景只运行一次用于平衡分布。
- 每章另选 A 与 D 各一个代表场景，各重复一次，只验证事件序列确定性，不用重复样本冒充平衡样本。
- 普通怪行为对本单位有效伤害或有效保护的贡献目标为 `5%～18%`；精英机制为 `10%～30%`；Boss 招牌主动造成的 Boss 战总承伤为 `12%～28%`。
- 单次 Boss 主动不能击杀满血、推荐战力下的非坦英雄；高难伤害回响或低血追击与主技能连续结算时也必须保留至少 700ms 的可见间隔。
- 更换前排、治疗或输出后，至少一个职责怪的承伤分布、存活时间或整关时长发生可测变化；不把不可手动控制的击杀顺序当作硬指标。
- 第 8 章重点记录召唤物存活时间和额外承伤；第 9 章重点记录护甲段吸收量；第 10 章确认没有出现第一至九章之外的新状态。

### 8.3 成熟体量判定

当四张注册表全部落地、120 关均由本矩阵生成、30 只 Boss 的 Normal 与高难技能位可运行，并完成上述代表场景回归后，当前 10 章主线才可认定为“敌人差异化内容完整”。只完成第一章或只接入行为框架，均不能视为十章内容完成。

## 9. 关联内容

- [章节三区域怪物阵容与美术设计规范](2026-09-15-three-region-monster-roster-art-standard.md)
- [第一章「青丘林地」怪物阵容](2026-07-31-qingqiu-frontier-monster-roster-design.md)
- [第二章「霜风谷」怪物阵容](2026-09-15-frostwind-valley-monster-roster-design.md)
- [第三章「赤沙荒地」怪物阵容](2026-09-16-redsand-wasteland-monster-roster-design.md)
- [第四章「雷崖高地」怪物阵容](2026-09-16-thundercliff-highlands-monster-roster-design.md)
- [第五章「黑水湿地」怪物阵容](2026-09-16-blackwater-wetlands-monster-roster-design.md)
- [第六章「燃烧荒地」怪物阵容](2026-09-16-burning-wasteland-monster-roster-design.md)
- [第七章「暗潮海岸」怪物阵容](2026-09-20-darktide-coast-monster-roster-design.md)
- [第八章「哀嚎丘陵」怪物阵容](2026-09-20-wailing-hills-monster-roster-design.md)
- [第九章「石牙山脉」怪物阵容](2026-09-20-stonefang-mountains-monster-roster-design.md)
- [第十章「北风关隘」怪物阵容](2026-09-20-northwind-pass-monster-roster-design.md)
- [战斗数值对标设计](2026-08-10-diablo-immortal-combat-balance-design.md)
