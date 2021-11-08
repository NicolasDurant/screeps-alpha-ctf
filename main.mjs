import {getObjectsByPrototype} from '/game/utils';
import {Creep} from '/game/prototypes';
import {Flag} from '/arena/prototypes';

/**
 * CTF Notes:
 * - 2x tank: 4 tough, 4 melee, 8 move
 * - 6x ranger: 4 ranged attack, 4 move
 * - 6x healer: 4 heal, 4 move
 */
export function loop() {
    const enemyFlag = getObjectsByPrototype(Flag).find(object => !object.my);
    const myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    for(const creep of myCreeps) {
        creep.moveTo(enemyFlag);
    }
}
