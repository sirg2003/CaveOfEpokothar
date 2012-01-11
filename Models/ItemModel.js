

var ItemModel = function(category, type, extras) {
	this.template = kItemsData.getItemTemplate(category, type);
	this.extras = extras || {};
	this.orderNum = ++ItemModel.orderNum;
};

ItemModel.orderNum = 0;

ItemModel.specialNameTemplate = new enyo.g11n.Template($L("#{cursed} #{knownBonus} #{adornment} #{displayName}"));
ItemModel.specialTerseNameTemplate = new enyo.g11n.Template($L("#{knownBonus} #{adornment} #{displayName}"));
ItemModel.corpseNameTemplate = new enyo.g11n.Template($L("#{monsterName} corpse"));
ItemModel.rottenNameTemplate = new enyo.g11n.Template($L("Rotting #{monsterName} corpse"));
ItemModel.bonesNameTemplate = new enyo.g11n.Template($L("#{monsterName} bones"));

/*
 *  Static functions
 */

ItemModel.initRandomNames = function() {
	var key, i, j, obj;
	
	ItemModel.randomNames = {};

	// First shuffle kItemAdornments.potions
	for (i = kItemAdornments.potions.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		obj = kItemAdornments.potions[i];
		kItemAdornments.potions[i] = kItemAdornments.potions[j];
		kItemAdornments.potions[j] = obj;
	}

	i = 0;
	for (key in kItemsData.potions) {
		obj = kItemAdornments.potions[i++];
		// Make a copy so it can be modified (the name can chance once the item is identified)
		ItemModel.randomNames[key] = {
			displayName: obj.displayName,
			tileImg: obj.tileImg
		};
	}
};

ItemModel.saveRandomNames = function() {
	localStorage.setItem("randomNames", JSON.stringify(ItemModel.randomNames));
};

ItemModel.restoreRandomNames = function() {
	var names = localStorage.getItem("randomNames");
	if (names) {
		ItemModel.randomNames = JSON.parse(names);
	} else {
		ItemModel.initRandomNames();
	}
};


/*
 * Object functions
 */

ItemModel.prototype.makeCopy = function() {
	var key, extras, newItem;

	extras = {};
	if (this.extras) {
		for (key in this.extras) {
			extras[key] = this.extras[key];
		}
	}
	newItem = Object.create(Object.getPrototypeOf(this));
	newItem.template = this.template;
	newItem.extras = extras;
	newItem.orderNum = ++ItemModel.orderNum;

	return newItem;
};

ItemModel.prototype.setSortList = function() {
	this.orderNum = ++ItemModel.orderNum;
};

ItemModel.prototype.getCategory = function() {
	return this.template.category;
};

ItemModel.prototype.getType = function() {
	return this.template.type;
};

ItemModel.prototype.getDisplayName = function(terse) {
	var name, type;
	//TODO: for now just display the name, but later, need this to include
	//unidentified ("murky purple potion")
	type = this.getType();
	if (this.canSpoil()) {
		if (this.extras.rotten) {
			if (type === "bones") {
				name = ItemModel.bonesNameTemplate.evaluate(this.extras);
			} else {
				name = ItemModel.rottenNameTemplate.evaluate(this.extras);
			}
		} else {
			name = ItemModel.corpseNameTemplate.evaluate(this.extras);
		}
	} else if (ItemModel.randomNames[type]) {
		name = ItemModel.randomNames[type].displayName;
	} else {
		
		// Copy the displayName from template to extras so the string templating can use it,
		// even though it wastes space when saving a game
		if (!this.extras.displayName && (this.extras.adornment || this.extras.cursed || this.extras.bonus)) {
			this.extras.displayName = this.template.displayName;
		}

		if (this.extras.displayName) {
			if (terse) {
				name = ItemModel.specialTerseNameTemplate.evaluate(this.extras);
			} else {
				name = ItemModel.specialNameTemplate.evaluate(this.extras);
			}
		} else {
			name = this.template.displayName || this.template.type;
		}
	}
	
	if (this.extras.count > 1) {
		name += " (" + this.extras.count + ")";
	}

	return name;
};

ItemModel.prototype.getTileImg = function() {
	var randomTileImg, type = this.template.type;
	randomTileImg = ItemModel.randomNames[type] && MapTileIcons[ItemModel.randomNames[type].tileImg];
	if (randomTileImg) {
		return randomTileImg;
	} else if (this.extras.tileImg) {
		return MapTileIcons[this.extras.tileImg];
	} else {
		return MapTileIcons[this.template.type];
	}
};

ItemModel.prototype.getDescription = function() {
	//TODO: add extra info, like magic enhancements, etc.
	//enhancements (eg, +1) and unidentified ("murky purple potion")
	var description;
	description = [this.getDisplayName(true)];
	if (this.template.description) {
		description.push(this.template.description);
	}
	if (this.extras.bonus && !this.extras.knownBonus && !this.extras.adornment) {
		if (Math.random() > 0.5) {
			description.push($L("The craftsmanship is exquisite."));
		} else {
			description.push($L("It looks very well made."));
		}
	}
	if (this.template.skill && !this.template.easy) {
		description.push(new enyo.g11n.Template($L("Skill required: #{skill}")).evaluate(this.template));
	}
	
	return description.join("<br/>");
};

ItemModel.prototype.getSkillRequired = function(ranged) {
	// if a weapon is used for ranged attack it has to be thrown unless the weapon uses ammunition
	// (or is ammo).
	if (!ranged || this.template.ammo || this.template.category === "ammo") {
		return this.template.skill;
	// Special case thrown weapons: darts, spears and daggers/knives 
	} else if (this.template.skill === "dart" || this.template.skill === "spear" || this.template.skill === "dagger"){
		return this.template.skill;
	} else {
		return "thrown";
	}
};

ItemModel.prototype.canUseUnskilled = function() {
	return this.template.easy;
};

ItemModel.prototype.getHandsRequired = function() {
	if (this.template.hands !== undefined) {
		return this.template.hands;
	} else {
		return 1;
	}
};

ItemModel.prototype.requiresAmmunition = function() {
	return this.template.ammo;
};

ItemModel.prototype.autoPickup = function() {
	return this.template.category === "food" || this.template.category === "potions" || this.extras.autoPickup;
};

ItemModel.prototype.setAutoPickupFlag = function() {
	this.extras.autoPickup = true;
};

ItemModel.prototype.removeAutoPickupFlag = function() {
	delete this.extras.autoPickup;
};

ItemModel.prototype.getRemainingUses = function() {
	if (this.extras.count !== undefined) {
		return this.extras.count;
	} else {
		return 1;
	}
};

ItemModel.prototype.setRemainingUses = function(count) {
	this.extras.count = count;
};

ItemModel.prototype.incrementUses = function(count) {
	if (!this.extras.count) {
		// Assume the item has 1 count if 'count' is not defined
		this.extras.count = 1 + count;
	} else {
		this.extras.count += count;
	}
};

ItemModel.prototype.useItOnce = function() {
	if (this.extras.count > 0) {
		--this.extras.count;
	}
	
	return this.extras.count || 0;
};

ItemModel.prototype.destroyedWhenUsed = function(hit) {
	if (this.template.destroyedWhenUsed) {
		if (hit) {
			return (Math.random() < 2 * this.template.destroyedWhenUsed);
		} else {
			return (Math.random() < this.template.destroyedWhenUsed);
		}
	} else {
		return false;
	}
};

ItemModel.prototype.getEquippedSlot = function() {
	return this.template.slot || this.template.category;
};

ItemModel.prototype.getWeight = function() {
	var w = this.template.weight;
	if (this.extras.count > 1) {
		w = w * this.extras.count;
	}
	return w;
};

ItemModel.prototype.getImage = function() {
	return this.template.img || "";
};

ItemModel.prototype.getNourishment = function() {
	return this.template.nourishment || 0;
};

ItemModel.prototype.getDiseasedAmount = function() {
	var diseaseChance = 0;
	if (this.extras && this.extras.disease) {
		diseaseChance = this.extras.disease;
	} else if (this.template.disease) {
		diseaseChance = this.template.disease;
	}
	
	if (this.extras.rotten) {
		diseaseChance *= 3;
	}
	
	if (diseaseChance && Math.random() * 100 < diseaseChance) {
		return diseaseChance;
	} else {
		return 0;
	}
};

ItemModel.prototype.getEffect = function() {
	var effect = {}, duration, amount;
	
	if (this.template.amount) {
		amount = this.template.amount;
		if (this.template.amountRand) {
			amount += Math.floor(Math.random() * this.template.amountRand);
		}
		effect.amount = amount;
	}
	
	if (this.template.attrAmount) {
		effect.attrAmount = this.template.attrAmount;
	}
	
	if (this.template.duration) {
		duration = this.template.duration;
		if (this.template.durationRand) {
			duration += Math.floor(Math.random() * this.template.durationRand);
		}
		effect.duration = duration;
	}
	
	if (this.template.attribute) {
		effect.attribute = this.template.attribute;
	}

	if (this.template.effect) {
		effect.effect = this.template.effect;
	}

	return effect;
};

ItemModel.prototype.setEquipped = function(equipped) {
	this.extras.equipped = equipped;
};

ItemModel.prototype.isEquipped = function() {
	return this.extras.equipped;
};

ItemModel.prototype.getDefense = function() {
	var defense = 0;
	if (this.template.defense) {
		defense = this.template.defense;
		if (this.extras.bonus) {
			defense += this.extras.bonus;
		}
	}
	return defense;
};

ItemModel.prototype.getBlock = function() {
	var block = 0;
	if (this.template.block) {
		block = this.template.block;
		if (this.extras.bonus) {
			block += this.extras.bonus;
		}
	}
	return block;
};

ItemModel.prototype.getFlexibility = function() {
	// 1 is very flexible, like cloth; 0 is inflexible like rock
	return this.template.flexibility || 1;
};

ItemModel.prototype.getMeleeReach = function() {
	// returning a falsey value indicates this item can't be used as a weapon
	return this.template.meleeReach || 1;
};

ItemModel.prototype.getRangedReach = function() {
	// returning a falsey value indicates this item can't be shot or thrown
	return this.template.rangeReach;
};

ItemModel.prototype.getAccuracy = function(range) {
	var accuracy;
	if (range > 1) {
		// Using math.ceil to enforce less accuracy on all ranged weapon use (thrown and projectile)
		accuracy = this.template.accuracy - 2 * Math.ceil(range / this.template.rangeAccuracy);
	} else {
		accuracy = this.template.accuracy;
	}

	if (this.extras.bonus) {
		accuracy += this.extras.bonus;
	}
	return accuracy;
};

ItemModel.prototype.magicUnidentified = function() {
	if (this.extras.bonus) {
		return !this.extras.knownBonus;
	} else {
		// If the item is not magical, then always consider it identified
		return false;
	}
};

ItemModel.prototype.identifyMagic = function(int, allowRetry) {
	var bonus, type;
	if (this.extras.knownBonus) {
		return false; // Already identified this item
	}
	
	if (!allowRetry && this.extras.idInt === int) {
		return false;
	}
	
	bonus = this.extras.bonus || 0;
	if (int > (18 * Math.random()) + (2 * Math.abs(bonus))) {
		type = this.getType();
		if (ItemModel.randomNames[type]) {
			// Replace the random displayname with the item's real displayname
			ItemModel.randomNames[type].displayName = this.template.displayName;
			this.extras.knownBonus = 1; //to mark this as identified
		} else {
			if (bonus > 0) {
				this.extras.knownBonus = "+" + bonus;
			} else if (bonus < 0) {
				this.extras.knownBonus = bonus + "";
			}
		}
		
		// It's been identified so don't need to track this anymore
		delete this.extras.idInt;
		return true;
	} else if (!allowRetry) {
		this.extras.idInt = int;
	}
	return false;
};

ItemModel.prototype.setBonus = function(val) {
	this.extras.bonus = val;
	// If the bonus is known, update the display version too
	if (this.extras.knownBonus) {
		if (val > 0) {
			this.extras.knownBonus = "+" + val;
		} else {
			this.extras.knownBonus = val + "";
		}
	}
};

ItemModel.prototype.addMagicBonus = function(level) {
	var x, bonus, category, adornmentsList;
	//TODO: potential for item to be cursed or blessed, but not until there's scrolls to identify and uncurse.
	
	category = this.getCategory();
	// For now, only ammo, armor and weapons can have magic bonuses.
	if (category !== "ammo" && category !== "armor" && category !== "weapons") {
		return;
	}

	// Max bonus is +3
	bonus = Math.floor(Math.random() * level / 2);
	if (bonus > 3) {
		bonus = 3;
	}

	// If the bonus is 0, the item isn't magical so skip the rest 
	if (bonus) {
		this.setBonus(bonus);

		adornmentsList = kItemAdornments[category];
		if (adornmentsList.length > 0) {
			// Essentially there's a 50% chance that the item will have an adornment
			x = Math.floor(Math.random() * 2 * adornmentsList.length);
			if (x < adornmentsList.length) {
				this.setAdornment(adornmentsList[x]);
			}
		}
	}
},

ItemModel.prototype.addRacialAdornment = function() {
	var n = Math.random();
	switch (this.getCategory()) {
	case "ammo":
		if (n > 0.4) {
			this.extras.adornment = kItemAdornments.racialElf;
		} else {
			this.extras.adornment = kItemAdornments.racialOrc;
		}
		break;
		
	case "armor":
		if (n > 0.6) {
			this.extras.adornment = kItemAdornments.racialDwarf;
		} else if (n > 0.3) {
			this.extras.adornment = kItemAdornments.racialElf;
		} else {
			this.extras.adornment = kItemAdornments.racialOrc;
		}
		break;

	case "weapon":
		switch (this.getSkillRequired()) {
		case "club":
			this.extras.adornment = kItemAdornments.racialOrc;
			break;
		
		case "axe":
			this.extras.adornment = kItemAdornments.racialDwarf;
			break;
		
		case "bow":
			this.extras.adornment = kItemAdornments.racialElf;
			break;
		
		case "sword":
			if (n > 0.5) {
				this.extras.adornment = kItemAdornments.racialElf;
			} else {
				this.extras.adornment = kItemAdornments.racialOrc;
			}
			break;
		
		default:
			if (n > 0.66) {
				this.extras.adornment = kItemAdornments.racialDwarf;
			} else if (n > 0.33) {
				this.extras.adornment = kItemAdornments.racialElf;
			} else {
				this.extras.adornment = kItemAdornments.racialOrc;
			}
			break;
		}
	}
};

ItemModel.prototype.setAdornment = function(val) {
	this.extras.adornment = val;
};

ItemModel.prototype.getAdornment = function() {
	return this.extras.adornment || "";
};

ItemModel.prototype.calcDamage = function(skill) {
	skill = skill || 0;
	var damage = Math.floor((Math.random() * this.template.damageRnd) + (Math.random() * skill)) + this.template.damageMin;
	return damage;
};

ItemModel.prototype.canConsolidate = function() {
	return !!this.template.canConsolidate;
};

ItemModel.prototype.consolidate = function(item) {
	var consolidated = false;
	if (this.template.canConsolidate) {
		//TODO: need to check other differences like extras.bonus or extras.adornment
		if (item.getCategory() === this.getCategory() && item.getType() === this.getType() &&
			item.extras.adornment === this.extras.adornment && item.extras.bonus === this.extras.bonus) {
			consolidated = true;
			this.incrementUses(item.getRemainingUses());
		}
	}
	return consolidated;
};

ItemModel.prototype.canSpoil = function() {
	return this.template.canSpoil;
};

// returns true if the item should disappear (has rotted away)
ItemModel.prototype.checkAge = function(changedCallback) {
	var duration, extras = this.extras;
	if (this.canSpoil() && extras.deathTurn) {
		duration = GameMain.turnCount - extras.deathTurn;
		if (duration > 10000) {
			if (changedCallback) {
				changedCallback("delete");
			}
			return true;
		} else if (duration > 2500 && this.getType() !== "bones") {
			// Change from a bloody corpse to a skeleton
			this.template = kItemsData.getItemTemplate(this.getCategory(), "bones");
			delete extras.tileImg;
			if (changedCallback) {
				changedCallback("bones");
			}
		} else if (!extras.rotten && duration > 500) {
			extras.rotten = true;
			if (changedCallback) {
				changedCallback("rotten");
			}
		}
	}
	
	return false;
};

ItemModel.prototype.getGoldValue = function() {
	var value = this.template.value || 10;
	value *= this.getRemainingUses();
	if (this.extras.bonus) {
		value *= (1 + this.extras.bonus);
	}
	return value;
};


ItemModel.prototype.toString = function() {
	var o = {
		category:this.template.category,
		type: this.template.type
	};
	// If extras has any properties in it, add it to the serialized string
	for (var k in this.extras) {
		o.extras = this.extras;
		break;
	}
	return JSON.stringify(o);
};
