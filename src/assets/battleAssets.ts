import {
  BATTLE_FOREGROUND_PROP_NAMES,
  getBattleBackgroundKeys,
  getBattleForegroundPropTextureKey,
  getBattleLayerTextureKey,
  type BattleForegroundPropName,
  type BattleLayerName,
  type BattleLayerPackKey,
} from "../content/battleBackgrounds";
import {
  createEncounterDefinitions,
  createStageEncounterPlan,
} from "../simulation/WaveSystem";
import { ACCOUNT_CURRENCY_BY_ID } from "../content/currencies";
import { getStageEquipmentDropPool } from "../progression/EquipmentPool";
import type { BattleSnapshot } from "../simulation/types";
import { ASSET_MANIFEST } from "./manifest";

export interface BattleAssetRequest {
  textureKey: string;
  path: string;
  kind: "image" | "svg";
}

type BattleAssetSnapshot = Pick<BattleSnapshot, "stage" | "seed" | "units">;

function request(textureKey: string, path: string): BattleAssetRequest {
  return { textureKey, path, kind: path.endsWith(".svg") ? "svg" : "image" };
}

export function getBattleAssetSignature(snapshot: BattleAssetSnapshot): string {
  const heroIds = snapshot.units
    .filter(({ team }) => team === "heroes")
    .map(({ sourceId }) => sourceId)
    .sort();
  return `${snapshot.stage}:${snapshot.seed}:${heroIds.join(",")}`;
}

/** Assets needed for the current party and every encounter in one stage. */
export function getBattleAssetRequests(snapshot: BattleAssetSnapshot): BattleAssetRequest[] {
  const sourceIds = new Set(
    snapshot.units.map(({ sourceId }) => sourceId),
  );
  const encounters = [
    ...createStageEncounterPlan(snapshot.stage, snapshot.seed),
    createEncounterDefinitions(snapshot.stage, 1, snapshot.seed, true),
  ];
  for (const encounter of encounters) {
    for (const { enemyId } of encounter) {
      sourceIds.add(enemyId);
    }
  }

  const requests: BattleAssetRequest[] = [];
  const characters = ASSET_MANIFEST.characters as Record<string, string>;
  for (const sourceId of sourceIds) {
    const path = characters[sourceId];
    if (path) requests.push(request(`character-${sourceId}`, path));
  }

  requests.push(request("loot-gold", ACCOUNT_CURRENCY_BY_ID.gold.icon));
  for (const item of getStageEquipmentDropPool(snapshot.stage)) {
    requests.push(request(`loot-equipment-${item.id}`, item.icon));
  }

  const { stageKey, foregroundKey, layerPackKey } = getBattleBackgroundKeys(snapshot.stage);
  const stages = ASSET_MANIFEST.backgrounds.stages as Record<string, string>;
  const foregrounds = ASSET_MANIFEST.backgrounds.foregrounds as Record<string, string>;
  const stagePath = stages[stageKey];
  const foregroundPath = foregrounds[foregroundKey];
  if (stagePath) requests.push(request(`background-${stageKey}`, stagePath));
  if (foregroundPath) requests.push(request(`background-${foregroundKey}`, foregroundPath));
  if (layerPackKey) {
    const packs = ASSET_MANIFEST.backgrounds.layerPacks as Record<
      BattleLayerPackKey,
      Record<BattleLayerName, string>
    >;
    for (const [layer, path] of Object.entries(packs[layerPackKey])) {
      requests.push(
        request(
          getBattleLayerTextureKey(layerPackKey, layer as BattleLayerName),
          path,
        ),
      );
    }
    const propPacks = ASSET_MANIFEST.backgrounds.foregroundProps as Record<
      BattleLayerPackKey,
      Record<BattleForegroundPropName, string>
    >;
    for (const prop of BATTLE_FOREGROUND_PROP_NAMES) {
      requests.push(
        request(
          getBattleForegroundPropTextureKey(layerPackKey, prop),
          propPacks[layerPackKey][prop],
        ),
      );
    }
  }
  return requests;
}
