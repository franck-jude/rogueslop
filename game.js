const utils = {
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    distance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    },

    sign(value) {
        return value > 0 ? 1 : value < 0 ? -1 : 0;
    },

    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
};

module.exports = utils;
const utils = require('./utils');

class Dungeon {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.map = [];
        this.stairs = { x: 0, y: 0 };
        this.level = 1;
    }

    generate(level, playerX, playerY) {
        this.level = level;
        this.map = [];
        this.initMap();
        this.placeStairs(playerX, playerY);
        return this.map;
    }

    initMap() {
        for (let y = 0; y < this.height; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.map[y][x] = '█';
                } else if (x >= 5 && x <= 24 && y >= 3 && y <= 11) {
                    this.map[y][x] = '·';
                } else {
                    this.map[y][x] = ' ';
                }
            }
        }
    }

    placeStairs(playerX, playerY) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 1000) {
            attempts++;
            const x = utils.randomInt(5, this.width - 6);
            const y = utils.randomInt(3, this.height - 4);
            if (this.map[y] && this.map[y][x] === '·' && !(x === playerX && y === playerY)) {
                this.stairs = { x, y };
                this.map[y][x] = '⇩';
                placed = true;
            }
        }
        if (!placed) {
            this.stairs = { x: 10, y: 7 };
            this.map[7][10] = '⇩';
        }
    }

    getStairs() {
        return this.stairs;
    }

    isWalkable(x, y) {
        if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1) return false;
        return this.map[y][x] === '·' || this.map[y][x] === ' ' || this.map[y][x] === '⇩';
    }

    isWall(x, y) {
        return this.map[y] && this.map[y][x] === '█';
    }

    isStairs(x, y) {
        return this.map[y] && this.map[y][x] === '⇩';
    }

    updateTile(x, y, char) {
        if (this.map[y] && x >= 0 && x < this.width) {
            this.map[y][x] = char;
        }
    }

    getMap() {
        return this.map;
    }
}

module.exports = Dungeon;
const utils = require('./utils');

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hp = 100;
        this.maxHp = 100;
        this.attack = 5;
        this.defense = 0;
        this.char = '☺';
    }

    move(dx, dy, dungeon, monsters, boss, combat, game) {
        const newX = this.x + dx;
        const newY = this.y + dy;

        if (!dungeon.isWalkable(newX, newY)) {
            return false;
        }

        if (dungeon.isStairs(newX, newY)) {
            if (game && game.shouldBlockStairs()) {
                console.log('⚠️ You must defeat the boss before proceeding!');
                return false;
            }
            if (game) game.goToNextLevel();
            return true;
        }

        // Check boss collision
        if (boss && boss.hp > 0 && newX === boss.x && newY === boss.y) {
            combat.attackBoss(this, boss, dungeon);
            return false;
        }

        // Check monster collision
        const monster = monsters.find(m => m.x === newX && m.y === newY && m.hp > 0);
        if (monster) {
            combat.attackMonster(this, monster, dungeon, monsters);
            return false;
        }

        dungeon.updateTile(this.y, this.x, '·');
        this.x = newX;
        this.y = newY;
        dungeon.updateTile(this.y, this.x, this.char);
        return true;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.defense);
        this.hp -= actualDamage;
        return actualDamage;
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }

    getStats() {
        return {
            x: this.x,
            y: this.y,
            hp: this.hp,
            maxHp: this.maxHp,
            attack: this.attack,
            defense: this.defense
        };
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}

module.exports = Player;
const utils = require('./utils');

class Monster {
    constructor(char, name, hp, maxHp, x, y, isBoss = false, attack = 0) {
        this.char = char;
        this.name = name;
        this.hp = hp;
        this.maxHp = maxHp;
        this.x = x;
        this.y = y;
        this.isBoss = isBoss;
        this.attack = attack || (isBoss ? 10 : 5);
        this.initialChar = char;
    }

    takeDamage(damage) {
        this.hp -= damage;
        return this.hp <= 0;
    }

    isAlive() {
        return this.hp > 0;
    }

    getAttackDamage() {
        return this.attack + (this.isBoss ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 3));
    }

    moveToward(player, dungeon, monsters) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = utils.distance(this.x, this.y, player.x, player.y);

        const range = this.isBoss ? 6 : 5;
        if (dist > range) return false;

        let moveX = 0, moveY = 0;
        if (Math.abs(dx) >= Math.abs(dy)) {
            moveX = utils.sign(dx);
        } else {
            moveY = utils.sign(dy);
        }

        const newX = this.x + moveX;
        const newY = this.y + moveY;

        if (newX === player.x && newY === player.y) {
            return true; // Hit player
        }

        if (dungeon.isWalkable(newX, newY)) {
            const monsterHere = monsters.find(m => m !== this && m.x === newX && m.y === newY && m.isAlive());
            const bossHere = monsters.find(m => m !== this && m.isBoss && m.x === newX && m.y === newY && m.isAlive());
            if (!monsterHere && !bossHere) {
                dungeon.updateTile(this.y, this.x, '·');
                this.x = newX;
                this.y = newY;
                dungeon.updateTile(this.y, this.x, this.char);
            }
        }
        return false;
    }
}

function createMonster(level, typeIndex, x, y) {
    const types = [
        { char: '⚔', name: 'Goblin', baseHp: 10, hpScale: 2 },
        { char: '☠', name: 'Skeleton', baseHp: 8, hpScale: 2 },
        { char: '⚒', name: 'Orc', baseHp: 15, hpScale: 3 },
        { char: '☯', name: 'Demon', baseHp: 30, hpScale: 5 },
        { char: '☿', name: 'Rat', baseHp: 5, hpScale: 1 }
    ];

    const type = types[typeIndex % types.length];
    const hp = type.baseHp + level * type.hpScale + utils.randomInt(0, 5);
    return new Monster(type.char, type.name, hp, hp, x, y, false);
}

function createBoss(level, x, y) {
    const hp = 50 + level * 10;
    const attack = 10 + level * 3;
    const boss = new Monster('☥', `Boss (Level ${level})`, hp, hp, x, y, true, attack);
    boss.char = '☥';
    return boss;
}

module.exports = { Monster, createMonster, createBoss };
const utils = require('./utils');

class Combat {
    constructor() {}

    attackMonster(attacker, defender, dungeon, monsters) {
        const damage = utils.randomInt(1, 10) + attacker.attack;
        const killed = defender.takeDamage(damage);
        
        if (killed) {
            dungeon.updateTile(defender.y, defender.x, '·');
            const idx = monsters.indexOf(defender);
            if (idx > -1) {
                monsters.splice(idx, 1);
            }
            console.log(`💀 You killed the ${defender.name}!`);
        } else {
            console.log(`⚔️ You hit the ${defender.name} for ${damage} damage!`);
        }
        return killed;
    }

    attackBoss(attacker, boss, dungeon) {
        const damage = utils.randomInt(1, 12) + attacker.attack;
        const killed = boss.takeDamage(damage);

        if (killed) {
            dungeon.updateTile(boss.y, boss.x, '·');
            console.log(`💀 YOU DEFEATED THE BOSS! ✦ Artefact acquired!`);
            return true;
        } else {
            console.log(`⚔️ You hit the ${boss.name} for ${damage} damage! (${boss.hp}/${boss.maxHp} HP)`);
            // Boss counterattacks
            const bossDamage = boss.getAttackDamage();
            const actualDamage = attacker.takeDamage(bossDamage);
            console.log(`💢 ${boss.name} counterattacks for ${actualDamage} damage!`);
            if (attacker.hp <= 0) {
                console.log('💀 YOU DIED! Game Over!');
                process.exit();
            }
        }
        return false;
    }

    monsterAttackPlayer(monster, player) {
        const damage = monster.getAttackDamage();
        const actualDamage = player.takeDamage(damage);
        console.log(`💢 ${monster.name} hit you for ${actualDamage} damage!`);
        if (player.hp <= 0) {
            console.log('💀 YOU DIED! Game Over!');
            process.exit();
        }
        return actualDamage;
    }

    findNearestEnemy(player, monsters, boss) {
        let nearest = null;
        let minDist = Infinity;

        monsters.filter(m => m.isAlive()).forEach(m => {
            const dist = utils.distance(player.x, player.y, m.x, m.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = m;
            }
        });

        if (boss && boss.isAlive()) {
            const dist = utils.distance(player.x, player.y, boss.x, boss.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = boss;
            }
        }

        return { enemy: nearest, distance: minDist };
    }
}

module.exports = Combat;
const utils = require('./utils');

class Item {
    constructor(char, name, type, value, x, y) {
        this.char = char;
        this.name = name;
        this.type = type;
        this.value = value;
        this.x = x;
        this.y = y;
    }
}

class Inventory {
    constructor() {
        this.items = [];
        this.maxSize = 10;
        this.hasArtefact = false;
    }

    addItem(item) {
        if (this.items.length >= this.maxSize) {
            return false;
        }
        this.items.push(item);
        return true;
    }

    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            return this.items.splice(index, 1)[0];
        }
        return null;
    }

    getItems() {
        return this.items;
    }

    size() {
        return this.items.length;
    }

    isFull() {
        return this.items.length >= this.maxSize;
    }

    useItem(index, player, monsters, boss, dungeon) {
        if (index < 0 || index >= this.items.length) return null;
        const item = this.items[index];
        const result = this.applyItem(item, player, monsters, boss, dungeon);
        if (result !== null) {
            this.items.splice(index, 1);
        }
        return result;
    }

    applyItem(item, player, monsters, boss, dungeon) {
        switch (item.type) {
            case 'health':
                const heal = item.value + utils.randomInt(0, 10);
                player.heal(heal);
                console.log(`♥ Used ${item.name}! Healed for ${heal} HP!`);
                return { type: 'health', amount: heal };

            case 'weapon':
                player.attack += item.value;
                console.log(`⚔ Used ${item.name}! Attack increased by ${item.value}!`);
                return { type: 'weapon', value: item.value };

            case 'shield':
                player.defense += item.value;
                console.log(`♡ Used ${item.name}! Defense increased by ${item.value}!`);
                return { type: 'shield', value: item.value };

            case 'scroll':
                const effects = ['All monsters take 10 damage!', 'You feel stronger!', 'You find some gold!'];
                const effect = utils.randomChoice(effects);
                if (effect.includes('damage')) {
                    monsters.forEach(m => {
                        m.takeDamage(10);
                        if (!m.isAlive()) {
                            dungeon.updateTile(m.y, m.x, '·');
                        }
                    });
                    const aliveMonsters = monsters.filter(m => m.isAlive());
                    monsters.length = 0;
                    monsters.push(...aliveMonsters);
                    if (boss && boss.isAlive()) {
                        const killed = boss.takeDamage(10);
                        if (!boss.isAlive()) {
                            dungeon.updateTile(boss.y, boss.x, '·');
                            this.hasArtefact = true;
                            console.log('💀 The boss was defeated by the scroll! ✦ Artefact acquired!');
                        }
                    }
                } else if (effect.includes('stronger')) {
                    player.attack += 2;
                    player.defense += 1;
                }
                console.log(`☰ Used ${item.name}! ${effect}`);
                return { type: 'scroll', effect };

            case 'artefact':
                console.log('✦ The Artefact radiates power! All stats increased!');
                player.attack += 5;
                player.defense += 3;
                player.maxHp += 20;
                player.heal(20);
                return { type: 'artefact' };

            default:
                return null;
        }
    }

    getArtefact() {
        this.hasArtefact = true;
    }
}

function createItem(level, x, y) {
    const types = [
        { char: '♥', name: 'Health Potion', type: 'health', value: 20 },
        { char: '⚔', name: 'Sword', type: 'weapon', value: 3 },
        { char: '♡', name: 'Shield', type: 'shield', value: 2 },
        { char: '☰', name: 'Scroll', type: 'scroll', value: 0 }
    ];

    const type = utils.randomChoice(types);
    return new Item(type.char, type.name, type.type, type.value, x, y);
}

function createArtefact(x, y) {
    return new Item('✦', 'Artefact', 'artefact', 0, x, y);
}

module.exports = { Item, Inventory, createItem, createArtefact };
class Renderer {
    constructor() {}

    render(dungeon, player, monsters, boss, inventory, level, maxLevel, hasArtefact, items) {
        console.clear();
        let output = `Level: ${level}/${maxLevel}  |  `;
        output += `HP: ${player.hp}/${player.maxHp}  |  `;
        output += `ATK: ${player.attack}  |  `;
        output += `DEF: ${player.defense}`;
        if (hasArtefact) output += '  |  ✦ Artefact';
        output += '\n';

        const map = dungeon.getMap();
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                output += map[y][x];
            }
            output += '\n';
        }

        output += '\n';
        const aliveMonsters = monsters.filter(m => m.isAlive());
        output += `Monsters: ${aliveMonsters.length}`;
        if (boss && boss.isAlive()) {
            output += `  |  Boss: ${boss.name} (HP: ${boss.hp}/${boss.maxHp})`;
        }
        output += `  |  Items: ${items.length}`;
        output += `  |  Inventory: ${inventory.size()}`;
        output += '\n';
        output += 'Controls: Arrows/WASD move, Space attack, E pick up, U use, I inventory, > stairs';

        console.log(output);
    }
}

module.exports = Renderer;
const readline = require('readline');
const Dungeon = require('./src/dungeon');
const Player = require('./src/player');
const { createMonster, createBoss } = require('./src/monster');
const Combat = require('./src/combat');
const { Inventory, createItem, createArtefact } = require('./src/items');
const Renderer = require('./src/render');
const utils = require('./src/utils');

class Game {
    constructor() {
        this.width = 30;
        this.height = 15;
        this.level = 1;
        this.maxLevel = 10;
        this.dungeon = new Dungeon(this.width, this.height);
        this.player = new Player(5, 5);
        this.monsters = [];
        this.boss = null;
        this.items = [];
        this.inventory = new Inventory();
        this.combat = new Combat();
        this.renderer = new Renderer();
        this.hasArtefact = false;
        this.initLevel();
    }

    initLevel() {
        this.monsters = [];
        this.items = [];
        this.boss = null;
        this.dungeon.generate(this.level, this.player.x, this.player.y);
        this.player.setPosition(5, 5);
        this.spawnMonsters();
        this.spawnItems();
        if (this.level % 5 === 0) {
            this.spawnBoss();
        }
        this.dungeon.updateTile(this.player.y, this.player.x, this.player.char);
    }

    spawnMonsters() {
        const numMonsters = Math.min(5 + this.level * 2, 15);
        let attempts = 0;
        let placed = 0;

        while (placed < numMonsters && attempts < 1000) {
            attempts++;
            const x = utils.randomInt(5, this.width - 6);
            const y = utils.randomInt(3, this.height - 4);
            const stairs = this.dungeon.getStairs();

            if (this.dungeon.getMap()[y][x] === '·' && 
                !(x === this.player.x && y === this.player.y) && 
                !(x === stairs.x && y === stairs.y)) {
                const monster = createMonster(this.level, placed, x, y);
                this.monsters.push(monster);
                this.dungeon.updateTile(y, x, monster.char);
                placed++;
            }
        }
    }

    spawnBoss() {
        let placed = false;
        let attempts = 0;
        const stairs = this.dungeon.getStairs();

        while (!placed && attempts < 500) {
            attempts++;
            const x = utils.randomInt(5, this.width - 6);
            const y = utils.randomInt(3, this.height - 4);

            if (this.dungeon.getMap()[y][x] === '·' && 
                !(x === this.player.x && y === this.player.y) && 
                !(x === stairs.x && y === stairs.y) &&
                !this.monsters.some(m => m.x === x && m.y === y)) {

                this.boss = createBoss(this.level, x, y);
                this.dungeon.updateTile(y, x, this.boss.char);
                placed = true;
                console.log(`⚠️ A BOSS APPEARS! ${this.boss.name} has ${this.boss.hp} HP!`);
            }
        }
    }

    spawnItems() {
        const numItems = Math.min(3 + this.level, 8);
        let attempts = 0;
        let placed = 0;
        const stairs = this.dungeon.getStairs();

        while (placed < numItems && attempts < 500) {
            attempts++;
            const x = utils.randomInt(5, this.width - 6);
            const y = utils.randomInt(3, this.height - 4);

            if (this.dungeon.getMap()[y][x] === '·' && 
                !(x === this.player.x && y === this.player.y) && 
                !(x === stairs.x && y === stairs.y) &&
                !this.monsters.some(m => m.x === x && m.y === y) &&
                !(this.boss && this.boss.x === x && this.boss.y === y)) {
                const item = createItem(this.level, x, y);
                this.items.push(item);
                this.dungeon.updateTile(y, x, item.char);
                placed++;
            }
        }
    }

    shouldBlockStairs() {
        return this.level % 5 === 0 && this.boss && this.boss.isAlive();
    }

    goToNextLevel() {
        if (this.level >= this.maxLevel) {
            console.log('🎉 You win! You escaped the dungeon! 🎉');
            process.exit();
        }

        this.level++;
        this.player.setPosition(5, 5);
        this.player.heal(20);
        this.initLevel();
        this.render();
    }

    attackNearest() {
        const result = this.combat.findNearestEnemy(this.player, this.monsters, this.boss);
        if (result.enemy) {
            if (result.distance <= 3) {
                if (result.enemy.isBoss) {
                    const killed = this.combat.attackBoss(this.player, this.boss, this.dungeon);
                    if (killed) {
                        this.inventory.getArtefact();
                        this.hasArtefact = true;
                        // Drop artefact
                        const artefact = createArtefact(this.boss.x, this.boss.y);
                        this.items.push(artefact);
                        this.dungeon.updateTile(this.boss.y, this.boss.x, '✦');
                        this.boss = null;
                    }
                } else {
                    this.combat.attackMonster(this.player, result.enemy, this.dungeon, this.monsters);
                }
            } else {
                console.log('No enemies nearby!');
            }
        } else {
            console.log('No enemies alive!');
        }
    }

    moveMonsters() {
        this.monsters.forEach(monster => {
            if (monster.isAlive()) {
                const hitPlayer = monster.moveToward(this.player, this.dungeon, this.monsters);
                if (hitPlayer) {
                    this.combat.monsterAttackPlayer(monster, this.player);
                }
            }
        });

        if (this.boss && this.boss.isAlive()) {
            const hitPlayer = this.boss.moveToward(this.player, this.dungeon, this.monsters);
            if (hitPlayer) {
                this.combat.monsterAttackPlayer(this.boss, this.player);
            }
        }
    }

    pickUp() {
        const itemIdx = this.items.findIndex(i => i.x === this.player.x && i.y === this.player.y);
        if (itemIdx === -1) {
            console.log('Nothing to pick up here.');
            return;
        }

        const item = this.items[itemIdx];

        if (item.type === 'artefact') {
            this.inventory.getArtefact();
            this.hasArtefact = true;
            this.items.splice(itemIdx, 1);
            this.dungeon.updateTile(this.player.y, this.player.x, this.player.char);
            console.log('✦ You picked up the Artefact!');
            return;
        }

        if (this.inventory.isFull()) {
            console.log('Inventory full!');
            return;
        }

        this.inventory.addItem(item);
        this.items.splice(itemIdx, 1);
        this.dungeon.updateTile(this.player.y, this.player.x, this.player.char);
        console.log(`📦 Picked up ${item.name}!`);
    }

    useItem() {
        if (this.inventory.size() === 0) {
            console.log('Inventory is empty!');
            return;
        }

        console.log('Inventory:');
        this.inventory.getItems().forEach((item, idx) => {
            console.log(`${idx + 1}: ${item.name}`);
        });
        console.log('Press number (1-9) to use, or any other key to cancel');

        const handler = (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            }

            const num = parseInt(str);
            if (num >= 1 && num <= this.inventory.size()) {
                const result = this.inventory.useItem(num - 1, this.player, this.monsters, this.boss, this.dungeon);
                if (result && result.type === 'artefact') {
                    this.hasArtefact = true;
                }
                process.stdin.removeListener('keypress', handler);
                this.render();
            } else {
                console.log('Cancelled.');
                process.stdin.removeListener('keypress', handler);
                this.render();
            }
        };

        process.stdin.on('keypress', handler);
    }

    showInventory() {
        if (this.inventory.size() === 0 && !this.hasArtefact) {
            console.log('Inventory is empty.');
            return;
        }

        console.log('📦 INVENTORY:');
        this.inventory.getItems().forEach((item, idx) => {
            console.log(`  ${idx + 1}: ${item.name}`);
        });
        if (this.hasArtefact) {
            console.log('  ✦ Artefact (permanent)');
        }
        console.log('Press any key to continue...');

        const handler = () => {
            process.stdin.removeListener('keypress', handler);
            this.render();
        };
        process.stdin.on('keypress', handler);
    }

    render() {
        this.renderer.render(
            this.dungeon,
            this.player,
            this.monsters,
            this.boss,
            this.inventory,
            this.level,
            this.maxLevel,
            this.hasArtefact,
            this.items
        );
    }

    run() {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        this.render();

        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            }

            if (key.name === 'space') {
                this.attackNearest();
                this.moveMonsters();
                this.render();
                return;
            }

            if (key.name === 'e') {
                this.pickUp();
                this.render();
                return;
            }

            if (key.name === 'u') {
                this.useItem();
                return;
            }

            if (key.name === 'i') {
                this.showInventory();
                return;
            }

            if (key.name === '>') {
                const stairs = this.dungeon.getStairs();
                if (this.player.x === stairs.x && this.player.y === stairs.y) {
                    if (this.shouldBlockStairs()) {
                        console.log('⚠️ You must defeat the boss before proceeding!');
                        return;
                    }
                    this.goToNextLevel();
                    this.render();
                    return;
                } else {
                    console.log('You are not on the stairs!');
                    return;
                }
            }

            let moved = false;
            switch (key.name) {
                case 'up':
                case 'w':
                    moved = this.player.move(0, -1, this.dungeon, this.monsters, this.boss, this.combat, this);
                    break;
                case 'down':
                case 's':
                    moved = this.player.move(0, 1, this.dungeon, this.monsters, this.boss, this.combat, this);
                    break;
                case 'left':
                case 'a':
                    moved = this.player.move(-1, 0, this.dungeon, this.monsters, this.boss, this.combat, this);
                    break;
                case 'right':
                case 'd':
                    moved = this.player.move(1, 0, this.dungeon, this.monsters, this.boss, this.combat, this);
                    break;
                default:
                    return;
            }

            if (moved) {
                this.moveMonsters();
                this.render();
            }
        });
    }
}

const game = new Game();
game.run();