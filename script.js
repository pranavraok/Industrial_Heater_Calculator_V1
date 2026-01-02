const landing = document.getElementById("landing");
const calculator = document.getElementById("calculator");
const passwordModal = document.getElementById("passwordModal");
const dbEditor = document.getElementById("dbEditor");
const dbPassword = document.getElementById("dbPassword");
const passError = document.getElementById("passError");
const dbTable = document.getElementById("dbTable");
const result = document.getElementById("result");

const wattage = document.getElementById("wattage");
const voltage = document.getElementById("voltage");
const coreOD = document.getElementById("coreOD");
const coreLength = document.getElementById("coreLength");
const extraInput = document.getElementById("extra");

const ADMIN_PASSWORD = "electro123";

const supabaseClient = window.supabase.createClient(
  "https://zgwpjwywbnhrwzlucvwe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnd3Bqd3l3Ym5ocnd6bHVjdndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzEyODAsImV4cCI6MjA4Mjk0NzI4MH0.jNlLdo4lAoVVNauhAqY0v_8L_sY_XVdlnsV230BaoAY"
);

let nichromeData = [];

async function loadDatabase() {
  const { data, error } = await supabaseClient
    .from("nichrome_wires")
    .select("*")
    .order("swg");

  if (error) {
    alert("❌ Failed to load wire database");
    console.error(error);
    return;
  }

  nichromeData = data;
}

loadDatabase();

function openCalculator() {
  landing.classList.add("hidden");
  dbEditor.classList.add("hidden");
  calculator.classList.remove("hidden");
  result.innerHTML = "";
}

function openPassword() {
  passError.textContent = "";
  dbPassword.value = "";
  passwordModal.classList.remove("hidden");
}

function closePassword() {
  passwordModal.classList.add("hidden");
  dbPassword.value = "";
  passError.textContent = "";
}

function checkPassword() {
  if (dbPassword.value === ADMIN_PASSWORD) {
    passwordModal.classList.add("hidden");
    renderDB();
    landing.classList.add("hidden");
    calculator.classList.add("hidden");
    dbEditor.classList.remove("hidden");
  } else {
    passError.textContent = "❌ Wrong password";
  }
}

function backToLanding() {
  calculator.classList.add("hidden");
  dbEditor.classList.add("hidden");
  landing.classList.remove("hidden");
  result.innerHTML = "";
}

// ---------- RENDER DB ----------
function renderDB() {
  dbTable.innerHTML = `
    <tr>
      <th>ID</th>
      <th>SWG</th>
      <th>Thickness</th>
      <th>Ω/m</th>
      <th>Min W</th>
      <th>Max W</th>
    </tr>
    ${nichromeData.map(r => `
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
    const id = row.dataset.id;

    const updateObj = {
      swg: +row.cells[1].innerText,
      thickness: +row.cells[2].innerText,
      ohm: +row.cells[3].innerText,
      minw: +row.cells[4].innerText,
      maxw: +row.cells[5].innerText
    };

    const { error } = await supabaseClient
      .from("nichrome_wires")
      .update(updateObj)
      .eq("id", id);

    if (error) {
      alert("❌ Failed to save database");
      console.error(error);
      return;
    }
  }

  alert("✅ Database saved globally");
  loadDatabase();
}

function calculate() {
  const W = +wattage.value;
  const V = +voltage.value;
  const OD = +coreOD.value;
  const L = +coreLength.value;
  const extra = +extraInput.value || 0;

  if (!W || !V || !OD || !L) {
    result.innerHTML =
      "<p style='color:#ef4444;margin-top:20px'>❌ Fill all required inputs</p>";
    return;
  }

  const baseR = (V * V) / W;
  const finalR = baseR * (1 + extra / 100);

  const startIndex = nichromeData.findIndex(
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

  for (let i = startIndex; i < nichromeData.length; i++) {
    const w = nichromeData[i];

    const wireLenM = finalR / w.ohm;
    const wireLenMM = wireLenM * 1000;
    const turns = wireLenMM / (Math.PI * OD);
    const pitch = L / turns;
    const idealPitch = 2 * w.thickness;

    const diff = Math.abs(pitch - idealPitch) / idealPitch * 100;

    const pass =
      w.swg <= 36
        ? pitch >= idealPitch && diff <= 50
        : pitch >= idealPitch;

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
    } else if (found) break;
  }

  result.innerHTML = `
    <div style="margin-top:15px">
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
            i === primaryIndex ? "primary" : r.pass ? "secondary" : "fail"
          }">
            <td>${r.swg}</td>
            <td>${r.thickness}</td>
            <td>${r.ohm}</td>
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

dbPassword.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    checkPassword();
  }
});
