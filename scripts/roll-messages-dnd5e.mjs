/**
 * Roll Messages for D&D 5e
 * Connects the Roll Messages hub to the dnd5e roll configuration dialogs. It tells the hub what
 * each dialog is rolling, puts the Messages box above the dialog's configuration section, and
 * adds clicked bonuses to the first roll's situational bonus.
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
    bonus: api.formulaFieldBonus(element => element.querySelector("input[name='roll.0.situational']"))
  });
});

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
  return type ? { actor, type, tags, aliases: { init: "initiative" } } : null;
}
