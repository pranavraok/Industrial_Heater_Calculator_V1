/* ------------------ GLOBAL STATE ------------------ */
let activeMaterial = null;
let activeTable = null;
let wireData = [];

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

/* ------------------ AUTH ------------------ */
const ADMIN_PASSWORD = "electro123";

/* ------------------ SUPABASE ------------------ */
const supabaseClient = window.supabase.createClient(
  "https://zgwpjwywbnhrwzlucvwe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnd3Bqd3l3Ym5ocnd6bHVjdndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzEyODAsImV4cCI6MjA4Mjk0NzI4MH0.jNlLdo4lAoVVNauhAqY0v_8L_sY_XVdlnsV230BaoAY"
);

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

/* ------------------ NAV ------------------ */
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

/* ------------------ PASSWORD ------------------ */
function openPassword() {
  passwordModal.classList.remove("hidden");
}

function closePassword() {
  passwordModal.classList.add("hidden");
  passError.innerText = "";
}

function checkPassword() {
  if (dbPassword.value === ADMIN_PASSWORD) {
    passwordModal.classList.add("hidden");
    renderDB();
    landing.classList.add("hidden");
    dbEditor.classList.remove("hidden");
  } else {
    passError.innerText = "❌ Wrong password";
  }
}

/* ------------------ DB EDITOR ------------------ */
function renderDB() {
  dbTitle.innerText =
    activeMaterial === "nichrome"
      ? "Edit Nichrome Database"
      : "Edit Kanthal D Database";

  dbTable.innerHTML = `
    <tr>
      <th>ID</th><th>SWG</th><th>Thickness</th><th>Ω/m</th><th>Min W</th><th>Max W</th>
    </tr>
    ${wireData.map(r => `
      <tr data-id="${r.id}">
        <td>${r.id}</td>
        <td contenteditable>${r.swg}</td>
        <td contenteditable>${r.thickness}</td>
        <td contenteditable>${r.ohm}</td>
        <td contenteditable>${r.minw}</td>
        <td contenteditable>${r.maxw}</td>
      </tr>
    `).join("")}
  `;
}

async function saveDatabase() {
  const rows = [...dbTable.rows].slice(1);
  for (const row of rows) {
    await supabaseClient
      .from(activeTable)
      .update({
        swg: +row.cells[1].innerText,
        thickness: +row.cells[2].innerText,
        ohm: +row.cells[3].innerText,
        minw: +row.cells[4].innerText,
        maxw: +row.cells[5].innerText
      })
      .eq("id", row.dataset.id);
  }

  await loadDatabase();
  saveTitle.innerText = "Saved";
  saveMessage.innerText = "Database updated successfully.";
  saveModal.classList.remove("hidden");
}

/* ------------------ CALCULATION ------------------ */
function calculate() {
  const W = +wattage.value;
  const V = +voltage.value;
  const OD = +coreOD.value;
  const L = +coreLength.value;
  const extra = +extraInput.value || 0;

  if (!W || !V || !OD || !L) {
    result.innerHTML = "<p style='color:red'>Fill all inputs</p>";
    return;
  }

  const baseR = (V * V) / W;
  const finalR = baseR * (1 + extra / 100);

  const startIndex = wireData.findIndex(
    w => W >= w.minw && W <= w.maxw
  );

  let rows = [];
  let found = false;
  let primaryIndex = -1;

  for (let i = startIndex; i < wireData.length; i++) {
    const w = wireData[i];

    const wireLenM = finalR / w.ohm;
    const turns = (wireLenM * 1000) / (Math.PI * OD);
    const pitch = L / turns;
    const ideal = 2 * w.thickness;

    let pass = false;
    if (w.swg <= 32) pass = pitch >= ideal * 0.98;
    else pass = pitch >= ideal;

    rows.push({ w, wireLenM, turns, pitch, ideal, pass });

    if (pass && !found) {
      found = true;
      primaryIndex = rows.length - 1;
    } else if (found) break;
  }

  result.innerHTML = `
    <p><b>Final Resistance:</b> ${finalR.toFixed(2)} Ω</p>
    <table>
      <tr>
        <th>SWG</th><th>Pitch</th><th>2×Thickness</th><th>Status</th>
      </tr>
      ${rows.map((r,i)=>`
        <tr class="${i===primaryIndex?'primary':r.pass?'secondary':'fail'}">
          <td>${r.w.swg}</td>
          <td>${r.pitch.toFixed(3)}</td>
          <td>${r.ideal.toFixed(3)}</td>
          <td>${r.pass?'PASS':'FAIL'}</td>
        </tr>
      `).join("")}
    </table>
  `;
}
