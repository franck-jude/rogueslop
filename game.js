Create a file projects/roguelike/game.js
[code]
// ============================================================
// 1. CONSTANTES
// ============================================================
const W = 30;
const H = 15;
const MAX_LEVEL = 10;
const PLAYER_START_HP = 20;
const PLAYER_START_ATK = 5;
const PLAYER_START_DEF = 2;
const MONSTER_ATTACK_RANGE = 3;
const MAX_INVENTORY = 20;
const ROOM_MIN_SIZE = 4;
const ROOM_MAX_SIZE = 6;

// ============================================================
// 2. ÉTAT DU JEU (centralisé)
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
// 3. UTILITAIRES
// ============================================================
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isTileFree(x, y, excludePlayer = true) {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    if (game.map[y][x] !== '.') return false;
    if (excludePlayer && x === game.player.x && y === game.player.y) return false;
    if (game.monsters.some(m => m.x === x && m.y === y)) return false;
    if (game.items.some(i => i.x === x && i.y === y)) return false;
    return true;
}

// ============================================================
// 4. GÉNÉRATION DU DONJON
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

    game.player.x = Math.min(rx + Math.floor(rw / 2), W - 1);
    game.player.y = Math.min(ry + Math.floor(rh / 2), H - 1);
    map[game.player.y][game.player.x] = '@';

    // Monstres (sans overlap)
    game.monsters = [];
    const numMonsters = 3 + Math.floor(level / 2);
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

    game.map = map;
    game.log.push('Niveau ' + level + ' genere !');
}

// ============================================================
// 5. CRÉATION DE MONSTRES
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
// 6. AFFICHAGE
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
            if (ch === '@') row += '@';
            else if (ch === '>') row += '>';
            else if (ch === '<') row += '<';
            else if (ch === '#') row += '#';
            else if (ch === 'g') row += 'g';
            else if (ch === 's') row += 's';
            else if (ch === 'o') row += 'o';
            else if (ch === 'd') row += 'd';
            else if (ch === 'r') row += 'r';
            else if (ch === '❤️') row += '❤️';
            else if (ch === '⚔️') row += '⚔️';
            else if (ch === '🛡️') row += '🛡️';
            else if (ch === '📜') row += '📜';
            else row += ch;
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
// 7. GESTION DES ESCALIERS
// ============================================================
function handleStairs(tile) {
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
// 8. GESTION DES ITEMS
// ============================================================
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
    if (itemType === '❤️') {
        const heal = 10 + Math.floor(Math.random() * 10);
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + heal);
        game.log.push('Potion utilisee (+' + heal + ' PV)');
    } else if (itemType === '⚔️') {
        game.player.attack += 2;
        game.log.push('Attaque augmentee de 2 !');
    } else if (itemType === '🛡️') {
        game.player.defense += 1;
        game.log.push('Defense augmentee de 1 !');
    } else if (itemType === '📜') {
        const random = Math.random();
        if (random < 0.3) {
            game.player.hp = Math.min(game.player.maxHp, game.player.hp + 15);
            game.log.push('Soin magique +15 PV !');
        } else if (random < 0.6) {
            const damage = 10 + Math.floor(Math.random() * 10);
            game.monsters.forEach(m => { m.hp -= damage; if (m.hp <= 0) game.log.push(m.name + ' vaincu !'); });
            game.monsters = game.monsters.filter(m => m.hp > 0);
            game.log.push('Explosion magique !');
        } else {
            game.log.push('Rien ne se passe...');
        }
    }
    render();
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
// 9. DÉPLACEMENT DU JOUEUR (refactorisé)
// ============================================================
function movePlayer(dx, dy) {
    if (game.gameOver) return false;
    const nx = clamp(game.player.x + dx, 0, W - 1);
    const ny = clamp(game.player.y + dy, 0, H - 1);
    if (nx === game.player.x && ny === game.player.y) return false;
    if (game.map[ny][nx] === '#') return false;

    // Vérifier les escaliers
    const stairsResult = handleStairs(game.map[ny][nx]);
    if (stairsResult !== null) return stairsResult;

    // Vérifier les items
    const itemIdx = game.items.findIndex(i => i.x === nx && i.y === ny);
    if (itemIdx !== -1) {
        if (game.inventory.length < MAX_INVENTORY) {
            const item = game.items.splice(itemIdx, 1)[0];
            game.inventory.push(item);
            game.log.push('Vous ramassez ' + item.type);
            render();
            return true;
        } else {
            game.log.push('Inventaire plein !');
            render();
            return false;
        }
    }

    // Vérifier les monstres
    const monster = game.monsters.find(m => m.x === nx && m.y === ny);
    if (monster) {
        attackMonster(monster);
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
// 10. COMBAT
// ============================================================
function attackMonster(monster) {
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
// 11. IA DES MONSTRES
// ============================================================
function moveMonsters() {
    game.monsters.forEach(m => {
        const dx = game.player.x - m.x;
        const dy = game.player.y - m.y;
        const dist = Math.abs(dx) + Math.abs(dy);

        if (dist <= MONSTER_ATTACK_RANGE) {
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
            const nx = m.x + moveX;
            const ny = m.y + moveY;

            if (nx === game.player.x && ny === game.player.y) {
                const damage = m.attack + Math.floor(Math.random() * 3);
                const defense = game.player.defense || 0;
                const finalDamage = Math.max(1, damage - defense);
                game.player.hp -= finalDamage;
                game.log.push(m.name + ' vous attaque (' + finalDamage + ')');
                if (game.player.hp <= 0) {
                    game.player.hp = 0;
                    game.gameOver = true;
                    game.log.push('VOUS ETES MORT !');
                    render();
                }
                return;
            }
            if (isTileFree(nx, ny, true)) {
                game.map[m.y][m.x] = '.';
                m.x = nx;
                m.y = ny;
                game.map[ny][nx] = m.symbol;
            }
        } else {
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = m.x + dir[0];
            const ny = m.y + dir[1];
            if (isTileFree(nx, ny, true)) {
                game.map[m.y][m.x] = '.';
                m.x = nx;
                m.y = ny;
                game.map[ny][nx] = m.symbol;
            }
        }
    });
    render();
}

// ============================================================
// 12. GESTION DES TOUCHES
// ============================================================
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') { process.exit(); }
    if (key.name === 'q') { process.exit(); }

    if (game.gameOver) {
        if (key.name === 'r') {
            // Reset complet
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
        return;
    }

    if (key.name === 'space') {
        let closest = null;
        let closestDist = Infinity;
        game.monsters.forEach(m => {
            const dist = Math.abs(m.x - game.player.x) + Math.abs(m.y - game.player.y);
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
        if (game.inventory.length === 0) {
            game.log.push('Inventaire vide.');
            render();
            return;
        }
        const item = game.inventory.pop();
        useItem(item.type);
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
// 13. INITIALISATION
// ============================================================
game.player.hp = PLAYER_START_HP;
game.player.maxHp = PLAYER_START_HP;
game.player.attack = PLAYER_START_ATK;
game.player.defense = PLAYER_START_DEF;
generateDungeon(1);
render();
game.log.push('Explore le donjon et elimine les monstres !');
[/code]