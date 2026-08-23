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

// ============================================================
// 2. ÉTAT DU JEU
// ============================================================
let map = [];
let player = { x: 0, y: 0, hp: PLAYER_START_HP, maxHp: PLAYER_START_HP, attack: PLAYER_START_ATK, defense: PLAYER_START_DEF };
let monsters = [];
let items = [];
let inventory = [];
let gameOver = false;
let turn = 0;
let log = [];
let currentLevel = 1;

// ============================================================
// 3. UTILITAIRES
// ============================================================
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// 4. GÉNÉRATION DU DONJON
// ============================================================
function generateDungeon(level = 1) {
    map = [];
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

    player.x = Math.min(rx + Math.floor(rw / 2), W - 1);
    player.y = Math.min(ry + Math.floor(rh / 2), H - 1);
    map[player.y][player.x] = '@';

    // Monstres
    monsters = [];
    const numMonsters = 3 + Math.floor(level / 2);
    for (let i = 0; i < numMonsters; i++) {
        let placed = false;
        for (let attempts = 0; attempts < 50 && !placed; attempts++) {
            const x = rx + 1 + Math.floor(Math.random() * (rw - 2));
            const y = ry + 1 + Math.floor(Math.random() * (rh - 2));
            if (x < W && y < H && map[y][x] === '.' && !(x === player.x && y === player.y)) {
                const types = ['g', 's', 'o', 'd', 'r'];
                const type = types[i % types.length];
                const monster = createMonster(type, level);
                monster.x = x;
                monster.y = y;
                monsters.push(monster);
                map[y][x] = type;
                placed = true;
            }
        }
    }

    // Items
    items = [];
    const numItems = 2 + Math.floor(level / 2);
    for (let i = 0; i < numItems; i++) {
        let placed = false;
        for (let attempts = 0; attempts < 30 && !placed; attempts++) {
            const x = rx + 1 + Math.floor(Math.random() * (rw - 2));
            const y = ry + 1 + Math.floor(Math.random() * (rh - 2));
            if (x < W && y < H && map[y][x] === '.' && !(x === player.x && y === player.y)) {
                const icon = ['❤️', '⚔️', '🛡️', '📜'][Math.floor(Math.random() * 4)];
                map[y][x] = icon;
                items.push({ x, y, type: icon });
                placed = true;
            }
        }
    }

    log.push('Niveau ' + level + ' genere !');
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
    console.clear();
    console.log('='.repeat(W + 4));
    console.log('DEMON DES PROFONDEURS');
    console.log('='.repeat(W + 4));
    console.log('PV: ' + (player.hp || PLAYER_START_HP) + '/' + (player.maxHp || PLAYER_START_HP) + '  Pos: (' + player.x + ',' + player.y + ')  Monstres: ' + monsters.length + '  Items: ' + items.length);
    console.log('Niveau: ' + currentLevel + '/' + MAX_LEVEL);
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
    console.log('Log: ' + (log[log.length - 1] || 'Explore le donjon...'));
    console.log('='.repeat(W + 4));
    console.log('Fleches: bouger | ESPACE: attaquer | E: ramasser | U: utiliser | I: inventaire | Q: quitter');
}

// ============================================================
// 7. DÉPLACEMENT DU JOUEUR
// ============================================================
function movePlayer(dx, dy) {
    if (gameOver) return false;
    const nx = clamp(player.x + dx, 0, W - 1);
    const ny = clamp(player.y + dy, 0, H - 1);

    if (nx === player.x && ny === player.y) return false;
    if (map[ny][nx] === '#') return false;

    const tile = map[ny][nx];
    if (tile === '>') {
        if (currentLevel < MAX_LEVEL) {
            currentLevel++;
            generateDungeon(currentLevel);
            render();
            log.push('Descendu au niveau ' + currentLevel);
            return true;
        } else {
            log.push('Niveau maximum atteint !');
            render();
            return false;
        }
    }
    if (tile === '<') {
        if (currentLevel > 1) {
            currentLevel--;
            generateDungeon(currentLevel);
            render();
            log.push('Remonte au niveau ' + currentLevel);
            return true;
        } else {
            log.push('Deja au niveau 1');
            render();
            return false;
        }
    }

    // Ramasser un item automatiquement (optionnel)
    const itemIndex = items.findIndex(i => i.x === nx && i.y === ny);
    if (itemIndex !== -1) {
        const item = items.splice(itemIndex, 1)[0];
        inventory.push(item);
        log.push('Vous ramassez ' + item.type);
        // On ne se déplace pas sur la case de l'item
        // On le ramasse simplement
        render();
        return true;
    }

    const monster = monsters.find(m => m.x === nx && m.y === ny);
    if (monster) {
        attackMonster(monster);
        return false;
    }

    map[player.y][player.x] = '.';
    player.x = nx;
    player.y = ny;
    map[ny][nx] = '@';
    turn++;
    moveMonsters();
    return true;
}

// ============================================================
// 8. COMBAT
// ============================================================
function attackMonster(monster) {
    const damage = (player.attack || PLAYER_START_ATK) + Math.floor(Math.random() * 4);
    const defense = monster.defense || 0;
    const finalDamage = Math.max(1, damage - defense);
    monster.hp -= finalDamage;
    log.push('Attaque: ' + finalDamage + ' degats au ' + monster.name);

    if (monster.hp <= 0) {
        log.push(monster.name + ' vaincu !');
        map[monster.y][monster.x] = '.';
        monsters = monsters.filter(m => m !== monster);
        // Drop d'item
        if (Math.random() < 0.3) {
            const icon = ['❤️', '⚔️', '🛡️', '📜'][Math.floor(Math.random() * 4)];
            items.push({ x: monster.x, y: monster.y, type: icon });
            map[monster.y][monster.x] = icon;
            log.push('Drop: ' + icon);
        }
    }
    render();
}

// ============================================================
// 9. IA DES MONSTRES
// ============================================================
function moveMonsters() {
    monsters.forEach(m => {
        const dx = player.x - m.x;
        const dy = player.y - m.y;
        const dist = Math.abs(dx) + Math.abs(dy);

        if (dist <= MONSTER_ATTACK_RANGE) {
            let moveX = 0, moveY = 0;
            if (Math.abs(dx) >= Math.abs(dy)) {
                moveX = Math.sign(dx);
            } else {
                moveY = Math.sign(dy);
            }

            // 20% de chance de mouvement aléatoire (pour varier)
            if (Math.random() < 0.2 && dist > 2) {
                const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                moveX = dir[0];
                moveY = dir[1];
            }

            const nx = m.x + moveX;
            const ny = m.y + moveY;

            if (nx === player.x && ny === player.y) {
                const damage = m.attack + Math.floor(Math.random() * 3);
                const defense = player.defense || PLAYER_START_DEF;
                const finalDamage = Math.max(1, damage - defense);
                player.hp = (player.hp || PLAYER_START_HP) - finalDamage;
                log.push(m.name + ' vous attaque (' + finalDamage + ')');
                if (player.hp <= 0) {
                    player.hp = 0;
                    gameOver = true;
                    log.push('VOUS ETES MORT !');
                    render();
                }
                return;
            }

            if (map[ny] && map[ny][nx] === '.' && !(nx === player.x && ny === player.y)) {
                map[m.y][m.x] = '.';
                m.x = nx;
                m.y = ny;
                map[ny][nx] = m.symbol;
            }
        } else {
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = m.x + dir[0];
            const ny = m.y + dir[1];
            if (map[ny] && map[ny][nx] === '.' && !(nx === player.x && ny === player.y)) {
                map[m.y][m.x] = '.';
                m.x = nx;
                m.y = ny;
                map[ny][nx] = m.symbol;
            }
        }
    });
    render();
}

// ============================================================
// 10. GESTION DES ITEMS
// ============================================================
function pickupItem() {
    const idx = items.findIndex(i => i.x === player.x && i.y === player.y);
    if (idx === -1) {
        log.push('Rien a ramasser.');
        render();
        return;
    }
    const item = items.splice(idx, 1)[0];
    inventory.push(item);
    map[player.y][player.x] = '@';
    log.push('Vous ramassez ' + item.type);
    render();
}

function useItem(itemType) {
    const idx = inventory.findIndex(i => i.type === itemType);
    if (idx === -1) {
        log.push('Vous n\'avez pas de ' + itemType);
        render();
        return;
    }
    const item = inventory.splice(idx, 1)[0];
    if (itemType === '❤️') {
        const heal = 10 + Math.floor(Math.random() * 10);
        player.hp = Math.min(player.maxHp || PLAYER_START_HP, (player.hp || PLAYER_START_HP) + heal);
        log.push('Potion utilisee (+' + heal + ' PV)');
    } else if (itemType === '⚔️') {
        player.attack = (player.attack || PLAYER_START_ATK) + 2;
        log.push('Attaque augmentee de 2 !');
    } else if (itemType === '🛡️') {
        player.defense = (player.defense || PLAYER_START_DEF) + 1;
        log.push('Defense augmentee de 1 !');
    } else if (itemType === '📜') {
        const random = Math.random();
        if (random < 0.3) {
            player.hp = Math.min(player.maxHp || PLAYER_START_HP, (player.hp || PLAYER_START_HP) + 15);
            log.push('Soin magique +15 PV !');
        } else if (random < 0.6) {
            const damage = 10 + Math.floor(Math.random() * 10);
            monsters.forEach(m => { m.hp -= damage; if (m.hp <= 0) log.push(m.name + ' vaincu !'); });
            monsters = monsters.filter(m => m.hp > 0);
            log.push('Explosion magique !');
        } else {
            log.push('Rien ne se passe...');
        }
    }
    render();
}

function showInventory() {
    if (inventory.length === 0) {
        log.push('Inventaire vide.');
    } else {
        const list = inventory.map(i => i.type).join(', ');
        log.push('Inventaire : ' + list);
    }
    render();
}

// ============================================================
// 11. GESTION DES TOUCHES
// ============================================================
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') { process.exit(); }
    if (key.name === 'q') { process.exit(); }

    if (gameOver) {
        if (key.name === 'r') {
            gameOver = false;
            monsters = [];
            items = [];
            inventory = [];
            log = [];
            player.hp = PLAYER_START_HP;
            player.maxHp = PLAYER_START_HP;
            player.attack = PLAYER_START_ATK;
            player.defense = PLAYER_START_DEF;
            currentLevel = 1;
            generateDungeon(currentLevel);
            render();
            log.push('Nouvelle partie !');
        }
        return;
    }

    if (key.name === 'space') {
        let closest = null;
        let closestDist = Infinity;
        monsters.forEach(m => {
            const dist = Math.abs(m.x - player.x) + Math.abs(m.y - player.y);
            if (dist < closestDist && dist <= 2) {
                closestDist = dist;
                closest = m;
            }
        });
        if (closest) {
            attackMonster(closest);
        } else {
            log.push('Aucun monstre proche');
            render();
        }
        return;
    }

    if (key.name === 'e') {
        pickupItem();
        return;
    }
    if (key.name === 'u') {
        if (inventory.length === 0) {
            log.push('Inventaire vide.');
            render();
            return;
        }
        const item = inventory.pop();
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
        if (gameOver) {
            log.push('Game Over - Appuie sur R pour recommencer');
            render();
        }
    }
});

// ============================================================
// 12. INITIALISATION
// ============================================================
player.hp = PLAYER_START_HP;
player.maxHp = PLAYER_START_HP;
player.attack = PLAYER_START_ATK;
player.defense = PLAYER_START_DEF;
generateDungeon(1);
render();
log.push('Explore le donjon et elimine les monstres !');
[/code]