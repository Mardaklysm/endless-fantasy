import { generateWorld } from "../../src/world/worldGenerator.ts";
import { isWorldTileWalkable, worldTileHasTag } from "../../src/data/worldTiles.ts";

const worldCount = 100;
let firstSignature = "";
let sawDifferentWorld = false;

for (let i = 0; i < worldCount; i += 1) {
  const world = generateWorld({ seed: `worldgen-test-${i}` });
  assert(world.validation.valid, `World ${i} failed validation: ${world.validation.errors.join("; ")}`);
  assert(isWorldTileWalkable(world.tiles[world.startPosition.y][world.startPosition.x]), `World ${i} start is blocked.`);
  assert(world.bridges.length > 0, `World ${i} did not create a bridge.`);

  for (const poi of world.pois) {
    const tile = world.tiles[poi.y][poi.x];
    assert(!worldTileHasTag(tile, "water"), `World ${i} POI ${poi.id} was placed on water.`);
    assert(isWorldTileWalkable(tile), `World ${i} POI ${poi.id} was placed on blocked terrain.`);
    assert(world.validation.reachablePoiIds.includes(poi.id), `World ${i} POI ${poi.id} was not reachable.`);
  }

  for (const row of world.tiles) {
    for (const tile of row) {
      if (worldTileHasTag(tile, "water") && !worldTileHasTag(tile, "bridge")) {
        assert(!isWorldTileWalkable(tile), `World ${i} water tile ${tile} is walkable.`);
      }
      if (worldTileHasTag(tile, "bridge")) {
        assert(isWorldTileWalkable(tile), `World ${i} bridge tile ${tile} is not walkable.`);
      }
    }
  }

  const signature = world.tiles.map((row) => row.join(",")).join("|");
  if (i === 0) firstSignature = signature;
  else if (signature !== firstSignature) sawDifferentWorld = true;
}

const stableA = generateWorld({ seed: "worldgen-stable-seed" });
const stableB = generateWorld({ seed: "worldgen-stable-seed" });
assert(JSON.stringify(stableA.tiles) === JSON.stringify(stableB.tiles), "Same seed produced different tile grids.");
assert(JSON.stringify(stableA.pois) === JSON.stringify(stableB.pois), "Same seed produced different POIs.");
assert(sawDifferentWorld, "Different seeds did not produce meaningfully different tile grids.");

console.log(`Worldgen validation passed for ${worldCount} generated worlds.`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
