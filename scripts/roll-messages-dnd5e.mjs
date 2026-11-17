/**
 * Roll Messages for D&D 5e
 * Connects the Roll Messages hub to the dnd5e roll configuration dialogs. It tells the hub what
 * each dialog is rolling, puts the Messages box above the dialog's configuration section, and
 * adds clicked bonuses to the first roll's situational bonus.
 *
 * A change's own Conditions (dnd5e change conditions) are checked against the dialog's roll data,
 * so roll.* keys such as roll.item.properties or roll.attack.type can narrow a message down.
 *
 * Roll types: attack, damage, check, save, initiative (or init), all.
 * Tags:       ability (str, dex...), skill (ste, prc...), tool (thief...), death, concentration,
 *             and for attacks and damage: action type (mwak, rwak, msak, rsak), item type
 *             (weapon, spell...), activity type (attack, save, heal...) and attack mode.
 */

Hooks.once("rollMessages.ready", api => {
  api.registerSystem({
    id: "dnd5e",
    hooks: ["renderRollConfigurationDialog"],
    describe: app => describeRoll(app.config ?? {}),
    insert(app, element, box) {
      const anchor = element.querySelector("[data-application-part='configuration']")
        ?? element.querySelector("[data-application-part='buttons']");
      if ( anchor ) anchor.before(box);
      else (element.querySelector("form") ?? element).append(box);
    },
    bonus: api.formulaFieldBonus(element => element.querySelector("input[name='roll.0.situational']")),
    condition: checkConditions
  });
});

/* -------------------------------------------- */
/*  Effect Select                               */
/* -------------------------------------------- */

/**
 * List the Roll Messages keys in Effect Select's Attribute Key dropdown.
 * Covers every type, plus the tags that come from dnd5e config (abilities, skills, tools,
 * action types, attack modes). Item and activity type tags can still be typed by hand.
 */
Hooks.on("effectSelect.keys", (keys, { documentName }) => {
  if ( (documentName !== "Actor") || (game.system.id !== "dnd5e") ) return;
  const cfg = CONFIG.DND5E;
  const group = game.modules.get("roll-messages")?.title ?? "Roll Messages";
  const loc = value => game.i18n.localize((typeof value === "string") ? value : (value?.label ?? ""));
  const add = (path, ...labels) => keys.push({
    key: `flags.roll-messages.${path}`, group, label: [group, ...labels].filter(Boolean).join(" › ")
  });

  const types = {
    all: "All Rolls", attack: "Attack Roll", damage: "Damage Roll",
    check: "Ability Check", save: "Saving Throw", initiative: "Initiative"
  };
  for ( const [type, label] of Object.entries(types) ) add(type, label);

  for ( const [id, ability] of Object.entries(cfg.abilities ?? {}) ) {
    for ( const type of ["check", "save", "attack"] ) add(`${type}.${id}`, types[type], loc(ability));
  }
  for ( const [id, skill] of Object.entries(cfg.skills ?? {}) ) add(`check.${id}`, types.check, loc(skill));
  for ( const id of Object.keys(cfg.tools ?? {}) ) add(`check.${id}`, types.check, toolLabel(id));
  add("save.death", types.save, "Death Save");
  add("save.concentration", types.save, "Concentration");

  for ( const type of ["attack", "damage"] ) {
    for ( const [id, label] of Object.entries(cfg.itemActionTypes ?? {}) ) add(`${type}.${id}`, types[type], loc(label));
    for ( const [id, mode] of Object.entries(cfg.attackModes ?? {}) ) add(`${type}.${id}`, types[type], loc(mode));
  }
});

/** Tool name from its base item, falling back to the id. */
function toolLabel(id) {
  try {
    const label = dnd5e.documents.Trait.keyLabel(`tool:${id}`, { trait: "tool" });
    if ( label && (label !== id) ) return label;
  } catch {}
  return id;
}

/* -------------------------------------------- */

/**
 * Check a message's change conditions against the roll being configured.
 * @param {object} message  From the hub, with the effect and change it came from.
 * @param {object} roll     RollInfo from describeRoll.
 * @returns {boolean}
 */
function checkConditions(message, roll) {
  const conditions = message.change?.conditions;
  if ( typeof conditions?.check !== "function" ) return true;
  const base = roll.rollData ?? roll.actor.getRollData();
  const data = message.effect?.getRuleConditionData?.(base) ?? base;
  return conditions.check(data) !== false;
}

/* -------------------------------------------- */

/**
 * Work out what a dnd5e roll dialog is rolling, from its hook names and subject.
 * @param {object} config  The dialog's roll process config.
 * @returns {object|null}  RollInfo for the hub.
 */
function describeRoll(config) {
  const hooks = (config.hookNames ?? []).map(h => String(h).toLowerCase());
  const subject = config.subject;
  const actor = subject instanceof Actor ? subject : (subject?.actor ?? subject?.item?.actor ?? null);
  if ( !actor?.system ) return null;

  const tags = new Set();
  const add = (...values) => values.forEach(v => v && tags.add(String(v).toLowerCase()));
  const addActivity = () => {
    const actionType = subject?.getActionType?.(config.attackMode) ?? subject?.actionType;
    add(actionType, subject?.type, subject?.item?.type, config.attackMode);
  };

  let type = null;
  if ( hooks.includes("damage") ) {
    type = "damage";
    addActivity();
  }
  else if ( hooks.includes("attack") ) {
    type = "attack";
    add(config.ability);
    addActivity();
  }
  else if ( hooks.includes("initiativedialog") || hooks.includes("initiative") ) {
    type = "initiative";
    add(actor.system.attributes?.init?.ability || CONFIG.DND5E.defaultAbilities?.initiative || "dex");
  }
  else if ( hooks.includes("deathsave") ) {
    type = "save";
    add("death");
  }
  else if ( hooks.includes("concentration") ) {
    type = "save";
    add("concentration", config.ability);
  }
  else if ( hooks.includes("savingthrow") ) {
    type = "save";
    add(config.ability);
  }
  else if ( hooks.includes("skill") || hooks.includes("tool") || hooks.includes("abilitycheck") ) {
    type = "check";
    add(config.ability, config.skill, config.tool);
  }
  if ( !type ) return null;
  const rollData = config.rolls?.[0]?.data ?? actor.getRollData();
  return { actor, type, tags, aliases: { init: "initiative" }, rollData };
}
