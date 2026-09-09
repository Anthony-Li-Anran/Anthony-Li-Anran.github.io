# Anthony-Li-Anran.io

This is Anthony Li's personal website.

## Live2D companion

The shared Jekyll layout includes Firefly (流萤) from Honkai: Star Rail,
using the model from
[hhjk21/Firefly-Companion-AI-](https://github.com/hhjk21/Firefly-Companion-AI-)
project (revision `abc0628e93e845345cded7db5fdf97ee0ae5fa3c`), on desktop screens
(at least 1024px wide). It loads after the page, follows the pointer, and offers
Chinese greetings, a hide button, and a restore button. Hiding is remembered in
the visitor's browser. Animation pauses while hidden or in a background tab.
Mobile and print layouts hide it; mobile visits do not download the runtime or
model. Visitors requesting reduced motion initially see only the restore button.
Audio is disabled.

The website adapts the source project's interaction ideas:

- Three idle motions, chosen every 16–24 seconds when no motion is playing.
- Eight facial expressions in the interaction panel, reverting after six seconds.
- Independent sunglasses and cat-ear toggles, also triggered by clicking the
  bangs or right back hair. Expression changes preserve accessory choices.
- A greeting button with an accompanying motion and site-related dialogue.
- Idle timers pause with the model while hidden or in a background tab.

AI chat, voice synthesis, memory and computer-control tools from the desktop
application are not included in this static-site integration.

- Set `live2d.enabled: false` in `_config.yml` to disable it site-wide.
- Add `live2d: false` to a page's front matter to disable it on that page.
- Change `live2d.model` to another compatible **Cubism 4** `.model3.json` URL
  (or a local path, with its companion files). Also update the expression names,
  accessory parameter IDs and motion group names in the script for a new model.
- Edit `assets/js/live2d.js` for dialogue and `assets/css/live2d.css` for placement.
- Restart Jekyll after editing `_config.yml`.

PixiJS and its Live2D adapter use pinned jsDelivr URLs and require network access.
The Cubism Core, model, texture, and greeting motion are served from this site.
If loading fails, the widget offers a retry button without blocking page content.

The native model supports automatic blinking, breathing, pointer following and
physics.

Dependencies and model attribution:

- [PixiJS 6.5.10](https://github.com/pixijs/pixijs/tree/v6.5.10) (MIT).
- [pixi-live2d-display 0.4.0](https://github.com/guansss/pixi-live2d-display) (MIT).
- Live2D Cubism Core 5.1.0, copyright Live2D Inc., under its
  [proprietary software license](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html).
- Model: [是依七哒](https://space.bilibili.com/457683484), as credited by
  [Firefly-Companion-AI-](https://github.com/hhjk21/Firefly-Companion-AI-).
  Character/game artwork belongs to miHoYo. The source specifies personal
  learning/exchange and noncommercial use.
- See `assets/live2d/firefly/NOTICE.md` for the imported files and adaptations.
  The upstream code's MIT license is retained in `SOURCE-LICENSE.txt`; it does
  not relicense the character or model.
