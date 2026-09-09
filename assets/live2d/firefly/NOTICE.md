# Firefly (流萤) model attribution

Imported from the user-selected repository:
https://github.com/hhjk21/Firefly-Companion-AI-

Revision: abc0628e93e845345cded7db5fdf97ee0ae5fa3c
Directory: resources/live2d/firefly/
Upstream model credit: bilibili @是依七哒
https://space.bilibili.com/457683484
Character/game artwork: miHoYo / Honkai: Star Rail.
The source specifies personal learning/exchange, noncommercial use.

The `.moc3`, texture, physics and expression files are unchanged. The three
Tick2 motion files retain their original curves with Meta.Loop changed to false
so each idle action finishes before a later action is scheduled.

The model manifest is adapted for the standard web SDK: Tick2 motions are exposed
as Tap, the EyeBlink parameter group is declared explicitly, and desktop-only
controllers and sound references are omitted. The website UI implements its own
timers, expression reset, accessory toggles and visibility handling, inspired by
apps/desktop/src/components/Live2D/Live2DPet.vue in the same repository.

SOURCE-LICENSE.txt retains the upstream MIT license for its code. It does not
grant ownership of, or relicense, the character or model artwork.
