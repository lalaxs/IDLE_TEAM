# 装备词条对照设计：对标《暗黑破坏神：不朽》

> **日期：** 2026-08-10  
> **状态：** 部分取代  
> **对标游戏：** Diablo Immortal（《暗黑破坏神：不朽》）  
> **取舍原则：** 结构与部位限制完整对照；绝对数值按本项目三装备位与现有 `itemBudget` 缩放，不照搬 12 槽体量。  
> **修订（2026-08-11）：** 第 4 节「词条池」已改由 `2026-08-11-equipment-affix-tbh-design.md` 接管（属性轴对齐 TBH）。底座 / 传奇特效 / 三层结构仍以本文为准。

## 1. 为何选它

| 候选 | 结论 |
|---|---|
| 巴尔的遗产 / 暗黑2 | 挂机刷宝对口，但词缀库上千条、公开表不完整，无法稳定对标 |
| 暗黑3 Loot 2.0 | 主/副属性文档最全，作**数值区间与稀有度条数**补充参考 |
| Melvor Idle | 装备几乎固定，缺少刷宝浮动 |
| **暗黑不朽** | **移动端 ARPG**；公开「部位 × 魔法属性」矩阵；传奇特效 ≈ 本项目 `trait` |

官方/社区依据：

- Blizzard《Itemization in Diablo Immortal》主/副装备槽划分  
- Fextralife Affixes 部位矩阵  
- Gamepur Bonus Attributes 区间（用作词条**相对比例**锚点）

## 2. 系统映射

| 不朽概念 | 本项目 |
|---|---|
| Base Item Damage / Life / Armor（固有） | **底座属性** `stats`：槽位锁类型 + `budget × 系数 × [0.85, 1.15]` |
| Magic Attributes（随机） | **词条** `affixes[]`：受部位限制、品质定条数、数值区间浮动 |
| Legendary skill-changing effect | **传奇特效** `traitId`（仅史诗；按 definitionId 固定，见 `2026-08-10-legendary-power-diablo-immortal-alignment.md`） |
| Item Rank / Reforge / Gems | **首版不做**（与成熟 Demo 规格一致） |
| Sets（件数套装） | **要做**，见 `2026-08-10-tbh-grade-and-set-design.md` |
| Normal → 多阶 | **10 阶品质**（TBH 骨架 + 本作命名），见 `2026-08-10-tbh-grade-and-set-design.md` |

品质 → 词条数（对照不朽品质阶梯，条数按三槽压缩）：

| 品质 | 对标 | 随机词条 | 特性 |
|---|---|---:|---|
| common | Normal | 0 | 无 |
| uncommon | Magic | 1 | 无 |
| rare | Rare | 2 | 1 |
| epic | Legendary | 3 | 1（数值略强，沿用现逻辑） |

## 3. 底座（Inherent）

沿用不朽「武器固有伤害 / 护甲固有生命与护甲」：

| 槽位 | 固定底座 | 系数（相对 budget） |
|---|---|---|
| main_weapon | attack | 1.00 |
| off_hand | attack | 0.75 |
| helmet | maxHp + defense | 4.0 / 0.25 |
| armor | maxHp + defense | 8.0 / 0.45 |
| gloves | attack | 0.40 |
| boots | maxHp + defense | 3.0 / 0.20 |
| ring | attack | 0.55 |
| bracer | defense + maxHp | 0.50 / 2.0 |
| amulet | attack **或** maxHp（二选一） | 0.55 / 3.0 |
| earring | 攻速向 **或** 生存向（二选一） | 见实现 |

浮动：`roll ∈ [0.85, 1.15]`。  
**不再**在底座里随机塞攻速（攻速只走词条池，对齐不朽 Magic Attribute）。

## 4. 词条池（Magic Attributes）

只收录不朽部位矩阵中、且能映射到本项目战斗字段的条目。  
区间相对比例锚定 Gamepur Bonus Attributes 中位比，再按「三槽 / 现有攻速 3–8%」缩放到可玩量级。

### 4.1 词条定义与区间

区间格式：`uncommon / rare / epic`（百分数为整型展示值；flat 按 budget 比例）。

| id | 不朽原文（摘要） | 效果 | uncommon | rare | epic |
|---|---|---|---|---|---|
| attack_speed | Attack Speed increased | 攻速 % | 3–5 | 4–7 | 5–8 |
| damage_pct | All Damage / Base Item Damage | 全伤害 % | 4–6 | 6–9 | 8–12 |
| primary_attack_pct | Primary Attack damage | 普攻伤害 % | 4–7 | 6–10 | 8–12 |
| crit_chance | Critical Hit Chance | 暴击率 % | 2–4 | 3–5 | 4–6 |
| crit_damage | Critical Hit Damage | 暴击伤害 %（基础 150%） | 10–16 | 14–22 | 18–28 |
| skill_damage | Skill damage | 技能伤害 % | 4–6 | 5–8 | 6–10 |
| elite_damage | Damage to Elites | ~~已移除~~ | — | — | — |
| execute_damage | Damage to enemies below 30% Life | ~~已移除~~ | — | — | — |
| life_pct | Life increased | 生命 % | 3–5 | 4–7 | 5–8 |
| damage_reduction | Damage taken reduced | 受伤减免 % | 2–3 | 3–4 | 4–5 |
| flat_attack | （主属性折叠为攻击） | 攻击 flat | 0.12–0.18×b | 0.14–0.22×b | 0.16–0.26×b |
| flat_life | Life Bonuses | 生命 flat | 1.2–2.0×b | 1.5–2.5×b | 1.8–3.0×b |
| flat_defense | Armor 等价 | 防御 flat | 0.12–0.20×b | 0.15–0.25×b | 0.18–0.30×b |
| life_on_hit | Life Regeneration 战斗化 | 击中回血 flat | 0.08–0.14×b | 0.10–0.18×b | 0.12–0.22×b |

`b` = `itemBudget`。同类词条同件装备不重复。

### 4.2 部位限制（对照不朽 Primary 矩阵 + 副装习惯）

| 词条 | 武器 | 副手 | 头盔 | 护甲 | 手套 | 鞋 | 戒指 | 护腕 | 护符 | 耳环 |
|---|---|---|---|---|---|---|---|---|---|---|
| attack_speed | ✓ | | ✓ | | ✓ | | ✓ | | ✓ | ✓ |
| damage_pct | ✓ | ✓ | ✓ | | | | ✓ | | ✓ | |
| primary_attack_pct | ✓ | | ✓ | | | | | | | |
| crit_chance | | | ✓ | | ✓ | | ✓ | ✓ | ✓ | ✓ |
| crit_damage | ✓ | | | | ✓ | | ✓ | | ✓ | |
| skill_damage | | | ✓ | | | | | | ✓ | |
| elite_damage | ✓ | ✓ | | | | | | | | |
| execute_damage | ✓ | | ✓ | | | | | | ✓ | |
| life_pct | | | | ✓ | | ✓ | ✓ | | ✓ | ✓ |
| damage_reduction | | | | ✓ | | ✓ | | | | |
| flat_attack | | | | | ✓ | | ✓ | ✓ | ✓ | ✓ |
| flat_life | | | ✓ | ✓ | | ✓ | | | ✓ | ✓ |
| flat_defense | | | | ✓ | | ✓ | | ✓ | | |
| life_on_hit | ✓ | | | | | | ✓ | | ✓ | |

说明：不朽头盔/护肩偏输出、胸腿偏生存；本项目头盔按 DI Head，护甲按 Torso+Legs 合并。

## 5. 特性（Legendary Effect）

继续使用现有 `TRAIT_DEFINITIONS` 与区域特性规则。  
对应不朽 Primary 槽传奇「改技能/战斗行为」的定位，**不改为随机词条**。

## 6. 战斗接入

| 词条 | 接入点 |
|---|---|
| flat_* / 底座 | `HeroBattleBonus.attack/maxHp/defense` |
| attack_speed | `attackSpeedPct`（整数百分比） |
| crit_chance | `critChance`（除以 100） |
| crit_damage | `critDamagePct`；暴击倍率 `1.5 + critDamagePct/100` |
| damage_pct / primary_attack_pct | 普攻攻击乘区 |
| skill_damage | 既有 `gearSkillDamage` |
| execute_damage | 既有 `gearExecute`（阈值仍 35%） |
| elite_damage | 目标 `kind ∈ {elite, boss}` 时乘区 |
| life_pct | `maxHpPct` |
| damage_reduction | 英雄受击时减免（与状态减伤叠乘上限另计） |
| life_on_hit | 普攻命中后治疗 |

评分 `itemScore`：底座加权 + 各词条换算分 + traitScore，供红点/一键换装。

## 7. 明确不做（本规格）

- 不朽 Item Rank、重铸石、传奇宝石、套装  
- 抗性分元素、召唤物伤、PvP 专属、控制免疫等无法映射条目  
- 金币获取%（暗黑3 副属性；本版不引入以免混对标）  
- 前后缀命名生成（可后续 UI 糖）

## 8. 存档

不做旧字段迁移；非法或过期存档走默认新建。新掉落按当前词条规格生成。
