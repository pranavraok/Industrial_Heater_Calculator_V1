/* =========================================================
   GLOBAL STATE
========================================================= */

let activeMaterial = null;
let activeTable = null;
let wireData = [];
let coreODOverridden = false;

const ADMIN_PASSWORD = "electro123@";

/* Available standard core diameters (mm) – sorted ascending */
const STANDARD_CORE_SIZES = [
  3.8, 4.1, 4.5, 5, 5.8, 6, 6.5, 7, 7.5, 7.7,
  8, 8.5, 9.2, 10, 10.5, 11, 12, 12.2, 13, 14,
  15.5, 16, 18, 21.3
];

/* Stock pipe inventory – each entry is { od, thickness } in mm */
const PIPE_INVENTORY = [
  { od: 15.8, thickness: 0.8 },
  { od: 15.5, thickness: 0.8 },
  { od: 14.5, thickness: 1.0 },
  { od: 14,   thickness: 1.0 },
  { od: 13.5, thickness: 0.8 },
  { od: 13.5, thickness: 1.0 },
  { od: 13.5, thickness: 0.7 },
  { od: 11,   thickness: 0.8 },
  { od: 18.8, thickness: 0.8 },
  { od: 18.5, thickness: 1.0 },
  { od: 17.5, thickness: 1.0 },
  { od: 17.5, thickness: 0.8 },
  { od: 18,   thickness: 1.0 },
  { od: 27,   thickness: 1.2 },
  { od: 21.4, thickness: 1.0 },
  { od: 20,   thickness: 1.0 },
  { od: 18,   thickness: 0.8 },
  { od: 14,   thickness: 0.8 },
  { od: 15.5, thickness: 1.0 },
  { od: 12.7, thickness: 0.6 },
  { od: 9.5,  thickness: 0.6 },
  { od: 10.5, thickness: 0.8 }
];

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
    coreODStatusEl.innerHTML = '<div class="cs-row cs-warn">⚠ Manual Override Active</div>';
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

/**
 * From STANDARD_CORE_SIZES, returns the largest size that is
 * less than or equal to `theoretical`.
 * Returns null if no standard size fits.
 */
function selectStandardCoreOD(theoretical) {
  let best = null;
  for (const size of STANDARD_CORE_SIZES) {
    if (size <= theoretical) best = size;
    else break; // list is sorted – no point continuing
  }
  return best;
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

  // -------------------------------------------------------
  // STOCK PIPE + CORE SELECTION (real-time preview)
  //
  // Case A – both Pipe OD and Pipe Thickness are AUTO:
  //   Loop PIPE_INVENTORY; find first pipe whose geometry
  //   yields a valid standard Core OD for the estimated SWG.
  //
  // Case B – Pipe values are MANUAL, only Core OD is AUTO:
  //   Use entered pipe values; snap Core OD to standard list.
  // -------------------------------------------------------

  const bothPipeAuto = autoPipeODCheckbox.checked && autoThicknessCheckbox.checked;

  if (bothPipeAuto && autoCoreODCheckbox.checked && wattDensity && wireData.length && W) {

    const insulationThickness = getInsulationThickness(wattDensity);
    const startEntry = wireData.find(w => W >= w.minw && W <= w.maxw);

    if (startEntry) {
      let pickedPipe = null;
      let pickedCoreOD = null;

      for (const pipe of PIPE_INVENTORY) {
        const pid = pipe.od - 2 * pipe.thickness;
        if (pid <= 0) continue;
        const theoretical = pid - 2 * startEntry.thickness - 2 * insulationThickness;
        if (theoretical <= 0) continue;
        const snapped = selectStandardCoreOD(theoretical);
        if (snapped !== null) { pickedPipe = pipe; pickedCoreOD = snapped; break; }
      }

      if (pickedPipe) {
        const pipeIDPreview = pickedPipe.od - 2 * pickedPipe.thickness;
        const theoretical   = pipeIDPreview - 2 * startEntry.thickness - 2 * insulationThickness;
        pipeODInput.value        = pickedPipe.od;
        pipeThicknessInput.value = pickedPipe.thickness;
        coreODInput.value        = pickedCoreOD;
        coreODStatusEl.innerHTML =
          `<div class="cs-row"><span class="cs-key">Pipe ID</span><span class="cs-val">${pipeIDPreview.toFixed(2)} mm</span></div>` +
          `<div class="cs-row"><span class="cs-key">Theoretical Core OD</span><span class="cs-val">${theoretical.toFixed(2)} mm</span></div>` +
          `<div class="cs-row"><span class="cs-key">Insulation</span><span class="cs-val">${insulationThickness.toFixed(1)} mm × 2 sides</span></div>` +
          `<div class="cs-row cs-ok">✓ Stock pipe selected</div>`;
      } else {
        pipeODInput.value        = '';
        pipeThicknessInput.value = '';
        coreODInput.value        = '';
        coreODStatusEl.innerHTML = '<div class="cs-row cs-err">⚠ No valid pipe + core combination found in stock</div>';
      }
    } else {
      coreODStatusEl.textContent = '';
    }

  } else if (autoCoreODCheckbox.checked && wattDensity && wireData.length && W) {

    // Case B: pipe values are manual – only Core OD auto
    const pipeThicknessVal = Number(pipeThicknessInput.value);
    const pipeODVal        = Number(pipeODInput.value) || heaterOD;

    if (pipeThicknessVal > 0) {
      const insulationThickness = getInsulationThickness(wattDensity);
      const startEntry = wireData.find(w => W >= w.minw && W <= w.maxw);
      const nichromeThickness = startEntry ? startEntry.thickness : 0;

      if (nichromeThickness > 0) {
        const pipeIDPreview     = pipeODVal - pipeThicknessVal * 2;
        const theoreticalCoreOD = pipeIDPreview - nichromeThickness * 2 - insulationThickness * 2;

        if (theoreticalCoreOD <= 0) {
          coreODInput.value = '';
          coreODStatusEl.innerHTML = '<div class="cs-row cs-err">⚠ Invalid geometry – check pipe thickness, insulation, and wire size</div>';
        } else {
          const standardCoreOD = selectStandardCoreOD(theoreticalCoreOD);
          if (standardCoreOD === null) {
            coreODInput.value = '';
            coreODStatusEl.innerHTML =
              `<div class="cs-row cs-err">⚠ No available core size fits this geometry</div>` +
              `<div class="cs-row cs-note">Theoretical: ${theoreticalCoreOD.toFixed(2)} mm – smallest stock is 3.8 mm</div>`;
          } else {
            coreODInput.value = standardCoreOD;
            coreODStatusEl.innerHTML =
              `<div class="cs-row"><span class="cs-key">Pipe ID</span><span class="cs-val">${pipeIDPreview.toFixed(2)} mm</span></div>` +
              `<div class="cs-row"><span class="cs-key">Theoretical Core OD</span><span class="cs-val">${theoreticalCoreOD.toFixed(2)} mm</span></div>` +
              `<div class="cs-row"><span class="cs-key">Insulation</span><span class="cs-val">${insulationThickness.toFixed(1)} mm × 2 sides</span></div>` +
              `<div class="cs-row cs-ok">✓ Standard size selected</div>`;
          }
        }
      } else {
        coreODStatusEl.textContent = '';
      }
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
      coreODStatusEl.innerHTML = '<div class="cs-row cs-warn">⚠ Manual Override Active</div>';
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
    if (autoCoreODCheckbox && autoCoreODCheckbox.checked) {
      result.innerHTML =
        "<p style='color:#ef4444'>❌ No valid stock pipe + core combination found – adjust inputs or check stock inventory</p>";
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
    result.innerHTML = autoThicknessCheckbox.checked
      ? "<p style='color:#ef4444'>❌ No valid stock pipe found – check inventory or adjust wattage</p>"
      : "<p style='color:#ef4444'>❌ Please enter pipe thickness</p>";
    return;
  }

  /* =====================================================
     STEP 3: GET PIPE OD (ALREADY AUTO-FILLED OR MANUAL)
  ===================================================== */

  const pipeOD = Number(pipeODInput.value);
  
  if (!pipeOD) {
    result.innerHTML = autoPipeODCheckbox.checked
      ? "<p style='color:#ef4444'>❌ No valid stock pipe found – check inventory or adjust wattage</p>"
      : "<p style='color:#ef4444'>❌ Please enter pipe OD</p>";
    return;
  }

  /* =====================================================
     STEP 3b: PIPE ID CALCULATION
  ===================================================== */
  // Pipe ID = Pipe OD − (2 × Pipe Thickness)
  // In auto mode pipeOD comes from the stock inventory selection.
  const pipeID = pipeOD - (2 * pipeThickness);

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

    /* ---- PER-SWG PIPE + CORE SELECTION ───────────────────────────────
       Auto mode : loop PIPE_INVENTORY to find the first pipe that:
                     (a) produces a theoretical CoreOD > 0
                     (b) snaps to a standard core size
                     (c) pitch validation passes for this SWG
       Manual mode: use the user-entered pipe OD / Core OD unchanged.
    ─────────────────────────────────────────────────────────────────── */
    let effectiveCoreOD;
    let selectedPipe = null;
    let invalidGeometry = false;

    if (isCoreODAuto) {

      for (const pipe of PIPE_INVENTORY) {
        const thisPipeID = pipe.od - 2 * pipe.thickness;
        if (thisPipeID <= 0) continue;

        const theoretical = thisPipeID - 2 * w.thickness - 2 * insulationThickness;
        if (theoretical <= 0) continue;

        const snapped = selectStandardCoreOD(theoretical);
        if (snapped === null) continue;

        // Pre-validate pitch with this candidate
        const wlMM_   = (finalResistance / w.ohm) * 1000;
        const turns_  = wlMM_ / (Math.PI * snapped);
        const pitch_  = coreLength / turns_;
        const ip_     = 2 * w.thickness;
        let passes = false;
        if (w.swg >= 22 && w.swg <= 32) passes = pitch_ >= ip_ * 0.98;
        else if (w.swg >= 33 && w.swg <= 45) passes = pitch_ >= ip_;

        if (passes) {
          selectedPipe    = pipe;
          effectiveCoreOD = snapped;
          break;
        }
      }

      if (selectedPipe === null) {
        invalidGeometry = true;
        effectiveCoreOD = 0;
      }

    } else {
      effectiveCoreOD = coreOD;
    }

    /* ---- SAFETY VALIDATION: skip turns/pitch for invalid geometry ---- */
    if (invalidGeometry) {
      results.push({
        swg: w.swg,
        thickness: w.thickness,
        ohm: w.ohm,
        wireLengthMeters: 0,
        turns: 0,
        pitch: 0,
        idealPitch: 2 * w.thickness,
        effectiveCoreOD: 0,
        selectedPipe: null,
        pass: false,
        invalidGeometry: true
      });
      if (!found) continue;  // try a thinner gauge – a different pipe may fit
      else break;
    }

    const wireLengthMeters = finalResistance / w.ohm;
    const wireLengthMM = wireLengthMeters * 1000;

    /* -------- TURNS CALCULATION (USING EFFECTIVE CORE OD) -------- */
    const circumferencePerTurn = Math.PI * effectiveCoreOD;
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
      effectiveCoreOD,
      selectedPipe,
      pass,
      invalidGeometry: false
    });

    if (pass && !found) {
      primaryIndex = results.length - 1;
      found = true;
    } else if (found) {
      break;
    }
  }

  /* ---- All evaluated gauges have invalid geometry → hard stop ---- */
  if (!found && results.length > 0 && results.every(r => r.invalidGeometry)) {
    result.innerHTML =
      "<p style='color:#ef4444'>❌ No valid stock pipe + core combination found for this wattage and geometry</p>";
    return;
  }

  /* =====================================================
     FINAL OUTPUT
  ===================================================== */

  // Resolve display values for the summary
  const primaryResult = primaryIndex >= 0 ? results[primaryIndex] : null;
  const primaryPipe   = (isCoreODAuto && primaryResult) ? primaryResult.selectedPipe : null;

  const displayPipeOD        = primaryPipe ? primaryPipe.od        : pipeOD;
  const displayPipeThickness = primaryPipe ? primaryPipe.thickness : pipeThickness;
  const displayPipeID        = displayPipeOD - 2 * displayPipeThickness;
  const displayCoreOD        = (isCoreODAuto && primaryResult) ? primaryResult.effectiveCoreOD : coreOD;

  result.innerHTML = `
    <div style="margin-top:18px;display:flex;flex-direction:column;gap:18px;">

      <!-- ── GEOMETRY SECTION ── -->
      <div class="info-grid">
        <div class="info-grid-header">GEOMETRY</div>

        <div class="info-label">Material</div>
        <div class="info-value">${(activeMaterial || '–').toUpperCase()}</div>

        <div class="info-label">Heater OD</div>
        <div class="info-value">${heaterOD.toFixed(2)} mm <span class="info-note">(watt density reference)</span></div>

        <div class="info-label">Selected Pipe OD</div>
        <div class="info-value">${displayPipeOD.toFixed(2)} mm
          <span class="info-tag">${isCoreODAuto ? 'Stock' : 'Manual'}</span>
        </div>

        <div class="info-label">Pipe Wall Thickness</div>
        <div class="info-value">${displayPipeThickness.toFixed(2)} mm
          <span class="info-tag">${isCoreODAuto ? 'Stock' : (autoThicknessCheckbox.checked ? 'Auto' : 'Manual')}</span>
        </div>

        <div class="info-label">Pipe ID</div>
        <div class="info-value">${displayPipeID.toFixed(2)} mm <span class="info-note">= Pipe OD − 2 × Wall Thickness</span></div>

        <div class="info-label">Heater Length (Total)</div>
        <div class="info-value">${heaterLength.toFixed(2)} mm</div>

        <div class="info-label">Core Length (Winding Area)</div>
        <div class="info-value">${coreLength.toFixed(2)} mm</div>

        <div class="info-label">Insulation Thickness</div>
        <div class="info-value">${insulationThickness.toFixed(1)} mm × 2 sides <span class="info-note">≥9 W/cm²→2 mm | &lt;8→1.5 mm | 8–9→1.7 mm</span></div>

        <div class="info-label">Core OD (Stock)</div>
        <div class="info-value">${displayCoreOD > 0 ? displayCoreOD.toFixed(2) + ' mm' : '–'}
          ${!isCoreODAuto ? '<span class="info-tag info-tag--warn">Manual Override</span>' : '<span class="info-tag">Standard</span>'}
        </div>
      </div>

      <!-- ── ELECTRICAL SECTION ── -->
      <div class="info-grid">
        <div class="info-grid-header">ELECTRICAL</div>

        <div class="info-label">Surface Area</div>
        <div class="info-value">${surfaceAreaCM2.toFixed(2)} cm²</div>

        <div class="info-label">Watt Density</div>
        <div class="info-value">${wattDensity.toFixed(2)} W/cm²</div>

        <div class="info-label">Base Resistance</div>
        <div class="info-value">${baseResistance.toFixed(2)} Ω</div>

        <div class="info-label">Final Resistance (+${extra}%)</div>
        <div class="info-value">${finalResistance.toFixed(2)} Ω</div>
      </div>

    </div>

    <div class="table-wrapper">
      <table>
        <tr>
          <th>SWG</th>
          <th>Thickness (mm)</th>
          <th>Ω / m</th>
          <th>Wire Length (m)</th>
          ${isCoreODAuto ? '<th>Pipe OD (mm)</th><th>Core OD (mm)</th>' : ''}
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
            <td>${r.invalidGeometry ? '–' : r.wireLengthMeters.toFixed(2)}</td>
            ${isCoreODAuto ? `
              <td style="${r.invalidGeometry ? 'color:#ef4444' : ''}">${r.invalidGeometry || !r.selectedPipe ? '⚠ –' : r.selectedPipe.od.toFixed(1) + ' / ' + r.selectedPipe.thickness.toFixed(1)}</td>
              <td style="${r.invalidGeometry ? 'color:#ef4444;font-weight:bold' : ''}">${r.invalidGeometry ? '⚠ –' : r.effectiveCoreOD.toFixed(2)}</td>
            ` : ''}
            <td>${r.invalidGeometry ? '–' : r.turns.toFixed(0)}</td>
            <td>${r.invalidGeometry ? '–' : r.pitch.toFixed(3)}</td>
            <td>${r.idealPitch.toFixed(3)}</td>
            <td>${r.invalidGeometry ? '<span style="color:#ef4444">⚠ No Stock Fit</span>' : r.pass ? "✓ PASS" : "✗ FAIL"}</td>
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
