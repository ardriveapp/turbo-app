const CU_ENDPOINT = "https://cu.ardrive.io/dry-run?process-id=qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE";
const COINGECKO_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=ar-io-network&vs_currencies=usd";

const YEAR_KEYS = [1, 2, 3, 4, 5];
let globalFees = {};
let globalDemandFactor = 1;
let globalUSD = 0;

function isValidArnsName(name) {
    const forbidden = ["www"]; // You can expand this list if more reserved names are added
    if (forbidden.includes(name)) return false;
    if (name.length < 1 || name.length > 51) return false;
    if (name.length === 1 && name.includes("-")) return false;
    if (name.startsWith("-") || name.endsWith("-")) return false;
    return /^[a-z0-9-]+$/.test(name);
  }
  

async function fetchArioPriceUSD() {
  const res = await fetch(COINGECKO_ENDPOINT);
  const data = await res.json();
  return data["ar-io-network"].usd;
}

async function fetchCUMessage(action) {
  const res = await fetch(CU_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Id: "1234",
      Target: "qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE",
      Owner: "1234",
      Anchor: "0",
      Data: "1234",
      Tags: [
        { name: "Action", value: action },
        { name: "Data-Protocol", value: "ao" },
        { name: "Type", value: "Message" },
        { name: "Variant", value: "ao.TN.1" },
      ],
    }),
  });
  const json = await res.json();
  return json.Messages?.[0]?.Data;
}

const availabilityBtn = document.getElementById("check-availability-btn");
availabilityBtn.addEventListener("click", checkAvailability);

async function checkAvailability() {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  results.classList.add("loading");
  const name = input.value.trim().toLowerCase();

  if (!isValidArnsName(name)) {
    results.innerHTML = `<p class="error">Invalid name format.</p>`;
    return;
  }

  results.innerHTML = `Checking availability...`;

  try {
    const res = await fetch(CU_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Id: "1234",
        Target: "qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE",
        Owner: "1234",
        Anchor: "0",
        Data: "1234",
        Tags: [
          { name: "Action", value: "Record" },
          { name: "Name", value: name },
          { name: "Data-Protocol", value: "ao" },
          { name: "Type", value: "Message" },
          { name: "Variant", value: "ao.TN.1" },
        ],
      }),
    });

    const data = await res.json();
    const record = data?.Messages?.[0]?.Data;

    if (record !== 'null') {
        results.classList.remove("loading");
      const recordData = typeof record === "string" ? JSON.parse(record) : record;
      const details = `
        <p><strong>🚫 ${name} is already registered.</strong></p>
        <ul>
          <li><strong>Type:</strong> ${recordData.type}</li>
          <li><strong>Start:</strong> ${new Date(recordData.startTimestamp).toLocaleString()}</li>
          <li><strong>Process ID:</strong><a href=https://ao.link/#/entity/${recordData.processId} target="_blank"> ${recordData.processId}</a></li>
          <li><strong>Undername Limit:</strong> ${recordData.undernameLimit}</li>
          <li><string><a href=https://arns.ar.io/#/manage/names/${name} target="_blank">More info</a></li>
        </ul>
      `;
      results.innerHTML = details;
    } else {
        results.classList.remove("loading");
      const length = name.length > 12 ? "13+" : name.length;
      const fee = globalFees[name.length] || globalFees["13"];
      const lease = fee.lease;
      const permabuy = fee.permabuy;

      const renewal = lease[2] - lease[1];
      const cells = [...YEAR_KEYS.map((yr) => lease[yr]), renewal, permabuy].map(f =>
        formatFeeCell(f, globalUSD, globalDemandFactor)
      );


      results.innerHTML = `
        <p><strong>✅ ${name} is available for purchase!</strong></p>
        <ul>
          <li>1 Year: ${cells[0]}</li>
          <li>2 Years: ${cells[1]}</li>
          <li>3 Years: ${cells[2]}</li>
          <li>4 Years: ${cells[3]}</li>
          <li>5 Years: ${cells[4]}</li>
          <li>Yearly Renewal: ${cells[5]}</li>
          <li>Permabuy: ${cells[6]}</li>
        </ul>
        <p><a href="https://arns.ar.io/#/register/${name}" target="_blank">Register ${name} →</a></p>
      `;
    }
  } catch (err) {
    console.error(err);
    results.classList.remove("loading");
    results.innerHTML = `<p class="error">Error checking name availability.</p>`;
  }
}

async function loadPrices() {
  try {
    document.getElementById("spinner").style.display = "block";
    const [priceUSD, feesRaw, demandRaw] = await Promise.all([
      fetchArioPriceUSD(),
      fetchCUMessage("Registration-Fees"),
      fetchCUMessage("Demand-Factor"),
    ]);

    globalDemandFactor = parseFloat(demandRaw);
    globalFees = JSON.parse(feesRaw);
    globalUSD = priceUSD;

    const table = document.getElementById("price-table-body");
    const arioUsdEl = document.getElementById("ario-usd");
    arioUsdEl.innerHTML = `$ARIO ≈ $${priceUSD.toFixed(4)} <a href="https://www.coingecko.com/en/coins/ar-io-network" target="_blank" rel="noopener noreferrer"><img src="external-link.svg" alt="Coingecko" height="14" /></a>`;
    document.getElementById("demand-factor").innerText = `Demand Factor: ${globalDemandFactor.toFixed(6)}`;

    const sortedKeys = Object.keys(globalFees)
      .map(Number)
      .sort((a, b) => a - b);

      let seenLongForm = false;

      for (const key of sortedKeys) {
        if (key > 12) {
          if (seenLongForm) continue;
          seenLongForm = true;
        }
      
        const label = key > 12 ? "13+" : key;
        const lease = globalFees[key].lease;
        const permabuy = globalFees[key].permabuy;
        const row = document.createElement("tr");
      
        const prices = [...YEAR_KEYS.map((yr) => lease[yr.toString()]), permabuy];
        const cells = prices.map((fee) => formatFeeCell(fee, priceUSD, globalDemandFactor));
      
        const labels = ["Characters", "1 Year", "2 Years", "3 Years", "4 Years", "5 Years", "Yearly Renewal", "Permabuy"];
const renewal = lease[2] - lease[1];
const extendedPrices = [...YEAR_KEYS.map((yr) => lease[yr.toString()]), renewal, permabuy];
const extendedCells = extendedPrices.map((fee) => formatFeeCell(fee, priceUSD, globalDemandFactor));
row.innerHTML = `<td data-label="${labels[0]}">${label}</td>` + extendedCells.map((c, i) => `<td data-label="${labels[i + 1]}">${c}</td>`).join("");

        table.appendChild(row);
      }

    setupSearch();
    document.getElementById("spinner").style.display = "none";
  } catch (err) {
    console.error("Failed to load ArNS prices:", err);
    document.getElementById("ario-usd").innerText = `<span class="error">Error loading prices.</span.`;
    document.getElementById("spinner").style.display = "none";
  }
}

function formatFeeCell(mario, usdRate, demandFactor) {
  const ario = mario / 1e6 * demandFactor;
  const usd = ario * usdRate;
  return `${ario.toFixed(2)} ARIO ($${usd.toFixed(2)})`;
}

function setupSearch() {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const clearBtn = document.getElementById("clear-btn");

  input.addEventListener("input", () => {
    const value = input.value.trim();
    clearBtn.style.display = value ? "block" : "none";
    if (!value) return (results.innerHTML = "");

    if (!isValidArnsName(value)) {
        results.innerHTML = `<span class="error">Invalid name. Only lowercase letters, numbers, and dashes allowed. Dashes can't be at the start/end or used alone.</span>`;
        return;
      }
      

    const len = value.length;
    const feeEntry = globalFees[len];
    if (!feeEntry) return (results.innerHTML = `<p>No pricing available for ${len}-char names.</p>`);

    const lease = feeEntry.lease;
    const permabuy = feeEntry.permabuy;
    const renewal = lease[2] - lease[1];
const prices = YEAR_KEYS.map((yr) => `<li>${yr} Year: ${formatFeeCell(lease[yr.toString()], globalUSD, globalDemandFactor)}</li>`)  
  .concat(`<li>Yearly Renewal: ${formatFeeCell(renewal, globalUSD, globalDemandFactor)}</li>`)
  .concat(`<li>Permabuy: ${formatFeeCell(permabuy, globalUSD, globalDemandFactor)}</li>`)  
  .join("");

    results.innerHTML = `
      <p>Prices for "<strong>${value}</strong>" (${len} characters):</p>
      <ul style="list-style: none; padding: 0; margin-top: 0.5rem;">${prices}</ul>
    `;
  });
  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    results.innerHTML = "";
    input.focus();
  });
}

window.addEventListener("DOMContentLoaded", loadPrices);
