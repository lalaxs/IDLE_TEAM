# 装备词条对照设计：对标 TBH 材料属性

> **日期：** 2026-08-11  
> **状态：** 执行中  
> **对标游戏：** TBH（Taskbar Hero）装饰 / 铭刻 / 铭文材料效果  
> **取代：** `2026-08-10-equipment-affix-diablo-immortal-design.md` 第 4 节词条池（底座三层结构仍保留）

## 1. 为何改标

此前词条池对标暗黑不朽 Magic Attributes；品阶色 / 同名变色 / 顶格 / 合成已对标 TBH。  
玩家反馈希望**词条手感也更贴 TBH**。TBH 的「词条感」主要来自 Cube 三层镶嵌材料（约 36 类属性），而非掉落随机前缀。

本规格取舍：

| 维度 | 本作做法 |
|---|---|
| 掉落随机词条 | **保留**（挂机刷宝需要；首版不做完整 Cube 镶嵌 UI） |
| 属性词汇与选择轴 | **对齐 TBH** 可映射战斗字段的核心材料属性 |
| 部位矩阵 | 压缩为 TBH 的 **武器 / 护甲 / 饰品** 三组，再映射到十槽 |
| 元素抗、AoE、召唤伤 | **首版不做**（战斗模型未支持） |
| 装饰 / 铭刻 / 铭文三孔 | **后续**（本规格只铺属性池与战斗接入） |

参考：[TBH Material Effects](https://tbhwiki.org/effects)、[Inscription 属性池](https://taskbarhero.wiki/inscription)

## 2. 系统分层（不变）

| 层 | 来源 |
|---|---|
| 底座 `stats` | 仍按槽位固有（见不朽底座规格 §3） |
| 随机词条 `affixes[]` | **本规格（TBH 属性轴）** |
| 传奇特效 `traitId` | 仍对标不朽 Legendary Power |
| 品阶 / 套装 / 合成 | TBH 品阶规格 |

品质 → 词条数不变：common 0 / uncommon 1 / rare 2 / epic+ 3。

## 3. 词条池（TBH 核心可映射）

区间：`uncommon / rare / epic`；更高品阶用既有 `affixRangeScale` 放大。

| id | TBH 原文 | 效果 | uncommon | rare | epic |
|---|---|---|---|---|---|
| flat_attack | Attack Damage | 攻击 flat | 0.12–0.18×b | 0.14–0.22×b | 0.16–0.26×b |
| damage_pct | Attack Damage %（折叠） | 全伤害 % | 4–6 | 6–9 | 8–12 |
| attack_speed | Attack Speed | 攻速 % | 3–5 | 4–7 | 5–8 |
| crit_chance | Critical Chance | 暴击率 % | 2–4 | 3–5 | 4–6 |
| crit_damage | Critical Damage | 暴击伤害 % | 10–16 | 14–22 | 18–28 |
| cooldown_reduction | Cooldown Reduction | 技能冷却缩减 % | 3–5 | 4–7 | 5–8 |
| skill_damage | （技能向补充，对应 Skill 轴） | 技能伤害 % | 4–6 | 5–8 | 6–10 |
| flat_life | Max HP | 生命 flat | 1.2–2.0×b | 1.5–2.5×b | 1.8–3.0×b |
| life_pct | Max HP % | 生命 % | 3–5 | 4–7 | 5–8 |
| flat_defense | Armor | 防御 flat | 0.12–0.20×b | 0.15–0.25×b | 0.18–0.30×b |
| defense_pct | Armor % | 防御 % | 3–5 | 4–7 | 5–8 |
| damage_reduction | （减伤，护甲侧） | 受伤减免 % | 2–3 | 3–4 | 4–5 |
| life_on_hit | Add HP Per Hit | 击中回血 flat | 0.08–0.14×b | 0.10–0.18×b | 0.12–0.22×b |
| life_steal | HP Leech | 伤害吸血 % | 1–2 | 2–3 | 3–4 |
| hp_regen | HP Regen Per Sec | 每秒回血 flat | 0.06–0.12×b | 0.08–0.15×b | 0.10–0.18×b |
| primary_attack_pct | （保留，普攻 Build） | 普攻伤害 % | 4–7 | 6–10 | 8–12 |
| physical_damage_pct | Physical Damage % | 物理伤害 %（物理系英雄） | 4–6 | 5–8 | 6–10 |
| magic_damage_pct | Spell / Magic Damage % | 法术伤害 %（法系英雄） | 4–6 | 5–8 | 6–10 |
| dodge_chance | Dodge Chance | 闪避 % | 2–3 | 3–4 | 4–5 |
| block_chance | Block Chance | 格挡 %（触发后伤害×50%） | 2–3 | 3–4 | 4–5 |
| move_speed | Movement Speed | 移动速度 % | 3–5 | 4–7 | 5–8 |

`b` = `itemBudget`。同类词条同件不重复。  
冷却缩减与特质 `skillCooldownPct` 叠乘，**合计上限 40%**。  
闪避 / 格挡分别 **上限 35%**。  
**不做**「对精英伤害 / 残血增伤」：本作无玩家可感知的精英与残血阈值玩法。  
英雄伤害学派：物攻英雄（洛恩/布兰/塔林/乌鸦）吃物理伤害；法系（米娅/诺拉/塞拉/海泽）吃法术伤害。

### 3.1 部位（武器 / 护甲 / 饰品）

| 组 | 槽位 |
|---|---|
| 武器 | main_weapon, off_hand |
| 护甲 | helmet, armor, gloves, boots, bracer |
| 饰品 | ring, amulet, earring |

| 词条 | 武器 | 护甲 | 饰品 |
|---|---|---|---|
| flat_attack | ✓ | gloves/bracer | ✓ |
| damage_pct | ✓ | helmet | ✓ |
| attack_speed | ✓ | helmet/gloves | ✓ |
| crit_chance | ✓ | gloves | ✓ |
| crit_damage | ✓ | gloves | ring/amulet |
| cooldown_reduction | ✓ | ✓ | ✓ |
| skill_damage | ✓ | helmet | amulet/earring |
| flat_life | | ✓ | ✓ |
| life_pct | | ✓ | ✓ |
| flat_defense | | ✓ | |
| defense_pct | | ✓ | |
| damage_reduction | | armor/boots/bracer | |
| life_on_hit | ✓ | | ✓ |
| life_steal | ✓ | | ✓ |
| hp_regen | | ✓ | ✓ |
| primary_attack_pct | ✓ | helmet | |
| physical_damage_pct | ✓ | gloves | ring/amulet |
| magic_damage_pct | ✓ | helmet | ✓ |
| dodge_chance | | boots/gloves/bracer | ✓ |
| block_chance | off_hand | armor/bracer/helmet | |
| move_speed | | boots | ✓ |

## 4. 战斗接入

| 词条 | 接入 |
|---|---|
| cooldown_reduction | `skillCooldownPct`；**每次**技能结算写回 CD 时生效 |
| defense_pct | 最终防御 `× (1 + defensePct)` |
| life_steal | 普攻/技能造成伤害后按比例治疗 |
| hp_regen | 战斗 tick 按秒回血 |
| dodge_chance | 受击判定：闪避则伤害为 0 |
| block_chance | 未闪避时再判格挡，伤害 ×50% |
| move_speed | `unit.moveSpeed × (1 + pct/100)` |
| physical / magic | 按英雄 `damageSchool` 乘区 |
| 其余 | 沿用既有 `HeroBattleBonus` 字段 |

## 5. 明确不做（本规格）

- 完整装饰 / 铭刻 / 铭文孔位与材料背包  
- 元素抗、AoE、召唤伤、投射物+1、火/冰/电分拆词条  
- 对精英伤害、残血增伤（无对应玩法语义）  
- 旧存档字段迁移（未上线，损坏或过期存档直接回默认）
