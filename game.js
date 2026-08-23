const readline = require('readline');

class Game {
    constructor() {
        this.width = 30;
        this.height = 15;
        this.level = 1;
        this.maxLevel = 10;
        this.map = [];
        this.player = { 
            x: 5, y: 5, 
            hp: 100, maxHp: 100,
            attack: 5,
            defense: 0
        };
        this.monsters = [];
        this.items = [];
        this.inventory = [];
        this.stairs = { x: 0, y: 0 };
        this.boss = null;
        this.bossDefeated = false;
        this.hasArtefact = false;
        this.initLevel();
    }

    initLevel() {
        this.map = [];
        this.monsters = [];
        this.items = [];
        this.boss = null;
        this.bossDefeated = false;
        this.initMap();
        this.placeStairs();
        this.initMonsters();
        this.initItems();
        if (this.level % 5 === 0) {
            this.spawnBoss();
        }
        this.map[this.player.y][this.player.x] = '🧙';
    }

    initMap() {
        for (let y = 0; y < this.height; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.map[y][x] = '🧱';
                } else if (x >= 5 && x <= 24 && y >= 3 && y <= 11) {
                    this.map[y][x] = '⬜';
                } else {
                    this.map[y][x] = ' ';
                }
            }
        }
    }

    placeStairs() {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 1000) {
            attempts++;
            const x = Math.floor(Math.random() * (this.width - 10)) + 5;
            const y = Math.floor(Math.random() * (this.height - 6)) + 3;
            if (this.map[y] && this.map[y][x] === '⬜' && !(x === this.player.x && y === this.player.y)) {
                this.stairs = { x, y };
                this.map[y][x] = '⬇️';
                placed = true;
            }
        }
        if (!placed) {
            this.stairs = { x: 10, y: 7 };
            this.map[7][10] = '⬇️';
        }
    }

    initMonsters() {
        const monsterTypes = [
            { char: '👺', name: 'Goblin', hp: 10 + this.level * 2, maxHp: 10 + this.level * 2 },
            { char: '💀', name: 'Skeleton', hp: 8 + this.level * 2, maxHp: 8 + this.level * 2 },
            { char: '👹', name: 'Orc', hp: 15 + this.level * 3, maxHp: 15 + this.level * 3 },
            { char: '👿', name: 'Demon', hp: 30 + this.level * 5, maxHp: 30 + this.level * 5 },
            { char: '🐀', name: 'Rat', hp: 5 + this.level, maxHp: 5 + this.level }
        ];

        const numMonsters = Math.min(5 + this.level * 2, 15);
        let attempts = 0;
        let placed = 0;

        while (placed < numMonsters && attempts < 1000) {
            attempts++;
            const x = Math.floor(Math.random() * (this.width - 10)) + 5;
            const y = Math.floor(Math.random() * (this.height - 6)) + 3;
            
            if (this.map[y] && this.map[y][x] === '⬜' && 
                !(x === this.player.x && y === this.player.y) && 
                !(x === this.stairs.x && y === this.stairs.y)) {
                const type = monsterTypes[placed % monsterTypes.length];
                const monster = {
                    ...type,
                    x, y,
                    hp: type.hp + Math.floor(Math.random() * 5),
                    maxHp: type.maxHp + Math.floor(Math.random() * 5),
                    isBoss: false
                };
                this.monsters.push(monster);
                this.map[y][x] = monster.char;
                placed++;
            }
        }
    }

    spawnBoss() {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 500) {
            attempts++;
            const x = Math.floor(Math.random() * (this.width - 10)) + 5;
            const y = Math.floor(Math.random() * (this.height - 6)) + 3;
            
            if (this.map[y] && this.map[y][x] === '⬜' && 
                !(x === this.player.x && y === this.player.y) && 
                !(x === this.stairs.x && y === this.stairs.y) &&
                !this.monsters.some(m => m.x === x && m.y === y)) {
                
                const bossHp = 50 + this.level * 10;
                const bossAttack = 10 + this.level * 3;
                
                this.boss = {
                    char: '🐉',
                    name: `Boss (Level ${this.level})`,
                    x, y,
                    hp: bossHp,
                    maxHp: bossHp,
                    attack: bossAttack,
                    isBoss: true
                };
                this.map[y][x] = '🐉';
                placed = true;
                console.log(`⚠️ A BOSS APPEARS! ${this.boss.name} has ${bossHp} HP!`);
            }
        }
    }

    initItems() {
        const itemTypes = [
            { char: '❤️', name: 'Health Potion', type: 'health', value: 20 },
            { char: '⚔️', name: 'Sword', type: 'weapon', value: 3 },
            { char: '🛡️', name: 'Shield', type: 'shield', value: 2 },
            { char: '📜', name: 'Scroll', type: 'scroll', value: 0 }
        ];

        const numItems = Math.min(3 + this.level, 8);
        let attempts = 0;
        let placed = 0;

        while (placed < numItems && attempts < 500) {
            attempts++;
            const x = Math.floor(Math.random() * (this.width - 10)) + 5;
            const y = Math.floor(Math.random() * (this.height - 6)) + 3;
            
            if (this.map[y] && this.map[y][x] === '⬜' && 
                !(x === this.player.x && y === this.player.y) && 
                !(x === this.stairs.x && y === this.stairs.y) &&
                !this.monsters.some(m => m.x === x && m.y === y) &&
                !(this.boss && this.boss.x === x && this.boss.y === y)) {
                const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                const item = {
                    ...type,
                    x, y
                };
                this.items.push(item);
                this.map[y][x] = item.char;
                placed++;
            }
        }
    }

    render() {
        console.clear();
        let output = `Level: ${this.level}/${this.maxLevel}  |  `;
        output += `HP: ${this.player.hp}/${this.player.maxHp}  |  `;
        output += `ATK: ${this.player.attack}  |  `;
        output += `DEF: ${this.player.defense}`;
        if (this.hasArtefact) output += '  |  ✨ Artefact';
        output += '\n';
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                output += this.map[y][x];
            }
            output += '\n';
        }
        
        output += '\n';
        const aliveMonsters = this.monsters.filter(m => m.hp > 0);
        output += `Monsters: ${aliveMonsters.length}`;
        if (this.boss && this.boss.hp > 0) {
            output += `  |  Boss: ${this.boss.name} (HP: ${this.boss.hp}/${this.boss.maxHp})`;
        }
        output += `  |  Items: ${this.items.length}`;
        output += `  |  Inventory: ${this.inventory.length}`;
        output += '\n';
        output += 'Controls: Arrows/WASD move, Space attack, E pick up, U use, I inventory, > stairs';
        
        console.log(output);
    }

    movePlayer(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        if (newX <= 0 || newX >= this.width - 1 || newY <= 0 || newY >= this.height - 1) {
            return false;
        }
        
        if (this.map[newY][newX] === '🧱') {
            return false;
        }
        
        if (this.map[newY][newX] === '⬇️') {
            if (this.level % 5 === 0 && this.boss && this.boss.hp > 0) {
                console.log('⚠️ You must defeat the boss before proceeding!');
                return false;
            }
            this.goToNextLevel();
            return true;
        }
        
        // Check boss collision
        if (this.boss && this.boss.hp > 0 && newX === this.boss.x && newY === this.boss.y) {
            this.attackBoss();
            return false;
        }
        
        const monster = this.monsters.find(m => m.x === newX && m.y === newY && m.hp > 0);
        if (monster) {
            this.attack(monster);
            return false;
        }
        
        this.map[this.player.y][this.player.x] = '⬜';
        this.player.x = newX;
        this.player.y = newY;
        this.map[this.player.y][this.player.x] = '🧙';
        return true;
    }

    goToNextLevel() {
        if (this.level >= this.maxLevel) {
            console.log('🎉 You win! You escaped the dungeon! 🎉');
            process.exit();
        }
        
        this.level++;
        this.player.x = 5;
        this.player.y = 5;
        this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
        this.initLevel();
        this.render();
    }

    attack(monster) {
        const damage = Math.floor(Math.random() * 10) + this.player.attack + this.level;
        monster.hp -= damage;
        
        if (monster.hp <= 0) {
            this.map[monster.y][monster.x] = '⬜';
            const idx = this.monsters.indexOf(monster);
            if (idx > -1) {
                this.monsters.splice(idx, 1);
            }
            console.log(`💀 You killed the ${monster.name}!`);
        } else {
            console.log(`⚔️ You hit the ${monster.name} for ${damage} damage!`);
        }
    }

    attackBoss() {
        if (!this.boss || this.boss.hp <= 0) return;
        
        const damage = Math.floor(Math.random() * 12) + this.player.attack + this.level;
        this.boss.hp -= damage;
        
        if (this.boss.hp <= 0) {
            this.boss.hp = 0;
            this.map[this.boss.y][this.boss.x] = '⬜';
            this.bossDefeated = true;
            this.hasArtefact = true;
            console.log(`💀 YOU DEFEATED THE BOSS! ✨ Artefact acquired!`);
            
            // Drop artefact item
            this.items.push({
                char: '✨',
                name: 'Artefact',
                type: 'artefact',
                value: 0,
                x: this.boss.x,
                y: this.boss.y
            });
            this.map[this.boss.y][this.boss.x] = '✨';
        } else {
            console.log(`⚔️ You hit the ${this.boss.name} for ${damage} damage! (${this.boss.hp}/${this.boss.maxHp} HP)`);
            
            // Boss counterattacks
            const bossDamage = Math.floor(Math.random() * this.boss.attack) + 5 - this.player.defense;
            const actualDamage = Math.max(1, bossDamage);
            this.player.hp -= actualDamage;
            console.log(`💢 ${this.boss.name} counterattacks for ${actualDamage} damage!`);
            if (this.player.hp <= 0) {
                this.player.hp = 0;
                console.log('💀 YOU DIED! Game Over!');
                process.exit();
            }
        }
    }

    attackNearest() {
        let nearest = null;
        let minDist = Infinity;
        
        // Check monsters
        this.monsters.filter(m => m.hp > 0).forEach(m => {
            const dist = Math.abs(m.x - this.player.x) + Math.abs(m.y - this.player.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = m;
            }
        });
        
        // Check boss
        if (this.boss && this.boss.hp > 0) {
            const dist = Math.abs(this.boss.x - this.player.x) + Math.abs(this.boss.y - this.player.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = this.boss;
            }
        }
        
        if (nearest) {
            if (minDist <= 3) {
                if (nearest.isBoss) {
                    this.attackBoss();
                } else {
                    this.attack(nearest);
                }
            } else {
                console.log('No enemies nearby!');
            }
        } else {
            console.log('No enemies alive!');
        }
    }

    moveMonsters() {
        this.monsters.filter(m => m.hp > 0).forEach(monster => {
            const dx = this.player.x - monster.x;
            const dy = this.player.y - monster.y;
            const dist = Math.abs(dx) + Math.abs(dy);
            
            if (dist <= 5) {
                let moveX = 0, moveY = 0;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    moveX = Math.sign(dx);
                } else {
                    moveY = Math.sign(dy);
                }
                
                const newX = monster.x + moveX;
                const newY = monster.y + moveY;
                
                // Check bounds
                if (newX <= 0 || newX >= this.width - 1 || newY <= 0 || newY >= this.height - 1) {
                    return;
                }
                
                if (newX === this.player.x && newY === this.player.y) {
                    const damage = Math.floor(Math.random() * 6) + 2 + this.level - this.player.defense;
                    const actualDamage = Math.max(1, damage);
                    this.player.hp -= actualDamage;
                    console.log(`💢 ${monster.name} hit you for ${actualDamage} damage!`);
                    if (this.player.hp <= 0) {
                        this.player.hp = 0;
                        console.log('💀 YOU DIED! Game Over!');
                        process.exit();
                    }
                    return;
                }
                
                if (this.map[newY] && (this.map[newY][newX] === '⬜' || this.map[newY][newX] === ' ')) {
                    this.map[monster.y][monster.x] = '⬜';
                    monster.x = newX;
                    monster.y = newY;
                    this.map[monster.y][monster.x] = monster.char;
                }
            }
        });
        
        // Move boss if alive
        if (this.boss && this.boss.hp > 0) {
            const dx = this.player.x - this.boss.x;
            const dy = this.player.y - this.boss.y;
            const dist = Math.abs(dx) + Math.abs(dy);
            
            if (dist <= 6) {
                let moveX = 0, moveY = 0;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    moveX = Math.sign(dx);
                } else {
                    moveY = Math.sign(dy);
                }
                
                const newX = this.boss.x + moveX;
                const newY = this.boss.y + moveY;
                
                // Check bounds
                if (newX <= 0 || newX >= this.width - 1 || newY <= 0 || newY >= this.height - 1) {
                    return;
                }
                
                if (newX === this.player.x && newY === this.player.y) {
                    const damage = Math.floor(Math.random() * this.boss.attack) + 5 - this.player.defense;
                    const actualDamage = Math.max(1, damage);
                    this.player.hp -= actualDamage;
                    console.log(`💢 ${this.boss.name} hit you for ${actualDamage} damage!`);
                    if (this.player.hp <= 0) {
                        this.player.hp = 0;
                        console.log('💀 YOU DIED! Game Over!');
                        process.exit();
                    }
                    return;
                }
                
                if (this.map[newY] && (this.map[newY][newX] === '⬜' || this.map[newY][newX] === ' ')) {
                    this.map[this.boss.y][this.boss.x] = '⬜';
                    this.boss.x = newX;
                    this.boss.y = newY;
                    this.map[this.boss.y][this.boss.x] = '🐉';
                }
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
        
        // Artefact is special - always pick up
        if (item.type === 'artefact') {
            this.hasArtefact = true;
            this.items.splice(itemIdx, 1);
            this.map[this.player.y][this.player.x] = '🧙';
            console.log('✨ You picked up the Artefact!');
            return;
        }
        
        if (this.inventory.length >= 10) {
            console.log('Inventory full!');
            return;
        }
        
        this.inventory.push(item);
        this.items.splice(itemIdx, 1);
        this.map[this.player.y][this.player.x] = '🧙';
        console.log(`📦 Picked up ${item.name}!`);
    }

    useItem() {
        if (this.inventory.length === 0) {
            console.log('Inventory is empty!');
            return;
        }
        
        console.log('Inventory:');
        this.inventory.forEach((item, idx) => {
            console.log(`${idx + 1}: ${item.name}`);
        });
        console.log('Press number (1-9) to use, or any other key to cancel');
        
        const handler = (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            }
            
            const num = parseInt(str);
            if (num >= 1 && num <= this.inventory.length) {
                const item = this.inventory[num - 1];
                this.applyItem(item);
                this.inventory.splice(num - 1, 1);
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

    applyItem(item) {
        switch (item.type) {
            case 'health':
                const heal = item.value + Math.floor(Math.random() * 10);
                this.player.hp = Math.min(this.player.hp + heal, this.player.maxHp);
                console.log(`❤️ Used ${item.name}! Healed for ${heal} HP!`);
                break;
            case 'weapon':
                this.player.attack += item.value;
                console.log(`⚔️ Used ${item.name}! Attack increased by ${item.value}!`);
                break;
            case 'shield':
                this.player.defense += item.value;
                console.log(`🛡️ Used ${item.name}! Defense increased by ${item.value}!`);
                break;
            case 'scroll':
                const effects = ['All monsters take 10 damage!', 'You feel stronger!', 'You find some gold!'];
                const effect = effects[Math.floor(Math.random() * effects.length)];
                if (effect.includes('damage')) {
                    this.monsters.forEach(m => {
                        m.hp -= 10;
                        if (m.hp <= 0) {
                            this.map[m.y][m.x] = '⬜';
                        }
                    });
                    this.monsters = this.monsters.filter(m => m.hp > 0);
                    if (this.boss && this.boss.hp > 0) {
                        this.boss.hp -= 10;
                        if (this.boss.hp <= 0) {
                            this.boss.hp = 0;
                            this.map[this.boss.y][this.boss.x] = '⬜';
                            this.bossDefeated = true;
                            this.hasArtefact = true;
                            console.log('💀 The boss was defeated by the scroll! ✨ Artefact acquired!');
                        }
                    }
                } else if (effect.includes('stronger')) {
                    this.player.attack += 2;
                    this.player.defense += 1;
                }
                console.log(`📜 Used ${item.name}! ${effect}`);
                break;
            case 'artefact':
                console.log('✨ The Artefact radiates power! All stats increased!');
                this.player.attack += 5;
                this.player.defense += 3;
                this.player.maxHp += 20;
                this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
                break;
        }
    }

    showInventory() {
        if (this.inventory.length === 0 && !this.hasArtefact) {
            console.log('Inventory is empty.');
            return;
        }
        
        console.log('📦 INVENTORY:');
        this.inventory.forEach((item, idx) => {
            console.log(`  ${idx + 1}: ${item.name}`);
        });
        if (this.hasArtefact) {
            console.log('  ✨ Artefact (permanent)');
        }
        console.log('Press any key to continue...');
        
        const handler = () => {
            process.stdin.removeListener('keypress', handler);
            this.render();
        };
        process.stdin.on('keypress', handler);
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
                if (this.player.x === this.stairs.x && this.player.y === this.stairs.y) {
                    if (this.level % 5 === 0 && this.boss && this.boss.hp > 0) {
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
                    moved = this.movePlayer(0, -1);
                    break;
                case 'down':
                case 's':
                    moved = this.movePlayer(0, 1);
                    break;
                case 'left':
                case 'a':
                    moved = this.movePlayer(-1, 0);
                    break;
                case 'right':
                case 'd':
                    moved = this.movePlayer(1, 0);
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