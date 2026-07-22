/**
 * AppreciationWall
 * --------------------------------------------------------------
 * Vanilla JS, no build step, no framework. Include this file with
 * a <script> tag (after pinboard-cards.js is optional — this module
 * is self-contained), then call:
 *
 *   AppreciationWall.renderWall(container, people, options)
 *
 * `people` matches the shape your server.js /api/glaze-submissions
 * endpoint already returns:
 *
 *   [
 *     {
 *       person: "Amara",
 *       group: "girlies",
 *       messages: [{ text: "...", from: "..." }, ...]
 *     },
 *     ...
 *   ]
 *
 * Example:
 *
 *   const res = await fetch("/api/glaze-submissions?group=girlies");
 *   const { people } = await res.json();
 *   AppreciationWall.renderWall(document.getElementById("wall"), people);
 *
 * Styles + the paper grain filter are injected automatically the
 * first time renderWall runs.
 * --------------------------------------------------------------
 */
const AppreciationWall = (() => {
  let stylesInjected = false;

  const NOTE_COLORS = ["#f2e08c", "#f5c6d4", "#b9d8ec"];
  const NOTE_FONTS = ["'Caveat', cursive", "'Kalam', cursive", "'Shadows Into Light', cursive"];
  const PAPER_STYLES = ["sticky", "torn", "index"];

  function parseRgbComponents(color) {
    if (typeof color !== "string") return null;
    const value = color.trim();

    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const raw = hex[1];
      const full = raw.length === 3
        ? raw.split("").map((ch) => ch + ch).join("")
        : raw;
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16)
      };
    }

    const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const parts = rgb[1].split(",").map((part) => Number(part.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every((num) => Number.isFinite(num))) {
        return {
          r: Math.max(0, Math.min(255, parts[0])),
          g: Math.max(0, Math.min(255, parts[1])),
          b: Math.max(0, Math.min(255, parts[2]))
        };
      }
    }

    return null;
  }

  function pickContrastTextColor(backgroundColor, darkText = "#2c2c2a", lightText = "#fff9f2") {
    const rgb = parseRgbComponents(backgroundColor);
    if (!rgb) return darkText;

    const luminance = ((0.299 * rgb.r) + (0.587 * rgb.g) + (0.114 * rgb.b)) / 255;
    return luminance > 0.6 ? darkText : lightText;
  }

  // Rough torn-edge polygon, reused for every "torn" note.
  const TORN_CLIP_PATH = "polygon(1% 3%,6% 0%,13% 2%,20% 0%,28% 1%,35% 0%,44% 2%,52% 0%,60% 1%,68% 0%,76% 2%,84% 0%,92% 1%,99% 0%,100% 8%,98% 16%,100% 24%,99% 33%,100% 41%,98% 50%,100% 58%,99% 67%,100% 75%,98% 84%,100% 92%,99% 100%,90% 99%,82% 100%,74% 98%,66% 100%,58% 99%,50% 100%,42% 98%,34% 100%,26% 99%,18% 100%,10% 98%,2% 100%,0% 92%,1% 84%,0% 75%,2% 67%,0% 58%,1% 50%,0% 42%,2% 33%,0% 25%,1% 16%,0% 8%)";

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    // Google Fonts for the handwritten look.
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Kalam:wght@400;700&family=Shadows+Into+Light&display=swap";
    document.head.appendChild(link);

    // Paper grain filter, referenced by every note via filter: url(#appreciation-wall-grain).
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.innerHTML = `
      <filter id="appreciation-wall-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" seed="7"></feTurbulence>
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0"></feColorMatrix>
        <feComposite operator="over" in2="SourceGraphic"></feComposite>
      </filter>
    `;
    document.body.appendChild(svg);

    const style = document.createElement("style");
    style.textContent = `
      .aw-board{
        --aw-cols: 3;
        background: transparent;
        border-radius: 16px;
        padding: 2rem 1.5rem;
        display: grid;
        grid-template-columns: repeat(var(--aw-cols), minmax(0, 1fr));
        gap: 1.5rem 1rem;
      }
      .aw-heading{
        text-align: center;
        margin: 0 0 1.5rem;
        grid-column: 1 / -1;
      }
      .aw-heading .aw-title{
        font-family: 'Kalam', cursive;
        color: #f4efe6;
        font-size: 1.4rem;
        font-weight: 700;
        margin: 0;
      }
      .aw-heading .aw-subtitle{
        font-family: 'Kalam', cursive;
        color: #c9c4b8;
        font-size: 0.8rem;
        margin: 4px 0 0;
      }
      .aw-column{
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .aw-name{
        font-family: 'Kalam', cursive;
        font-weight: 700;
        color: #f4efe6;
        font-size: 50px;
        border-bottom: 2px solid #f4efe6;
        padding-bottom: 2px;
        margin-bottom: 4px;
      }
      .aw-empty{
        font-family: 'Kalam', cursive;
        color: #7a766c;
        font-size: 0.8rem;
      }
      .aw-note-wrap{
        position: relative;
        width: 100%;
      }
      .aw-asset-frame{
        width: 100%;
        border-radius: 3px;
        overflow: hidden;
        background: transparent;
        border: none;
        filter: none;
      }
      .aw-asset-frame img{
        display: block;
        width: 100%;
        height: auto;
      }
      .aw-note{
        color: #2c2c2a;
        padding: 16px 14px 18px;
        min-height: 84px;
        font-size: 1rem;
        line-height: 1.35;
        box-sizing: border-box;
        position: relative;
        filter: url(#appreciation-wall-grain);
      }
      .aw-note-from{
        display: block;
        font-weight: 700;
        font-size: 0.75rem;
        margin-top: 8px;
        opacity: 0.7;
      }
      .aw-fold{
        position: absolute;
        bottom: 0;
        right: 0;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 0 0 16px 16px;
        border-color: transparent transparent rgba(0,0,0,0.13) transparent;
      }
      .aw-tape{
        position: absolute;
        top: -9px;
        left: 50%;
        width: 44px;
        height: 16px;
        background: rgba(244,239,230,0.5);
        border: 1px solid rgba(255,255,255,0.35);
        filter: url(#appreciation-wall-grain);
      }

      @media (max-width: 700px){
        .aw-board{
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /** Deterministic-ish pick so re-renders don't jitter every note's look on every call. */
  function pick(list, seed) {
    return list[seed % list.length];
  }

  function buildNote(message, index, colorPalette) {
    const wrap = document.createElement("div");
    wrap.className = "aw-note-wrap";

    const rotation = ((index % 5) - 2) * 1.5; // -3deg to 3deg spread
    wrap.style.transform = `rotate(${rotation}deg)`;
    wrap.style.filter = "drop-shadow(0 3px 4px rgba(0,0,0,0.35))";

    const paperStyle = pick(PAPER_STYLES, index);
    const palette = Array.isArray(colorPalette) && colorPalette.length
      ? colorPalette
      : NOTE_COLORS;
    const color = pick(palette, index + 1);
    const font = pick(NOTE_FONTS, index);
    const textColor = pickContrastTextColor(color, "#2c2c2a", "#fff9f2");
    const fromColor = pickContrastTextColor(color, "rgba(44,44,42,0.72)", "rgba(255,249,242,0.82)");

    const note = document.createElement("div");
    note.className = "aw-note";
    note.style.background = color;
    note.style.color = textColor;
    note.style.fontFamily = font;
    note.style.borderRadius = paperStyle === "torn" ? "0" : "2px";
    note.style.clipPath = paperStyle === "torn" ? TORN_CLIP_PATH : "none";
    note.style.border = paperStyle === "index" ? "1px dashed rgba(0,0,0,0.15)" : "none";

    if (paperStyle === "sticky") {
      const fold = document.createElement("div");
      fold.className = "aw-fold";
      note.appendChild(fold);
    } else {
      const tape = document.createElement("div");
      tape.className = "aw-tape";
      tape.style.transform = `translateX(-50%) rotate(${index % 2 === 0 ? -3 : 4}deg)`;
      note.appendChild(tape);
    }

    const text = document.createElement("div");
    text.textContent = message.text;
    text.style.position = "relative";
    text.style.color = textColor;
    note.appendChild(text);

    if (message.from) {
      const from = document.createElement("span");
      from.className = "aw-note-from";
      from.style.color = fromColor;
      from.textContent = `— ${message.from}`;
      note.appendChild(from);
    }

    wrap.appendChild(note);
    return wrap;
  }

  function buildAssetNote(asset, index) {
    const wrap = document.createElement("div");
    wrap.className = "aw-note-wrap";

    const rotation = ((index % 5) - 2) * 1.2;
    wrap.style.transform = `rotate(${rotation}deg)`;
    wrap.style.filter = "drop-shadow(0 3px 4px rgba(0,0,0,0.35))";

    const frame = document.createElement("div");
    frame.className = "aw-asset-frame";

    const img = document.createElement("img");
    img.src = asset.backgroundSrc;
    img.alt = "Submitted note";

    frame.appendChild(img);
    wrap.appendChild(frame);
    return wrap;
  }

  function buildColumn(personEntry, colorConfig) {
        const personKey = String(personEntry.person || "").trim().toLowerCase();
        const personColors = colorConfig && colorConfig.personFavoriteColors
          ? colorConfig.personFavoriteColors[personKey]
          : null;
        const palette = Array.isArray(personColors) && personColors.length
          ? personColors
          : colorConfig.defaultColors;

    const column = document.createElement("div");
    column.className = "aw-column";

    const name = document.createElement("div");
    name.className = "aw-name";
    name.textContent = personEntry.person;
    column.appendChild(name);

    const assets = Array.isArray(personEntry.assets) ? personEntry.assets : [];
    assets.forEach((asset, i) => {
      if (asset && asset.backgroundSrc) {
        column.appendChild(buildAssetNote(asset, i));
      }
    });

    if (!personEntry.messages || personEntry.messages.length === 0) {
      if (assets.length > 0) {
        return column;
      }
      const empty = document.createElement("div");
      empty.className = "aw-empty";
      empty.textContent = "no notes yet";
      column.appendChild(empty);
      return column;
    }

    personEntry.messages.forEach((message, i) => {
      column.appendChild(buildNote(message, i, palette));
    });

    return column;
  }

  /**
   * Renders the appreciation wall into `container`.
   * @param {HTMLElement} container  Required. Element to render into (cleared first).
  * @param {Array<{person:string, assets?:Array<{backgroundSrc:string}>, messages:Array<{text:string, from:string}>}>} people  Required.
   * @param {Object} [options]
   * @param {string} [options.title='appreciation wall']  Heading text.
   * @param {string} [options.subtitle='grab a pen, leave a note for someone who made your day']  Subheading text.
  * @param {number} [options.columns=3]  Number of grid columns (people per row).
  * @param {string[]} [options.defaultNoteColors]  Fallback note colors.
  * @param {Object.<string, string[]>} [options.personFavoriteColors]  Person->palette map.
   */
  function renderWall(container, people, options = {}) {
    injectStyles();

    if (!container) {
      throw new Error("renderWall requires a container element.");
    }
    if (!Array.isArray(people)) {
      throw new Error("renderWall requires a people array.");
    }

    const {
      title = "appreciation wall",
      subtitle = "grab a pen, leave a note for someone who made your day",
      columns = 3,
      defaultNoteColors = NOTE_COLORS,
      personFavoriteColors = {}
    } = options;

    const colorConfig = {
      defaultColors: Array.isArray(defaultNoteColors) && defaultNoteColors.length
        ? defaultNoteColors
        : NOTE_COLORS,
      personFavoriteColors: personFavoriteColors && typeof personFavoriteColors === "object"
        ? personFavoriteColors
        : {}
    };

    container.innerHTML = "";

    const board = document.createElement("div");
    board.className = "aw-board";
    board.style.setProperty("--aw-cols", String(columns));

    const heading = document.createElement("div");
    heading.className = "aw-heading";
    heading.innerHTML = `
      <p class="aw-title">${title}</p>
      <p class="aw-subtitle">${subtitle}</p>
    `;
    board.appendChild(heading);

    people.forEach((personEntry) => {
      board.appendChild(buildColumn(personEntry, colorConfig));
    });

    container.appendChild(board);
  }

  return { renderWall };
})();
