/* =========================================================
   GLOBAL STATE
========================================================= */

let activeMaterial = null;
let activeTable = null;
let wireData = [];
let coreODOverridden = false;

const ADMIN_PASSWORD = "electro123@";

/* =========================================================
   DOM REFERENCES
========================================================= */

const materialSelect = document.getElementById("materialSelect");
const landing = document.getElementById("landing");
const calculator = document.getElementById("calculator");
const dbEditor = document.getElementById("dbEditor");
const passwordModal = document.getElementById("passwordModal");
const saveModal = document.getElementById("saveModal");
const result = document.getElementById("result");

const wattage = document.getElementById("wattage");
const voltage = document.getElementById("voltage");

const heaterODInput = document.getElementById("heaterOD");
const heaterLengthInput = document.getElementById("heaterLength");
const coreLengthInput = document.getElementById("coreLength");
const pipeThicknessInput = document.getElementById("pipeThickness");
const pipeODInput = document.getElementById("pipeOD");
const coreODInput = document.getElementById("coreOD");

const autoThicknessCheckbox = document.getElementById("autoThickness");
const autoPipeODCheckbox = document.getElementById("autoPipeOD");
const autoCoreODCheckbox = document.getElementById("autoCoreOD");
const coreODStatusEl = document.getElementById("coreODStatus");

const extraInput = document.getElementById("extra");

const materialLabel = document.getElementById("materialLabel");
const materialLabelCalc = document.getElementById("materialLabelCalc");

/* =========================================================
   SUPABASE CONNECTION
========================================================= */

const supabaseClient = window.supabase.createClient(
  "https://zgwpjwywbnhrwzlucvwe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnd3Bqd3l3Ym5ocnd6bHVjdndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzEyODAsImV4cCI6MjA4Mjk0NzI4MH0.jNlLdo4lAoVVNauhAqY0v_8L_sY_XVdlnsV230BaoAY"
);

/* =========================================================
   MATERIAL SELECTION
========================================================= */

function selectMaterial(type) {

  activeMaterial = type;

  activeTable =
    type === "nichrome"
      ? "nichrome_wires"
      : "kanthal_d_wires";

  const labelText =
    type === "nichrome"
      ? "Material: Nichrome"
      : "Material: Kanthal D";

  materialLabel.innerText = labelText;

  if (materialLabelCalc) {
    materialLabelCalc.innerText = labelText;
  }

  materialSelect.classList.add("hidden");
  landing.classList.remove("hidden");

  loadDatabase();
}

function backToMaterial() {
  landing.classList.add("hidden");
  calculator.classList.add("hidden");
  dbEditor.classList.add("hidden");
  materialSelect.classList.remove("hidden");
}

/* =========================================================
   LOAD DATABASE
========================================================= */

async function loadDatabase() {

  const { data, error } = await supabaseClient
    .from(activeTable)
    .select("*")
    .order("swg");

  if (error) {
    alert("Failed to load database");
    console.error(error);
    return;
  }

  wireData = data;
}

/* =========================================================
   NAVIGATION
========================================================= */

function openCalculator() {
  landing.classList.add("hidden");
  calculator.classList.remove("hidden");
  result.innerHTML = "";
}

function backToLanding() {
  calculator.classList.add("hidden");
  dbEditor.classList.add("hidden");
  landing.classList.remove("hidden");
}

/* =========================================================
   AUTO/MANUAL TOGGLE FUNCTIONS
========================================================= */

function toggleAutoThickness() {
  const isAuto = autoThicknessCheckbox.checked;
  pipeThicknessInput.disabled = isAuto;
  if (isAuto) {
    pipeThicknessInput.value = '';
    pipeThicknessInput.placeholder = 'Auto';
    autoCalculateFields();
  }
}

function toggleAutoPipeOD() {
  const isAuto = autoPipeODCheckbox.checked;
  pipeODInput.disabled = isAuto;
  if (isAuto) {
    pipeODInput.value = '';
    pipeODInput.placeholder = 'Auto';
    autoCalculateFields();
  }
}

function toggleAutoCoreOD() {
  const isAuto = autoCoreODCheckbox.checked;
  if (isAuto) {
    coreODInput.value = '';
    coreODInput.placeholder = 'Auto';
    coreODOverridden = false;
    coreODStatusEl.textContent = '';
    autoCalculateFields();
  } else {
    coreODOverridden = true;
    coreODStatusEl.textContent = 'Manual Override Active';
    coreODStatusEl.style.color = '#f59e0b';
  }
}

/* =========================================================
   INSULATION THICKNESS RULE  (based on watt density)
========================================================= */

/**
 * Returns insulation thickness in mm:
 *   wattDensity >= 9  → 2.0 mm
 *   wattDensity <  8  → 1.5 mm
 *   8 ≤ wattDensity < 9 → 1.7 mm (default mid-range)
 */
function getInsulationThickness(wattDensity) {
  if (wattDensity >= 9) return 2.0;
  if (wattDensity < 8)  return 1.5;
  return 1.7;
}

/* =========================================================
   AUTO-CALCULATE FIELDS IN REAL-TIME
========================================================= */

function autoCalculateFields() {
  
  const W = Number(wattage.value);
  const V = Number(voltage.value);
  const heaterOD = Number(heaterODInput.value);
  const heaterLength = Number(heaterLengthInput.value);

  // Compute watt density once so it can be reused by all downstream rules
  let wattDensity = 0;
  if (W && heaterOD && heaterLength) {
    const surfaceAreaCM2 = (Math.PI * heaterOD * heaterLength) / 100;
    wattDensity = W / surfaceAreaCM2;
  }

  // Auto-calculate Pipe Thickness (if enabled and we have enough data)
  if (autoThicknessCheckbox.checked && wattDensity) {
    pipeThicknessInput.value = wattDensity <= 9 ? 0.8 : 1.0;
  }

  // Get current pipe thickness (auto or manual)
  const pipeThickness = Number(pipeThicknessInput.value);

  // Auto-calculate Pipe OD (if enabled and we have required data)
  if (autoPipeODCheckbox.checked && heaterOD) {
    let increment;
    
    // Rule based on Heater OD
    if (heaterOD <= 10) {
      increment = 1.5;
    } else if (heaterOD <= 15) {
      increment = 2.0;
    } else if (heaterOD <= 25) {
      increment = 2.5;
    } else {
      increment = 3.0;
    }
    
    const pipeOD = heaterOD + increment;
    pipeODInput.value = pipeOD.toFixed(2);
  }

  // -------------------------------------------------------
  // AUTO-CALCULATE CORE OD
  // Formula: CoreOD = HeaterOD - (PipeThickness × 2)
  //                           - (NichromeWireThickness × 2)
  //                           - InsulationThickness
  // -------------------------------------------------------
  if (autoCoreODCheckbox.checked && wattDensity && heaterOD && pipeThickness) {

    const insulationThickness = getInsulationThickness(wattDensity);

    // Estimate wire thickness from the first entry in the wattage range
    let nichromeThickness = 0;
    if (wireData.length && W) {
      const startEntry = wireData.find(w => W >= w.minw && W <= w.maxw);
      if (startEntry) nichromeThickness = startEntry.thickness;
    }

    if (nichromeThickness > 0) {
      const calcCoreOD =
        heaterOD
        - (pipeThickness * 2)
        - (nichromeThickness * 2)
        - insulationThickness;

      if (calcCoreOD <= 0) {
        coreODInput.value = '';
        coreODStatusEl.textContent =
          '⚠ Invalid dimensions – check heater OD and thickness values';
        coreODStatusEl.style.color = '#ef4444';
      } else {
        coreODInput.value = calcCoreOD.toFixed(2);
        coreODStatusEl.textContent =
          `Insulation: ${insulationThickness} mm`;
        coreODStatusEl.style.color = '#22c55e';
      }
    } else {
      // Wire database not yet loaded or wattage not in range
      coreODStatusEl.textContent = '';
    }
  }
}

/* =========================================================
   ATTACH EVENT LISTENERS FOR REAL-TIME AUTO-FILL
========================================================= */

function setupAutoCalculation() {
  // Trigger auto-calculation when these fields change
  wattage.addEventListener('input', autoCalculateFields);
  voltage.addEventListener('input', autoCalculateFields);
  heaterODInput.addEventListener('input', autoCalculateFields);
  heaterLengthInput.addEventListener('input', autoCalculateFields);
  pipeThicknessInput.addEventListener('input', autoCalculateFields);
  pipeODInput.addEventListener('input', autoCalculateFields);

  // Detect manual override on Core OD field
  coreODInput.addEventListener('input', () => {
    if (autoCoreODCheckbox.checked) {
      // User typed into the field — switch to manual override
      autoCoreODCheckbox.checked = false;
      coreODOverridden = true;
      coreODStatusEl.textContent = 'Manual Override Active';
      coreODStatusEl.style.color = '#f59e0b';
    }
  });
}

// Initialize auto-calculation on page load
setupAutoCalculation();

/* =========================================================
   MAIN CALCULATION
========================================================= */

function calculate() {

  const W = Number(wattage.value);
  const V = Number(voltage.value);
  const heaterOD = Number(heaterODInput.value);
  const heaterLength = Number(heaterLengthInput.value);
  const coreLength = Number(coreLengthInput.value);
  const extra = Number(extraInput.value) || 0;

  /* ---------------- VALIDATION ---------------- */

  if (!wireData.length) {
    result.innerHTML =
      "<p style='color:#ef4444'>❌ Database not loaded.</p>";
    return;
  }

  if (!W || !V || !heaterOD || !heaterLength || !coreLength) {
    result.innerHTML =
      "<p style='color:#ef4444'>❌ Fill all required inputs</p>";
    return;
  }

  const coreOD = Number(coreODInput.value);

  if (!coreOD || coreOD <= 0) {
    // Distinguish between auto-calc failure vs user left it empty
    if (autoCoreODCheckbox && autoCoreODCheckbox.checked) {
      result.innerHTML =
        "<p style='color:#ef4444'>❌ Invalid dimensions – check heater OD and thickness values</p>";
    } else {
      result.innerHTML =
        "<p style='color:#ef4444'>❌ Please enter Core OD (or enable Auto mode)</p>";
    }
    return;
  }

  /* =====================================================
     STEP 1: WATT DENSITY (USING HEATER OD + HEATER LENGTH)
  ===================================================== */

  const heaterCircumference = Math.PI * heaterOD; // mm
  const surfaceAreaMM2 = heaterCircumference * heaterLength; // mm²
  const surfaceAreaCM2 = surfaceAreaMM2 / 100; // convert to cm²
  const wattDensity = W / surfaceAreaCM2;

  /* =====================================================
     STEP 1b: INSULATION THICKNESS (from watt density rule)
  ===================================================== */

  const insulationThickness = getInsulationThickness(wattDensity);
  const isCoreODAuto = autoCoreODCheckbox && autoCoreODCheckbox.checked;

  /* =====================================================
     STEP 2: GET PIPE THICKNESS (ALREADY AUTO-FILLED OR MANUAL)
  ===================================================== */

  const pipeThickness = Number(pipeThicknessInput.value);
  
  if (!pipeThickness) {
    result.innerHTML =
      "<p style='color:#ef4444'>❌ Please enter pipe thickness or enable Auto mode</p>";
    return;
  }

  /* =====================================================
     STEP 3: GET PIPE OD (ALREADY AUTO-FILLED OR MANUAL)
  ===================================================== */

  const pipeOD = Number(pipeODInput.value);
  
  if (!pipeOD) {
    result.innerHTML =
      "<p style='color:#ef4444'>❌ Please enter pipe OD or enable Auto mode</p>";
    return;
  }

  /* =====================================================
     STEP 4: RESISTANCE CALCULATION
  ===================================================== */

  const baseResistance = (V * V) / W;
  const finalResistance = baseResistance * (1 + extra / 100);

  /* =====================================================
     STEP 5: FIND STARTING GAUGE FROM WATTAGE RANGE
  ===================================================== */

  const startIndex = wireData.findIndex(
    w => W >= w.minw && W <= w.maxw
  );

  if (startIndex === -1) {
    result.innerHTML =
      "<p style='color:#ef4444'>❌ No wire found for this wattage range</p>";
    return;
  }

  let results = [];
  let primaryIndex = -1;
  let found = false;

  /* =====================================================
     STEP 6: ITERATE GAUGE LOGIC
  ===================================================== */

  for (let i = startIndex; i < wireData.length; i++) {

    const w = wireData[i];

    const wireLengthMeters = finalResistance / w.ohm;
    const wireLengthMM = wireLengthMeters * 1000;

    /* -------- TURNS CALCULATION (USING CORE OD) -------- */
    const circumferencePerTurn = Math.PI * coreOD;
    const turns = wireLengthMM / circumferencePerTurn;

    /* -------- PITCH: SPACING BETWEEN TURNS (USING CORE LENGTH) -------- */
    const pitch = coreLength / turns;
    const idealPitch = 2 * w.thickness;

    let pass = false;

    if (w.swg >= 22 && w.swg <= 32) {
      pass = pitch >= idealPitch * 0.98;
    } else if (w.swg >= 33 && w.swg <= 45) {
      pass = pitch >= idealPitch;
    }

    results.push({
      swg: w.swg,
      thickness: w.thickness,
      ohm: w.ohm,
      wireLengthMeters,
      turns,
      pitch,
      idealPitch,
      pass
    });

    if (pass && !found) {
      primaryIndex = results.length - 1;
      found = true;
    } else if (found) {
      break;
    }
  }

  /* =====================================================
     FINAL OUTPUT
  ===================================================== */

  result.innerHTML = `
    <div style="margin-top:15px">

      <b>Material:</b> ${activeMaterial || "-"}<br><br>

      <b>Heater OD:</b> ${heaterOD.toFixed(2)} mm<br>
      <b>Heater Length (Total):</b> ${heaterLength.toFixed(2)} mm<br>
      <b>Core Length (Winding Area):</b> ${coreLength.toFixed(2)} mm<br>
      <b>Pipe Thickness:</b> ${pipeThickness.toFixed(2)} mm ${autoThicknessCheckbox.checked ? '(Auto)' : '(Manual)'}<br>
      <b>Pipe OD:</b> ${pipeOD.toFixed(2)} mm ${autoPipeODCheckbox.checked ? '(Auto)' : '(Manual)'}<br>
      <b>Insulation Thickness:</b> ${insulationThickness.toFixed(1)} mm
        <i style="color:var(--muted);font-size:11px">(watt density rule: ≥9 W/cm²→2mm | &lt;8→1.5mm | 8–9→1.7mm)</i><br>
      <b>Core OD (For Turns Circumference):</b> ${coreOD.toFixed(2)} mm
        ${!isCoreODAuto
          ? '<span style="background:#78350f;color:#fcd34d;font-size:10px;padding:1px 6px;border-radius:9px;margin-left:4px">Manual Override</span>'
          : ''
        }<br><br>

      <b>Surface Area:</b> ${surfaceAreaCM2.toFixed(2)} cm² <i style="color:var(--muted);font-size:11px">(using Heater Length)</i><br>
      <b>Watt Density:</b> ${wattDensity.toFixed(2)} W/cm²<br><br>

      <b>Base Resistance:</b> ${baseResistance.toFixed(2)} Ω<br>
      <b>Final Resistance (+${extra}%):</b> ${finalResistance.toFixed(2)} Ω<br><br>

      <i style="color:var(--muted);font-size:12px">
        📐 Pipe OD Auto Rule: ≤10mm → +1.5mm | ≤15mm → +2mm | ≤25mm → +2.5mm | >25mm → +3mm<br>
        📊 Turns = Wire Length ÷ (π × Core OD) | Pitch = Core Length ÷ Turns
      </i>
    </div>

    <div class="table-wrapper">
      <table>
        <tr>
          <th>SWG</th>
          <th>Thickness (mm)</th>
          <th>Ω / m</th>
          <th>Wire Length (m)</th>
          <th>Turns</th>
          <th>Pitch (mm)</th>
          <th>2 × Thickness</th>
          <th>Status</th>
        </tr>

        ${results.map((r, i) => `
          <tr class="${
            i === primaryIndex
              ? "primary"
              : r.pass
              ? "secondary"
              : "fail"
          }">
            <td>${r.swg}</td>
            <td>${r.thickness.toFixed(3)}</td>
            <td>${r.ohm.toFixed(3)}</td>
            <td>${r.wireLengthMeters.toFixed(2)}</td>
            <td>${r.turns.toFixed(0)}</td>
            <td>${r.pitch.toFixed(3)}</td>
            <td>${r.idealPitch.toFixed(3)}</td>
            <td>${r.pass ? "✓ PASS" : "✗ FAIL"}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;
}

/* =========================================================
   PASSWORD MODAL FUNCTIONS
========================================================= */

function openPassword() {
  passwordModal.classList.remove("hidden");
  document.getElementById("dbPassword").value = "";
  document.getElementById("passError").innerText = "";
}

function closePassword() {
  passwordModal.classList.add("hidden");
}

function checkPassword() {
  const pass = document.getElementById("dbPassword").value;
  const passError = document.getElementById("passError");

  if (pass === ADMIN_PASSWORD) {
    closePassword();
    openDatabase();
  } else {
    passError.innerText = "❌ Incorrect password";
    passError.style.color = "#ef4444";
  }
}

/* =========================================================
   DATABASE EDITOR FUNCTIONS
========================================================= */

function openDatabase() {
  landing.classList.add("hidden");
  dbEditor.classList.remove("hidden");
  populateDBTable();
}

function populateDBTable() {
  const table = document.getElementById("dbTable");
  
  if (!wireData.length) {
    table.innerHTML = "<tr><td>No data loaded</td></tr>";
    return;
  }

  let html = `
    <thead>
      <tr>
        <th>SWG</th>
        <th>Thickness (mm)</th>
        <th>Ω / m</th>
        <th>Min Wattage</th>
        <th>Max Wattage</th>
      </tr>
    </thead>
    <tbody>
  `;

  wireData.forEach((wire, idx) => {
    html += `
      <tr>
        <td><input type="number" value="${wire.swg}" data-idx="${idx}" data-field="swg"></td>
        <td><input type="number" step="0.001" value="${wire.thickness}" data-idx="${idx}" data-field="thickness"></td>
        <td><input type="number" step="0.001" value="${wire.ohm}" data-idx="${idx}" data-field="ohm"></td>
        <td><input type="number" value="${wire.minw}" data-idx="${idx}" data-field="minw"></td>
        <td><input type="number" value="${wire.maxw}" data-idx="${idx}" data-field="maxw"></td>
      </tr>
    `;
  });

  html += `</tbody>`;
  table.innerHTML = html;

  // Add event listeners to update wireData when inputs change
  table.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      const value = parseFloat(e.target.value) || 0;
      wireData[idx][field] = value;
    });
  });
}

async function saveDatabase() {
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;
  saveBtn.innerText = "Saving...";

  try {
    const { error } = await supabaseClient
      .from(activeTable)
      .upsert(wireData, { onConflict: "swg" });

    if (error) throw error;

    showSaveModal("✅ Success", "Database saved successfully!");
  } catch (err) {
    console.error(err);
    showSaveModal("❌ Error", "Failed to save database: " + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Save Changes";
  }
}

/* =========================================================
   SAVE STATUS MODAL
========================================================= */

function showSaveModal(title, message) {
  document.getElementById("saveTitle").innerText = title;
  document.getElementById("saveMessage").innerText = message;
  document.getElementById("saveModal").classList.remove("hidden");
}

function closeSaveModal() {
  document.getElementById("saveModal").classList.add("hidden");
}
