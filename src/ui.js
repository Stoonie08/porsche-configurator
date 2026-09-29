import "./style.css";

export function createUI() {
  document.querySelector("#app").innerHTML = `
    <header>
      <a class="brand" href="#">
        STONEY JIMENEZ <span>/ CONFIGURATOR</span>
      </a>
      <span class="project-tag">INTERACTIVE STUDY · 01</span>
    </header>

    <div class="toolbar">
      <span>
        911 <span class="muted">/ Your configuration</span>
      </span>

      <div>
        <button id="save-config">Save configuration</button>
        <button id="summary-toggle" class="primary">
          Summary ↗
        </button>
      </div>
    </div>

    <main class="layout">
      <section class="visual-column" aria-label="Vehicle preview">
        <div id="viewer">
          <div id="status" role="status">Loading Porsche…</div>

          <details class="scene-tools">
            <summary>Adjust scene</summary>

            <label>
              Background
              <select id="background">
                <option value="panorama">Panorama</option>
                <option value="studio">Light studio</option>
                <option value="dark">Dark studio</option>
              </select>
            </label>

            <label>
              Environment brightness
              <output id="brightness-value">1.00</output>
              <input
                id="brightness"
                type="range"
                min="0"
                max="3"
                step="0.05"
                value="1"
              >
            </label>

            <label>
              Environment rotation
              <output id="rotation-value">0°</output>
              <input
                id="rotation"
                type="range"
                min="0"
                max="360"
                value="0"
              >
            </label>

            <label>
              Exposure
              <output id="exposure-value">1.00</output>
              <input
                id="exposure"
                type="range"
                min="0.2"
                max="2"
                step="0.05"
                value="1"
              >
            </label>

            <fieldset id="dof-controls">
              <legend>Tire depth of field</legend>

              <label>
                <input id="dof-enabled" type="checkbox" checked>
                Enable in Tire view
              </label>

              <label>
                Focus distance
                <output id="dof-focus-value">2.20</output>
                <input
                  id="dof-focus"
                  type="range"
                  min="0.2"
                  max="8"
                  step="0.01"
                  value="2.2"
                >
              </label>

              <label>
                Blur strength
                <output id="dof-aperture-value">0.008</output>
                <input
                  id="dof-aperture"
                  type="range"
                  min="0"
                  max="0.04"
                  step="0.001"
                  value="0.008"
                >
              </label>

              <label>
                Maximum blur
                <output id="dof-maxblur-value">0.008</output>
                <input
                  id="dof-maxblur"
                  type="range"
                  min="0"
                  max="0.02"
                  step="0.001"
                  value="0.008"
                >
              </label>

              <p class="note">
                Select Tire, then adjust focus until the wheel is sharp.
                Focus distance uses viewer units.
              </p>
            </fieldset>
          </details>

          <button id="reset-view" class="reset" disabled>
            Reset view ↺
          </button>
        </div>

        <nav id="views" aria-label="Camera views"></nav>

        <p class="viewer-caption">
          Drag to rotate <span>·</span>
          Scroll to zoom <span>·</span>
          Right-drag to pan
        </p>

        <details id="dev-panel" hidden>
          <summary>Camera developer controls</summary>

          <div class="dev-content">
            <label>
              View name
              <input
                id="view-name"
                placeholder="Front three-quarter"
                maxlength="60"
              >
            </label>

            <label>
              Field of view
              <output id="fov-value">50°</output>
              <input
                id="fov"
                type="range"
                min="20"
                max="80"
                value="50"
              >
            </label>

            <button id="capture-view" disabled>
              Save current view
            </button>

            <select id="saved-views" aria-label="Saved views"></select>

            <button id="load-view" disabled>
              Load selected
            </button>

            <button id="export-views" disabled>
              Download views JSON
            </button>

            <p id="dev-message" role="status">
              Wait for the car to load, then compose your shot.
            </p>
          </div>
        </details>
      </section>

      <aside class="options">
        <p class="eyebrow">MAKE IT YOURS</p>
        <h1>911 Turbo S</h1>
        <p class="subtitle">A study in personal expression.</p>

        <details open class="option-section">
          <summary>
            Exterior colors
            <span id="paint-label">Original</span>
          </summary>

          <p class="group-label">Essentials</p>
          <div id="paint-swatches"></div>
          <p id="paint-help" class="note">Loading paint material…</p>
        </details>

        <details class="option-section">
          <summary>
            Wheels
            <span id="wheel-label">Original wheels</span>
          </summary>

          <div id="wheel-options" class="cards"></div>

          <p class="note">
            Alternate designs are UI placeholders.
            The 3D wheels stay unchanged.
          </p>
        </details>

        <details class="option-section">
          <summary>
            Seats
            <span id="seat-label">Original seats</span>
          </summary>

          <div id="seat-options" class="cards"></div>

          <p class="note">
            Alternate designs are UI placeholders.
            The 3D seats stay unchanged.
          </p>
        </details>

        <section class="build-summary">
          <p class="eyebrow">YOUR SELECTION</p>
          <dl id="selection-list"></dl>
          <button id="reset-config">Reset selections</button>
        </section>

        <p class="study-note">
          Independent portfolio project. Not affiliated with Porsche.
        </p>
      </aside>
    </main>

    <dialog id="summary-dialog">
      <div class="dialog-heading">
        <h2>Your configuration</h2>
        <button id="close-summary" aria-label="Close summary">✕</button>
      </div>

      <dl id="dialog-selection"></dl>

      <p class="note">
        Wheel and seat alternatives record your selections only;
        previews are not available yet.
      </p>
    </dialog>
  `;

  const state = {
    paint: "Original",
    wheels: "Original wheels",
    seats: "Original seats",
  };

  const paints = [
    ["Original", "#eeeeec"],
    ["Chalk", "#c9c5bc"],
    ["Jet black", "#151719"],
    ["Guards red", "#ba2029"],
    ["Forest green", "#234b3a"],
    ["Ocean blue", "#294c70"],
  ];

  let actions = {};
  let ready = false;
  let views = [];

  // Restore locally saved cameras.
  try {
    const data = JSON.parse(
      localStorage.getItem("porsche-camera-views-v1") || "[]"
    );

    if (Array.isArray(data)) {
      views = data.filter(validView);
    }
  } catch {
    // Saved cameras are optional.
  }

  function validView(view) {
    return (
      view &&
      typeof view.name === "string" &&
      ["position", "target"].every(
        (key) =>
          Array.isArray(view[key]) &&
          view[key].length === 3 &&
          view[key].every(Number.isFinite)
      ) &&
      Number.isFinite(view.fov) &&
      view.fov >= 20 &&
      view.fov <= 80
    );
  }

  function selectionList(element) {
    element.replaceChildren();

    Object.entries(state).forEach(([key, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = key;

      const dd = document.createElement("dd");
      dd.textContent = value;

      element.append(dt, dd);
    });
  }

  function refresh() {
    selectionList(document.querySelector("#selection-list"));
    selectionList(document.querySelector("#dialog-selection"));

    document.querySelector("#paint-label").textContent = state.paint;
    document.querySelector("#wheel-label").textContent = state.wheels;
    document.querySelector("#seat-label").textContent = state.seats;

    document.querySelectorAll("[data-selection]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(state[button.dataset.selection] === button.dataset.value)
      );
    });
  }

  // Paint swatches
  paints.forEach(([name, color]) => {
    const button = document.createElement("button");

    button.className = "swatch";
    button.style.setProperty("--paint", color);
    button.dataset.selection = "paint";
    button.dataset.value = name;
    button.disabled = true;
    button.title = name;
    button.setAttribute("aria-label", name);

    button.innerHTML = `
      <span class="paint-chip"></span>
      <span></span>
    `;

    button.lastElementChild.textContent = name;

    button.onclick = () => {
      actions.paint(name === "Original" ? null : color);
      state.paint = name;
      refresh();
    };

    document.querySelector("#paint-swatches").append(button);
  });

  // Placeholder artwork
  const wheelIcon = `
    <svg viewBox="0 0 100 70" aria-hidden="true">
      <circle cx="50" cy="35" r="27"/>
      <circle cx="50" cy="35" r="20"/>
      <circle cx="50" cy="35" r="5"/>
      <path d="
        M50 10v20
        m0 10v20
        M25 35h20
        m10 0h20
        M32 17l14 14
        m8 8 14 14
        M32 53l14-14
        m8-8 14-14
      "/>
    </svg>
  `;

  const seatIcon = `
    <svg viewBox="0 0 100 70" aria-hidden="true">
      <path d="
        M42 8h18l4 9-5 5 4 24 13 7-3 9H32l-5-10
        7-11 2-19-3-6z
        M36 25h22
        M34 44l24 3
        M33 53h33
      "/>
    </svg>
  `;

  const placeholderGroups = [
    [
      "wheels",
      "wheel-options",
      ["Original wheels", "Sport design", "Classic design"],
      wheelIcon,
    ],
    [
      "seats",
      "seat-options",
      ["Original seats", "Sport seats", "Bucket seats"],
      seatIcon,
    ],
  ];

  placeholderGroups.forEach(([key, id, names, icon]) => {
    names.forEach((name, index) => {
      const button = document.createElement("button");

      button.className = "option-card";
      button.dataset.selection = key;
      button.dataset.value = name;

      button.innerHTML = `
        ${icon}
        <strong></strong>
        <small></small>
      `;

      button.querySelector("strong").textContent = name;
      button.querySelector("small").textContent = index
        ? "Preview unavailable"
        : "Current model";

      button.onclick = () => {
        state[key] = name;
        refresh();
      };

      document.getElementById(id).append(button);
    });
  });

  // Camera buttons
  const viewIcons = {
    Overview: "◩",
    Rear: "▱",
    Side: "▰",
    Tire: "◉",
    Front: "▱",
    Top: "◇",
  };

  const viewNames = [
    "Overview",
    "Rear",
    "Side",
    "Tire",
    "Front",
    "Top",
  ];

  viewNames.forEach((name, index) => {
    const button = document.createElement("button");

    button.disabled = true;
    button.className = "view-button";

    button.innerHTML = `
      <span class="view-symbol">${viewIcons[name]}</span>
      <span>${name}</span>
    `;

    button.setAttribute("aria-pressed", String(index === 0));

    button.onclick = () => {
      actions.view(name);

      document.querySelectorAll(".view-button").forEach((other) => {
        other.setAttribute(
          "aria-pressed",
          String(other === button)
        );
      });
    };

    document.querySelector("#views").append(button);
  });

  // Summary dialog
  const dialog = document.querySelector("#summary-dialog");

  document.querySelector("#summary-toggle").onclick = () => {
    dialog.showModal();
  };

  document.querySelector("#close-summary").onclick = () => {
    dialog.close();
  };

  function download(data, name) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = name;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.querySelector("#save-config").onclick = () => {
    download(
      {
        version: 1,
        selections: state,
        placeholderCategories: ["wheels", "seats"],
      },
      "porsche-configuration.json"
    );
  };

  document.querySelector("#reset-config").onclick = () => {
    Object.assign(state, {
      paint: "Original",
      wheels: "Original wheels",
      seats: "Original seats",
    });

    if (ready) {
      actions.paint(null);
    }

    refresh();
  };

  document.querySelector("#reset-view").onclick = () => {
    actions.view("Overview");

    document.querySelectorAll(".view-button").forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === 0));
    });
  };

  // Environment controls
  document.querySelector("#background").onchange = (event) => {
    actions.environment?.("background", event.target.value);
  };

  ["brightness", "rotation", "exposure"].forEach((id) => {
    document.getElementById(id).oninput = (event) => {
      const value = Number(event.target.value);

      document.getElementById(`${id}-value`).textContent =
        id === "rotation" ? `${value}°` : value.toFixed(2);

      actions.environment?.(id, value);
    };
  });

  // Depth-of-field controls
  document.querySelector("#dof-enabled").onchange = (event) => {
    actions.dof?.("enabled", event.target.checked);
  };

  ["focus", "aperture", "maxblur"].forEach((key) => {
    document.getElementById(`dof-${key}`).oninput = (event) => {
      const value = Number(event.target.value);

      document.getElementById(`dof-${key}-value`).textContent =
        value.toFixed(key === "focus" ? 2 : 3);

      actions.dof?.(key, value);
    };
  });

  // Saved camera controls
  function refreshSaved() {
    const select = document.querySelector("#saved-views");
    select.replaceChildren();

    views.forEach((view, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = view.name;
      select.append(option);
    });

    document.querySelector("#load-view").disabled =
      !ready || !views.length;

    document.querySelector("#export-views").disabled = !views.length;
  }

  if (import.meta.env.DEV) {
    document.querySelector("#dev-panel").hidden = false;
  }

  document.querySelector("#fov").oninput = (event) => {
    const value = Number(event.target.value);

    document.querySelector("#fov-value").textContent = `${value}°`;
    actions.fov?.(value);
  };

  document.querySelector("#capture-view").onclick = () => {
    const name = document.querySelector("#view-name").value.trim();
    const message = document.querySelector("#dev-message");

    if (!name) {
      message.textContent = "Enter a view name first.";
      return;
    }

    const view = {
      name,
      ...actions.capture(),
    };

    const existingIndex = views.findIndex(
      (item) => item.name === name
    );

    if (existingIndex < 0) {
      views.push(view);
    } else {
      views[existingIndex] = view;
    }

    try {
      localStorage.setItem(
        "porsche-camera-views-v1",
        JSON.stringify(views)
      );

      message.textContent = `Saved “${name}” in this browser.`;
    } catch {
      message.textContent =
        "Saved for this session. Download JSON for a backup.";
    }

    refreshSaved();

    document.querySelector("#saved-views").value =
      views.findIndex((item) => item.name === name);
  };

  document.querySelector("#load-view").onclick = () => {
    const index = Number(
      document.querySelector("#saved-views").value
    );

    const view = views[index];

    if (view) {
      actions.restore(view);
      document.querySelector("#view-name").value = view.name;
      syncFov(view.fov);
    }
  };

  document.querySelector("#export-views").onclick = () => {
    download(
      {
        coordinateSystem:
          "Viewer space: car centered, longest side 4 units",
        views,
      },
      "camera-views.json"
    );
  };

  function syncFov(value) {
    document.querySelector("#fov").value = value;
    document.querySelector("#fov-value").textContent =
      `${Math.round(value)}°`;
  }

  refresh();
  refreshSaved();

  return {
    viewer: document.querySelector("#viewer"),
    status: document.querySelector("#status"),

    connect(callbacks) {
      actions = callbacks;
    },

    ready(paintFound) {
      ready = true;

      document
        .querySelectorAll(".view-button, #reset-view, #capture-view")
        .forEach((button) => {
          button.disabled = false;
        });

      document.querySelectorAll(".swatch").forEach((button) => {
        button.disabled = !paintFound;
      });

      document.querySelector("#paint-help").textContent = paintFound
        ? "Color previews use your existing paint finish."
        : "Car-paint material not found; swatches are unavailable.";

      document.querySelector("#dev-message").textContent =
        "Compose your shot, name it, then save.";

      refreshSaved();
    },

    syncFov,

    manualView() {
      document.querySelectorAll(".view-button").forEach((button) => {
        button.setAttribute("aria-pressed", "false");
      });
    },
  };
}