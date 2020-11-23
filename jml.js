var winner = null;
var loser = null;
var commandes = { 0: [] };
var casts = [];
var learns = [];

var steps = 1;
var maxOneLearn = true;
// PLAYER CLASS
class Player {
    constructor(inv0, inv1, inv2, inv3, score) {
        this.inv0 = inv0;
        this.inv1 = inv1;
        this.inv2 = inv2;
        this.inv3 = inv3;
        this.score = score;
    }

    hasNoInv() {
        return (
            this.inv0 == 0 &&
            this.inv1 == 0 &&
            this.inv2 == 0 &&
            this.inv3 == 0
        );
    }

    getBestPCast() {
        return casts.filter(
            _cast => {
                return _cast.delta0 >= 0 && _cast.delta1 >= 0 && _cast.delta2 >= 0 && _cast.delta3 >= 0 && _cast.actionType == 'CAST'
            }
        ).sort(
            (a, b) => {
                return (b.delta0 + b.delta1 + b.delta2 + b.delta3) - (a.delta0 + a.delta1 + a.delta2 + a.delta3)
            }
        )[0];
    }

    canLearn(learn) {
        return this.inv0 >= learn.learnPosition;
    }

    tInv() {
        return (this.inv0 + this.inv1 + this.inv2 + this.inv3);
    }

}

class BaseCommande {
    constructor(actionId, actionType, delta0, delta1, delta2, delta3, price, castable, spells, cycles,
        tomeIndex, taxCount, repeatable, learnPosition
    ) {
        this.actionId = actionId;
        this.actionType = actionType;
        this.delta0 = delta0;
        this.delta1 = delta1;
        this.delta2 = delta2;
        this.delta3 = delta3;
        this.price = price;
        this.castable = castable;
        this.spells = spells;
        this.cycles = cycles;
        this.tomeIndex = tomeIndex;
        this.taxCount = taxCount;
        this.repeatable = repeatable;
        this.learnPosition = learnPosition
    }

    isCastableC(commande) {
        return [
            this.delta0 + commande.delta0,
            this.delta1 + commande.delta1,
            this.delta2 + commande.delta2,
            this.delta3 + commande.delta3
        ].every(e => e <= 0);
    }

    isCastableP(player) {
        return (
            this.delta0 + player.inv0 >= 0 &&
            this.delta1 + player.inv1 >= 0 &&
            this.delta2 + player.inv2 >= 0 &&
            this.delta3 + player.inv3 >= 0 &&
            this.castable
        );
    }
}

class Learn extends BaseCommande {
    static getLearnById(actionId) {
        return learns.filter(l => l.actionId == actionId)[0];
    }
}

// COMMANDE CLASS
class Commande extends BaseCommande {
    isCommandable(player) {
        return (
            Math.abs(this.delta0) <= player.inv0 &&
            Math.abs(this.delta1) <= player.inv1 &&
            Math.abs(this.delta2) <= player.inv2 &&
            Math.abs(this.delta3) <= player.inv3
        );
    }
}
// Cast class
class Cast extends BaseCommande {

    static getCastById(actionId) {
        return casts.filter(c => c.actionId == actionId)[0];
    }
}

// Game class
class Game {
    static sortBuildables(commandeLevel = 0) {
        const getBestCommande = (commandes) => { // sort fastest and price desc 
            return commandes.sort(function (a, b) {
                return b.price - a.price || a.cycles - b.cycles; // || a.spells.length - b.spells.length;
            });
        };

        let allCommandes = [];
        for (let i in commandes) {
            if (!commandes[i]) break;
            allCommandes = [...allCommandes, ...commandes[i]];
        }

        return getBestCommande(allCommandes.filter(_commande => _commande.isCommandable(winner)))[0];
    }

    static canBuild(commandeLevel = 0) {
        // Can build commande
        const getBestCommande = (commandes) => { // sort fastest and price desc 
            return commandes.sort(function (a, b) {
                return b.price - a.price;
            });
        };

        if (commandes[commandeLevel]) {
            const bestCommandes = getBestCommande(commandes[commandeLevel]); //commandes[commandeLevel].sort((a,b) => a.price - b.price ? -1 : 1)
            for (let commande of bestCommandes) {
                if (commande.isCommandable(winner)) {
                    return commande;
                }
            }
            return false;
        }
        return false;
    }

    static buildSubLevel(commandeLevel = 0, max = 4) {
        --max;
        
        // transforme commandes 
        const nextLevel = commandeLevel + 1;
        commandes[nextLevel] = [];
        //console.error(commandeLevel, commandes[commandeLevel]); 
        for (let commande of commandes[commandeLevel]) {
            // CASTS
            for (let cast of casts) {
                if (cast.actionType == 'CAST' && cast.isCastableC(commande)) {
                    const cycles = cast.castable && !commande.spells.find(s=>s.actionId == cast.actionId) ? commande.cycles + 1 : commande.cycles + 2;
                    // Apply revers cast 
                    commandes[nextLevel].push(
                        new Commande(
                            commande.actionId,
                            commande.actionType,
                            cast.delta0 + commande.delta0,
                            cast.delta1 + commande.delta1,
                            cast.delta2 + commande.delta2,
                            cast.delta3 + commande.delta3,
                            commande.price,
                            0, //castable
                            [cast, ...commande.spells], //sub Levels
                            cycles,
                            commande.tomeIndex,
                            commande.taxCount,
                            commande.repeatable
                        )
                    );
                }
            }
        }

        if (commandes[nextLevel] && commandes[nextLevel].length > 0 && max >= 0) {
            Game.buildSubLevel(nextLevel, max);
        }

        return;
    }

    static runStrategy() {
        const canBuildCommande = this.sortBuildables();


        if (canBuildCommande && canBuildCommande.spells.length > 0) {
            const _cast = casts.filter(c => c.actionId == canBuildCommande.spells[0]['actionId'])[0];
            if (_cast && _cast['castable'] && _cast.isCastableP(winner)) {
                console.log(`CAST ${_cast.actionId}`);
                return;
            } else {
                console.log('REST');
                return;
            }
        } else if (canBuildCommande) {
            console.log(`BREW ${canBuildCommande.actionId}`);
            return;
        } else {
            //console.log(`LEARN ${learns.filter(_learn => _learn.learnPosition == 0)[0].actionId}`);

            if (maxOneLearn) {
                console.log(`LEARN ${learns.filter(_learn => _learn.learnPosition == 0)[0].actionId}`);
                maxOneLearn = false;
                return;
            } else {
                maxOneLearn = true;
                const bestpcast = winner.getBestPCast();
                if (bestpcast && bestpcast.castable) {
                    console.log('CAST ' + bestpcast.actionId);
                    return;
                } else if (bestpcast && !bestpcast.castable) {
                    console.log('REST');
                    return;
                } else {
                    console.log(`LEARN ${learns.filter(_learn => _learn.learnPosition == 0)[0].actionId}`);
                    return;
                }

            } 
        }

    }


    static runAlgo() {
        const xxx = Game.canBuild(0);
        if (xxx) {
            console.log(`BREW ${xxx.actionId} BREW ${xxx.actionId}`);
            return;
        }

        if (winner.hasNoInv()) {
            const bestpcast = winner.getBestPCast();
            if (bestpcast && bestpcast.castable) {
                console.log('CAST ' + bestpcast.actionId);
                return;
            } else if (bestpcast && !bestpcast.castable) {
                console.log('REST');
                return;
            } else {
                console.log(`LEARN ${learns.filter(_learn => _learn.learnPosition == 0)[0].actionId}`);
                return;
            }
        }
        

        if (steps < 11) {
            console.log(`LEARN ${learns.filter(_learn => _learn.learnPosition == 0)[0].actionId}`);
            return;
        }

        /* if (steps % 5 == 0) {
            console.log(`LEARN ${learns.filter(_learn => _learn.learnPosition == 0)[0].actionId}`);
            return;
        } */
/* 
        const moyenne = (commandes[0].reduce((a,i) => a+i.price, 0) / commandes[0].length);
        commandes[0] = commandes[0].filter((c) => c.price >= moyenne);
 */
        // start by building commandes sublevels
        Game.buildSubLevel(0, 3);
        // start strategy
        Game.runStrategy();
    }

}

//const game = new Game();
// GAME LOOP
while (true) {
    const actionCount = parseInt(readline()); // the number of spells and recipes in play
    var learnPosition = 0;
    steps++;
    for (let i = 0; i < actionCount; i++) {
        var inputs = readline().split(' ');
        const actionId = parseInt(inputs[0]); // the unique ID of this spell or recipe
        const actionType = inputs[1]; // in the first league: BREW; later: CAST, OPPONENT_CAST, LEARN, BREW
        const delta0 = parseInt(inputs[2]); // tier-0 ingredient change
        const delta1 = parseInt(inputs[3]); // tier-1 ingredient change
        const delta2 = parseInt(inputs[4]); // tier-2 ingredient change
        const delta3 = parseInt(inputs[5]); // tier-3 ingredient change
        const price = parseInt(inputs[6]); // the price in rupees if this is a potion
        const tomeIndex = parseInt(inputs[7]); // in the first two leagues: always 0; later: the index in the tome if this is a tome spell, equal to the read-ahead tax
        const taxCount = parseInt(inputs[8]); // in the first two leagues: always 0; later: the amount of taxed tier-0 ingredients you gain from learning this spell
        const castable = inputs[9] !== '0'; // in the first league: always 0; later: 1 if this is a castable player spell
        const repeatable = inputs[10] !== '0'; // for the first two leagues: always 0; later: 1 if this is a repeatable player spell
        //Push commandes 
        if (actionType.includes('BREW')) commandes[0].push(new Commande(actionId, actionType, delta0, delta1, delta2, delta3, price, 0, [], 0, tomeIndex, taxCount, repeatable, learnPosition));
        if (actionType.includes('CAST')) casts.push(new Cast(actionId, actionType, delta0, delta1, delta2, delta3, price, castable, [], 0, tomeIndex, taxCount, repeatable, learnPosition));
        if (actionType.includes('LEARN')) {
            learns.push(new Learn(actionId, actionType, delta0, delta1, delta2, delta3, price, castable, [], 0, tomeIndex, taxCount, repeatable, learnPosition));
            learnPosition++
        }
    }
    for (let i = 0; i < 2; i++) {
        var inputs = readline().split(' ');
        const inv0 = parseInt(inputs[0]); // tier-0 ingredients in inventory
        const inv1 = parseInt(inputs[1]);
        const inv2 = parseInt(inputs[2]);
        const inv3 = parseInt(inputs[3]);
        const score = parseInt(inputs[4]);
        // create Players
        if (i === 0) winner = new Player(inv0, inv1, inv2, inv3, score);
        if (i === 1) loser = new Player(inv0, inv1, inv2, inv3, score);
    }

    // Start strategy
    Game.runAlgo();
    // Clear vars
    winner = null;
    loser = null;
    commandes = { 0: [] };
    casts = [];
    learns = [];
    // Write an action using console.log()
    // To debug: console.error('Debug messages...');
    //console.error({winner, loser, casts, commandes});

    // in the first league: BREW <id> | WAIT; later: BREW <id> | CAST <id> [<times>] | LEARN <id> | REST | WAIT
    //console.log('BREW 0');
}
