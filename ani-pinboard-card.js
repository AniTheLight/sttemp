/**
 * PinboardCards
 * --------------------------------------------------------------
 * Vanilla JS, no build step, no framework. Include this file with
 * a <script> tag, then call:
 *
 *   PinboardCards.createNameCard({ name, paper, pin, font })
 *   PinboardCards.createMessageCard({ message, paper, pin, font })
 *   PinboardCards.createCustomNoteCard({ backgroundSrc, aspectRatio, text, imageSrc, padding, width, font })
 *   PinboardCards.createTearOffPoster({ receiverName, messages, paper, tabColor, headlineFont, font, width })
 *
 * All return a DOM element you can append anywhere:
 *
 *   const card = PinboardCards.createNameCard({ name: "Priya", pin: "#e2b64a" });
 *   document.getElementById("board").appendChild(card);
 *
 * Styles are injected automatically the first time any function
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

      .tearoff-poster{
        position: relative;
        border-radius: 2px;
        box-shadow: 0 10px 22px rgba(0,0,0,0.35);
        overflow: hidden;
      }
      .tearoff-poster .tearoff-head{
        padding: 28px 20px 18px;
      }
      .tearoff-poster .tearoff-head h2{
        margin: 0;
        line-height: 1.15;
      }
      .tearoff-poster .tearoff-head .tearoff-hint{
        margin: 14px 0 0;
        font-size: 0.7rem;
      }
      .tearoff-row{
        display: flex;
        border-top: 1px dashed rgba(255,249,242,0.55);
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
        -webkit-overflow-scrolling: touch;
        background-image: repeating-linear-gradient(
          to right,
          transparent 0,
          transparent 43px,
          rgba(255,249,242,0.55) 43px,
          rgba(255,249,242,0.55) 44px
        );
      }
      .tearoff-tab{
        flex: 0 0 44px;
        min-width: 44px;
        height: 64px;
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: transform 0.45s ease, opacity 0.45s ease;
        transform-origin: top center;
      }
      .tearoff-tab:not(:last-child){
        border-right: 1px dashed rgba(255,249,242,0.55);
      }
      .tearoff-tab span{
        writing-mode: vertical-rl;
        letter-spacing: 0.5px;
        font-size: 0.75rem;
      }
      .tearoff-row::-webkit-scrollbar{
        height: 8px;
      }
      .tearoff-row::-webkit-scrollbar-thumb{
        background: rgba(255,249,242,0.45);
        border-radius: 999px;
      }
      .tearoff-row::-webkit-scrollbar-track{
        background: rgba(0,0,0,0.12);
      }
      .tearoff-reveal-area{
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
      }
      .tearoff-note{
        position: relative;
        border-radius: 2px;
        padding: 12px 30px 12px 14px;
        box-shadow: 0 6px 12px rgba(0,0,0,0.3);
        opacity: 0;
        transform: translateY(-6px);
        transition: opacity 0.35s ease, transform 0.35s ease;
      }
      .tearoff-note .tearoff-close{
        position: absolute;
        top: 6px;
        right: 8px;
        width: 20px;
        height: 20px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
        color: rgba(44,44,42,0.55);
      }
      .tearoff-note.image-only .tearoff-close{
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: gray;
        color: #fff9f2;
        backdrop-filter: blur(2px);
        z-index: 1;
      }
      .tearoff-note .tearoff-from{
        margin: 0 0 4px;
        font-weight: 700;
        font-size: 0.8rem;
        color: #2c2c2a;
      }
      .tearoff-note .tearoff-text{
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.4;
        color: #2c2c2a;
      }
      .tearoff-note .tearoff-image{
        display: block;
        width: 100%;
        max-height: 240px;
        object-fit: contain;
        margin-top: 8px;
        border-radius: 2px;
      }
      .tearoff-note.image-only{
        background: transparent;
        padding: 0;
        box-shadow: none;
      }
      .tearoff-note.image-only .tearoff-image{
        margin-top: 0;
      }
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

  /**
   * Creates a tear-off compliment poster. The headline is the receiver's
   * name; each tab along the bottom carries a sender's name. Tapping a
   * tab tears it off (with a fold/fade animation) and reveals that
   * sender's message below the poster. Pressing the × on a revealed
   * note puts the tab back in place so it can be torn again.
   *
   * @param {Object} opts
   * @param {string} opts.receiverName  Required. Name shown as the poster headline.
  * @param {Array<{from:string, text?:string, imageSrc?:string}>} opts.messages  Required. One tab per entry; can be empty.
   * @param {string} [opts.headline]  Full headline text; defaults to `"${receiverName},\nyou're appreciated."`.
   * @param {string} [opts.paper='#e8543a']  Poster background colour.
   * @param {string} [opts.noteColor='#fdf1a8']  Background colour of revealed notes.
   * @param {string} [opts.headlineFont="'Archivo Black', sans-serif"]  Font for the headline.
   * @param {string} [opts.font="'Kalam', cursive"]  Font for tab labels and note text.
   * @param {number|string} [opts.width=280]  Poster width in px (number) or any CSS width string.
   * @returns {HTMLElement}  A wrapper containing the poster and its reveal area stacked vertically.
   */
  function createTearOffPoster({
    receiverName,
    messages,
    headline,
    paper = "#e8543a",
    noteColor = "#fdf1a8",
    headlineFont = "'Archivo Black', sans-serif",
    font = "'Kalam', cursive",
    width = 280
  }) {
    injectStyles();

    if (!receiverName) {
      throw new Error("createTearOffPoster requires receiverName.");
    }
    if (!Array.isArray(messages)) {
      throw new Error("createTearOffPoster requires messages to be an array.");
    }

    const wrapper = document.createElement("div");
    wrapper.style.width = typeof width === "number" ? `${width}px` : String(width);

    const posterTextColor = pickContrastTextColor(paper, "#2c2c2a", "#fff9f2");
    const hintColor = pickContrastTextColor(paper, "rgba(44,44,42,0.75)", "rgba(255,249,242,0.82)");
    const noteTextColor = pickContrastTextColor(noteColor, "#2c2c2a", "#fff9f2");
    const closeColor = pickContrastTextColor(noteColor, "rgba(44,44,42,0.55)", "rgba(255,249,242,0.75)");

    const poster = document.createElement("div");
    poster.className = "tearoff-poster";
    poster.style.background = paper;

    const head = document.createElement("div");
    head.className = "tearoff-head";

    const h2 = document.createElement("h2");
    h2.style.fontFamily = headlineFont;
    h2.style.color = posterTextColor;
    h2.style.fontSize = "1.6rem";
    const headlineText = headline || `${receiverName},\nyou're appreciated.`;
    headlineText.split("\n").forEach((line, i, arr) => {
      h2.appendChild(document.createTextNode(line));
      if (i < arr.length - 1) h2.appendChild(document.createElement("br"));
    });
    head.appendChild(h2);

    const hint = document.createElement("p");
    hint.className = "tearoff-hint";
    hint.style.fontFamily = font;
    hint.style.color = hintColor;
    hint.textContent = "tear a tab to see who left you a note";
    head.appendChild(hint);

    poster.appendChild(head);

    const tabRow = document.createElement("div");
    tabRow.className = "tearoff-row";
    poster.appendChild(tabRow);

    wrapper.appendChild(poster);

    const revealArea = document.createElement("div");
    revealArea.className = "tearoff-reveal-area";
    wrapper.appendChild(revealArea);

    messages.forEach((m) => {
      const senderName = String(m && m.from ? m.from : "anonymous").trim() || "anonymous";
      const messageText = String(m && m.text ? m.text : "").trim();
      const imageSrc = m && typeof m.imageSrc === "string" ? m.imageSrc : "";

      const tab = document.createElement("button");
      tab.className = "tearoff-tab";
      tab.setAttribute("aria-label", `Tear off tab for ${senderName}`);

      const label = document.createElement("span");
      label.style.fontFamily = font;
      label.style.color = posterTextColor;
      label.textContent = senderName;
      tab.appendChild(label);

      let note = null;

      function restoreTab() {
        if (!note) return;
        note.style.opacity = "0";
        note.style.transform = "translateY(-6px)";
        setTimeout(() => {
          note.remove();
          note = null;
        }, 250);

        tab.style.visibility = "visible";
        requestAnimationFrame(() => {
          tab.style.transform = "translateY(0) rotate(0deg)";
          tab.style.opacity = "1";
        });
        delete tab.dataset.torn;
      }

      function showNote() {
        note = document.createElement("div");
        note.className = "tearoff-note";
        const isImageOnly = Boolean(imageSrc) && !messageText;
        if (isImageOnly) {
          note.classList.add("image-only");
        } else {
          note.style.background = noteColor;
        }

        const closeBtn = document.createElement("button");
        closeBtn.className = "tearoff-close";
        closeBtn.setAttribute("aria-label", `Put tab back for ${senderName}`);
        closeBtn.style.color = closeColor;
        closeBtn.textContent = "\u00D7";
        closeBtn.addEventListener("click", restoreTab);

        note.appendChild(closeBtn);

        if (!isImageOnly) {
          const fromLine = document.createElement("p");
          fromLine.className = "tearoff-from";
          fromLine.style.fontFamily = font;
          fromLine.style.color = noteTextColor;
          fromLine.textContent = `from ${senderName}`;
          note.appendChild(fromLine);
        }

        if (messageText) {
          const textLine = document.createElement("p");
          textLine.className = "tearoff-text";
          textLine.style.fontFamily = font;
          textLine.style.color = noteTextColor;
          textLine.textContent = messageText;
          note.appendChild(textLine);
        }

        if (imageSrc) {
          const imageNode = document.createElement("img");
          imageNode.className = "tearoff-image";
          imageNode.src = imageSrc;
          imageNode.alt = `Image from ${senderName}`;
          note.appendChild(imageNode);
        }

        revealArea.appendChild(note);

        requestAnimationFrame(() => {
          note.style.opacity = "1";
          note.style.transform = "translateY(0)";
        });
      }

      tab.addEventListener("click", () => {
        if (tab.dataset.torn) return;
        tab.dataset.torn = "1";
        tab.style.transform = "translateY(70px) rotate(6deg)";
        tab.style.opacity = "0";

        setTimeout(() => {
          tab.style.visibility = "hidden";
          showNote();
        }, 450);
      });

      tabRow.appendChild(tab);
    });

    return wrapper;
  }

  return { createNameCard, createMessageCard, createCustomNoteCard, createTearOffPoster };
})();
