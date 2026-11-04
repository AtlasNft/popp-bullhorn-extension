// Runs in the page's main world: an isolated content script cannot read window.NOVO_SESSION.
// Bullhorn's CSS styles every button (padding 9px 18px) and cancels transform, so each
// element sets its own box with !important.
(() => {
  if (window !== window.top || document.getElementById("popp-button")) return;

  const APP_ORIGINS = {
    candidates: "https://ai.joinpopp.com",
    workflows: "https://app.joinpopp.com"
  };
  const POSITION_KEY = "popp-extension-badge-position";
  const DRAWER_FRAME_ID = "popp-drawer-frame";
  const JOB_RECORD_PATH = /^\/content\/record\/JobOrder\/(\d+)(\/|$)/;
  const POPP_PURPLE = "#7b6cff";
  const POPP_DARK = "#2e2b3a";
  const BADGE_SIZE = 65;
  const EDGE_MARGIN = 20;
  const POSITIONS = {
    "bottom-right": "Bottom right",
    "bottom-center": "Bottom centre",
    "bottom-left": "Bottom left",
    "top-right": "Top right",
    "top-center": "Top centre",
    "top-left": "Top left"
  };
  const DEFAULT_POSITION = "bottom-right";

  // Bullhorn internals, not a public API: a Bullhorn release can move them.
  const readCorporationId = () => {
    const corporationId =
      window.NOVO_SESSION?.UlSession?.identity?.corporationId;
    return corporationId == null ? null : String(corporationId);
  };

  // Bullhorn keeps one frame per open record; only the shown one is the current vacancy.
  const readShownJobId = () => {
    for (const frame of document.querySelectorAll("iframe")) {
      if (frame.id === DRAWER_FRAME_ID) continue;
      const rect = frame.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      try {
        const match = JOB_RECORD_PATH.exec(
          frame.contentWindow.location.pathname
        );
        if (match) return match[1];
      } catch {}
    }
    return null;
  };

  const readSetting = (key, fallback) => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const writeSetting = (key, value) => {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {}
  };

  const buildEntryUrl = (app, { instanceId, jobId }) => {
    const url = new URL("/ats", APP_ORIGINS[app]);
    url.searchParams.set("instanceId", instanceId);
    if (jobId) url.searchParams.set("jobId", jobId);
    return url.toString();
  };

  const setStyles = (element, styles) => {
    for (const [property, value] of Object.entries(styles)) {
      element.style.setProperty(property, value, "important");
    }
  };

  const create = (tag, styles, text) => {
    const element = document.createElement(tag);
    if (styles) setStyles(element, styles);
    if (text) element.textContent = text;
    return element;
  };

  const button = create(
    "button",
    {
      position: "fixed",
      width: `${BADGE_SIZE}px`,
      height: `${BADGE_SIZE}px`,
      "border-radius": "50%",
      border: "0",
      padding: "0",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      "line-height": "1",
      background: POPP_PURPLE,
      color: "#fff",
      font: "700 18px sans-serif",
      cursor: "pointer",
      "box-shadow": "0 4px 12px rgba(0, 0, 0, 0.25)",
      "z-index": "2147483647"
    },
    "Popp"
  );
  button.id = "popp-button";
  button.setAttribute("aria-label", "Open Popp");

  const tooltip = create(
    "div",
    {
      position: "fixed",
      padding: "8px 14px",
      background: POPP_DARK,
      color: "#fff",
      font: "13px sans-serif",
      "border-radius": "12px",
      "white-space": "nowrap",
      "pointer-events": "none",
      "z-index": "2147483647",
      display: "none"
    },
    "Use AI to find candidates and build workflows"
  );

  const menu = create("div", {
    position: "fixed",
    "min-width": "220px",
    padding: "8px",
    background: "#fff",
    "border-radius": "8px",
    "box-shadow": "0 4px 16px rgba(0, 0, 0, 0.2)",
    font: "14px sans-serif",
    color: "#1f1147",
    "z-index": "2147483647",
    display: "none"
  });

  const menuItem = (label) =>
    create(
      "button",
      {
        display: "block",
        width: "100%",
        padding: "10px 12px",
        border: "0",
        background: "transparent",
        "text-align": "left",
        font: "inherit",
        color: "inherit",
        cursor: "pointer"
      },
      label
    );
  const findCandidates = menuItem("Find candidates");
  const newWorkflow = menuItem("New workflow");
  const message = create("p", {
    margin: "8px 12px",
    color: "#b42318",
    display: "none"
  });

  const positionLabel = create(
    "label",
    { display: "block", margin: "8px 12px 4px", "font-size": "12px" },
    "Badge position"
  );
  const positionSelect = create("select", { display: "block", "margin-top": "4px" });
  for (const [value, label] of Object.entries(POSITIONS)) {
    positionSelect.append(new Option(label, value));
  }
  positionLabel.append(positionSelect);
  menu.append(findCandidates, newWorkflow, message, positionLabel);

  const readPosition = () => {
    const position = readSetting(POSITION_KEY, DEFAULT_POSITION);
    return POSITIONS[position] ? position : DEFAULT_POSITION;
  };

  // The menu and the tooltip open towards the middle of the page, next to the badge.
  const placeAt = (position) => {
    const [vertical, horizontal] = position.split("-");
    const offset = `${EDGE_MARGIN + BADGE_SIZE + 12}px`;
    const clear = {
      top: "auto",
      bottom: "auto",
      left: "auto",
      right: "auto",
      margin: "0",
      width: "auto"
    };
    const badge = { ...clear, [vertical]: `${EDGE_MARGIN}px`, width: `${BADGE_SIZE}px` };
    const popup = { ...clear, [vertical]: offset };
    if (horizontal === "center") {
      badge.left = `calc(50% - ${BADGE_SIZE / 2}px)`;
      Object.assign(popup, {
        left: "0",
        right: "0",
        margin: "0 auto",
        width: "max-content"
      });
    } else {
      badge[horizontal] = `${EDGE_MARGIN}px`;
      popup[horizontal] = `${EDGE_MARGIN}px`;
    }
    setStyles(button, badge);
    setStyles(menu, popup);
    setStyles(tooltip, popup);
  };
  positionSelect.value = readPosition();
  placeAt(positionSelect.value);
  positionSelect.addEventListener("change", () => {
    writeSetting(POSITION_KEY, positionSelect.value);
    placeAt(positionSelect.value);
  });

  const drawer = create("div", {
    position: "fixed",
    top: "0",
    right: "0",
    width: "90vw",
    height: "100vh",
    background: "#fff",
    "box-shadow": "-4px 0 16px rgba(0, 0, 0, 0.2)",
    "z-index": "2147483646",
    display: "none",
    "flex-direction": "column"
  });
  const drawerHeader = create("div", {
    display: "flex",
    "align-items": "center",
    "justify-content": "space-between",
    padding: "8px 12px",
    background: "#1f1147",
    color: "#fff",
    font: "600 14px sans-serif"
  });
  const drawerTitle = create("span");
  const closeButton = create(
    "button",
    {
      border: "0",
      padding: "0 4px",
      background: "transparent",
      color: "#fff",
      font: "20px sans-serif",
      cursor: "pointer"
    },
    "×"
  );
  closeButton.title = "Close";
  // No sandbox attribute: a sandboxed frame cannot use the shared login cookies.
  const frame = create("iframe", { flex: "1", width: "100%", border: "0" });
  frame.id = DRAWER_FRAME_ID;
  drawerHeader.append(drawerTitle, closeButton);
  drawer.append(drawerHeader, frame);

  const showMenu = (shown) =>
    setStyles(menu, { display: shown ? "block" : "none" });

  const openPopp = (app) => {
    const instanceId = readCorporationId();
    if (!instanceId) {
      message.textContent = "Bullhorn account not found on this page.";
      setStyles(message, { display: "block" });
      return;
    }
    setStyles(message, { display: "none" });
    const jobId = readShownJobId();
    drawerTitle.textContent = jobId ? `Popp · Job ${jobId}` : "Popp";
    frame.src = buildEntryUrl(app, { instanceId, jobId });
    setStyles(drawer, { display: "flex" });
    setStyles(button, { display: "none" });
    showMenu(false);
  };

  const showTooltip = (shown) => {
    setStyles(button, { background: shown ? POPP_DARK : POPP_PURPLE });
    setStyles(tooltip, {
      display: shown && menu.style.display === "none" ? "block" : "none"
    });
  };
  button.addEventListener("mouseenter", () => showTooltip(true));
  button.addEventListener("mouseleave", () => showTooltip(false));
  button.addEventListener("click", () => {
    showTooltip(false);
    openPopp("candidates");
  });
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    showTooltip(false);
    showMenu(menu.style.display === "none");
  });
  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && event.target !== button) showMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") showMenu(false);
  });
  findCandidates.addEventListener("click", () => openPopp("candidates"));
  newWorkflow.addEventListener("click", () => openPopp("workflows"));
  closeButton.addEventListener("click", () => {
    setStyles(drawer, { display: "none" });
    setStyles(button, { display: "flex" });
    frame.src = "about:blank";
  });

  document.documentElement.append(drawer, menu, tooltip, button);
})();
