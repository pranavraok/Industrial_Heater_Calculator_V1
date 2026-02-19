/* =========================================================
   GLOBAL STATE
========================================================= */

let activeMaterial = null;
let activeTable = null;
let wireData = [];

const ADMIN_PASSWORD = "change-me";

/* =========================================================
   DOM REFERENCES
========================================================= */

const materialSelect = document.getElementById("materialSelect");
const landing = document.getElementById("landing");
const calculator = document.getElementById("calculator");
const dbEditor = document.getElementById("dbEditor");
const passwordModal = document.getElementById("passwordModal");
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

/* =========================================================
   AUTO-CALCULATE FIELDS IN REAL-TIME
========================================================= */

function autoCalculateFields() {
  
  const W = Number(wattage.value);
  const V = Number(voltage.value);
  const heaterOD = Number(heaterODInput.value);
  const heaterLength = Number(heaterLengthInput.value);

  // Auto-calculate Pipe Thickness (if enabled and we have enough data)
  if (autoThicknessCheckbox.checked && W && V && heaterOD && heaterLength) {
    const heaterCircumference = Math.PI * heaterOD;
    const surfaceAreaMM2 = heaterCircumference * heaterLength;
    const surfaceAreaCM2 = surfaceAreaMM2 / 100;
    const wattDensity = W / surfaceAreaCM2;

    let pipeThickness;
    if (wattDensity <= 9) {
      pipeThickness = 0.8;
    } else {
      pipeThickness = 1.0;
    }
    pipeThicknessInput.value = pipeThickness;
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

  // Get current pipe OD (auto or manual)
  const pipeOD = Number(pipeODInput.value);

  // Core OD is now manually entered (no auto-calculation)
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
  
  if (!coreOD) {
    result.innerHTML =
      "<p style='color:#ef4444'>❌ Please enter Core OD</p>";
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
      <b>Core OD (For Turns Circumference):</b> ${coreOD.toFixed(2)} mm<br><br>

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
