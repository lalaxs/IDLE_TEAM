# 传奇特效对标修订（取代「区域特性 50%」）

- 版本：1.0
- 日期：2026-08-10
- 对标：Diablo Immortal Legendary Gear
- 状态：取代霜原/赤沙/苍雷规格中的「稀有以上 50% 区域特性」规则

## 1. 为何改

原「章节装备稀有/史诗 50% 抽区域特性、50% 抽基础特性」**不是**暗黑不朽模型。

不朽对应关系：

| 不朽 | 本项目 |
|---|---|
| Normal | common：仅底座 |
| Magic | uncommon：底座 + 词条 |
| Rare | rare：底座 + 更多词条，**无传奇橘字** |
| Legendary | epic：底座 + 词条 + **该装备定义固定的传奇特效** |

传奇特效绑定 **definitionId**，不随机、不与基础特性池混抽。

## 2. 新规则

1. `rare`：**永不**写入 `traitId`。
2. `epic`：`traitId = definition.legendaryTraitId`（定义上写死；无则 `null`）。
3. 删除 `regionalTraitByChapter` 与 50% 硬币判定。
4. 原霜咬/沙痕/雷铭等，改为对应章节装备定义上的 **固定** `legendaryTraitId`（只有掉出史诗时显现）。
5. 基础锐利/守护等，固定写在第一章（及扩槽）具体装备定义上。

## 3. 与套装的边界

不朽副装还有 **Set Items**（定点副本掉落 + 套装件数加成）。本 Demo **仍不做套装**；章节辨识只靠「史诗时固定橘字」，不再做区域随机特效。

## 4. 废弃条款

下列文档中的「50% 区域特性」生成规则作废，以本文与主规格 §9 为准：

- `2026-07-31-frostland-equipment-expansion-design.md` §5
- `2026-08-01-red-sands-equipment-expansion-design.md` 特性分配
- `2026-08-01-stormsea-equipment-expansion-design.md` §5
- `2026-08-10-ten-slot-equipment-expansion-design.md` 中「区域特性」相关表述改为「章节传奇橘字（仅史诗）」
