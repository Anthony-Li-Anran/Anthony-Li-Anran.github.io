# Anthony-Li-Anran.io

This is Anthony Li's personal website.

## Live2D companion

Stelle v4 appears in the bottom-right corner on desktop (1024px and above),
using the approved upper-chest crop, mouse tracking, blinking and idle movement.
The greeting button triggers a smile and blink. Hide/show preference persists
between pages; mobile does not load the model, and hidden tabs pause animation.
Reduced-motion users start with the companion hidden and can display a still
portrait using the show button.

The integration lives in `_includes/live2d.html`, `assets/css/live2d.css` and
`assets/js/live2d.js`. All model/runtime resources are local under `assets/live2d/`;
upload that directory along with the code when deploying. Keep the versioned
`stelle-v4` directory intact so its manifest and textures remain consistent.
Source attribution and original terms are included with the model.

Set `live2d.enabled: false` in `_config.yml` to disable it site-wide, or add
`live2d: false` to a page's front matter. Resource URLs use Jekyll's `relative_url`
filter, supporting both domain-root and project-subdirectory deployments.
