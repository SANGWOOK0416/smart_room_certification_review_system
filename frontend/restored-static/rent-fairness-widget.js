(function () {
  const API_BASE_URL = "http://127.0.0.1:4000";
  const housingTypes = [
    ["ONE_ROOM", "원룸"],
    ["OFFICETEL", "오피스텔"],
    ["APARTMENT", "아파트"],
    ["ONE_ROOM", "다가구"],
    ["VILLA", "빌라"]
  ];

  let regions = [];
  let mounted = false;
  let floatingMounted = false;
  let selectedRegion;
  let formState = {
    housingType: "ONE_ROOM",
    deposit: "",
    monthlyRent: "",
    exclusiveArea: ""
  };

  function money(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? `${numberValue.toFixed(1)}만원` : "-";
  }

  function areaValue(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? `${numberValue.toFixed(1)}만원/m²` : "-";
  }

  function createStyle() {
    if (document.getElementById("rent-fairness-widget-style")) return;
    const style = document.createElement("style");
    style.id = "rent-fairness-widget-style";
    style.textContent = `
      .rent-fairness-panel{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:22px;background:rgba(15,23,42,.42)}
      .rent-fairness-card{width:min(760px,100%);max-height:88vh;overflow:auto;display:grid;gap:14px;padding:20px;border-radius:18px;background:#fff;border:1px solid #dbe4ef;box-shadow:0 28px 80px rgba(15,23,42,.25)}
      .rent-fairness-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .rent-fairness-header strong{display:block;font-size:22px;color:#17202b}.rent-fairness-header span{display:block;margin-top:4px;color:#64748b;font-weight:800}
      .rent-fairness-close,.rent-fairness-open{height:38px;padding:0 13px;border:0;border-radius:12px;background:#17202b;color:#fff;font-weight:900;cursor:pointer}
      .rent-fairness-floating-open{position:fixed;right:18px;bottom:74px;z-index:60;height:44px;padding:0 16px;border:0;border-radius:999px;background:#1d4ed8;color:#fff;font-weight:900;cursor:pointer;box-shadow:0 18px 32px rgba(29,78,216,.28)}
      .rent-fairness-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rent-fairness-grid label{display:grid;gap:6px;color:#465569;font-size:12px;font-weight:900}
      .rent-fairness-grid input,.rent-fairness-grid select{min-height:42px;padding:0 12px;border:1px solid #d3ddea;border-radius:12px;background:#fff;font:inherit}
      .rent-fairness-code{padding:10px 12px;border-radius:12px;background:#eef4ff;color:#1d4ed8;font-weight:900}
      .rent-fairness-submit{height:44px;border:0;border-radius:14px;background:#1d4ed8;color:#fff;font-weight:900;cursor:pointer}
      .rent-fairness-result{display:grid;gap:10px;padding:14px;border-radius:16px;border:1px solid #dbe4ef;background:#f8fafc}
      .rent-fairness-result.warning{border-color:#f59e0b;background:#fff7ed}.rent-fairness-result.ok{border-color:#22c55e;background:#f0fdf4}
      .rent-fairness-badge{width:fit-content;padding:6px 10px;border-radius:999px;background:#17202b;color:#fff;font-weight:900}
      .rent-fairness-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.rent-fairness-metrics div{padding:10px;border-radius:12px;background:#fff;border:1px solid #e5edf6}.rent-fairness-metrics span{display:block;color:#64748b;font-size:12px;font-weight:900}.rent-fairness-metrics strong{display:block;margin-top:4px;color:#17202b}
      @media(max-width:620px){.rent-fairness-grid,.rent-fairness-metrics{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function flattenRegions() {
    return regions.flatMap((sido) =>
      sido.sigungu.flatMap((sigungu) =>
        sigungu.eupmyeondong.map((dong) => ({
          ...dong,
          sido: sido.sido,
          sigungu: sigungu.name
        }))
      )
    );
  }

  function options(items, selected) {
    return items.map((item) => `<option value="${item}" ${item === selected ? "selected" : ""}>${item}</option>`).join("");
  }

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function rememberForm(form) {
    if (!form) return;
    const formData = new FormData(form);
    formState = {
      housingType: String(formData.get("housingType") || formState.housingType || "ONE_ROOM"),
      deposit: String(formData.get("deposit") || ""),
      monthlyRent: String(formData.get("monthlyRent") || ""),
      exclusiveArea: String(formData.get("exclusiveArea") || "")
    };
  }

  function renderPanel(result, notice) {
    const flat = flattenRegions();
    selectedRegion = selectedRegion || flat.find((region) => region.lawdCode === "47130") || flat[0];
    const sidos = [...new Set(flat.map((region) => region.sido))];
    const sigungus = [...new Set(flat.filter((region) => region.sido === selectedRegion.sido).map((region) => region.sigungu))];
    const dongs = flat.filter((region) => region.sido === selectedRegion.sido && region.sigungu === selectedRegion.sigungu);

    const resultHtml = result
      ? `<section class="rent-fairness-result ${result.isOutlier ? "warning" : "ok"}">
          <span class="rent-fairness-badge">${result.isOutlier ? "시세 경고" : "정상 범위"}</span>
          <strong>${result.message}</strong>
          <div class="rent-fairness-metrics">
            <div><span>환산월세</span><strong>${money(result.convertedMonthlyRent)}</strong></div>
            <div><span>면적당 환산월세</span><strong>${areaValue(result.convertedRentPerArea)}</strong></div>
            <div><span>표본 수</span><strong>${result.sampleCount}건</strong></div>
            <div><span>지역 평균</span><strong>${areaValue(result.stats && result.stats.average)}</strong></div>
            <div><span>중앙값</span><strong>${areaValue(result.stats && result.stats.median)}</strong></div>
            <div><span>상한선</span><strong>${areaValue(result.stats && result.stats.upperBound)}</strong></div>
          </div>
        </section>`
      : notice
        ? `<section class="rent-fairness-result"><strong>${notice}</strong></section>`
        : "";

    return `<section class="rent-fairness-panel">
      <form class="rent-fairness-card" id="rent-fairness-form">
        <div class="rent-fairness-header">
          <div>
            <strong>자취방 월세 안심 계산기</strong>
            <span>같은 법정동과 주택유형 기준으로 보증금, 면적을 보정해 월세 적정성을 판단합니다.</span>
          </div>
          <button class="rent-fairness-close" type="button">닫기</button>
        </div>
        <div class="rent-fairness-grid">
          <label>시/도<select name="sido">${options(sidos, selectedRegion.sido)}</select></label>
          <label>시/군/구<select name="sigungu">${options(sigungus, selectedRegion.sigungu)}</select></label>
          <label>읍/면/동<select name="dong">${dongs.map((dong) => `<option value="${dong.legalDongCode}" ${dong.legalDongCode === selectedRegion.legalDongCode ? "selected" : ""}>${dong.eupmyeondong}</option>`).join("")}</select></label>
          <label>주택유형<select name="housingType">${housingTypes.map(([value, label]) => `<option value="${value}" ${value === formState.housingType ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>보증금(만원)<input name="deposit" inputmode="numeric" placeholder="예: 500" value="${escapeAttribute(formState.deposit)}" required></label>
          <label>월세(만원)<input name="monthlyRent" inputmode="numeric" placeholder="예: 45" value="${escapeAttribute(formState.monthlyRent)}" required></label>
          <label>전용면적(m²)<input name="exclusiveArea" inputmode="decimal" placeholder="예: 18.5" value="${escapeAttribute(formState.exclusiveArea)}" required></label>
          <div class="rent-fairness-code">법정동 코드: ${selectedRegion.legalDongCode}<br>실거래 조회 코드: ${selectedRegion.lawdCode}</div>
        </div>
        <button class="rent-fairness-submit" type="submit">월세 적정성 계산</button>
        ${resultHtml}
      </form>
    </section>`;
  }

  function bindPanel(panel) {
    panel.querySelector(".rent-fairness-close").addEventListener("click", () => panel.remove());
    panel.addEventListener("click", (event) => {
      if (event.target === panel) panel.remove();
    });

    const form = panel.querySelector("#rent-fairness-form");
    const updateRegion = () => {
      const flat = flattenRegions();
      const formData = new FormData(form);
      const sido = String(formData.get("sido") || "");
      const sigungu = String(formData.get("sigungu") || "");
      const dongCode = String(formData.get("dong") || "");
      rememberForm(form);
      selectedRegion =
        flat.find((region) => region.legalDongCode === dongCode) ||
        flat.find((region) => region.sido === sido && region.sigungu === sigungu) ||
        selectedRegion;
      openPanel();
    };

    form.sido.addEventListener("change", () => {
      const flat = flattenRegions();
      rememberForm(form);
      selectedRegion = flat.find((region) => region.sido === form.sido.value) || selectedRegion;
      openPanel();
    });
    form.sigungu.addEventListener("change", () => {
      const flat = flattenRegions();
      rememberForm(form);
      selectedRegion = flat.find((region) => region.sido === form.sido.value && region.sigungu === form.sigungu.value) || selectedRegion;
      openPanel();
    });
    form.dong.addEventListener("change", updateRegion);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      rememberForm(form);
      const payload = {
        lawdCode: selectedRegion.lawdCode,
        legalDongCode: selectedRegion.legalDongCode,
        eupmyeondong: selectedRegion.eupmyeondong,
        housingType: String(formData.get("housingType")),
        deposit: Number(formData.get("deposit")),
        monthlyRent: Number(formData.get("monthlyRent")),
        exclusiveArea: Number(formData.get("exclusiveArea"))
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/rent-fairness/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "계산에 실패했습니다.");
        panel.outerHTML = renderPanel(body);
        bindPanel(document.querySelector(".rent-fairness-panel"));
      } catch (error) {
        panel.outerHTML = renderPanel(null, error instanceof Error ? error.message : "계산 중 오류가 발생했습니다.");
        bindPanel(document.querySelector(".rent-fairness-panel"));
      }
    });
  }

  async function openPanel() {
    createStyle();
    const existing = document.querySelector(".rent-fairness-panel");
    if (existing) existing.remove();
    if (!regions.length) {
      const response = await fetch(`${API_BASE_URL}/api/rent-fairness/regions`);
      regions = await response.json();
    }
    document.body.insertAdjacentHTML("beforeend", renderPanel());
    bindPanel(document.querySelector(".rent-fairness-panel"));
  }

  function mountButton() {
    if (mounted) return;
    const actions = document.querySelector(".session-actions");
    if (!actions) return;
    mounted = true;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rent-fairness-open";
    button.textContent = "월세 계산기";
    button.addEventListener("click", () => openPanel());
    actions.prepend(button);
  }

  const interval = window.setInterval(() => {
    mountButton();
    if (mounted) window.clearInterval(interval);
  }, 500);
})();
