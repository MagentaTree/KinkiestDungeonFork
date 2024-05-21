
let KDLeashPullCost = 0.5;
let KDLeashPullKneelTime = 5;

let KDLeashReason : {[_: string]: (entity: entity) => boolean} = {
	ShadowTether: (entity) => {
		if (!(entity.leash.entity && KinkyDungeonFindID(entity.leash.entity)?.Enemy?.tags?.shadow)) return false;
		if (entity.player) {
			return KinkyDungeonPlayerTags.get("Shadow");
		} else {
			return KDBoundEffects(entity) > 1;
		}
	}
};

function KDGetTetherLength(entity: entity): number {
	if (!entity) entity = KDPlayer();
	if (entity.leash) {
		return entity.leash.length || 2.5;
	}
	return 0;
}

function KDIsPlayerTethered(entity: entity): boolean {
	if (!entity) entity = KDPlayer();
	if (entity.leash) {
		KDUpdateLeashCondition(entity);
		return entity.leash != undefined;
	}
	if (entity.player) {
		let found = KinkyDungeonFindID(KDGameData.KinkyDungeonLeashingEnemy);
		if (!found) KDGameData.KinkyDungeonLeashingEnemy = 0;
		return KDGameData.KinkyDungeonLeashedPlayer > 0;
	}
	return false;
}

/** Updates the leash and returns true if the leash survives or false if removed */
function KDUpdateLeashCondition(entity: entity, noDelete: boolean = false) : boolean {
	if (entity.leash?.reason) {
		if (!KDLeashReason[entity.leash.reason] || !KDLeashReason[entity.leash.reason](entity)) {
			if (!noDelete)
				delete entity.leash;
			return false;
		}
	}
	return true;
}

function KinkyDungeonAttachTetherToEntity(dist: number, entity: entity, player: entity, reason?: string, color?: string, priority: number = 5, item: item = null): KDLeashData {
	if (!player) player = KDPlayer();

	if (!player.leash || priority > player.leash.priority) {
		player.leash = {
			x: entity.x,
			y: entity.y,
			entity: entity.player ? -1 : entity.id,
			reason: reason,
			color: color,
			length: dist || 2,
			priority: priority,
			restraintID: item?.id,
		};
		return player.leash;
	}
	return undefined;
}

function KDIsPlayerTetheredToLocation(player: entity, x: number, y: number, entity?: entity): boolean {
	if (!player.player) return false;
	if (player.leash) {
		if (entity && KDIsPlayerTetheredToEntity(player, KDLookupID(player.leash.entity))) {
			return true;
		} else if (player.leash.x == x && player.leash.y == y) return true;
		else if (entity && player.leash.x == entity.x && player.leash.y == entity.y) return true;
	}
	return false;
}

function KDIsPlayerTetheredToEntity(player: entity, entity: entity) {
	if (!player.player) return false;

	if (player.leash) {
		let host = KDLookupID(player.leash.entity);
		if (host?.id == entity?.id) {
			return true;
		}
	}
	return false;
}



function KDBreakTether(player: entity): boolean {
	if (player?.leash) {
		delete player.leash;
		return true;
	}
	return false;
}


function KinkyDungeonDrawTethers(CamX: number, CamY: number) {
	KDTetherGraphics.clear();
	if (!KDGameBoardAddedTethers) {
		kdgameboard.addChild(KDTetherGraphics);
		KDGameBoardAddedTethers = true;
	}

	let drawTether = (entity: entity) => {
		if (entity.leash) {
			let xx = canvasOffsetX + (entity.visual_x - CamX)*KinkyDungeonGridSizeDisplay;
			let yy = canvasOffsetY + (entity.visual_y - CamY)*KinkyDungeonGridSizeDisplay;
			let txx = canvasOffsetX + (entity.leash.x - CamX)*KinkyDungeonGridSizeDisplay;
			let tyy = canvasOffsetY + (entity.leash.y - CamY)*KinkyDungeonGridSizeDisplay;
			let dx = (txx - xx);
			let dy = (tyy - yy);
			let dd = 0.1; // Increments
			let color = entity.leash.color;
			if (!color || color == "Default") color = "#aaaaaa";
			if (Array.isArray(color)) color = color[0];
			KDTetherGraphics.lineStyle(4, string2hex(color), 1);
			for (let d = 0; d < 1; d += dd) {
				let yOffset = 30 * Math.sin(Math.PI * d);
				let yOffset2 = 30 * Math.sin(Math.PI * (d + dd));
				KDTetherGraphics.moveTo(KinkyDungeonGridSizeDisplay/2 + xx + dx*d, KinkyDungeonGridSizeDisplay*0.8 + yOffset + yy + dy*d);
				KDTetherGraphics.lineTo(KinkyDungeonGridSizeDisplay/2 + xx + dx*(d+dd), KinkyDungeonGridSizeDisplay*0.8 + yOffset2 + yy + dy*(d+dd));
			}
		}

	};

	drawTether(KDPlayer());
	for (let enemy of KDMapData.Entities) {
		drawTether(enemy);
	}
}

function KinkyDungeonUpdateTether(Msg: boolean, Entity: entity, xTo?: number, yTo?: number): boolean {

	if (Entity.player && KinkyDungeonFlags.get("pulled")) return false;
	else if (KDEnemyHasFlag(Entity, "pulled")) return false;

	KDUpdateLeashCondition(Entity, false);

	if (Entity.leash) {
		let exceeded = false;
		let leash = Entity.leash;
		let tether = leash.length;

		if (leash.entity) {
			let target = KDLookupID(leash.entity);
			if (!target) {
				return false;
			} else {
				leash.x = target.x;
				leash.y = target.y;
			}
		}

		let restraint = (Entity.player && leash.restraintID) ?  KinkyDungeonAllRestraintDynamic().find((inv) => {return inv.item.id == leash.restraintID;}) : undefined;

		if (!restraint && (Entity.player && leash.restraintID)) {
			KDBreakTether(Entity);
		}

		if (Entity.player) KDGameData.KinkyDungeonLeashedPlayer = Math.max(KDGameData.KinkyDungeonLeashedPlayer, 5);

		if (xTo || yTo) {// This means we are trying to move
			let pathToTether = KinkyDungeonFindPath(xTo, yTo, leash.x, leash.y, false, !Entity.player, false, KinkyDungeonMovableTilesSmartEnemy);
			let playerDist = Math.max(pathToTether?.length || 0, KDistChebyshev(xTo-leash.x, yTo-leash.y));
			// Fallback
			if (playerDist > tether && KDistEuclidean(xTo-leash.x, yTo-leash.y) > KDistEuclidean(Entity.x-leash.x, Entity.y-leash.y)) {
				if (Msg && leash.restraintID) {
					if (restraint) {
						KinkyDungeonSendActionMessage(10, TextGet("KinkyDungeonTetherTooShort").replace("TETHER", KDGetItemName(restraint.item)), "#ff5277", 2, true);
					}
				}
				if (Entity.player) {
					if (KinkyDungeonCanStand() && !KDForcedToGround()) {
						KDGameData.KneelTurns = Math.max(KDGameData.KneelTurns, KDLeashPullKneelTime + KDGameData.SlowMoveTurns);
						KinkyDungeonChangeWill(-KDLeashPullCost, false);
					}
				} else {
					Entity.stun = Math.max(Entity.stun || 0, 2);
				}

				//return true;
				if (Entity.player) KinkyDungeonSetFlag("leashtug", 3);
				else KinkyDungeonSetEnemyFlag(Entity, "leashtug", 3);
				exceeded = true;
			}
		}
		for (let i = 0; i < 10; i++) {
			// Distance is in pathing units
			let pathToTether = KinkyDungeonFindPath(Entity.x, Entity.y, leash.x, leash.y, false, !Entity.player, false, KinkyDungeonMovableTilesSmartEnemy);
			let playerDist = pathToTether?.length;
			// Fallback
			if (!pathToTether) playerDist = KDistChebyshev(Entity.x-leash.x, Entity.y-leash.y);
			if (playerDist > tether) {
				let slot = null;
				if (pathToTether
					&& pathToTether?.length > 0
					&& (
						KDistEuclidean(pathToTether[0].x - leash.x, pathToTether[0].y - leash.y) > -0.01 + KDistEuclidean(Entity.x - leash.x, Entity.y - leash.y)
						|| KinkyDungeonFindPath(pathToTether[0].x, pathToTether[0].y, leash.x, leash.y, false, !Entity.player, false, KinkyDungeonMovableTilesSmartEnemy)?.length < pathToTether.length
					) && KDistChebyshev(pathToTether[0].x - Entity.x, pathToTether[0].y - Entity.y) < 1.5)
					slot = pathToTether[0];
				if (!slot) {
					let mindist = playerDist;
					for (let X = Entity.x-1; X <= Entity.x+1; X++) {
						for (let Y = Entity.y-1; Y <= Entity.y+1; Y++) {
							if ((X !=  Entity.x || Y != Entity.y) && KinkyDungeonMovableTilesEnemy.includes(KinkyDungeonMapGet(X, Y)) && KDistEuclidean(X-leash.x, Y-leash.y) < mindist) {
								mindist = KDistEuclidean(X-leash.x, Y-leash.y);
								slot = {x:X, y:Y};
							}
						}
					}
				}
				if (!slot) { //Fallback
					slot = {x:leash.x, y:leash.y};
				}
				if (slot) {
					let enemy = KinkyDungeonEnemyAt(slot.x, slot.y);
					if (enemy) {
						let slot2 = null;
						let mindist2 = playerDist;
						for (let X = enemy.x-1; X <= enemy.x+1; X++) {
							for (let Y = enemy.y-1; Y <= enemy.y+1; Y++) {
								if ((X !=  enemy.x || Y != enemy.y) && !KinkyDungeonEntityAt(slot.x, slot.y) && KinkyDungeonMovableTilesEnemy.includes(KinkyDungeonMapGet(X, Y)) && KDistEuclidean(X-Entity.x, Y-Entity.y) < mindist2) {
									mindist2 = KDistEuclidean(X-Entity.x, Y-Entity.y);
									slot2 = {x:X, y:Y};
								}
							}
						}
						if (slot2) {
							KDMoveEntity(enemy, slot2.x, slot2.y, false);
						} else {
							let pointSwap = KinkyDungeonGetNearbyPoint(slot.x, slot.y, true, undefined, true, true);
							if (pointSwap)
								KDMoveEntity(enemy, pointSwap.x, pointSwap.y, false, undefined, undefined, true);
							else
								KDMoveEntity(enemy, Entity.x, Entity.y, false,undefined, undefined, true);
						}
					}
					// Force open door
					if (KinkyDungeonMapGet(slot.x, slot.y) == 'D') KinkyDungeonMapSet(slot.x, slot.y, 'd');

					if (Entity.player) {
						KDMovePlayer(slot.x, slot.y, false, undefined, undefined);
					} else {
						KDMoveEntity(Entity, slot.x, slot.y, false, undefined, undefined, true);
					}
					if (Entity.player) KinkyDungeonSetFlag("pulled", 1);
					else KinkyDungeonSetEnemyFlag(Entity, "pulled", 1);
					if (Entity.player) KinkyDungeonSetFlag("leashtug", 3);
					else KinkyDungeonSetEnemyFlag(Entity, "leashtug", 3);
					if (Entity.player) {
						KinkyDungeonInterruptSleep();
						KinkyDungeonSendEvent("leashTug", {Entity: Entity, slot: slot, item: restraint});
						if (KinkyDungeonLeashingEnemy()) {
							KinkyDungeonSetEnemyFlag(KinkyDungeonLeashingEnemy(), "harshpull", 5);
						}
						if (Msg && restraint) KinkyDungeonSendActionMessage(9, TextGet("KinkyDungeonTetherPull").replace("TETHER", KDGetItemName(restraint.item)), "#ff5277", 2, true);
						exceeded = true;
					}

				}
			}
		}
		return exceeded;
	}
	return false;


}

