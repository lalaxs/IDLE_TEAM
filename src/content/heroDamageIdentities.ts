import type { DamageElement } from "../simulation/types";

export interface HeroDamageIdentity {
  id: string;
  name: string;
  damageSchool: "physical" | "magic";
  damageElement: DamageElement;
}

/** Playable H01–H08 plus planned H09–H40. One school and one element per hero. */
export const HERO_DAMAGE_IDENTITIES: readonly HeroDamageIdentity[] = [
  { id: "H01", name: "洛恩", damageSchool: "physical", damageElement: "physical" },
  { id: "H02", name: "布兰", damageSchool: "physical", damageElement: "physical" },
  { id: "H03", name: "米娅", damageSchool: "magic", damageElement: "fire" },
  { id: "H04", name: "诺拉", damageSchool: "magic", damageElement: "holy" },
  { id: "H05", name: "塔林", damageSchool: "physical", damageElement: "physical" },
  { id: "H06", name: "乌鸦", damageSchool: "physical", damageElement: "dark" },
  { id: "H07", name: "塞拉", damageSchool: "magic", damageElement: "frost" },
  { id: "H08", name: "海泽", damageSchool: "magic", damageElement: "lightning" },
  { id: "H09", name: "莫尔", damageSchool: "physical", damageElement: "dark" },
  { id: "H10", name: "伊芙", damageSchool: "physical", damageElement: "frost" },
  { id: "H11", name: "维恩", damageSchool: "magic", damageElement: "dark" },
  { id: "H12", name: "凯恩", damageSchool: "physical", damageElement: "dark" },
  { id: "H13", name: "黛拉", damageSchool: "physical", damageElement: "fire" },
  { id: "H14", name: "薇尔", damageSchool: "magic", damageElement: "dark" },
  { id: "H15", name: "月桑", damageSchool: "magic", damageElement: "dark" },
  { id: "H16", name: "里芙", damageSchool: "physical", damageElement: "physical" },
  { id: "H17", name: "托尔", damageSchool: "physical", damageElement: "physical" },
  { id: "H18", name: "露芽", damageSchool: "magic", damageElement: "frost" },
  { id: "H19", name: "赤鳞", damageSchool: "magic", damageElement: "fire" },
  { id: "H20", name: "翠环", damageSchool: "magic", damageElement: "frost" },
  { id: "H21", name: "安珀", damageSchool: "physical", damageElement: "fire" },
  { id: "H22", name: "霍克", damageSchool: "physical", damageElement: "physical" },
  { id: "H23", name: "卡恩", damageSchool: "physical", damageElement: "physical" },
  { id: "H24", name: "伊琳", damageSchool: "magic", damageElement: "dark" },
  { id: "H25", name: "杜衡", damageSchool: "physical", damageElement: "physical" },
  { id: "H26", name: "岚纱", damageSchool: "magic", damageElement: "frost" },
  { id: "H27", name: "凌风", damageSchool: "physical", damageElement: "physical" },
  { id: "H28", name: "奥琳", damageSchool: "magic", damageElement: "lightning" },
  { id: "H29", name: "加伦", damageSchool: "magic", damageElement: "lightning" },
  { id: "H30", name: "雷默", damageSchool: "physical", damageElement: "lightning" },
  { id: "H31", name: "克莱", damageSchool: "magic", damageElement: "lightning" },
  { id: "H32", name: "墨薇", damageSchool: "magic", damageElement: "dark" },
  { id: "H33", name: "柯特", damageSchool: "physical", damageElement: "physical" },
  { id: "H34", name: "幽翎", damageSchool: "physical", damageElement: "dark" },
  { id: "H35", name: "图鲁", damageSchool: "physical", damageElement: "lightning" },
  { id: "H36", name: "娜薇", damageSchool: "magic", damageElement: "frost" },
  { id: "H37", name: "格蕾", damageSchool: "magic", damageElement: "dark" },
  { id: "H38", name: "摩恩", damageSchool: "magic", damageElement: "dark" },
  { id: "H39", name: "索尔", damageSchool: "magic", damageElement: "fire" },
  { id: "H40", name: "卡尔", damageSchool: "physical", damageElement: "physical" },
] as const;
