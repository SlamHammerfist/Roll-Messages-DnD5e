# Roll Messages for D&D 5e

Connects [Roll Messages](https://github.com/SlamHammerfist/Roll-Messages) to the D&D 5e roll
dialogs. Install and enable both modules.

## Keys

Add a change to an active effect with the key `flags.roll-messages.<type>` and your message as
the value. Any change type works; **Custom** keeps the actor's data untouched.

`<type>` is `attack`, `damage`, `check`, `save`, `initiative` (or `init`), or `all`.

Add tags after the type to narrow it down. The message shows only when the roll has every tag:

- Ability: `check.str`, `save.dex`, `attack.dex`
- Skill or tool: `check.ste`, `check.thief`
- Special saves: `save.death`, `save.concentration`
- Attacks and damage: action type (`mwak`, `rwak`, `msak`, `rsak`), item type (`weapon`, `spell`,
  `consumable`), activity type (`attack`, `save`, `heal`) or attack mode (`oneHanded`, `thrown`)

Skill and tool rolls count as checks. Initiative only matches `initiative` and `all`.

## Clickable bonuses

`@Bonus[formula]{Name}` in a message adds `formula[Name]` to the roll's situational bonus when
clicked, and takes it out again on a second click. In a damage dialog with several rolls, the bonus
goes into the first one.

Example: key `flags.roll-messages.save.dex`, value
`You can add your @Bonus[1d4]{Bardic Inspiration} to this save.`

## Requirements

- Foundry VTT v14
- D&D 5e system 6.0 or later
- Roll Messages 2.0.0 or later
