import {findClosestByRange, findInRange, getObjectsByPrototype, getRange, getTicks} from '/game/utils';
import {Creep, Flag, StructureTower} from '/game/prototypes';
import {HEAL, RANGED_ATTACK} from '/game/constants';

let healers = [], rangers = [], tanks = [], goonSquad = [];
let tower, myFlag, enemyFlag, direction;

const heal = (creep, damagedCreeps) => {
    let target = findInRange(creep, damagedCreeps);
    creep.heal(target);
};

const shoot = (creep, targets) => {
    let target = findInRange(creep, targets);
    creep.rangedAttack(target);
};

const punch = (creep, targets) => {
    let target = findInRange(creep, targets);
    creep.attack(target);
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
    const myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    const targets = getObjectsByPrototype(Creep).filter(c => !c.my);
    const myWoundedCreeps = myCreeps.filter(object => object.hits < object.hitsMax);
    // ONCE: Useful initialisations
    if(getTicks() === 1) {
        myFlag = getObjectsByPrototype(Flag).find(object => object.my);
        enemyFlag = getObjectsByPrototype(Flag).find(object => !object.my);
        tower = getObjectsByPrototype(StructureTower).filter(object => object.my);
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
        // ONCE: Move healers to goon squad and specify pathing
        if (goonSquad.length < 2) {
            healers[0].path = {x: myFlag.x + direction, y: myFlag.y};
            healers[1].path = {x: myFlag.x, y: myFlag.y + direction};
            goonSquad.push(healers[0], healers[1]);
            healers.splice(0, 2);
        }
        // ONCE: Move rangers to goon squad and specify pathing
        if (goonSquad.length < 6) {
            rangers[0].path = {x: myFlag.x, y: myFlag.y + (-direction)};
            rangers[1].path = {x: myFlag.x + (-direction), y: myFlag.y};
            rangers[2].path = {x: myFlag.x + (-direction), y: myFlag.y + direction};
            rangers[3].path = {x: myFlag.x + direction, y: myFlag.y + (-direction)};
            goonSquad.push(rangers[0], rangers[1], rangers[2], rangers[3]);
            rangers.splice(0, 4);
        }
        // ONCE: Move tank to goon squad and specify pathing
        if (goonSquad.length < 7) {
            tanks[0].path = {x: myFlag.x + direction, y: myFlag.y + direction};
            goonSquad.push(tanks[0]);
            tanks.splice(0, 1);
        }
    }
    // Command Goon-Squad
    if (getTicks() <= 50) {
        goonSquad[2].moveTo(goonSquad[2].path);
        goonSquad[3].moveTo(goonSquad[3].path);
    } else {
        for (const goon of goonSquad) {
            if (getRange(goon, goon.path) > 0) {
                goon.moveTo(goon.path.x, goon.path.y);
            } else if (goon.role === 'healer') {
                heal(goon, myWoundedCreeps);
            } else if (goon.role === 'ranger') {
                shoot(goon, targets);
            } else if (goon.role === 'tank') {
                punch(goon, targets);
            }
        }
    }
    // Healer creeps
    for (const creep of healers) {
        creep.moveTo(enemyFlag);
    }
    // Healer creeps
    for (const creep of rangers) {
        creep.moveTo(enemyFlag);
    }
    // Healer creeps
    for (const creep of tanks) {
        creep.moveTo(enemyFlag);
    }
    // Tower shoot
    const closestTarget = findClosestByRange(tower, targets);
    if (closestTarget) {
        tower.attack(closestTarget);
    }
}
