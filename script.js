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

const defaultData = [
  { swg:22, thickness:0.711, ohm:2.760, minW:1300, maxW:1599 },
  { swg:23, thickness:0.610, ohm:3.728, minW:1200, maxW:1299 },
  { swg:24, thickness:0.559, ohm:4.536, minW:900, maxW:1199 },
  { swg:25, thickness:0.508, ohm:5.31, minW:850, maxW:1049 },
  { swg:26, thickness:0.457, ohm:6.802, minW:800, maxW:899 },
  { swg:28, thickness:0.376, ohm:9.793, minW:600, maxW:799 },
  { swg:30, thickness:0.305, ohm:15.744, minW:400, maxW:599 },
  { swg:32, thickness:0.274, ohm:18.32, minW:300, maxW:399 },
  { swg:32, thickness:0.274, ohm:18.600, minW:300, maxW:399 },
  { swg:34, thickness:0.234, ohm:25.90, minW:250, maxW:299 },
  { swg:35, thickness:0.213, ohm:31.596, minW:225, maxW:274 },
  { swg:36, thickness:0.193, ohm:36.06, minW:200, maxW:249 },
  { swg:36, thickness:0.193, ohm:37.08, minW:200, maxW:249 },
  { swg:37, thickness:0.173, ohm:45.82, minW:175, maxW:199 },
  { swg:38, thickness:0.152, ohm:62.88, minW:150, maxW:199 },
  { swg:38, thickness:0.152, ohm:59.408, minW:150, maxW:199 },
  { swg:39, thickness:0.132, ohm:78.40, minW:133, maxW:174 },
  { swg:40, thickness:0.122, ohm:93.20, minW:125, maxW:149 },
  { swg:40, thickness:0.122, ohm:94.00, minW:125, maxW:149 },
  { swg:42, thickness:0.102, ohm:132.60, minW:100, maxW:124 },
  { swg:42, thickness:0.102, ohm:139.20, minW:100, maxW:124 },
  { swg:44, thickness:0.081, ohm:214.66, minW:10, maxW:99 },
  { swg:44, thickness:0.081, ohm:219.0, minW:10, maxW:99 }
  
];

let nichromeData = JSON.parse(localStorage.getItem("nichromeDB")) || defaultData;

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

function renderDB() {
  dbTable.innerHTML = `
    <tr>
      <th>SWG</th>
      <th>Thickness</th>
      <th>Ω/m</th>
      <th>Min W</th>
      <th>Max W</th>
    </tr>
    ${nichromeData.map(r => `
      <tr>
        <td contenteditable>${r.swg}</td>
        <td contenteditable>${r.thickness}</td>
        <td contenteditable>${r.ohm}</td>
        <td contenteditable>${r.minW}</td>
        <td contenteditable>${r.maxW}</td>
      </tr>
    `).join("")}
  `;
}

function saveDatabase() {
  const rows = [...dbTable.rows].slice(1);

  nichromeData = rows.map(r => ({
    swg: +r.cells[0].innerText,
    thickness: +r.cells[1].innerText,
    ohm: +r.cells[2].innerText,
    minW: +r.cells[3].innerText,
    maxW: +r.cells[4].innerText
  }));

  localStorage.setItem("nichromeDB", JSON.stringify(nichromeData));
  alert("✅ Database saved permanently");
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
    w => W >= w.minW && W <= w.maxW
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