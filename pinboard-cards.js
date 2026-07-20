/**
 * PinboardCards
 * --------------------------------------------------------------
 * Vanilla JS, no build step, no framework. Include this file with
 * a <script> tag, then call:
 *
 *   PinboardCards.createNameCard({ name, paper, pin, font })
 *   PinboardCards.createMessageCard({ message, paper, pin, font })
 *   PinboardCards.createCustomNoteCard({ backgroundSrc, aspectRatio, text, imageSrc, padding, width, font })
 *
 * Both return a DOM element you can append anywhere:
 *
 *   const card = PinboardCards.createNameCard({ name: "Priya", pin: "#e2b64a" });
 *   document.getElementById("board").appendChild(card);
 *
 * Styles are injected automatically the first time either function
 * runs, so you don't need a separate CSS file.
 * --------------------------------------------------------------
 */
const PinboardCards = (() => {
  let stylesInjected = false;
  const PAPER_BACKGROUNDS = [
    "/images/written_glaze/paper_bgs/1.jpg",
    "/images/written_glaze/paper_bgs/2.jpg",
    "/images/written_glaze/paper_bgs/3.jpg"
  ];

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement("style");
    style.textContent = `
      .name-tag{
        position: relative;
        display: inline-block;
        padding: 10px 26px 12px;
        border-radius: 2px;
        background-image: repeating-linear-gradient(178deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 4px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.30);
        width: fit-content;
        justify-content: center;
        align-items: center;
      }
      .name-tag h2{
        margin: 0;
        font-weight: 700;
        font-size: 2.1rem;
        color: #33291d;
        text-align: center;
        white-space: nowrap;
      }

      .message-note{
        position: relative;
        width: fit-content;
        min-width: 150px;
        max-width: 420px;
        padding: 26px 16px 16px;
        border-radius: 3px;
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
        box-shadow: 0 10px 18px rgba(0,0,0,0.32), inset 0 0 20px rgba(90,70,30,0.20);
      }
      .message-note p{
        margin: 0;
        font-weight: 400;
        font-size: 1.05rem;
        line-height: 1.4;
        color: #2e2a25;
        white-space: pre-line;
      }

      .custom-note-card{
        position: relative;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        background-repeat: no-repeat;
        background-size: contain;
        background-position: center;
      }
      .custom-note-safe{
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .custom-note-safe p{
        margin: 0;
        text-align: center;
        line-height: 1.35;
        color: #2e2a25;
        max-width: 100%;
        word-break: break-word;
      }
      .custom-note-safe img{
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .pin-tack{
        position: absolute;
        top: -10px;
        left: 50%;
        width: 18px;
        height: 18px;
        transform: translateX(-50%);
        filter: drop-shadow(0 3px 3px rgba(0,0,0,0.45));
        z-index: 2;
      }
      .pin-tack .rim{ fill: none; stroke: rgba(0,0,0,0.3); stroke-width: 0.6; }
      .pin-tack .shine{ fill: rgba(255,255,255,0.65); }
      .pin-tack .shadow-ring{ fill: rgba(0,0,0,0.12); }
    `;
    document.head.appendChild(style);
  }

  /** Builds the shared thumbtack SVG, tinted with the given colour. */
  function buildThumbtack(pinColor) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "pin-tack");
    svg.setAttribute("viewBox", "0 0 20 20");

    const shadowRing = document.createElementNS(NS, "circle");
    shadowRing.setAttribute("class", "shadow-ring");
    shadowRing.setAttribute("cx", "10");
    shadowRing.setAttribute("cy", "11");
    shadowRing.setAttribute("r", "8.5");

    const head = document.createElementNS(NS, "circle");
    head.setAttribute("class", "head");
    head.setAttribute("cx", "10");
    head.setAttribute("cy", "10");
    head.setAttribute("r", "8");
    head.setAttribute("fill", pinColor);

    const rim = document.createElementNS(NS, "circle");
    rim.setAttribute("class", "rim");
    rim.setAttribute("cx", "10");
    rim.setAttribute("cy", "10");
    rim.setAttribute("r", "8");

    const shine = document.createElementNS(NS, "circle");
    shine.setAttribute("class", "shine");
    shine.setAttribute("cx", "7.5");
    shine.setAttribute("cy", "7");
    shine.setAttribute("r", "2.1");

    svg.append(shadowRing, head, rim, shine);
    return svg;
  }

  /**
   * Creates a name tag card.
   * @param {Object} opts
   * @param {string} opts.name  Required. Name to display.
   * @param {string} [opts.paper='#dfe8c9']  Paper background colour.
   * @param {string} [opts.pin='#e2b64a']    Thumbtack colour.
   * @param {string} [opts.font="'Caveat', cursive"]  Font for the name.
   * @returns {HTMLElement}
   */
  function createNameCard({ name, paper = "#dfe8c9", pin = "#e2b64a", font = "'Caveat', cursive" }) {
    injectStyles();

    const card = document.createElement("div");
    card.className = "name-tag";
    card.style.background = paper;

    card.appendChild(buildThumbtack(pin));

    const h2 = document.createElement("h2");
    h2.style.fontFamily = font;
    h2.textContent = name;
    card.appendChild(h2);

    return card;
  }

  /**
   * Creates a message note card. Width hugs the text up to a max width,
   * so shorter messages stay compact and longer ones wrap and grow
   * taller once they hit the cap — no manual sizing needed.
   * @param {Object} opts
   * @param {string} opts.message  Required. The note text.
   * @param {string} [opts.paper='#efe3c8']  Paper background colour.
   * @param {string} [opts.pin='#b5482f']    Thumbtack colour.
   * @param {string} [opts.font="'Kalam', cursive"]  Font for the message.
   * @returns {HTMLElement}
   */
  function createMessageCard({ message, paper = "#efe3c8", pin = "#b5482f", font = "'Kalam', cursive" }) {
    injectStyles();

    const card = document.createElement("div");
    card.className = "message-note";
    const randomPaper = PAPER_BACKGROUNDS[Math.floor(Math.random() * PAPER_BACKGROUNDS.length)];
    card.style.backgroundColor = paper;
    card.style.backgroundImage = `url("${randomPaper}")`;

    card.appendChild(buildThumbtack(pin));

    const p = document.createElement("p");
    p.style.fontFamily = font;
    p.textContent = message;
    card.appendChild(p);

    return card;
  }

  /**
   * Creates a custom note card that uses an artwork file as the card
   * background and places optional centered content in a configurable
   * safe area.
   * @param {Object} opts
   * @param {string} opts.backgroundSrc  Required. PNG/SVG path for the note artwork.
   * @param {string} [opts.aspectRatio='1 / 1']  CSS aspect-ratio value matching the artwork.
   * @param {string} [opts.text]  Optional text content; mutually exclusive with imageSrc.
   * @param {string} [opts.imageSrc]  Optional image content; mutually exclusive with text.
   * @param {string} [opts.padding='16% 14% 12%']  CSS padding for content safe area.
   * @param {number|string} [opts.width=280]  Width in px (number) or any CSS width string.
   * @param {string} [opts.font="'Kalam', cursive"]  Font used when text is rendered.
   * @returns {HTMLElement}
   */
  function createCustomNoteCard({
    backgroundSrc,
    aspectRatio = "1 / 1",
    text,
    imageSrc,
    padding = "16% 14% 12%",
    width = 280,
    font = "'Kalam', cursive"
  }) {
    injectStyles();

    if (!backgroundSrc) {
      throw new Error("createCustomNoteCard requires backgroundSrc.");
    }

    if (text != null && imageSrc) {
      throw new Error("createCustomNoteCard accepts either text or imageSrc, not both.");
    }

    const card = document.createElement("div");
    card.className = "custom-note-card";
    card.style.width = typeof width === "number" ? `${width}px` : String(width);
    card.style.aspectRatio = aspectRatio;
    card.style.padding = padding;
    card.style.backgroundImage = `url("${String(backgroundSrc).replace(/"/g, '\\"')}")`;

    const safe = document.createElement("div");
    safe.className = "custom-note-safe";

    if (typeof text === "string" && text.length > 0) {
      const p = document.createElement("p");
      p.style.fontFamily = font;
      p.textContent = text;
      safe.appendChild(p);
    } else if (imageSrc) {
      const img = document.createElement("img");
      img.src = imageSrc;
      img.alt = "Custom note content";
      safe.appendChild(img);
    }

    card.appendChild(safe);
    return card;
  }

  return { createNameCard, createMessageCard, createCustomNoteCard };
})();
