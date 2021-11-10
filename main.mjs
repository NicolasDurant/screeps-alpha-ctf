import {findClosestByRange, findInRange, getObjectsByPrototype, getRange, getTicks} from '/game/utils';
import {BodyPart, Creep, Flag, StructureTower} from '/game/prototypes';
import {HEAL, RANGED_ATTACK} from '/game/constants';

let healers = [], rangers = [], tanks = [], goonSquad = [], ninjas = [], bait = [], nirvana = {x: 20, y: 80};
let tower, myFlag, enemyFlag, direction, towerPath;

const heal = (creep, damagedCreeps) => {
    if (creep.hits === undefined) return;
    let target = findClosestByRange(creep, damagedCreeps);
    if (target && getRange(creep, target) === 1) {
        return creep.heal(target);
    } else {
        return creep.rangedHeal(target);
    }
};

const shoot = (creep, targets) => {
    if (creep.hits === undefined) return;
    let targetsInRange = findInRange(creep, targets, 3);
    if (targetsInRange.length >= 3) {
        return creep.rangedMassAttack();
    } else if (targetsInRange.length > 0) {
        return creep.rangedAttack(targetsInRange[0]);
    }
};

const attack = (creep, targets) => {
    if (creep.hits === undefined) return;
    let target = findClosestByRange(creep, targets);
    return creep.attack(target);
};

const search = (creep, bodyParts) => {
    if (creep.hits === undefined) return;
    let target = findClosestByRange(creep, bodyParts);
    let range = getRange(creep, target);
    if (range <= 10) {
        creep.path = target;
    }
};

const patrol = (creep, a, b, opts = null) => {
    if (creep.hits === undefined) return;
    if (creep.path.x === a.x && creep.path.y === a.y) {
        creep.moveTo(a, opts);
        if (creep.x === a.x && creep.y === a.y) {
            creep.path = b
        }
    } else if (creep.path.x === b.x && creep.path.y === b.y) {
        creep.moveTo(b, opts);
        if (creep.x === b.x && creep.y === b.y) {
            creep.path = a
        }
    } else {
        throw Error('Neither A or B are represented in the creeps.path property!')
    }
};

const krakatower = (tower, targets) => {
    if (tower.hits === undefined) return;
    let target = findClosestByRange(tower, targets);
    let range = getRange(tower, target);
    let energy = tower.store.energy;
    if (energy === 50 && range <= 50) {
        return tower.attack(target);
    } else if (range <= 5) {
        return tower.attack(target);
    }
};

const underAttackAndNotHome = () => {
    for (let i = 0; i < ninjas.length; i++) {
        const ninja = ninjas[i];
        if (ninja.hits === undefined) {
            ninjas.splice(i, 1);
            continue;
        }
        if (ninja.role === 'healer' && ninja.hits < ninja.hitsMax && getRange(ninja, myFlag) > 3) {
            return true
        }
    }
    return false;
};

const enemyFlagUndefended = (targets) => {
    for (let i = 0; i < targets.length; i++) {
        let target = targets[i];
        let range = getRange(target, enemyFlag);
        if (range < 10) {
            return false;
        }
    }
    return true;
};

/**
 * CTF Notes:
 * - 2x tank: 4 tough, 4 melee, 8 move
 * - 6x ranger: 4 ranged attack, 4 move
 * - 6x healer: 4 heal, 4 move
 * TODO: Enemy doesnt move -> reform goon squad and collect items, then attack
 */
export function loop() {
    // Variables that can change per tick
    let myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    let targets = getObjectsByPrototype(Creep).filter(c => !c.my);
    let bodyParts = getObjectsByPrototype(BodyPart);
    let myWoundedCreeps = myCreeps.filter(object => object.hits < object.hitsMax);
    // ONCE: Useful initialisations
    if (getTicks() === 1) {
        myFlag = getObjectsByPrototype(Flag).find(object => object.my);
        enemyFlag = getObjectsByPrototype(Flag).find(object => !object.my);
        tower = getObjectsByPrototype(StructureTower).find(object => object.my);
        towerPath = tower;
        direction = myFlag.x === 2 && myFlag.y === 2 ? 1 : -1;
        // ONCE: Distribute roles
        for (const creep of myCreeps) {
            let heal = 0, rangedAttack = 0;
            creep.body.forEach((body) => {
                if (body.type === HEAL) heal += 1
                if (body.type === RANGED_ATTACK) rangedAttack += 1
            })
            if (heal > 0) {
                creep.role = 'healer'
                healers.push(creep);
            } else if (rangedAttack > 0) {
                creep.role = 'ranger';
                rangers.push(creep);
            } else {
                creep.role = 'tank';
                tanks.push(creep);
            }
        }
        // GOON SQUAD is the defensive formation
        // ONCE: Move healers to goon squad and specify pathing
        if (goonSquad.length < 3) {
            healers[0].path = {x: tower.x + (-direction), y: tower.y + (-direction)};
            healers[1].path = {x: tower.x + (-direction), y: tower.y + (-direction) * 3};
            healers[2].path = {x: tower.x + (-direction) * 3, y: tower.y + (-direction)};
            goonSquad.push(healers[0], healers[1], healers[2]);
            healers.splice(0, 3);
        }
        // ONCE: Move rangers to goon squad and specify pathing
        if (goonSquad.length < 9) {
            rangers[0].path = {x: tower.x, y: tower.y + (-direction)};
            rangers[1].path = {x: tower.x, y: tower.y + (-direction) * 2};
            rangers[2].path = {x: tower.x, y: tower.y + (-direction) * 3};
            rangers[3].path = {x: tower.x + (-direction), y: tower.y};
            rangers[4].path = {x: tower.x + (-direction) * 2, y: tower.y};
            rangers[5].path = {x: tower.x + (-direction) * 3, y: tower.y};
            goonSquad.push(rangers[0], rangers[1], rangers[2], rangers[3], rangers[4], rangers[5]);
            rangers.splice(0, 6);
        }
        // NINJA SQUAD is the offensive formation that goes for an attempt of the flag
        // ONCE: Move tank to ninja squad and specify pathing
        if (ninjas.length < 1) {
            tanks[0].path = nirvana;
            healers[0].path = tanks[0];
            healers[1].path = tanks[0];
            healers[2].path = tanks[0];
            ninjas.push(tanks[0], healers[0], healers[1], healers[2]);
            tanks.splice(0, 1);
            healers.splice(0, 3);
        }
        // BAIT is a tank that will draw fire for the defensive squad
        // ONCE: Move tank to bait squad and specify pathing
        if (bait.length < 1) {
            tanks[0].path = {x: tower.x + (-direction) * 3, y: tower.y + direction};
            bait.push(tanks[0]);
            tanks.splice(0, 1);
        }
    }
    // NINJA SQUAD commands
    if (getTicks() > 1400 || enemyFlagUndefended(targets)) {
        let keeper = targets.filter(t => t.x === enemyFlag.x && t.y === enemyFlag.y);
        for (let i = 0; i < ninjas.length; i++) {
            const ninja = ninjas[i];
            if (ninja.hits === undefined) {
                ninjas.splice(i, 1);
                continue;
            }
            if (ninja.role === 'healer') {
                if (heal(ninja, myWoundedCreeps) !== 0) {
                    ninja.moveTo(enemyFlag);
                }
            } else if (ninja.role === 'ranger') {
                if (keeper.length > 0 && findInRange(ninja, keeper, 3).length > 0) {
                    shoot(ninja, keeper)
                } else {
                    ninja.moveTo(enemyFlag);
                }
            } else if (ninja.role === 'tank') {
                if (keeper.length > 0 && findInRange(ninja, keeper, 1).length > 0) {
                    attack(ninja, keeper)
                } else {
                    ninja.moveTo(enemyFlag);
                }
            }
        }
    } else if (underAttackAndNotHome()) {
        for (let i = 0; i < ninjas.length; i++) {
            const ninja = ninjas[i];
            if (ninja.hits === undefined) {
                ninjas.splice(i, 1);
                continue;
            }
            ninja.moveTo(myFlag);
        }
    } else {
        for (let i = 0; i < ninjas.length; i++) {
            const ninja = ninjas[i];
            if (ninja.hits === undefined) {
                ninjas.splice(i, 1);
                continue;
            }
            if (ninja.role === 'healer') {
                if (getRange(ninja, ninja.path) > 2) {
                    ninja.moveTo(ninja.path.x, ninja.path.y);
                } else {
                    heal(ninja, myWoundedCreeps);
                }
            } else if (ninja.role === 'tank') {
                if (getRange(ninja, ninja.path) > 0) {
                    ninja.moveTo(ninja.path.x, ninja.path.y);
                } else {
                    search(ninja, bodyParts);
                }
            }
        }
    }
    // GOON SQUAD commands
    if (getTicks() <= 25) {
        goonSquad[0].moveTo(goonSquad[0].path);
        goonSquad[1].moveTo(goonSquad[1].path);
        goonSquad[2].moveTo(goonSquad[2].path);
    } else if (getTicks() >= 1600 || myCreeps.length - 6 > targets.length) {
        ninjas.push(...goonSquad);
        goonSquad = [];
    } else {
        for (let i = 0; i < goonSquad.length; i++) {
            const goon = goonSquad[i];
            if (goon.hits === undefined) {
                goonSquad.splice(i, 1);
                continue;
            }
            if (getRange(goon, goon.path) > 0) {
                goon.moveTo(goon.path.x, goon.path.y);
            } else if (goon.role === 'healer') {
                heal(goon, myWoundedCreeps);
            } else if (goon.role === 'ranger') {
                shoot(goon, targets);
            } else if (goon.role === 'tank') {
                attack(goon, targets);
            }
        }
    }
    // BAIT SQUAD commands
    if (getTicks() >= 1600 || myCreeps.length - 6 > targets.length) {
        if (bait.length > 0 && bait[0].hits === undefined) {
            bait.pop();
        } else {
            if (getRange(bait[0], myFlag) > 0) {
                bait[0].moveTo(myFlag);
            }
        }
    } else if (getTicks() >= 50) {
        if (bait.length > 0 && bait[0].hits === undefined) {
            bait.pop();
        } else if (bait.length > 0) {
            let enemy = findInRange(bait[0], targets, 1);
            if (enemy.length > 0) {
                bait[0].attack(enemy[0])
            } else {
                patrol(bait[0], {x: towerPath.x + (-direction) * 3, y: towerPath.y + direction}, {
                    x: towerPath.x + direction,
                    y: towerPath.y + (-direction) * 3
                }, {swampCost: 0, plainCost: 5, reusePath: true});
            }
        }
    }
    // Tower attack closest target with maximum BOOM
    krakatower(tower, targets)
}
