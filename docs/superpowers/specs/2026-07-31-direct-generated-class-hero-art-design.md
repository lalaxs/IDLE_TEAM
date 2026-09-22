# H5 放置 RPG 职业英雄直生图设计规范

> **状态：** 已确认，进入生产  
> **日期：** 2026-07-31  
> **现行修订：** 2026-09-15，统一英雄本体标尺
> **范围：** 13 个职业、40 个专精、男女各一张，共 80 张完整角色单图  
> **权威风格参考：** [`hero-style-master-v1.png`](../../art/references/hero-style-master-v1.png)

## 1. 生产决策

正式英雄美术只采用“一名英雄一次独立完整生图”：

- 每张图从头生成完整的头部、身体、服装、双手、双脚和武器。
- 每张图只包含一名角色，不生成角色板、装备板、组合页或多视图。
- 男性和女性角色分别独立生成，不以同一身体进行换装或局部替换。
- 不使用基础身体、种族底板、装备图层、模板套壳、部件库或后期拼接。
- 不把一张角色裁切后与另一张角色的武器、头部或服装组合。
- 修订失败图时重新生成整名角色，只允许进行背景去除、尺寸转换和轻微边缘清理等非设计性处理。

曾讨论的三种方法中，正式选择第一种：

1. **逐角色完整直生图（采用）：** 最贴近权威参考图的自然完整感，每名角色拥有独立轮廓。
2. **男女成对同画布生成（拒绝）：** 容易形成角色设定板，裁切后比例与线条不一致。
3. **身体与装备模块化拼装（废止）：** 容易出现肢体错位、轮廓破碎和“套模板”感。

## 2. 知识产权边界

职业与专精只借鉴经典大型多人 RPG 的战斗幻想和辨识逻辑：

- 可以借鉴“重甲盾卫、火焰施法者、双匕首刺客、自然治疗者”等通用职业语义。
- 可以使用通用武器类型、魔法属性和护甲重量表达专精。
- 不复制任何现有游戏的命名角色、脸型、发型、具体套装、神器、武器轮廓、纹章、阵营标志或 UI 标志。
- 不在图片中出现第三方游戏名称、职业名称、文字、水印或商标。
- 所有服装、武器装饰和种族细节必须重新设计为本项目的原创形态。

## 3. 权威视觉语言

### 3.1 构图

- 正方形单角色资产，角色完整入画。
- 角色朝右，采用三分之四侧身；脸部仍能看到两只眼睛。
- 姿势为可直接进入战斗的中性待机姿势，不使用大幅挥砍、跳跃或施法动作。
- 角色本体使用统一标尺，脚底位于统一基线；武器、盾牌和独立法术符号只占用本体框以外的装备空间。
- 四周留有安全边距，武器、头发、耳朵、角和法杖不得触边。
- 不出现地面、投影、场景、边框、标题、属性条、宠物或第二名角色。

### 3.2 统一本体标尺

- “角色本体”由头部外轮廓、脸部、核心躯干、圆形双手、短腿和双脚确定；手持武器、盾牌、法杖、弓、外扩肩甲、披风飘片、光环和独立法术符号不参与本体尺寸计算。
- 所有英雄使用同一个 `1024×1024` 坐标系：本体框高度固定为 `760 px`，水平中心为 `x=512`，脚底基线为 `y=930`。
- 本体头部宽度保持为本体高度的 `58%–62%`，核心躯干宽度保持为 `44%–48%`，圆手直径保持为 `13%–16%`；职业和性别不能通过缩小这些基础尺寸表达。
- 护甲、长发、兜帽和长袍可以改变外轮廓，但必须围绕同一头部、躯干、手脚锚点向外生长。重甲英雄不能拥有更大的基础身体，布甲英雄也不能拥有更小的基础身体。
- 完整角色四周保留至少 `32 px` 安全边距。装备超出安全区时，缩短装备、收紧姿势或重新生成整名角色，禁止缩小本体以把装备塞进画布。
- 母版处理以人工确认的本体框计算统一缩放，并以本体框而非整张图的 Alpha 可见边界居中。所有英雄在运行时使用同一个显示倍率，不允许按单张素材的可见边界二次放大或缩小。

### 3.3 Q 版比例

- 总体为 `1.45–1.65` 头身。
- 包含头发或帽子的头部占角色总高 `58%–64%`。
- 脸部轮廓偏圆，颊部饱满，不使用尖下巴和写实面部结构。
- 颈部隐藏或省略，头部直接衔接短小躯干。
- 身体是单一主色块，腰部不做写实收束。
- 双腿简化为两个短小色块，脚尖轻微错开以表达侧身。
- 双手均为清晰圆形，不绘制手指。

### 3.4 五官

- 两只竖向黑色椭圆眼睛。
- 不绘制嘴巴、鼻子、眉毛、睫毛和面部皱纹。
- 眼睛大小、间距和高度必须接近权威参考。
- 不使用表情符号、腮红或高光眼珠。

### 3.5 线条与色块

- 轮廓线使用近黑色，不使用纯灰描边。
- 外轮廓线宽约为头部宽度的 `9%–12%`。
- 内部分隔线宽为外轮廓的 `45%–60%`。
- 描边粗细以 `430×280` 战斗画布中的最终显示结果验收；同屏英雄的外轮廓不得因装备尺寸或单图缩放出现明显粗细跳变。
- 所有线条使用圆角端点与圆角连接。
- 每名角色只使用 `4–6` 个主要可见颜色，不含描边色。
- 使用大面积纯色色块；只允许一层非常轻微的同色系暗面辅助体积。
- 禁止写实材质、金属反射、复杂渐变、颗粒、笔刷纹理、强光晕和 3D 渲染感。
- 内部主要分隔线不超过 8 条，装饰不得把身体切碎。

### 3.6 武器与职业辨识

辨识优先级为：

1. 武器类别；
2. 头部特征；
3. 护甲重量与身体轮廓；
4. 职业主色；
5. 一个专精魔法符号。

武器必须比早期试制图更克制：

- 匕首、短剑、单手锤：角色总高 `42%–56%`。
- 法杖、长弓、长柄武器、双手武器：角色总高 `55%–68%`。
- 盾牌：角色总高 `30%–40%`。
- 双持武器不得遮挡整个身体，轮廓应一前一后自然错开，但两件攻击武器的工作端都必须朝画面右侧。
- 武器最多保留三个结构层级：主体、握柄、一个识别装饰。
- 不使用超大刀刃、密集齿口、复杂镶嵌或超过头部尺寸的法术特效。

### 3.7 装备持握与朝向

- 英雄统一面向画面右侧，右侧为默认交战方向。战斗待机中的刀剑从握柄向右或右上出刃，剑尖的 `x` 坐标必须大于握柄的 `x` 坐标；旧版 H01 那种从手部向左上伸出的剑判定为方向错误。只有明确收刀入鞘的非战斗姿势可以例外。
- 装备朝向验收从肩部开始：肩、肘、腕、圆手和握柄必须形成连续、自然的受力链。武器指向人物前方时，持械上臂不得后摆到躯干后方；标准姿势为手臂自然下垂或略向前、肘部低于肩部、手腕与握柄方向一致。
- H01 防护战士固定为人物左手持剑、人物右手持盾；在右向三分之四视角中，剑位于画面右侧，盾位于画面左侧。剑臂自然下垂并略向前，盾臂弯曲护住躯干。
- 圆手只能握在握柄、弓把或盾牌背带位置。刀剑护手必须位于手与刃之间；斧头、战锤和法杖头必须位于握持点外侧；不得握住刃面、斧头、锤头、法杖顶饰或盾缘。
- 弓手握住弓把，弓背朝交战方向、弓弦位于人物一侧；出现箭矢时，箭头必须朝右。弓身与弓弦不能因镜像而交换前后关系。
- 所有“盾牌＋攻击武器”角色统一为人物左手（画面右侧）持攻击武器、人物右手（画面左侧）持盾。盾牌正面朝右前方，持握结构隐藏在盾面背后；盾牌不能像贴在手背外侧的装饰片。
- 双持武器的两个握柄分别进入两只圆手。两件攻击武器都必须朝画面右侧或右上方：刀剑或爪尖、斧锤工作端中心、枪口的横坐标都必须大于各自握持圆手的横坐标。前后手允许姿势不同，但不得左右对称外展，也不能让其中一件出现反握、倒握或穿过手掌。
- 装备方向失败时重新生成或只编辑该装备及持握关系。不得通过翻转整名角色修复，因为这会同时破坏英雄的统一朝向。

## 4. 男女角色的配对规则

同一专精的男女角色共享：

- 种族；
- 武器类别；
- 护甲重量；
- 职业主色与辅助色；
- 一个头部识别点；
- 一个身体识别点；
- 面向、脚底基线和整体 Q 版比例。

允许产生差异的项目：

- 发型、发束、角或耳朵的局部轮廓；
- 肩部宽度与躯干宽度；
- 披风、围巾或衣摆轮廓；
- 同类武器的局部原创造型；
- 同一魔法属性下的小型符号形状。

禁止用胸部曲线、裸露面积、细腰、浓妆或睫毛作为女性识别手段。男女差异必须在保持同一套极简卡通语法的前提下完成。

## 5. 种族使用范围

种族不再与所有职业进行组合，只在视觉特征确实必要的职业中保留。

| 种族 | 使用范围 | 固定特征 | 禁止项 |
|---|---|---|---|
| 王国人 | 除下列特殊职业外的 27 个专精 | 圆脸、普通耳型、自然肤色 | 不增加种族符号 |
| 月蚀精灵 | 恶魔猎手 3 专精 | 短长耳、额侧小角或眼部暗带，三选二 | 不使用现有游戏的眼罩、纹身或刃轮廓 |
| 森灵 | 德鲁伊 4 专精 | 圆脸、叶片发饰、短长耳 | 不直接复制任何动物形态或现有德鲁伊套装 |
| 翼鳞族 | 唤魔师 3 专精 | 圆脸、短角、耳后小鳞片或折叠小翼 | 不使用写实龙头和大面积龙翼 |
| 角裔 | 萨满祭司 3 专精 | 圆脸、一对短钝角、粗发束 | 不使用特定图腾纹章或现有种族脸型 |

数量统计：

- 王国人：27 专精 × 2 性别 = 54 张。
- 特殊种族：13 专精 × 2 性别 = 26 张。
- 总计：80 张。

死亡骑士的苍白肤色、符文冷光和亡者气息属于职业状态，不单独建立种族。

## 6. 40 专精资产清单

每一行分别生成男性 `M` 与女性 `F` 两张完整单图。

| ID | 职业 | 专精 | 种族 | 核心武器 | 轮廓与魔法识别 | 主色 |
|---|---|---|---|---|---|---|
| DK-BLD | 死亡骑士 | 鲜血 | 王国人 | 克制的双手符文斧 | 重肩甲、单枚血红符文 | 暗红、铁灰 |
| DK-FRO | 死亡骑士 | 冰霜 | 王国人 | 成对短符文剑 | 短毛领、浅蓝冰晶 | 冰蓝、深钢蓝 |
| DK-UHO | 死亡骑士 | 邪恶 | 王国人 | 双手符文剑 | 不对称肩甲、单枚病绿符文 | 暗绿、炭灰 |
| DH-HAV | 恶魔猎手 | 浩劫 | 月蚀精灵 | 成对短月刃 | 小角、暗色眼带、一个绿焰刻痕 | 墨绿、黑紫 |
| DH-VEN | 恶魔猎手 | 复仇 | 月蚀精灵 | 单把厚月刃 | 较宽护臂、一个橙红封印 | 深紫、熔橙 |
| DH-DEV | 恶魔猎手 | 噬灭 | 月蚀精灵 | 成对短虚空刃 | 后掠短角、一个紫蓝虚空晶体 | 靛紫、冷蓝 |
| DR-BAL | 德鲁伊 | 平衡 | 森灵 | 新月顶端短法杖 | 叶片发饰、单枚月日双色符号 | 夜蓝、暖金 |
| DR-FER | 德鲁伊 | 野性 | 森灵 | 成对短爪套 | 后掠发束、叶形肩片 | 苔绿、赤褐 |
| DR-GUA | 德鲁伊 | 守护 | 森灵 | 树皮圆盾与短木槌 | 宽躯干、单层树皮护肩 | 深绿、木棕 |
| DR-RES | 德鲁伊 | 恢复 | 森灵 | 芽叶顶端法杖 | 柔和叶冠、一个水滴形嫩芽 | 叶绿、浅青 |
| EV-DEV | 唤魔师 | 湮灭 | 翼鳞族 | 短鳞杖 | 短角、小翼、一个红蓝能量晶 | 赤红、深蓝 |
| EV-PRE | 唤魔师 | 恩护 | 翼鳞族 | 螺旋短法杖 | 圆弧翼片、一个翠金生命环 | 翠绿、暖金 |
| EV-AUG | 唤魔师 | 增辉 | 翼鳞族 | 晶石拳套 | 厚鳞护肩、一个琥珀菱晶 | 琥珀、靛蓝 |
| HU-BEA | 猎人 | 野兽控制 | 王国人 | 短弓与驯兽号角 | 毛边短披肩、爪形扣件 | 森绿、皮棕 |
| HU-MAR | 猎人 | 射击 | 王国人 | 简洁长弓 | 单侧护眼发束、箭羽肩饰 | 松绿、金棕 |
| HU-SUR | 猎人 | 生存 | 王国人 | 短柄猎矛 | 轻皮甲、单枚陷阱扣件 | 橄榄绿、铁灰 |
| MA-ARC | 法师 | 奥术 | 王国人 | 紫晶短法杖 | 圆顶兜帽、一个紫色菱晶 | 紫罗兰、深蓝 |
| MA-FIR | 法师 | 火焰 | 王国人 | 火晶短杖 | 火焰形发束、单枚橙红火滴 | 红橙、暗红 |
| MA-FRO | 法师 | 冰霜 | 王国人 | 冰晶法杖 | 圆毛领、单枚六角冰晶 | 冰蓝、海军蓝 |
| MO-BRE | 武僧 | 酒仙 | 王国人 | 短杖与小酒壶 | 圆肩布衣、绳结腰带 | 玉绿、陶棕 |
| MO-MIS | 武僧 | 织雾 | 王国人 | 弯顶短杖 | 宽袖、单枚浅青雾旋 | 青绿、米白 |
| MO-WIN | 武僧 | 踏风 | 王国人 | 圆形拳套 | 束袖、短飘带、一个风纹 | 翠绿、黑青 |
| PA-HOL | 圣骑士 | 神圣 | 王国人 | 单手锤与小圣典 | 圆肩金边甲、一个暖金日轮 | 金黄、象牙白 |
| PA-PRO | 圣骑士 | 防护 | 王国人 | 单手锤与圆盾 | 厚重对称肩甲、盾面原创菱纹 | 皇家蓝、暖金 |
| PA-RET | 圣骑士 | 惩戒 | 王国人 | 克制的双手战锤 | 短披风、单枚金色光痕 | 暖金、深红 |
| PR-DIS | 牧师 | 戒律 | 王国人 | 短杖与小经卷 | 黑白双层领巾、一个金紫圆环 | 象牙白、紫金 |
| PR-HOL | 牧师 | 神圣 | 王国人 | 圆环顶端法杖 | 柔和兜帽、单枚暖白光环 | 白金、浅蓝 |
| PR-SHA | 牧师 | 暗影 | 王国人 | 短匕首与小虚空珠 | 深兜帽、一个紫黑眼形晶体 | 深紫、炭黑 |
| RO-ASS | 潜行者 | 奇袭 | 王国人 | 成对短匕首 | 高围巾、不对称小药瓶 | 暗红、黑灰 |
| RO-OUT | 潜行者 | 狂徒 | 王国人 | 短弯刀与小型手铳 | 翻领短外套、单枚铜扣 | 海军蓝、铜棕 |
| RO-SUB | 潜行者 | 敏锐 | 王国人 | 成对短刃 | 深色兜帽、一个浅紫烟纹 | 黑紫、冷灰 |
| SH-ELE | 萨满祭司 | 元素 | 角裔 | 石晶短杖 | 短钝角、一个火雷双色晶 | 土棕、闪电蓝 |
| SH-ENH | 萨满祭司 | 增强 | 角裔 | 成对短战斧 | 粗发束、单枚风纹护肩 | 深青、铁灰 |
| SH-RES | 萨满祭司 | 恢复 | 角裔 | 图腾形短杖 | 圆角肩布、一个清水旋纹 | 水蓝、沙棕 |
| WL-AFF | 术士 | 痛苦 | 王国人 | 弯顶诅咒杖 | 深兜帽、单枚病绿魂石 | 暗绿、黑紫 |
| WL-DEM | 术士 | 恶魔学识 | 王国人 | 短杖与小魔典 | 尖肩布衣、一个紫色封印 | 紫黑、暗红 |
| WL-DES | 术士 | 毁灭 | 王国人 | 火晶法杖 | 断续衣摆、一个橙绿混沌晶 | 炭黑、熔橙 |
| WA-ARM | 战士 | 武器 | 王国人 | 简洁双手剑 | 单侧厚肩甲、长围巾 | 铁灰、深红 |
| WA-FUR | 战士 | 狂怒 | 王国人 | 成对中型战斧 | 宽肩短甲、一道红色布带 | 暗钢、猩红 |
| WA-PRO | 战士 | 防护 | 王国人 | 短剑与圆盾 | 重肩甲、盾面原创横纹 | 钢蓝、铜金 |

## 7. 单图提示词结构

每张图的提示词必须包含以下固定结构，只有角色变量允许变化：

```text
Use case: stylized-concept
Asset type: H5 idle RPG complete single-character hero master
Input image: Image 1 is the sole authoritative style reference. Use only its simplified visual language, proportions, line weight, eyes, hands, feet, flat color treatment, and restrained weapon scale. Do not copy any depicted character.
Primary request: Generate exactly one complete original <性别><种族><职业><专精> hero from scratch as one coherent illustration.
Subject: <本行武器、轮廓、头部识别点、身体识别点、专精符号与配色>
Composition: right-facing three-quarter side view, both oval eyes visible, neutral combat-ready idle pose, full body. Keep the body anchors—outer head, core torso, circle hands, short legs and feet—at one shared scale: exactly 74% canvas height, horizontally centered, feet on one baseline. Weapons, shields and detached magic symbols may extend beyond the body frame while keeping generous outer padding.
Style: ultra-simple cute fantasy cartoon, 1.45–1.65 heads tall, huge round face, hidden neck, tiny torso, two circle hands, two extremely short legs, very thick rounded near-black outline at the same visual weight as the reference, minimal inner lines, 4–6 flat colors.
Equipment mechanics: the hero faces right and the right side is the combat direction. Validate the full limb chain before the weapon direction: shoulder, elbow, wrist, round hand and grip must form one natural continuous load path. A forward-pointing weapon arm must hang naturally or reach slightly forward with the elbow below the shoulder; never pull the upper arm behind the torso while twisting the weapon forward. Every ready-position attack weapon must extend right or upper-right from its own grip. In a dual-wield loadout, both weapons point in that same screen-right combat direction: both blade or claw tips, axe or hammer working-head centers, and firearm muzzles must have an x-coordinate greater than their own gripping hands. Never mirror a dual-wield pair outward. In every weapon-and-shield loadout, the anatomical left hand on screen-right carries the attack weapon and the anatomical right hand on screen-left carries the shield. Put each round hand on a real grip; keep guards between hand and blade, weapon heads beyond the hand, shield face braced toward front-right, and bow string on the character side with any arrowhead pointing right. No mirrored, backward, upside-down, reverse-gripped or hand-piercing equipment.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for later removal.
Constraints: exactly one character; one cohesive body; complete weapon; keep the same head width, core torso width, hand diameter and foot size regardless of equipment complexity; never shrink the body to make a weapon, shield, armor, cape or halo fit—simplify or reposition the equipment instead; no mouth, nose, eyebrows, eyelashes, fingers, text, logo, watermark, UI, frame, ground, cast shadow, glow cloud, pet, companion, second character, character sheet, turnaround, callout, panels, separate equipment, spare parts, collage, modular pieces, template or sprite sheet.
Avoid: front-facing pose, realistic anatomy, long legs, small head, sharp chin, thin lines, painterly rendering, glossy 3D, complex armor filigree, oversized weapon, copied game armor, copied artifact weapon, faction insignia. Do not use #ff00ff in the character.
```

每张图片都必须重新提交完整提示词，不能依赖上一张图片的隐含上下文。

## 8. 输出结构

```text
docs/art/generated/heroes/
├── chroma/          # 内部保留的带纯色背景原图
├── master/          # 1024 × 1024 透明 PNG
├── runtime/         # 512 × 512 透明 WebP
├── portraits/       # 256 × 256 头像 WebP
├── previews/        # 96 px 可读性预览与职业联系表
└── review/          # 复查记录及联系表
```

命名：

```text
hero_<小写专精ID>_<m|f>_master_v01.png
hero_<小写专精ID>_<m|f>_runtime_v01.webp
hero_<小写专精ID>_<m|f>_portrait_v01.webp
```

例如：

```text
hero_pa_pro_m_master_v01.png
hero_pa_pro_f_master_v01.png
```

## 9. 内部生产顺序

生产可以分批执行，但只在 80 张全部完成并通过检查后一次性交付：

1. 六张内部校准图：防护战士男、火焰法师女、射击猎人男、噬灭恶魔猎手女、恩护唤魔师男、守护德鲁伊女。
2. 校准图通过内部复查后，按职业生成男女锚点。
3. 依次完成死亡骑士、恶魔猎手、德鲁伊、唤魔师、猎人、法师、武僧、圣骑士、牧师、潜行者、萨满祭司、术士、战士。
4. 每一张都是独立完整生成，不把内部校准图作为可拼接底板。
5. 最终统一移除纯色背景、导出尺寸、生成联系表并检查 80 张完整性。

## 10. 自主复查与重做规则

### 10.1 机器检查

每张正式母版必须满足：

- 文件格式为带 Alpha 通道的 PNG。
- 尺寸为 `1024 × 1024`。
- 四角完全透明。
- 非透明主体没有触碰画布边缘。
- PNG 元数据中的 `hero_body_bbox` 必须记录本体框，框高为 `760 px`、水平中心为 `x=512`、底边为 `y=930`。
- 完整可见轮廓四周安全边距不低于 `32 px`；装备超限时退回重做，不得缩小本体。
- 文件名与 80 项清单完全匹配，不缺失、不重复。
- 512 WebP、256 头像和 96 px 预览均可正常解码。

### 10.2 视觉检查

每张图逐项判定：

- [ ] 只有一名完整角色，没有角色板、配件板或额外角色。
- [ ] 朝右三分之四侧身，不是正面立绘。
- [ ] 头部足够圆且足够大，腿部极短。
- [ ] 本体高度、头宽、核心躯干宽、圆手直径和脚部大小与同屏英雄一致；装备复杂度没有改变本体比例。
- [ ] 两只椭圆眼睛清晰，没有嘴、鼻、眉毛和睫毛。
- [ ] 两只手均为圆形，没有手指。
- [ ] 外轮廓粗、圆、连续，不出现细碎线条。
- [ ] 在实际战斗显示尺寸下，描边粗细与统一英雄锚点一致。
- [ ] 武器完整、克制且能辨识，不遮挡脸部和主要身体。
- [ ] 装备与人物朝向一致；双持攻击武器的两个工作端都朝画面右侧；盾武角色由人物左手（画面右侧）持武器、人物右手（画面左侧）持盾；圆手握在正确位置，工作端和刃口没有拿反、倒置、穿手或镜像错误。
- [ ] 专精通过武器、主色和一个符号被识别。
- [ ] 与权威参考在极简程度、Q 版比例和线条粗度上相符。
- [ ] 不包含第三方套装、武器、纹章或角色的可识别复制。
- [ ] 缩至 96 px 高时，角色、武器和主色仍然清楚。

### 10.3 自动重做

出现以下任意情况时，不进入最终交付，直接重新生成整张角色：

- 多角色、多视图、拼图、拆件或装备展示板；
- 正面站姿、长腿、写实身体或小头比例；
- 线条明显偏细、内部装饰过多；
- 五官多出嘴、鼻、眉毛或睫毛；
- 手指出现或手部不是圆形；
- 武器过大、残缺、穿插身体或职业不可识别；
- 角色被裁切、触边或背景无法干净去除；
- 与权威参考图的整体语言明显不一致。

重做时只调整导致失败的提示词变量，同时仍重新生成完整角色。不得通过拼接旧图进行修复。

## 11. 最终交付

一次性交付：

- 80 张 `1024 × 1024` 透明 PNG 母版；
- 80 张 `512 × 512` 透明 WebP 运行时图；
- 80 张 `256 × 256` WebP 头像；
- 13 张按职业排列的联系表；
- 1 张全体 80 人总览联系表；
- 1 份文件完整性与复查报告；
- 本规范、最终资产清单和实际使用的提示词记录。

在所有文件完成前不进行分批验收，也不把尚未通过内部检查的图片作为最终资产交付。
