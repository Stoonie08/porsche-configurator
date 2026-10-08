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
        <button id="toggle-viewer-overlays" type="button" aria-pressed="false">Hide viewer controls</button>
        <button id="toggle-camera-tools" type="button" aria-expanded="false" aria-controls="dev-panel">Camera tools</button>
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

          <div class="scene-tools" aria-label="Scene controls">
            <div id="scene-settings" class="scene-settings" hidden>
              <div class="scene-presets">
                <fieldset class="scene-choice">
                  <legend>Background</legend>
                  <div class="background-options">
                    <button type="button" class="background-tile" data-background="studio" aria-pressed="true">
                      <span class="background-art studio-art" aria-hidden="true"></span><span>Light studio</span>
                    </button>
                    <button type="button" class="background-tile" data-background="dark" aria-pressed="false">
                      <span class="background-art dark-art" aria-hidden="true"></span><span>Dark studio</span>
                    </button>
                    <button type="button" class="background-tile" data-background="panorama" aria-pressed="false">
                      <span class="background-art panorama-art" aria-hidden="true"></span><span>Panorama</span>
                    </button>
                  </div>
                </fieldset>
                <fieldset class="scene-choice">
                  <legend>Time of day</legend>
                  <div class="time-options">
                    <button type="button" data-time="day" aria-pressed="true">Day</button>
                    <button type="button" data-time="night" aria-pressed="false">Night</button>
                  </div>
                </fieldset>
              </div>

            </div>
            <div class="scene-toolbar">
              <button id="scene-toggle" type="button" aria-expanded="false" aria-controls="scene-settings">
                <svg class="scene-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
                Adjust scene
              </button>
              <button id="auto-rotate" type="button" aria-pressed="false" disabled title="Rotate the car view">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M19 12a7 7 0 0 0-12-5M5 12a7 7 0 0 0 12 5"/></svg>
                360° View
              </button>
              <button id="reset-view" type="button" disabled title="Reset camera to Overview">Reset view ↺</button>
              <button id="viewer-fullscreen" type="button" class="fullscreen-button" aria-label="Enter fullscreen" title="Fullscreen">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6"/></svg>
              </button>
            </div>
            <p id="scene-feedback" class="scene-feedback" role="status" hidden></p>
          </div>
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

              <details id="dev-fine-adjustments" class="scene-advanced">
                <summary>Fine adjustments</summary>
                <div class="scene-sliders">
            <label>
              Environment brightness
              <output id="brightness-value">0.50</output>
              <input
                id="brightness"
                type="range"
                min="0"
                max="3"
                step="0.01"
                value="0.5"
              >
            </label>

            <label>
              Environment rotation
              <output id="rotation-value">184°</output>
              <input
                id="rotation"
                type="range"
                min="0"
                max="360"
                value="184"
              >
            </label>

            <label>
              Exposure
              <output id="exposure-value">1.25</output>
              <input
                id="exposure"
                type="range"
                min="0.2"
                max="2"
                step="0.05"
                value="1.25"
              >
            </label>

            <fieldset id="dof-controls">
              <legend>Distance depth of field</legend>

              <label>
                <input id="dof-enabled" type="checkbox" checked>
                Enable close-up depth of field
              </label>

              <label>
                <input id="dof-autofocus" type="checkbox" checked>
                Autofocus on car
              </label>
              <label>
                Manual focus distance
                <output id="dof-focus-value">0.96</output>
                <input
                  id="dof-focus"
                  type="range"
                  min="0.2"
                  max="8"
                  step="0.01"
                  value="0.96"
                >
              </label>

              <label>
                Blur strength
                <output id="dof-aperture-value">0.003</output>
                <input
                  id="dof-aperture"
                  type="range"
                  min="0"
                  max="0.04"
                  step="0.001"
                  value="0.003"
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
                Zoom closer for blur; pull back for a sharp full-car view. Disable autofocus to use manual focus.
              </p>
            </fieldset>
                </div>
              </details>

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
            <span id="wheel-label">Standard Option</span>
          </summary>

          <div id="wheel-options" class="cards"></div>

          <p class="note">
            Images preview each wheel option.
            Selecting an option does not change the 3D wheels yet.
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
    wheels: "Standard Option",
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
      localStorage.getItem("porsche-camera-views-v1") || "[]",
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
          view[key].every(Number.isFinite),
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
        String(state[button.dataset.selection] === button.dataset.value),
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

  // Wheel images: keep file names and requested display order together.
  const wheelFiles = [
    "Standard_Option.png",
    "Lightweaight_Option.png",
    "Esclusive_Option.png",
  ];

  wheelFiles.forEach((file) => {
    const name = file.replace(/\.png$/i, "").replaceAll("_", " ");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-card wheel-card";
    button.dataset.selection = "wheels";
    button.dataset.value = name;
    const image = document.createElement("img");
    image.className = "wheel-option-image";
    image.src = `${import.meta.env.BASE_URL}images/wheels/${file}`;
    image.alt = "";
    image.width = 960;
    image.height = 960;
    image.loading = "lazy";
    image.decoding = "async";
    const label = document.createElement("strong");
    label.textContent = name;
    button.append(image, label);
    button.onclick = () => {
      state.wheels = name;
      refresh();
    };
    document.querySelector("#wheel-options").append(button);
  });

  // Seat placeholder artwork
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
  const viewNames = ["Overview", "Rear", "Side", "Tire", "Front", "Top"];

  viewNames.forEach((name, index) => {
    const button = document.createElement("button");

    button.disabled = true;
    button.className = "view-button";

    button.innerHTML = `
      <img class="view-thumbnail" src="${import.meta.env.BASE_URL}views/${name}.png" alt="" draggable="false">
      <span>${name}</span>
    `;

    button.setAttribute("aria-pressed", String(index === 0));

    button.onclick = () => {
      actions.view(name);

      document.querySelectorAll(".view-button").forEach((other) => {
        other.setAttribute("aria-pressed", String(other === button));
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
      "porsche-configuration.json",
    );
  };

  document.querySelector("#reset-config").onclick = () => {
    Object.assign(state, {
      paint: "Original",
      wheels: "Standard Option",
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
  const scenePanel = document.querySelector("#scene-settings");
  const sceneToggle = document.querySelector("#scene-toggle");
  function toggleScene(open) {
    scenePanel.hidden = !open;
    sceneToggle.setAttribute("aria-expanded", String(open));
  }
  sceneToggle.onclick = () => toggleScene(scenePanel.hidden);
  document
    .querySelector(".scene-tools")
    .addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !scenePanel.hidden) {
        toggleScene(false);
        sceneToggle.focus();
        event.stopPropagation();
      }
    });
  document.querySelectorAll("[data-background]").forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll("[data-background]").forEach((other) => {
        other.setAttribute("aria-pressed", String(other === button));
      });
      actions.environment?.("background", button.dataset.background);
    };
  });
  document.querySelectorAll("[data-time]").forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll("[data-time]").forEach((other) => {
        other.setAttribute("aria-pressed", String(other === button));
      });
      const night = button.dataset.time === "night";
      for (const [id, value] of Object.entries({
        brightness: night ? 0.16 : 0.5,
        exposure: night ? 0.85 : 1.25,
      })) {
        document.getElementById(id).value = value;
        document.getElementById(`${id}-value`).textContent = value.toFixed(2);
      }
      actions.environment?.("timeOfDay", button.dataset.time);
    };
  });
  const rotateButton = document.querySelector("#auto-rotate");
  function syncAutoRotate(enabled) {
    rotateButton.setAttribute("aria-pressed", String(enabled));
  }
  rotateButton.onclick = () => {
    const enabled = rotateButton.getAttribute("aria-pressed") !== "true";
    syncAutoRotate(enabled);
    actions.autoRotate?.(enabled);
  };
  const fullscreenButton = document.querySelector("#viewer-fullscreen");
  const viewerElement = document.querySelector("#viewer");
  if (!viewerElement.requestFullscreen) fullscreenButton.hidden = true;
  fullscreenButton.onclick = async () => {
    const feedback = document.querySelector("#scene-feedback");
    feedback.hidden = true;
    try {
      if (document.fullscreenElement === viewerElement)
        await document.exitFullscreen();
      else await viewerElement.requestFullscreen();
    } catch {
      feedback.textContent =
        "Fullscreen is unavailable in this browser window.";
      feedback.hidden = false;
    }
  };
  document.addEventListener("fullscreenchange", () => {
    const fullscreen = document.fullscreenElement === viewerElement;
    fullscreenButton.setAttribute(
      "aria-label",
      fullscreen ? "Exit fullscreen" : "Enter fullscreen",
    );
    fullscreenButton.title = fullscreen ? "Exit fullscreen" : "Fullscreen";
  });

  ["brightness", "rotation", "exposure"].forEach((id) => {
    document.getElementById(id).oninput = (event) => {
      const value = Number(event.target.value);

      document.getElementById(`${id}-value`).textContent =
        id === "rotation" ? `${value}°` : value.toFixed(2);

      actions.environment?.(id, value);
    };
  });

  document.querySelector("#dof-focus").disabled = true;
  document.querySelector("#dof-autofocus").onchange = (event) => {
    document.querySelector("#dof-focus").disabled = event.target.checked;
    actions.dof?.("autoFocus", event.target.checked);
  };

  // Depth-of-field controls
  document.querySelector("#dof-enabled").onchange = (event) => {
    actions.dof?.("enabled", event.target.checked);
  };

  ["focus", "aperture", "maxblur"].forEach((key) => {
    document.getElementById(`dof-${key}`).oninput = (event) => {
      const value = Number(event.target.value);

      document.getElementById(`dof-${key}-value`).textContent = value.toFixed(
        key === "focus" ? 2 : 3,
      );

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

    document.querySelector("#load-view").disabled = !ready || !views.length;

    document.querySelector("#export-views").disabled = !views.length;
  }

  if (import.meta.env.DEV) {
    document.querySelector("#dev-panel").hidden = false;
  }

  const devPanel = document.querySelector("#dev-panel");
  const cameraToolsButton = document.querySelector("#toggle-camera-tools");
  cameraToolsButton.hidden = !import.meta.env.DEV;
  cameraToolsButton.onclick = () => {
    const open = devPanel.hidden || !devPanel.open;
    devPanel.hidden = false;
    devPanel.open = open;
    if (open) devPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  devPanel.addEventListener("toggle", () => {
    cameraToolsButton.setAttribute("aria-expanded", String(devPanel.open));
  });

  const overlaysButton = document.querySelector("#toggle-viewer-overlays");
  let overlaysHidden = false;
  const previousVisibility = new Map();
  function toggleViewerOverlays() {
    overlaysHidden = !overlaysHidden;
    const overlays = document.querySelectorAll("#viewer .scene-tools, #viewer #status, #viewer .reset");
    overlays.forEach((element) => {
      if (overlaysHidden) {
        previousVisibility.set(element, {
          value: element.style.getPropertyValue("visibility"),
          priority: element.style.getPropertyPriority("visibility"),
        });
        element.style.setProperty("visibility", "hidden", "important");
      } else {
        const previous = previousVisibility.get(element);
        if (previous?.value) element.style.setProperty("visibility", previous.value, previous.priority);
        else element.style.removeProperty("visibility");
      }
    });
    overlaysButton.textContent = overlaysHidden ? "Show viewer controls" : "Hide viewer controls";
    overlaysButton.setAttribute("aria-pressed", String(overlaysHidden));
  }
  overlaysButton.onclick = toggleViewerOverlays;
  overlaysButton.title = "Hide or show overlays (H). Also works in fullscreen.";
  window.addEventListener("keydown", (event) => {
    const editing = event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]");
    if (event.key.toLowerCase() !== "h" || event.repeat || event.ctrlKey || event.metaKey || event.altKey || editing) return;
    event.preventDefault();
    toggleViewerOverlays();
  });

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

    const existingIndex = views.findIndex((item) => item.name === name);

    if (existingIndex < 0) {
      views.push(view);
    } else {
      views[existingIndex] = view;
    }

    try {
      localStorage.setItem("porsche-camera-views-v1", JSON.stringify(views));

      message.textContent = `Saved “${name}” in this browser.`;
    } catch {
      message.textContent =
        "Saved for this session. Download JSON for a backup.";
    }

    refreshSaved();

    document.querySelector("#saved-views").value = views.findIndex(
      (item) => item.name === name,
    );
  };

  document.querySelector("#load-view").onclick = () => {
    const index = Number(document.querySelector("#saved-views").value);

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
        coordinateSystem: "Viewer space: car centered, longest side 4 units",
        views,
      },
      "camera-views.json",
    );
  };

  function syncFov(value) {
    document.querySelector("#fov").value = value;
    document.querySelector("#fov-value").textContent = `${Math.round(value)}°`;
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
        .querySelectorAll(
          ".view-button, #reset-view, #capture-view, #auto-rotate",
        )
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
    syncAutoRotate,

    manualView() {
      document.querySelectorAll(".view-button").forEach((button) => {
        button.setAttribute("aria-pressed", "false");
      });
    },
  };
}
