import {getObjectsByPrototype, getRange, findClosestByRange} from '/game/utils';
import {Creep, Flag, StructureTower} from '/game/prototypes';
import {BODYPART_COST} from '/game/constants';
let rolesSet = false, healers = [], rangers = [], tanks = [], goonSquad = [], directionPlus = -1;
let myCreeps, tower, myFlag, enemyFlag;
/**
 * CTF Notes:
 * - 2x tank: 4 tough, 4 melee, 8 move
 * - 6x ranger: 4 ranged attack, 4 move
 * - 6x healer: 4 heal, 4 move
 */
export function loop() {
    // ONCE: Useful initialisations
    if(!myFlag) myFlag = getObjectsByPrototype(Flag).find(object => object.my);
    if(!enemyFlag) enemyFlag = getObjectsByPrototype(Flag).find(object => !object.my);
    if(!myCreeps) myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    if(!tower) tower = getObjectsByPrototype(StructureTower).filter(object => object.my);
    // ONCE: Where is my flag ?
    if(directionPlus === -1) directionPlus = myFlag.x === 4 && myFlag.y === 4 ? 1 : 0;
    // ONCE: Distribute roles
    if(!rolesSet) {
        for(const creep of myCreeps) {
            let heal = 0, rangedAttack = 0;
            creep.body.forEach((body)=>{
                if(body.type === BODYPART_COST.HEAL) heal += 1
                if(body.type === BODYPART_COST.RANGED_ATTACK) rangedAttack += 1
            })
            if (heal > 0) {
                creep.role = 'healer'
                healers.push(creep);
            }
            else if (rangedAttack > 0) {
                creep.role = 'ranger';
                rangers.push(creep);
            }
            else {
                creep.role = 'tank';
                tanks.push(creep);
            }
        }
        rolesSet = true;
    }
    // ONCE: Move healers to goon squad
    if(goonSquad.length <= 3) {
        goonSquad.push(healers[0], healers[1], healers[2])
        healers.splice(0,3)
    }
    // ONCE: Move rangers to goon squad
    if(goonSquad.length <= 7) {
        goonSquad.push(rangers[0], rangers[1], rangers[2], rangers[3])
        rangers.splice(0,4)
    }
    // ONCE: Move tank to goon squad
    if(goonSquad.length <= 8) {
        goonSquad.push(tanks[0])
        tanks.splice(0,1)
    }
    // Variables that can change per tick
    const targets = getObjectsByPrototype(Creep).filter(c => !c.my);
    const myWoundedCreeps = myCreeps.filter(object => object.hits < object.hitsMax);
    const closestTarget = findClosestByRange(tower, targets);
    // Healer creeps
    for(const creep of healers) {
        creep.moveTo(enemyFlag);
    }
    // Healer creeps
    for(const creep of healers) {
        creep.moveTo(enemyFlag);
    }
    // Healer creeps
    for(const creep of healers) {
        creep.moveTo(enemyFlag);
    }
    // Tower attack
    if(closestTarget) {
        tower.attack(closestTarget);
    }
}
