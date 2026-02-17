/* ------------------ GLOBAL STATE ------------------ */
let activeMaterial = null;
let activeTable = null;
let wireData = [];
const ADMIN_PASSWORD = "change-me";

/* ------------------ PIPE DATA (SS304 ERW) ------------------ */
const pipeOptions = [
  9.5, 10.5, 11, 12.7, 13.5,
  14, 14.5, 15.5, 15.8, 17.5,
  18, 18.5, 18.8, 20, 21.4, 27
];

/* ------------------ DOM ------------------ */
const materialSelect = document.getElementById("materialSelect");
const landing = document.getElementById("landing");
const calculator = document.getElementById("calculator");
const dbEditor = document.getElementById("dbEditor");
const passwordModal = document.getElementById("passwordModal");
const result = document.getElementById("result");

const wattage = document.getElementById("wattage");
const voltage = document.getElementById("voltage");
const coreOD = document.getElementById("coreOD");
const coreLength = document.getElementById("coreLength");
const extraInput = document.getElementById("extra");

const dbPassword = document.getElementById("dbPassword");
const passError = document.getElementById("passError");
const dbTable = document.getElementById("dbTable");
const dbTitle = document.getElementById("dbTitle");
const materialLabel = document.getElementById("materialLabel");

const saveModal = document.getElementById("saveModal");
const saveTitle = document.getElementById("saveTitle");
const saveMessage = document.getElementById("saveMessage");

/* ------------------ SUPABASE ------------------ */
const supabaseClient = window.supabase.createClient(
  "https://zgwpjwywbnhrwzlucvwe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnd3Bqd3l3Ym5ocnd6bHVjdndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzEyODAsImV4cCI6MjA4Mjk0NzI4MH0.jNlLdo4lAoVVNauhAqY0v_8L_sY_XVdlnsV230BaoAY"
);

/* ------------------ INIT PIPE DROPDOWN ------------------ */
pipeOptions.forEach(od => {
  const option = document.createElement("option");
  option.value = od;
  option.textContent = od + " mm";
  coreOD.appendChild(option);
});

/* ------------------ MATERIAL SELECTION ------------------ */
function selectMaterial(type) {
  activeMaterial = type;
  activeTable = type === "nichrome" ? "nichrome_wires" : "kanthal_d_wires";

  materialLabel.innerText =
    type === "nichrome" ? "Material: Nichrome" : "Material: Kanthal D";

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

/* ------------------ DATABASE LOAD ------------------ */
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

async function ensureDatabaseLoaded() {
  if (!activeTable) {
    return false;
  }
  if (!wireData.length) {
    await loadDatabase();
  }
  return wireData.length > 0;
}

function openCalculator() {
  landing.classList.add("hidden");
  dbEditor.classList.add("hidden");
  calculator.classList.remove("hidden");
  result.innerHTML = "";
}

function backToLanding() {
  calculator.classList.add("hidden");
  dbEditor.classList.add("hidden");
  landing.classList.remove("hidden");
}

function openPassword() {
  passError.textContent = "";
  dbPassword.value = "";
  passwordModal.classList.remove("hidden");
}

function closePassword() {
  passwordModal.classList.add("hidden");
}

function showSaveModal(title, message) {
  saveTitle.textContent = title;
  saveMessage.textContent = message;
  saveModal.classList.remove("hidden");
}

function closeSaveModal() {
  saveModal.classList.add("hidden");
}

async function checkPassword() {
  if (!activeMaterial) {
    passError.textContent = "Select a material first.";
    return;
  }

  const entered = dbPassword.value.trim();
  if (entered !== ADMIN_PASSWORD) {
    passError.textContent = "Incorrect password.";
    return;
  }

  passwordModal.classList.add("hidden");
  await ensureDatabaseLoaded();
  openDbEditor();
}

function openDbEditor() {
  landing.classList.add("hidden");
  calculator.classList.add("hidden");
  dbEditor.classList.remove("hidden");
  dbTitle.textContent =
    activeMaterial === "nichrome" ? "Edit Nichrome Database" : "Edit Kanthal D Database";
  renderDbTable();
}

function renderDbTable() {
  if (!wireData.length) {
    dbTable.innerHTML = "<tr><td>No data available.</td></tr>";
    return;
  }

  const header = `
    <tr>
      <th>SWG</th>
      <th>Thickness (mm)</th>
      <th>Ohm / m</th>
      <th>Min W</th>
      <th>Max W</th>
    </tr>
  `;

  const rows = wireData.map(w => `
    <tr data-swg="${w.swg}">
      <td>${w.swg}</td>
      <td><input type="number" step="0.001" data-field="thickness" value="${w.thickness}"></td>
      <td><input type="number" step="0.001" data-field="ohm" value="${w.ohm}"></td>
      <td><input type="number" step="1" data-field="minw" value="${w.minw}"></td>
      <td><input type="number" step="1" data-field="maxw" value="${w.maxw}"></td>
    </tr>
  `).join("");

  dbTable.innerHTML = header + rows;
}

async function saveDatabase() {
  const rows = Array.from(dbTable.querySelectorAll("tr[data-swg]"));
  if (!rows.length) {
    showSaveModal("Nothing to save", "No rows found to update.");
    return;
  }

  const updated = rows.map(row => {
    const getNumber = field => Number(row.querySelector(`input[data-field="${field}"]`).value);
    return {
      swg: Number(row.dataset.swg),
      thickness: getNumber("thickness"),
      ohm: getNumber("ohm"),
      minw: getNumber("minw"),
      maxw: getNumber("maxw")
    };
  });

  const hasInvalid = updated.some(
    w => !Number.isFinite(w.thickness) || !Number.isFinite(w.ohm) || !Number.isFinite(w.minw) || !Number.isFinite(w.maxw)
  );

  if (hasInvalid) {
    showSaveModal("Invalid data", "Please enter valid numeric values for all fields.");
    return;
  }

  const { error } = await supabaseClient
    .from(activeTable)
    .upsert(updated, { onConflict: "swg" });

  if (error) {
    console.error(error);
    showSaveModal("Save failed", "Unable to save changes. Check the console for details.");
    return;
  }

  wireData = updated.slice().sort((a, b) => a.swg - b.swg);
  showSaveModal("Saved", "Database updated successfully.");
}

/* ------------------ CALCULATION ------------------ */
function calculate() {
  const W = +wattage.value;
  const V = +voltage.value;
  const OD = +coreOD.value;
  const L = +coreLength.value;
  const extra = +extraInput.value || 0;

  if (!wireData.length) {
    result.innerHTML =
      "<p style='color:#ef4444;margin-top:20px'>❌ Database not loaded. Select material again.</p>";
    return;
  }

  if (!W || !V || !OD || !L) {
    result.innerHTML =
      "<p style='color:#ef4444;margin-top:20px'>❌ Fill all required inputs</p>";
    return;
  }

  /* -------- WATT DENSITY -------- */
  const circumference = Math.PI * OD;
  const areaMM2 = circumference * L;
  const areaCM2 = areaMM2 / 100;
  const wattDensity = W / areaCM2;

  /* -------- RESISTANCE -------- */
  const baseR = (V * V) / W;
  const finalR = baseR * (1 + extra / 100);

  const startIndex = wireData.findIndex(
    w => W >= w.minw && W <= w.maxw
  );

  if (startIndex === -1) {
    result.innerHTML =
      "<p style='color:#ef4444;margin-top:20px'>❌ No wire found for this wattage range</p>";
    return;
  }

  let results = [];
  let primaryIndex = -1;
  let found = false;

  for (let i = startIndex; i < wireData.length; i++) {
    const w = wireData[i];

    const wireLenM = finalR / w.ohm;
    const wireLenMM = wireLenM * 1000;
    const turns = wireLenMM / (Math.PI * OD);
    const pitch = L / turns;
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
      wireLenM,
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

  result.innerHTML = `
    <div style="margin-top:15px">
      <b>Surface Area:</b> ${areaCM2.toFixed(2)} cm²<br>
      <b>Watt Density:</b> ${wattDensity.toFixed(2)} W/cm²<br><br>
      <b>Base Resistance:</b> ${baseR.toFixed(2)} Ω<br>
      <b>Final Resistance (+${extra}%):</b> ${finalR.toFixed(2)} Ω
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
            <td>${r.wireLenM.toFixed(2)}</td>
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
