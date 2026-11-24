// app/src/services/templates/styles.js
// P3-6 customisation, as data the renderer (templateService) and the customisation sheet share:
//   PALETTES (12, each checked for text contrast ≥ 4.5:1 on white), FONT_PAIRS (8, OFL fonts bundled as assets:
//   services/templates/fonts.js), and the choice lists. Pure data, now in ../../utils/resumeRender.js (shared with the server, P3d).

export {
  PALETTES, FONT_PAIRS, SIZES, DENSITY, MARGINS, HEADING_STYLES, SECTION_KEYS, MODEL_DEFAULT_COLOURS,
} from '../../utils/resumeRender';
