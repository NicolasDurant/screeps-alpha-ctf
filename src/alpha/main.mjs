import { findClosestByRange, findInRange, getObjectsByPrototype, getRange, getTicks } from 'game/utils';
import { BodyPart, Creep, Flag, StructureTower } from 'game/prototypes';
import { HEAL, RANGED_ATTACK, ERR_NOT_IN_RANGE, ERR_INVALID_TARGET } from 'game/constants';
import { } from 'arena';

let healers = [], rangers = [], tanks = [], goonSquad = [], ninjas = [], bait = [], nirvana = {x: 20, y: 80};
let towers, myFlag, enemyFlag, direction;

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
    console.log(targetsInRange)
    if (targetsInRange.length >= 3) {
        return creep.rangedMassAttack();
    } else {
        return creep.rangedAttack(targetsInRange[0]);
    }
};

const attack = (creep, targets) => {
    if (creep.hits === undefined) return;
    let target = findClosestByRange(creep, targets);
    return creep.attack(target);
};

const search = (creep, bodyParts) => {
    if (creep.hits === undefined || bodyParts.length === 0) return;
    let target = findClosestByRange(creep, bodyParts);
    let range = getRange(creep, target);
    if (range <= 13) {
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

const krakatower = (towers, targets) => {
    for (let i = 0; i < towers.length; i++) {
        if (towers[i].hits === undefined || targets.length === 0) return;
        let target = findClosestByRange(towers[i], targets);
        let range = getRange(towers[i], target);
        let energy = towers[i].store.energy;
        if (energy === 50 && range <= 50) {
            return towers[i].attack(target);
        } else if (range <= 5) {
            return towers[i].attack(target);
        }
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

const myFlagsAttacker = (targets) => {
    for (let i = 0; i < targets.length; i++) {
        let target = targets[i];
        let range = getRange(target, myFlag);
        if (range < 10) {
            return target;
        }
    }
    return false;
};

const firstTickInit = (creeps) => {
    myFlag = getObjectsByPrototype(Flag).find(object => object.my);
    enemyFlag = getObjectsByPrototype(Flag).find(object => !object.my);
    towers = getObjectsByPrototype(StructureTower).filter(object => object.my);
    direction = myFlag.x === 3 && myFlag.y === 3 ? 1 : -1;
    // ONCE: Distribute roles
    for (const creep of creeps) {
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
        healers[0].path = {x: myFlag.x, y: myFlag.y};
        healers[1].path = {x: myFlag.x + (-direction), y: myFlag.y};
        healers[2].path = {x: myFlag.x, y: myFlag.y + (-direction)};
        goonSquad.push(healers[0], healers[1], healers[2]);
        healers.splice(0, 3);
    }
    // ONCE: Move rangers to goon squad and specify pathing
    if (goonSquad.length < 8) {
        rangers[0].path = {x: myFlag.x, y: myFlag.y - (-direction)};
        rangers[1].path = {x: myFlag.x - (-direction), y: myFlag.y - (-direction)};
        rangers[2].path = {x: myFlag.x - (-direction), y: myFlag.y};
        rangers[3].path = {x: myFlag.x - (-direction), y: myFlag.y + (-direction) * 2};
        rangers[4].path = {x: myFlag.x + (-direction) * 2, y: myFlag.y - (-direction)};
        goonSquad.push(rangers[0], rangers[1], rangers[2], rangers[3], rangers[4]);
        rangers.splice(0, 5);
    }
    // NINJA SQUAD is the offensive formation that goes for an attempt of the flag
    // ONCE: Move tank to ninja squad and specify pathing
    if (ninjas.length < 1) {
        tanks[0].path = nirvana;
        healers[0].path = tanks[0];
        healers[1].path = tanks[0];
        healers[2].path = tanks[0];
        rangers[0].path = tanks[0];
        ninjas.push(tanks[0], healers[0], healers[1], healers[2], rangers[0]);
        tanks.splice(0, 1);
        healers.splice(0, 3);
        rangers.splice(0, 3);
    }
    // BAIT is a tank that will draw fire for the defensive squad
    // ONCE: Move tank to bait squad and specify pathing
    if (bait.length < 1) {
        tanks[0].path = {x: myFlag.x + direction * 3, y: myFlag.y - direction * 2};
        bait.push(tanks[0]);
        tanks.splice(0, 1);
    }
};


/**
* CTF Notes:
* - 2x tank: 4 tough, 4 melee, 8 move
* - 6x ranger: 4 ranged attack, 4 move
* - 6x healer: 4 heal, 4 move
* - 2x Tower (x: 2, y: 4 && x: 4, y: 2) || (x: 97, y: 95 && x: 95, y: 97)
* - 1x Flag (x: 3, y: 3) || (x: 96, y: 96)
*/
export function loop() {
    // Variables that can change per tick
    let myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    let targets = getObjectsByPrototype(Creep).filter(c => !c.my);
    let bodyParts = getObjectsByPrototype(BodyPart);
    let myWoundedCreeps = myCreeps.filter(object => object.hits < object.hitsMax);
    // ONCE: Useful initialisations
    if (getTicks() === 1) {
        firstTickInit(myCreeps);
    }
    // TODO: control if code acceptable
    // NINJA SQUAD commands
    if (enemyFlagUndefended(targets) && getTicks() > 100 || getTicks() > 1600) {
        let keeper = targets.filter(t => t.x === enemyFlag.x && t.y === enemyFlag.y);
        for (let i = 0; i < ninjas.length; i++) {
            const ninja = ninjas[i];
            if (ninja.hits === undefined) {
                ninjas.splice(i, 1);
                continue;
            }
            if (ninja.role === 'healer') {
                if (heal(ninja, myWoundedCreeps) !== 0) {
                    if (ninjas[0].role === 'tank') {
                        ninja.moveTo(ninjas[0].x + 2 * (-direction), ninjas[0].y + 2 * (-direction));
                    } else {
                        ninja.moveTo(enemyFlag);
                    }
                }
            } else if (ninja.role === 'ranger') {
                if (keeper.length > 0 && findInRange(ninja, keeper, 3).length > 0) {
                    shoot(ninja, keeper)
                } else if (shoot(ninja, targets) !== ERR_NOT_IN_RANGE || shoot(ninja, targets) === ERR_INVALID_TARGET) {
                    if (ninjas[0].role === 'tank') {
                        ninja.moveTo(ninjas[0].x + 2 * (-direction), ninjas[0].y + 2 * (-direction));
                    } else {
                        ninja.moveTo(enemyFlag);
                    }
                }
            } else if (ninja.role === 'tank') {
                if (keeper.length > 0 && findInRange(ninja, keeper, 1).length > 0) {
                    attack(ninja, keeper)
                } else if (attack(ninja, targets) === ERR_NOT_IN_RANGE || attack(ninja, targets) === ERR_INVALID_TARGET) {
                    if (findInRange(ninja, ninjas, 10).length < myCreeps.length - 2 && getTicks() > 1600) {

                    } else if (findInRange(ninja, ninjas, 1).length < 2 && getTicks() < 1600) {

                    } else {
                        ninja.moveTo(enemyFlag);
                    }
                }
            }
        }
    } else if (underAttackAndNotHome() && getTicks() < 100) {
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
                if (ninjas[0].role === 'tank') {
                    ninja.moveTo(ninjas[0].x + 2 * (-direction), ninjas[0].y + 2 * (-direction));
                } else {
                    heal(ninja, myWoundedCreeps);
                }
            } else if (ninja.role === 'ranger') {
                if (ninjas[0].role === 'tank') {
                    ninja.moveTo(ninjas[0].x + 2 * (-direction), ninjas[0].y + 2 * (-direction));
                } else {
                    shoot(ninja, targets)
                }
            } else if (ninja.role === 'tank') {
                if (getRange(ninja, ninja.path) > 0) {
                    ninja.moveTo(ninja.path.x, ninja.path.y, {swampCost: 0, plainCost: 5, reusePath: true});
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
    } else if (getTicks() >= 1500 || myCreeps.length - 5 > targets.length) {
        let potentialTarget = myFlagsAttacker(targets);
        if (potentialTarget) {
            for (let i = 0; i < goonSquad.length; i++) {
                const goon = goonSquad[i];
                if (goon.hits === undefined) {
                    goonSquad.splice(i, 1);
                    continue;
                }
                if (goon.role === 'healer') {
                    if (heal(goon, myWoundedCreeps) === ERR_NOT_IN_RANGE) {
                        goon.moveTo(potentialTarget);
                    }
                } else if (goon.role === 'ranger') {
                    let shot = shoot(goon, targets)
                    if (shot === ERR_NOT_IN_RANGE || shot === ERR_INVALID_TARGET) {
                        goon.moveTo(potentialTarget);
                    }
                } else if (goon.role === 'tank') {
                    if (attack(goon, targets) === ERR_NOT_IN_RANGE) {
                        goon.moveTo(potentialTarget);
                    }
                }
            }
        } else {
            ninjas.push(...goonSquad);
            goonSquad = [];
        }
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
    if (getTicks() >= 1500 || myCreeps.length - 5 > targets.length) {
        if (bait.length > 0 && bait[0].hits === undefined) {
            bait.pop();
        } else {
            if (getRange(bait[0], myFlag) > 0) {
                bait[0].moveTo(myFlag);
            } else {
                attack(bait[0], targets);
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
                patrol(bait[0], {x: myFlag.x + direction * 3, y: myFlag.y - direction * 2}, {
                    x: myFlag.x - direction * 2,
                    y: myFlag.y + direction * 3
                }, {swampCost: 0, plainCost: 5, reusePath: true});
            }
        }
    }
    // Tower attack closest target with maximum BOOM
    krakatower(towers, targets)
}
