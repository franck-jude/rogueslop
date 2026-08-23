# Review of game.js

## 1. Architecture (Modularity, Structure)

### Strengths
- **Centralized state management** - Using a single `game` object makes state tracking straightforward
- **Clear functional decomposition** - Functions are organized by responsibility (generation, rendering, combat, etc.)
- **Separation of concerns** - Rendering, game logic, and input handling are reasonably separated
- **Good use of constants** - Game parameters are defined at the top for easy tuning

### Issues
- **Monolithic state object** - The `game` object is a dumping ground for all game state; this makes testing difficult
- **Tight coupling between map and entities** - The map stores visual symbols, but entity positions are duplicated in separate arrays, creating synchronization risks
- **No clear module boundaries** - All code in one file without import/export, making it hard to test in isolation
- **Mixed concerns in `moveMonsters`** - This function handles pathfinding, combat, and map updates all at once

### Suggestion
Consider splitting into modules: `state.js`, `dungeon.js`, `combat.js`, `rendering.js`, `input.js`

---

## 2. Code Quality (Naming, Comments, Duplication)

### Strengths
- **Good variable names** - `nx`, `ny`, `rx`, `ry` are clear in context
- **Section comments** - The `// ============================================================` markers make navigation easy
- **Consistent formatting** - Good use of whitespace and alignment
- **Clear function names** - `pickupItem`, `movePlayer`, `attackMonster` are self-explanatory

### Issues
- **Inconsistent comment style** - Mix of French and English comments
- **Magic numbers** - `3 + Math.floor(level / 2)` for monster count is not self-documenting
- **Duplicate rendering logic** - The `render()` function has repetitive if/else for each emoji/character
- **`isTileFree` is overly complex** - Checks multiple conditions, some of which are redundant
- **Naming conflict** - `randomInt` vs built-in `Math.random` - could be confused

### Example of duplication
```javascript
// In render() - could be a mapping object
else if (ch === 'g') row += 'g';
else if (ch === 's') row += 's';
// ... 10+ similar lines
```

---

## 3. Complexity (Functions, Conditions)

### Strengths
- **Most functions are single-purpose** - Good separation in `movePlayer` and `generateDungeon`
- **Reasonable function sizes** - Most functions are under 40 lines
- **Good use of early returns** - Reduces nesting in `movePlayer`

### Issues
- **`moveMonsters` is too complex** (50+ lines, 4 levels of nesting):
  ```javascript
  game.monsters.forEach(m => {
    if (dist <= MONSTER_ATTACK_RANGE) {
      // 30 lines of pathfinding + combat
    } else {
      // 10 lines of random movement
    }
  });
  ```
- **`handleStairs` has nested conditionals** that could be streamlined
- **`useItem` uses if/else chain** - A strategy pattern would be cleaner
- **`generateDungeon` has duplicate placement logic** for monsters and items

### Cyclomatic complexity
- `moveMonsters`: ~12 (high)
- `render`: ~15 (high, due to character mapping)
- `useItem`: ~10 (moderate)

---

## 4. Bugs & Edge Cases

### Critical Bugs

1. **`isTileFree` doesn't check monster HP** - Dead monsters remain on map until filtered
   ```javascript
   // In moveMonsters - HP check happens after position check
   if (nx === game.player.x && ny === game.player.y) {
     // Combat... but monster may already be dead!
   }
   ```

2. **Stairs can be walked on but remain** - When you step on stairs, you teleport but the stair symbol remains, creating visual inconsistency

3. **`randomInt` max/min off by one** - `Math.random() * (max - min + 1)` includes the max, but when min=0, max=1, it should return 0 or 1

4. **`handleStairs` doesn't clear the map** - Walking on stairs triggers level generation but the '>' or '<' symbol persists

5. **Game over state doesn't stop monster movement** - If player dies, monsters can still move in `moveMonsters` before the game over flag is checked

6. **Inventory item use with `useItem` doesn't check if item exists** - The function tries to pop an item even if not found

### Edge Cases

| Scenario | Current Behavior | Expected |
|----------|------------------|----------|
| Monster spawns on item | `isTileFree` prevents overlap | ✅ Good |
| Player at map edge trying to move | `clamp` prevents going out | ✅ Good |
| No items to pickup | Logs "Rien a ramasser" | ✅ Good |
| All monsters defeated | `game.monsters` empty, no attacks | ⚠️ Player can't progress unless stairs exist |
| Inventory full and step on item | Logs "Inventaire plein !" | ⚠️ Item stays on map - can pick up later |

### Duplicate Position Data Risk
```javascript
// Player position stored in two places
game.player.x = x;        // State object
map[y][x] = '@';          // Map object
// If these get out of sync, rendering breaks
```

---

## 5. Concrete Suggestions for Improvement

### Suggestion 1: Extract Character Rendering to Mapping Object
```javascript
// Before: render() with 15 if/else statements
// After:
const CHAR_MAP = {
    '#': '#', 'g': 'g', 's': 's', 'o': 'o', 
    'd': 'd', 'r': 'r', '❤️': '❤️', '⚔️': '⚔️',
    '🛡️': '🛡️', '📜': '📜', '@': '@', '.': '.'
};
// Then: row += CHAR_MAP[ch] || ch;
```

### Suggestion 2: Separate Monster AI into Its Own Function
```javascript
function updateMonster(monster) {
    const distance = getDistance(monster, game.player);
    if (distance <= MONSTER_ATTACK_RANGE) {
        return pursuePlayer(monster);
    } else {
        return wanderRandomly(monster);
    }
}

function pursuePlayer(monster) {
    // Only pathfinding logic
}

function wanderRandomly(monster) {
    // Only random movement logic
}
```

### Suggestion 3: Use a Strategy Pattern for Items
```javascript
const ITEM_EFFECTS = {
    '❤️': (player) => { 
        const heal = 10 + Math.floor(Math.random() * 10);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        return `Potion utilisée (+${heal} PV)`;
    },
    '⚔️': (player) => { 
        player.attack += 2;
        return 'Attaque augmentée de 2 !';
    },
    // etc.
};

function useItem(itemType) {
    const effect = ITEM_EFFECTS[itemType];
    if (!effect) return 'Objet inconnu';
    // ... use effect
}
```

### Suggestion 4: Add Validation Before Map Updates
```javascript
function syncMapWithState() {
    // Rebuild map from game state to prevent desync
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (game.map[y][x] === '@') game.map[y][x] = '.';
            if (game.map[y][x] === game.player.symbol) game.map[y][x] = '.';
        }
    }
    // Then apply all entities
    game.map[game.player.y][game.player.x] = '@';
    game.monsters.forEach(m => game.map[m.y][m.x] = m.symbol);
    game.items.forEach(i => game.map[i.y][i.x] = i.type);
}
```

### Suggestion 5: Extract Constants to Configuration Object
```javascript
// Before: W = 30, H = 15, MAX_LEVEL = 10 scattered
// After:
const CONFIG = {
    world: { width: 30, height: 15 },
    player: { startHp: 20, startAtk: 5, startDef: 2 },
    monsters: { maxPerLevel: 3, attackRange: 3 },
    inventory: { maxSize: 20 },
    dungeon: { roomMinSize: 4, roomMaxSize: 6, maxLevel: 10 }
};

// Then: CONFIG.world.width instead of W
```

---

## Summary Table

| Category | Score (1-10) | Notes |
|----------|--------------|-------|
| Architecture | 6 | Good separation but needs module structure |
| Code Quality | 7 | Clear but some duplication |
| Complexity | 6 | Most functions good, but `moveMonsters` too complex |
| Bug Resilience | 5 | Several critical bugs identified |
| Extensibility | 6 | Easy to modify, hard to test |
| **Overall** | **6/10** | Solid foundation with room for improvement |

---

### Priority Fix Order
1. ✅ Fix inventory bug in `useItem`
2. ✅ Fix game-over state preventing monster movement
3. ✅ Extract rendering mapping to object
4. ✅ Split monster AI into separate functions
5. ✅ Add state sync validation function
6. ⭐ Refactor item effects to strategy pattern

This is a well-structured game with clear intent. The main issues are around state consistency, monster AI complexity, and some edge cases in inventory/stair handling. The proposed changes would make the code more maintainable and robust without changing the gameplay.