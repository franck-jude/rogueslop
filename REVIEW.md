Create a file projects/roguelike/REVIEW.md
[code]
# Review of game.js

## Architecture (Score: 6/10)
- **Monolithic structure**: All logic is in a single file (~500 lines). No separation of concerns.
- **Global state**: Heavy use of global variables (`map`, `player`, `monsters`, etc.) makes the code hard to test and reason about.
- **No module system**: No imports/exports. This prevents reusability and makes the file a single point of failure.
- **Separation of concerns**: Some attempts at separation (`generateDungeon`, `render`, `movePlayer`) but still tightly coupled.

## Code Quality (Score: 5/10)
- **Naming**: Mostly clear (`movePlayer`, `attackMonster`), but some abbreviations (`W`, `H`, `rx`, `ry`) could be more explicit.
- **Comments**: Minimal. Some sections have headers, but function-level documentation is missing.
- **Duplication**: Monster creation logic is repeated. Rendering logic is mixed with game logic.
- **Magic numbers**: Many hardcoded values (`30`, `15`, `25`, `10`, `3`, `5`) without explanation.
- **Constants**: Good use of constants for game parameters (`MAX_LEVEL`, `PLAYER_START_HP`).

## Complexity (Score: 6/10)
- **Functions**: `movePlayer` is ~50 lines, handling movement, stairs, items, and monsters. Too many responsibilities.
- **`moveMonsters`**: ~40 lines, handles both movement and combat logic.
- **Conditions**: `render` function has a long chain of `if/else` for each symbol.
- **Nested logic**: Some deeply nested conditions in `movePlayer` and `moveMonsters`.

## Bugs / Edge Cases
- **Player can move out of bounds**: The `clamp` function prevents this, so it's fixed.
- **Monsters can overlap**: No check to prevent multiple monsters on the same tile.
- **Item pick-up**: Items can be picked up even if player doesn't move onto them (automatic pick-up).
- **Inventory limit**: No limit on inventory size.
- **Game reset**: After death, `R` key resets but some state (items, inventory) may persist.
- **Stairs generation**: Stairs can sometimes be placed unreachable (if room layout changes).

## 5 Concrete Suggestions for Improvement

1. **Split into modules**: Create separate files for `dungeon.js`, `player.js`, `monster.js`, `combat.js`, `items.js`, `render.js`. Use `module.exports` and `require()`.
2. **Use a state object**: Replace global variables with a `game` object that holds all state. This makes resetting easier and improves testability.
3. **Refactor `movePlayer`**: Break it into smaller functions: `handleStairs()`, `handleItems()`, `handleMonsters()`, `handleMovement()`.
4. **Add edge case handling**: Prevent monster overlap (check if tile is free). Add inventory limit (max 20 items). Ensure stairs are placed in reachable locations.
5. **Extract constants**: Replace magic numbers (`3`, `5`, `25`, `10`) with named constants (`MONSTER_SPAWN_RADIUS`, `ROOM_MIN_SIZE`, etc.) at the top.
[/code]