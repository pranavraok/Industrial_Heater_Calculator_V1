const nichromeData = [
  { swg: 22, thickness: 0.711, ohm: 2.760, minW: 1300, maxW: 1599 },
  { swg: 23, thickness: 0.610, ohm: 3.728, minW: 1200, maxW: 1299 },
  { swg: 24, thickness: 0.559, ohm: 4.536, minW: 900, maxW: 1199 },
  { swg: 25, thickness: 0.508, ohm: 5.31, minW: 850, maxW: 1049 },
  { swg: 26, thickness: 0.457, ohm: 6.802, minW: 800, maxW: 899 },
  { swg: 28, thickness: 0.376, ohm: 9.793, minW: 600, maxW: 799 },
  { swg: 30, thickness: 0.305, ohm: 15.744, minW: 400, maxW: 599 },
  { swg: 32, thickness: 0.274, ohm: 18.32, minW: 300, maxW: 399 },
  { swg: 34, thickness: 0.254, ohm: 25.90, minW: 250, maxW: 299 },
  { swg: 35, thickness: 0.213, ohm: 31.596, minW: 225, maxW: 274 },
  { swg: 36, thickness: 0.193, ohm: 36.06, minW: 200, maxW: 249 },
  { swg: 37, thickness: 0.178, ohm: 45.82, minW: 175, maxW: 199 },
  { swg: 38, thickness: 0.152, ohm: 62.88, minW: 150, maxW: 199 },
  { swg: 39, thickness: 0.132, ohm: 78.40, minW: 133, maxW: 174 },
  { swg: 40, thickness: 0.122, ohm: 94.00, minW: 125, maxW: 149 },
  { swg: 40, thickness: 0.122, ohm: 93.20, minW: 113, maxW: 137 },
  { swg: 42, thickness: 0.102, ohm: 132.60, minW: 100, maxW: 124 },
  { swg: 44, thickness: 0.081, ohm: 214.66, minW: 10, maxW: 99 }
];

function calculate() {
  const wattageEl = document.getElementById("wattage");
  const voltageEl = document.getElementById("voltage");
  const coreODEl = document.getElementById("coreOD");
  const coreLengthEl = document.getElementById("coreLength");
  const extraEl = document.getElementById("extra");
  const resultEl = document.getElementById("result");

  const W = Number(wattageEl.value);
  const V = Number(voltageEl.value);
  const coreOD = Number(coreODEl.value);
  const coreLength = Number(coreLengthEl.value);
  let extra = Number(extraEl.value);

  // ---------- BASIC VALIDATION ----------
  if (!W || !V || !coreOD || !coreLength) {
    resultEl.innerHTML = `<p style="color:red">Please fill all required inputs.</p>`;
    return;
  }

  if (isNaN(extra)) extra = 0;

  // ---------- RESISTANCE ----------
  const baseR = (V * V) / W;
  const finalR = baseR * (1 + extra / 100);

  // ---------- FIND STARTING GAUGE ----------
  const startIndex = nichromeData.findIndex(
    w => W >= w.minW && W <= w.maxW
  );

  if (startIndex === -1) {
    resultEl.innerHTML = `<p style="color:red">No suitable starting gauge found.</p>`;
    return;
  }

  let results = [];
  let primaryFound = false;
  let primaryIndex = -1;

  // ---------- ITERATION (STOP EARLY LOGIC) ----------
  for (let i = startIndex; i < nichromeData.length; i++) {
    const w = nichromeData[i];

    const wireLenM = finalR / w.ohm;
    const wireLenMM = wireLenM * 1000;
    const turns = wireLenMM / (Math.PI * coreOD);
    const pitch = coreLength / turns;
    const idealPitch = 2 * w.thickness;

    let status = "FAIL";
    const diff = Math.abs(pitch - idealPitch) / idealPitch * 100;

    // PASS RULES
    if (w.swg <= 36) {
      if (pitch >= idealPitch && diff <= 50) status = "PASS";
    } else {
      if (pitch >= idealPitch) status = "PASS";
    }

    // Always push rows until PRIMARY is found
    if (!primaryFound) {
      results.push({
        swg: w.swg,
        thickness: w.thickness,
        ohm: w.ohm,
        wireLenM,
        turns,
        pitch,
        idealPitch,
        status
      });
    }

    // FIRST PASS → PRIMARY
    if (status === "PASS" && !primaryFound) {
      primaryFound = true;
      primaryIndex = results.length - 1;
      continue;
    }

    // SECONDARY → one more case only, then STOP
    if (primaryFound) {
      results.push({
        swg: w.swg,
        thickness: w.thickness,
        ohm: w.ohm,
        wireLenM,
        turns,
        pitch,
        idealPitch,
        status
      });
      break;
    }
  }

  // ---------- RENDER TABLE ----------
  const rows = results.map((r, i) => {
    let cls = r.status === "PASS" ? "pass" : "fail";
    if (i === primaryIndex) cls = "final";

    return `
      <tr class="${cls}">
        <td>${r.swg}</td>
        <td>${r.thickness}</td>
        <td>${r.ohm}</td>
        <td>${r.wireLenM.toFixed(2)}</td>
        <td>${r.turns.toFixed(0)}</td>
        <td>${r.pitch.toFixed(3)}</td>
        <td>${r.idealPitch.toFixed(3)}</td>
        <td>${r.status}</td>
      </tr>
    `;
  }).join("");

  resultEl.innerHTML = `
    <div class="info">
      Base Resistance: <b>${baseR.toFixed(2)} Ω</b><br>
      Final Resistance (+${extra}%): <b>${finalR.toFixed(2)} Ω</b>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>SWG</th>
            <th>Thickness (mm)</th>
            <th>Ω/m</th>
            <th>Wire Length (m)</th>
            <th>Turns</th>
            <th>Pitch (mm)</th>
            <th>2×Thickness</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}