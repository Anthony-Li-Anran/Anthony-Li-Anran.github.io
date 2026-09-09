# Anthony-Li-Anran.io

This is Anthony Li's personal website.

## Live2D companion

The shared Jekyll layout includes a Shizuku sample companion on desktop screens
(at least 1024px wide). It loads after the page, follows the pointer, and offers
Chinese greetings, a hide button, and a restore button. Hiding is remembered in
the visitor's browser. Animation pauses while hidden or in a background tab.
Mobile and print layouts hide it; mobile visits do not download the runtime or
model. Visitors requesting reduced motion initially see only the restore button.
Audio is disabled.

- Set `live2d.enabled: false` in `_config.yml` to disable it site-wide.
- Add `live2d: false` to a page's front matter to disable it on that page.
- Change `live2d.model` to another **Cubism 2** model JSON URL (or a local path
  such as `/assets/live2d/model/model.json`, with its companion files).
- Edit `assets/js/live2d.js` for dialogue and `assets/css/live2d.css` for placement.
- Restart Jekyll after editing `_config.yml`.

Runtime and model assets use pinned jsDelivr URLs and require network access.
If loading fails, the widget offers a retry button without blocking page content.
Cubism 3/4/5 models require a compatible runtime as well as a model URL change.

Dependencies and model attribution:

- [PixiJS 6.5.10](https://github.com/pixijs/pixijs/tree/v6.5.10) (MIT).
- [pixi-live2d-display 0.4.0](https://github.com/guansss/pixi-live2d-display) (MIT).
- Cubism 2 runtime distributed by
  [live2d-widgets 1.0.1](https://github.com/stevenjoezhang/live2d-widget), subject
  to the Live2D SDK license linked in that project's README.
- Shizuku sample assets from `live2d-widget-model-shizuku@1.0.5`, copyright
  Live2D Inc.; see the
  [Live2D Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html).
  Replacement models retain their respective authors' usage terms.
