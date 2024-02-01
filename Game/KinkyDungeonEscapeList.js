	"use strict";

let KinkyDungeonEscapeTypes = {
	"None": {
		check: () => {
			return true;
		},
		text: () => {
		  let escape = KinkyDungeonEscapeTypes["None"].check();
		  if (escape)
				return TextGet("KDEscapeKey_Pass_None");
			else
				return TextGet("KDEscapeKey_Fail_None");			
		}
	},
	"Default": {
		check: () => {
			return KDGameData.JailKey;
		},
		text: () => {
		  let escape = KinkyDungeonEscapeTypes["Default"].check();
		  if (escape)
				return TextGet("KDEscapeKey_Pass_Default");
			else
				return TextGet("KDEscapeKey_Fail_Default");			
		}
	},
	"Kill": {
		worldgenstart: () => {
			let enemytype = KinkyDungeonGetEnemy([], KDGetEffLevel(),KinkyDungeonMapIndex[MiniGameKinkyDungeonCheckpoint], '0');
			let enemynumber = Math.floor(Math.random()*2)+3;  //random number 3 to 5
			let data = {enemy: enemytype.name, number: enemynumber};
			KinkyDungeonSendEvent("calcEscapeKillTarget", data);
			KDMapData.KillTarget = data.enemy;
			KDMapData.KillQuota = data.number;
			for (let i = 0; i < data.number; i++) {
				let point = KinkyDungeonGetRandomEnemyPoint(true);
				if (point) {
					let ens = KinkyDungeonSummonEnemy(point.x, point.y, data.enemy, 1, 2.9);
					KinkyDungeonSetEnemyFlag(ens[0], "killtarget", -1);
				}
			}
		},
		check: () => {
			if (!KDMapData.KillTarget) //if this wasnt the escapemethod when this floor was created, spawn targets now
				KinkyDungeonEscapeTypes["Kill"].worldgenstart();

			var count = 0;
			for (let enemy of KDMapData.Entities) {
				if (KDEnemyHasFlag(enemy, "killtarget")) {
					count++;
				}
			}
			KDMapData.KillQuota = count;
			return KDMapData.KillQuota <= 0;
		},
		text: () => {
		  let escape = KinkyDungeonEscapeTypes["Kill"].check();
		  if (escape)
				return TextGet("KDEscapeKey_Pass_Kill");
			else
				return TextGet("KDEscapeKey_Fail_Kill").replace("NUMBER", KDMapData.KillQuota.toString()).replace("TYPE",TextGet("Name" + KDMapData.KillTarget));
		}
	},
	"Miniboss": {
		worldgenstart: () => {
			let enemytype = KinkyDungeonGetEnemy(['miniboss'], KDGetEffLevel(),KinkyDungeonMapIndex[MiniGameKinkyDungeonCheckpoint], '0');
			let enemynumber = 1;
			let data = {enemy: enemytype.name, number: enemynumber};
			KinkyDungeonSendEvent("calcEscapeKillTarget", data);
			KDMapData.KillTarget = data.enemy;
			KDMapData.KillQuota = data.number;
			for (let i = 0; i < data.number; i++) {
				let point = KinkyDungeonGetRandomEnemyPoint(true);
				if (point) {
					let ens = KinkyDungeonSummonEnemy(point.x, point.y, data.enemy, 1, 2.9);
					KinkyDungeonSetEnemyFlag(ens[0], "killtarget", -1);
					KDMakeHighValue(ens[0]);
				}
			}
		},
		check: () => {
			if (!KDMapData.KillTarget) //if this wasnt the escapemethod when this floor was created, spawn targets now
				KinkyDungeonEscapeTypes["Miniboss"].worldgenstart();

			var count = 0;
			for (let enemy of KDMapData.Entities) {
				if (KDEnemyHasFlag(enemy, "killtarget")) {
					count++;
				}
			}
			KDMapData.KillQuota = count;
			return KDMapData.KillQuota <= 0;
		},
		text: () => {
		  let escape = KinkyDungeonEscapeTypes["Miniboss"].check();
		  if (escape)
				return TextGet("KDEscapeKey_Pass_Miniboss");
			else
				return TextGet("KDEscapeKey_Fail_Miniboss").replace("TYPE",TextGet("Name" + KDMapData.KillTarget));
		}
	},
	"Chest": {
		worldgenstart: () => {
			let count = 0;
			for (let X = 1; X < KDMapData.GridWidth - 1; X++) {
				for (let Y = 1; Y < KDMapData.GridHeight - 1; Y++) {
					if (KinkyDungeonMapGet(X, Y) == 'C' && KinkyDungeonTilesGet(X+','+Y)?.Lock == undefined) {
						if (KinkyDungeonFindPath(KDMapData.StartPosition.x, KDMapData.StartPosition.y, X, Y) != undefined) {
							count++;
						}
					}
				}
			}
			let quota = Math.floor(Math.random()*2)+8;  //random number 8 to 10
			if (quota > count) quota = count;
			let data = {number: quota};
			KinkyDungeonSendEvent("calcEscapeChestQuota", data);
			KDMapData.ChestQuota = data.number;
		},
		check: () => {
			if (KDMapData.ChestQuota < 0)
				KinkyDungeonEscapeTypes["Chest"].worldgenstart();				
			return KDMapData.ChestQuota == 0;
		},
		text: () => {
		  let escape = KinkyDungeonEscapeTypes["Chest"].check();
		  if (escape)
				return TextGet("KDEscapeKey_Pass_Chest");
			else
				return TextGet("KDEscapeKey_Fail_Chest").replace("NUMBER", KDMapData.ChestQuota.toString());
		}
	},
	"Trap": {
		worldgenstart: () => {
			let count = 0;
			for (let X = 1; X < KDMapData.GridWidth - 1; X++) {
				for (let Y = 1; Y < KDMapData.GridHeight - 1; Y++) {
					if (KinkyDungeonTilesGet(X+','+Y)?.Trap != undefined) {
						if (KinkyDungeonFindPath(KDMapData.StartPosition.x, KDMapData.StartPosition.y, X, Y) != undefined) {
							count++;
						}
					}
				}
			}
			let quota = Math.floor(Math.random()*5)+30;  //random number 30 to 35
			let data = {number: quota};
			KinkyDungeonSendEvent("calcEscapeTrapQuota", data);
			KDMapData.TrapQuota = data.number;
		},
		check: () => {
			if (KDMapData.TrapQuota < 0)
				KinkyDungeonEscapeTypes["Trap"].worldgenstart();				
			return KDMapData.TrapQuota == 0;
		},
		text: () => {
		  let escape = KinkyDungeonEscapeTypes["Trap"].check();
		  if (escape)
				return TextGet("KDEscapeKey_Pass_Trap");
			else
				return TextGet("KDEscapeKey_Fail_Trap").replace("NUMBER", KDMapData.TrapQuota.toString());
		}
	},
	"Boss": {
		check: () => {
			return KinkyDungeonFlags.has("BossUnlocked");
		},
		text: () => {
		  let escape = KinkyDungeonEscapeTypes["Boss"].check();
		  if (escape)
				return TextGet("KDEscapeKey_Pass_Boss");
			else
				return TextGet("KDEscapeKey_Fail_Boss");			
		}
	},
}

function KDEscapeWorldgenStart(method) {
	if (method) {
		if (KinkyDungeonEscapeTypes[method] && KinkyDungeonEscapeTypes[method].worldgenstart) {
			KinkyDungeonEscapeTypes[method].worldgenstart();
		}
	}
}
