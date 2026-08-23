Create a file projects/roguelike/game.js
```javascript
// ============================================================
// 1. CONFIGURATION
// ============================================================

const CONFIG = {
    world: { width: 30, height: 15 },
    player: { startHp: 20, startAtk: 5, startDef: 2 },
    monsters: { baseCount: 3, attackRange: 3 },
    inventory: { maxSize: 20 },
    dungeon: { roomMinSize: 4, roomMaxSize: 6, maxLevel: 10 }
};

// ============================================================
// 2. CONSTANTES
// ============================================================

const W = CONFIG.world.width;
const H = CONFIG.world.height;
const MAX_LEVEL = CONFIG.dungeon.maxLevel;
const PLAYER_START_HP = CONFIG.player.startHp;
const PLAYER_START_ATK = CONFIG.player.startAtk;
const PLAYER_START_DEF = CONFIG.player.startDef;
const MONSTER_ATTACK_RANGE = CONFIG.monsters.attackRange;
const MAX_INVENTORY = CONFIG.inventory.maxSize;
const ROOM_MIN_SIZE = CONFIG.dungeon.roomMinSize;
const ROOM_MAX_SIZE = CONFIG.dungeon.roomMaxSize;

// ============================================================
// 3. ÉTAT DU JEU (centralisé)
// ============================================================

const game = {
    map: [],
    player: { x: 0, y: 0, hp: PLAYER_START_HP, maxHp: PLAYER_START_HP, attack: PLAYER_START_ATK, defense: PLAYER_START_DEF },
    monsters: [],
    items: [],
    inventory: [],
    gameOver: false,
    turn: 0,
    log: [],
    currentLevel: 1
};

// ============================================================
// 4. UTILITAIRES
// ============================================================

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isTileFree(x, y, excludePlayer = true) {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    if (game.map[y][x] !== '.' && game.map[y][x] !== '>') return false;
    if (excludePlayer && x === game.player.x && y === game.player.y) return false;
    if (game.monsters.some(m => m.x === x && m.y === y && m.hp > 0)) return false;
    if (game.items.some(i => i.x === x && i.y === y)) return false;
    return true;
}

function getDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// ============================================================
// 5. RENDU (extrait des caractères)
// ============================================================

const CHAR_MAP = {
    '#': '#',
    '.': '.',
    '@': '@',
    '>': '>',
    '<': '<',
    'g': 'g',
    's': 's',
    'o': 'o',
    'd': 'd',
    'r': 'r',
    '❤️': '❤️',
    '⚔️': '⚔️',
    '🛡️': '🛡️',
    '📜': '📜'
};

function getChar(ch) {
    return CHAR_MAP[ch] || ch;
}

// ============================================================
// 6. GÉNÉRATION DU DONJON
// ============================================================

function generateDungeon(level = 1) {
    const map = [];
    for (let y = 0; y < H; y++) {
        map[y] = [];
        for (let x = 0; x < W; x++) {
            map[y][x] = '#';
        }
    }

    const growth = Math.min(level, 5);
    const rx = 2, ry = 2, rw = 25 + growth, rh = 10 + growth;
    for (let y = ry; y < ry + rh && y < H; y++) {
        for (let x = rx; x < rx + rw && x < W; x++) {
            map[y][x] = '.';
        }
    }

    if (level < MAX_LEVEL) {
        const sx = Math.min(rx + rw - 2, W - 1);
        const sy = Math.min(ry + rh - 2, H - 1);
        map[sy][sx] = '>';
    }
    if (level > 1) {
        map[ry + 1][rx + 1] = '<';
    }

    // Items
    game.items = [];
    const numItems = 2 + Math.floor(level / 2);
    for (let i = 0; i < numItems; i++) {
        let placed = false;
        for (let attempts = 0; attempts < 30 && !placed; attempts++) {
            const x = rx + 1 + Math.floor(Math.random() * (rw - 2));
            const y = ry + 1 + Math.floor(Math.random() * (rh - 2));
            if (isTileFree(x, y, true)) {
                const icon = ['❤️', '⚔️', '🛡️', '📜'][Math.floor(Math.random() * 4)];
                map[y][x] = icon;
                game.items.push({ x, y, type: icon });
                placed = true;
            }
        }
    }

    // Monsters
    game.monsters = [];
    const numMonsters = CONFIG.monsters.baseCount + Math.floor(level / 2);
    for (let i = 0; i < numMonsters; i++) {
        let placed = false;
        for (let attempts = 0; attempts < 50 && !placed; attempts++) {
            const x = rx + 1 + Math.floor(Math.random() * (rw - 2));
            const y = ry + 1 + Math.floor(Math.random() * (rh - 2));
            if (isTileFree(x, y, true)) {
                const types = ['g', 's', 'o', 'd', 'r'];
                const type = types[i % types.length];
                const monster = createMonster(type, level);
                monster.x = x;
                monster.y = y;
                game.monsters.push(monster);
                map[y][x] = type;
                placed = true;
            }
        }
    }

    // Player
    game.player.x = Math.min(rx + Math.floor(rw / 2), W - 1);
    game.player.y = Math.min(ry + Math.floor(rh / 2), H - 1);
    map[game.player.y][game.player.x] = '@';

    game.map = map;
    game.log.push('Niveau ' + level + ' genere !');
}

// ============================================================
// 7. CRÉATION DE MONSTRES
// ============================================================

function createMonster(type, level) {
    const base = {
        g: { name: 'Gobelin', hp: 5, attack: 2, defense: 1, symbol: 'g', xp: 5 },
        s: { name: 'Squelette', hp: 8, attack: 3, defense: 2, symbol: 's', xp: 8 },
        o: { name: 'Orque', hp: 12, attack: 5, defense: 3, symbol: 'o', xp: 12 },
        d: { name: 'Demon', hp: 16, attack: 7, defense: 4, symbol: 'd', xp: 18 },
        r: { name: 'Rat', hp: 4, attack: 2, defense: 0, symbol: 'r', xp: 3 }
    };
    const b = base[type] || base.g;
    return {
        name: b.name,
        hp: b.hp + level * 2,
        maxHp: b.hp + level * 2,
        attack: b.attack + Math.floor(level / 2),
        defense: b.defense + Math.floor(level / 3),
        symbol: b.symbol,
        xp: b.xp + level,
        x: 0,
        y: 0
    };
}

// ============================================================
// 8. AFFICHAGE
// ============================================================

function render() {
    const { map, player, monsters, items, inventory, currentLevel } = game;
    console.clear();
    console.log('='.repeat(W + 4));
    console.log('DEMON DES PROFONDEURS');
    console.log('='.repeat(W + 4));
    console.log(`PV: ${player.hp}/${player.maxHp}  Pos: (${player.x},${player.y})  Monstres: ${monsters.length}  Items: ${items.length}`);
    console.log(`Niveau: ${currentLevel}/${MAX_LEVEL}  Inventaire: ${inventory.length}/${MAX_INVENTORY}`);
    console.log('');

    for (let y = 0; y < H; y++) {
        let row = '';
        for (let x = 0; x < W; x++) {
            const ch = map[y][x];
            row += getChar(ch);
        }
        console.log(row);
    }

    console.log('');
    console.log('-'.repeat(W + 4));
    console.log(`Log: ${game.log[game.log.length - 1] || 'Explore le donjon...'}`);
    console.log('='.repeat(W + 4));
    console.log('Fleches: bouger | ESPACE: attaquer | E: ramasser | U: utiliser | I: inventaire | Q: quitter');
}

// ============================================================
// 9. GESTION DES ESCALIERS
// ============================================================

function handleStairs(tile, x, y) {
    if (tile === '>') {
        if (game.currentLevel < MAX_LEVEL) {
            game.currentLevel++;
            generateDungeon(game.currentLevel);
            render();
            game.log.push('Descendu au niveau ' + game.currentLevel);
            return true;
        } else {
            game.log.push('Niveau maximum atteint !');
            render();
            return false;
        }
    }
    if (tile === '<') {
        if (game.currentLevel > 1) {
            game.currentLevel--;
            generateDungeon(game.currentLevel);
            render();
            game.log.push('Remonte au niveau ' + game.currentLevel);
            return true;
        } else {
            game.log.push('Deja au niveau 1');
            render();
            return false;
        }
    }
    return null;
}

// ============================================================
// 10. GESTION DES ITEMS (avec stratégie)
// ============================================================

const ITEM_EFFECTS = {
    '❤️': (player) => {
        const heal = 10 + Math.floor(Math.random() * 10);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        return 'Potion utilisee (+' + heal + ' PV)';
    },
    '⚔️': (player) => {
        player.attack += 2;
        return 'Attaque augmentee de 2 !';
    },
    '🛡️': (player) => {
        player.defense += 1;
        return 'Defense augmentee de 1 !';
    },
    '📜': (player) => {
        const random = Math.random();
        if (random < 0.3) {
            player.hp = Math.min(player.maxHp, player.hp + 15);
            return 'Soin magique +15 PV !';
        } else if (random < 0.6) {
            const damage = 10 + Math.floor(Math.random() * 10);
            game.monsters.forEach(m => { m.hp -= damage; if (m.hp <= 0) game.log.push(m.name + ' vaincu !'); });
            game.monsters = game.monsters.filter(m => m.hp > 0);
            return 'Explosion magique !';
        } else {
            return 'Rien ne se passe...';
        }
    }
};

function pickupItem() {
    const idx = game.items.findIndex(i => i.x === game.player.x && i.y === game.player.y);
    if (idx === -1) {
        game.log.push('Rien a ramasser.');
        render();
        return;
    }
    if (game.inventory.length >= MAX_INVENTORY) {
        game.log.push('Inventaire plein !');
        render();
        return;
    }
    const item = game.items.splice(idx, 1)[0];
    game.inventory.push(item);
    game.log.push('Vous ramassez ' + item.type);
    render();
}

function useItem(itemType) {
    const idx = game.inventory.findIndex(i => i.type === itemType);
    if (idx === -1) {
        game.log.push('Vous n\'avez pas de ' + itemType);
        render();
        return;
    }
    
    const item = game.inventory.splice(idx, 1)[0];
    const effect = ITEM_EFFECTS[itemType];
    
    if (effect) {
        const message = effect(game.player);
        game.log.push(message);
    } else {
        game.log.push('Objet inconnu');
    }
    render();
}

function useLastInventoryItem() {
    if (game.inventory.length === 0) {
        game.log.push('Inventaire vide.');
        render();
        return;
    }
    const item = game.inventory.pop();
    useItem(item.type);
}

function showInventory() {
    if (game.inventory.length === 0) {
        game.log.push('Inventaire vide.');
    } else {
        const list = game.inventory.map(i => i.type).join(', ');
        game.log.push('Inventaire : ' + list);
    }
    render();
}

// ============================================================
// 11. DÉPLACEMENT DU JOUEUR
// ============================================================

function movePlayer(dx, dy) {
    if (game.gameOver) return false;
    const nx = clamp(game.player.x + dx, 0, W - 1);
    const ny = clamp(game.player.y + dy, 0, H - 1);
    if (nx === game.player.x && ny === game.player.y) return false;
    if (game.map[ny][nx] === '#') return false;

    // Vérifier les escaliers
    const currentTile = game.map[ny][nx];
    if (currentTile === '>' || currentTile === '<') {
        const stairsResult = handleStairs(currentTile, nx, ny);
        if (stairsResult !== null) {
            // Mettre à jour la map après déplacement
            game.map[game.player.y][game.player.x] = '.';
            game.map[ny][nx] = '@';
            game.player.x = nx;
            game.player.y = ny;
            return stairsResult;
        }
    }

    // Vérifier les items
    const itemIdx = game.items.findIndex(i => i.x === nx && i.y === ny);
    if (itemIdx !== -1) {
        if (game.inventory.length < MAX_INVENTORY) {
            const item = game.items.splice(itemIdx, 1)[0];
            game.inventory.push(item);
            game.log.push('Vous ramassez ' + item.type);
            game.map[game.player.y][game.player.x] = '.';
            game.player.x = nx;
            game.player.y = ny;
            game.map[ny][nx] = '@';
            render();
            return true;
        } else {
            game.log.push('Inventaire plein !');
            render();
            return false;
        }
    }

    // Vérifier les monstres
    const monster = game.monsters.find(m => m.x === nx && m.y === ny && m.hp > 0);
    if (monster) {
        attackMonster(monster);
        game.turn++;
        // Le combat peut tuer le joueur, ne pas déplacer
        return false;
    }

    // Déplacement normal
    game.map[game.player.y][game.player.x] = '.';
    game.player.x = nx;
    game.player.y = ny;
    game.map[ny][nx] = '@';
    game.turn++;
    moveMonsters();
    render();
    return true;
}

// ============================================================
// 12. COMBAT
// ============================================================

function attackMonster(monster) {
    if (game.gameOver) return;
    if (!monster || monster.hp <= 0) {
        game.log.push('Ce monstre est deja mort.');
        render();
        return;
    }

    const damage = game.player.attack + Math.floor(Math.random() * 4);
    const defense = monster.defense || 0;
    const finalDamage = Math.max(1, damage - defense);
    monster.hp -= finalDamage;
    game.log.push('Attaque: ' + finalDamage + ' degats au ' + monster.name);

    if (monster.hp <= 0) {
        game.log.push(monster.name + ' vaincu !');
        game.map[monster.y][monster.x] = '.';
        game.monsters = game.monsters.filter(m => m !== monster);
        if (Math.random() < 0.3) {
            const icon = ['❤️', '⚔️', '🛡️', '📜'][Math.floor(Math.random() * 4)];
            game.items.push({ x: monster.x, y: monster.y, type: icon });
            game.map[monster.y][monster.x] = icon;
            game.log.push('Drop: ' + icon);
        }
    }
    render();
}

// ============================================================
// 13. IA DES MONSTRES (refactorisée)
// ============================================================

function pursuePlayer(monster) {
    const dx = game.player.x - monster.x;
    const dy = game.player.y - monster.y;
    const dist = getDistance(monster.x, monster.y, game.player.x, game.player.y);
    
    let moveX = 0, moveY = 0;
    if (Math.abs(dx) >= Math.abs(dy)) {
        moveX = Math.sign(dx);
    } else {
        moveY = Math.sign(dy);
    }
    
    if (Math.random() < 0.2 && dist > 2) {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        moveX = dir[0];
        moveY = dir[1];
    }
    
    return { dx: moveX, dy: moveY };
}

function wanderRandomly(monster) {
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    return { dx: dir[0], dy: dir[1] };
}

function updateMonster(monster) {
    if (game.gameOver) return false;
    
    const distance = getDistance(monster.x, monster.y, game.player.x, game.player.y);
    let move;
    
    if (distance <= MONSTER_ATTACK_RANGE) {
        move = pursuePlayer(monster);
    } else {
        move = wanderRandomly(monster);
    }
    
    const nx = monster.x + move.dx;
    const ny = monster.y + move.dy;
    
    // Combat check
    if (nx === game.player.x && ny === game.player.y) {
        const damage = monster.attack + Math.floor(Math.random() * 3);
        const defense = game.player.defense || 0;
        const finalDamage = Math.max(1, damage - defense);
        game.player.hp -= finalDamage;
        game.log.push(monster.name + ' vous attaque (' + finalDamage + ')');
        
        if (game.player.hp <= 0) {
            game.player.hp = 0;
            game.gameOver = true;
            game.log.push('VOUS ETES MORT !');
            render();
        }
        return true;
    }
    
    // Movement check
    if (isTileFree(nx, ny, true)) {
        game.map[monster.y][monster.x] = '.';
        monster.x = nx;
        monster.y = ny;
        game.map[ny][nx] = monster.symbol;
        return true;
    }
    
    return false;
}

function moveMonsters() {
    if (game.gameOver) return;
    
    game.monsters.forEach(monster => {
        if (monster.hp > 0) {
            updateMonster(monster);
        }
    });
    render();
}

// ============================================================
// 14. GESTION DES TOUCHES
// ============================================================

function resetGame() {
    game.monsters = [];
    game.items = [];
    game.inventory = [];
    game.log = [];
    game.player.hp = PLAYER_START_HP;
    game.player.maxHp = PLAYER_START_HP;
    game.player.attack = PLAYER_START_ATK;
    game.player.defense = PLAYER_START_DEF;
    game.currentLevel = 1;
    game.gameOver = false;
    generateDungeon(game.currentLevel);
    render();
    game.log.push('Nouvelle partie !');
}

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') { process.exit(); }
    if (key.name === 'q') { process.exit(); }

    if (game.gameOver) {
        if (key.name === 'r') {
            resetGame();
        }
        return;
    }

    if (key.name === 'space') {
        let closest = null;
        let closestDist = Infinity;
        game.monsters.forEach(m => {
            if (m.hp <= 0) return;
            const dist = getDistance(m.x, m.y, game.player.x, game.player.y);
            if (dist < closestDist && dist <= 2) {
                closestDist = dist;
                closest = m;
            }
        });
        if (closest) {
            attackMonster(closest);
        } else {
            game.log.push('Aucun monstre proche');
            render();
        }
        return;
    }

    if (key.name === 'e') {
        pickupItem();
        return;
    }
    if (key.name === 'u') {
        useLastInventoryItem();
        return;
    }
    if (key.name === 'i') {
        showInventory();
        return;
    }

    let dx = 0, dy = 0;
    if (key.name === 'up') dy = -1;
    else if (key.name === 'down') dy = 1;
    else if (key.name === 'left') dx = -1;
    else if (key.name === 'right') dx = 1;

    if (dx !== 0 || dy !== 0) {
        movePlayer(dx, dy);
        render();
        if (game.gameOver) {
            game.log.push('Game Over - Appuie sur R pour recommencer');
            render();
        }
    }
});

// ============================================================
// 15. INITIALISATION
// ============================================================

game.player.hp = PLAYER_START_HP;
game.player.maxHp = PLAYER_START_HP;
game.player.attack = PLAYER_START_ATK;
game.player.defense = PLAYER_START_DEF;
generateDungeon(1);
render();
game.log.push('Explore le donjon et elimine les monstres !');