**Ok Vic Viper. On a deux problèmes :**

1. **Le fichier `game.js` est corrompu** : il commence par `Create a file...` (le parseur a mal écrit le fichier).
2. **Le jeu ne compile pas** (évidemment).

On va **réparer manuellement** et **recopier le bon code**.

---

## ✅ **Étape 1 : Supprimer le fichier corrompu**

```powershell
Remove-Item -Force projects/roguelike/game.js
```

---

## ✅ **Étape 2 : Recréer le fichier proprement**

```powershell
notepad projects/roguelike/game.js
```

**Copie-colle ce code :**

```javascript
const readline = require('readline');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

const W = 30;
const H = 15;
let map = [];
let player = { x: 0, y: 0, hp: 20, maxHp: 20 };
let monsters = [];
let gameOver = false;
let turn = 0;
let log = [];
let currentLevel = 1;
const MAX_LEVEL = 10;

function generateDungeon(level = 1) {
    map = [];
    for (let y = 0; y < H; y++) {
        map[y] = [];
        for (let x = 0; x < W; x++) {
            map[y][x] = '#';
        }
    }

    const rx = 2, ry = 2, rw = 25, rh = 10;
    for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
            map[y][x] = '.';
        }
    }

    if (level < MAX_LEVEL) {
        map[ry + rh - 2][rx + rw - 2] = '>';
    }
    if (level > 1) {
        map[ry + 1][rx + 1] = '<';
    }

    player.x = Math.floor(rx + rw / 2);
    player.y = Math.floor(ry + rh / 2);
    map[player.y][player.x] = '@';

    monsters = [];
    const monsterPositions = [
        [rx + 3, ry + 3],
        [rx + rw - 4, ry + 3],
        [rx + 5, ry + rh - 4],
        [rx + rw - 5, ry + rh - 4],
        [Math.floor(rx + rw / 2), ry + 2]
    ];

    monsterPositions.forEach((pos, i) => {
        const x = pos[0], y = pos[1];
        if (map[y] && map[y][x] === '.') {
            const types = ['g', 's', 'o', 'd', 'r'];
            const type = types[i % types.length];
            const monster = {
                x, y, symbol: type,
                hp: type === 'd' ? 10 : type === 'o' ? 8 : 5,
                maxHp: type === 'd' ? 10 : type === 'o' ? 8 : 5,
                attack: type === 'd' ? 5 : type === 'o' ? 4 : 2,
                name: type === 'g' ? 'Gobelin' : type === 's' ? 'Squelette' : type === 'o' ? 'Orque' : type === 'd' ? 'Demon' : 'Rat'
            };
            monsters.push(monster);
            map[y][x] = type;
        }
    });

    log.push('Niveau ' + level + ' genere !');
}

function render() {
    console.clear();
    console.log('='.repeat(W + 4));
    console.log('DEMON DES PROFONDEURS');
    console.log('='.repeat(W + 4));
    console.log('PV: ' + (player.hp || 20) + '/' + (player.maxHp || 20) + '  Pos: (' + player.x + ',' + player.y + ')  Monstres: ' + monsters.length);
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
            else row += ch;
        }
        console.log(row);
    }

    console.log('');
    console.log('-'.repeat(W + 4));
    console.log('Log: ' + (log[log.length - 1] || 'Explore le donjon...'));
    console.log('='.repeat(W + 4));
    console.log('Fleches: bouger | ESPACE: attaquer | Q: quitter');
}

function movePlayer(dx, dy) {
    if (gameOver) return false;
    const nx = player.x + dx;
    const ny = player.y + dy;

    if (nx < 0 || nx >= W || ny < 0 || ny >= H) return false;
    if (map[ny][nx] === '#') return false;

    const tile = map[ny][nx];
    if (tile === '>') {
        if (currentLevel < MAX_LEVEL) {
            currentLevel++;
            generateDungeon(currentLevel);
            render();
            log.push('⬇️ Descendu au niveau ' + currentLevel);
            return true;
        } else {
            log.push('🏆 Niveau maximum atteint !');
            render();
            return false;
        }
    }
    if (tile === '<') {
        if (currentLevel > 1) {
            currentLevel--;
            generateDungeon(currentLevel);
            render();
            log.push('⬆️ Remonté au niveau ' + currentLevel);
            return true;
        } else {
            log.push('🔙 Deja au niveau 1');
            render();
            return false;
        }
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

function attackMonster(monster) {
    const damage = 3 + Math.floor(Math.random() * 4);
    monster.hp -= damage;
    log.push('⚔️ ' + damage + ' degats au ' + monster.name);

    if (monster.hp <= 0) {
        log.push('💀 ' + monster.name + ' vaincu !');
        map[monster.y][monster.x] = '.';
        monsters = monsters.filter(m => m !== monster);
    }
    render();
}

function moveMonsters() {
    monsters.forEach(m => {
        const dx = player.x - m.x;
        const dy = player.y - m.y;
        const dist = Math.abs(dx) + Math.abs(dy);

        if (dist <= 3) {
            let moveX = 0, moveY = 0;
            if (Math.abs(dx) >= Math.abs(dy)) {
                moveX = Math.sign(dx);
            } else {
                moveY = Math.sign(dy);
            }

            const nx = m.x + moveX;
            const ny = m.y + moveY;

            if (nx === player.x && ny === player.y) {
                const damage = m.attack + Math.floor(Math.random() * 3);
                player.hp = (player.hp || 20) - damage;
                log.push('💥 ' + m.name + ' vous attaque (' + damage + ')');
                if (player.hp <= 0) {
                    player.hp = 0;
                    gameOver = true;
                    log.push('💀 VOUS ETES MORT !');
                    render();
                }
                return;
            }

            if (map[ny] && map[ny][nx] === '.') {
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

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') { process.exit(); }
    if (key.name === 'q') { process.exit(); }

    if (gameOver) {
        if (key.name === 'r') {
            gameOver = false;
            monsters = [];
            log = [];
            player.hp = 20;
            player.maxHp = 20;
            currentLevel = 1;
            generateDungeon(currentLevel);
            render();
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
            log.push('💨 Aucun monstre proche');
            render();
        }
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
            log.push('💀 Game Over - Appuie sur R pour recommencer');
            render();
        }
    }
});

player.hp = 20;
player.maxHp = 20;
generateDungeon(1);
render();
```

---

## ✅ **Étape 3 : Tester le jeu**

```powershell
node projects/roguelike/game.js
```

---

**Vic Viper, le jeu devrait tourner.** 🔥🛠️