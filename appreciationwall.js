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

  const NOTE_COLORS = ["#f2e08c", "#f5c6d4", "#b9d8ec", "#b7dcc2", "#f5f1e6"];
  const NOTE_FONTS = ["'Caveat', cursive", "'Kalam', cursive", "'Shadows Into Light', cursive"];
  const PAPER_STYLES = ["sticky", "torn", "index"];

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
        background: #1c1c1a;
        border-radius: 16px;
        padding: 2rem 1.5rem;
        display: grid;
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
        font-size: 1.05rem;
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
    `;
    document.head.appendChild(style);
  }

  /** Deterministic-ish pick so re-renders don't jitter every note's look on every call. */
  function pick(list, seed) {
    return list[seed % list.length];
  }

  function buildNote(message, index) {
    const wrap = document.createElement("div");
    wrap.className = "aw-note-wrap";

    const rotation = ((index % 5) - 2) * 1.5; // -3deg to 3deg spread
    wrap.style.transform = `rotate(${rotation}deg)`;
    wrap.style.filter = "drop-shadow(0 3px 4px rgba(0,0,0,0.35))";

    const paperStyle = pick(PAPER_STYLES, index);
    const color = pick(NOTE_COLORS, index + 1);
    const font = pick(NOTE_FONTS, index);

    const note = document.createElement("div");
    note.className = "aw-note";
    note.style.background = color;
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
    note.appendChild(text);

    if (message.from) {
      const from = document.createElement("span");
      from.className = "aw-note-from";
      from.textContent = `— ${message.from}`;
      note.appendChild(from);
    }

    wrap.appendChild(note);
    return wrap;
  }

  function buildColumn(personEntry) {
    const column = document.createElement("div");
    column.className = "aw-column";

    const name = document.createElement("div");
    name.className = "aw-name";
    name.textContent = personEntry.person;
    column.appendChild(name);

    if (!personEntry.messages || personEntry.messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "aw-empty";
      empty.textContent = "no notes yet";
      column.appendChild(empty);
      return column;
    }

    personEntry.messages.forEach((message, i) => {
      column.appendChild(buildNote(message, i));
    });

    return column;
  }

  /**
   * Renders the appreciation wall into `container`.
   * @param {HTMLElement} container  Required. Element to render into (cleared first).
   * @param {Array<{person:string, messages:Array<{text:string, from:string}>}>} people  Required.
   * @param {Object} [options]
   * @param {string} [options.title='appreciation wall']  Heading text.
   * @param {string} [options.subtitle='grab a pen, leave a note for someone who made your day']  Subheading text.
   * @param {number} [options.columns=3]  Number of grid columns (people per row).
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
      columns = 3
    } = options;

    container.innerHTML = "";

    const board = document.createElement("div");
    board.className = "aw-board";
    board.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    const heading = document.createElement("div");
    heading.className = "aw-heading";
    heading.innerHTML = `
      <p class="aw-title">${title}</p>
      <p class="aw-subtitle">${subtitle}</p>
    `;
    board.appendChild(heading);

    people.forEach((personEntry) => {
      board.appendChild(buildColumn(personEntry));
    });

    container.appendChild(board);
  }

  return { renderWall };
})();
