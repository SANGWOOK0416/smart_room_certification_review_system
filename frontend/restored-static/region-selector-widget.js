(function () {
  const API_BASE_URL = "http://127.0.0.1:4000";
  const DEFAULT_LAWD = "47130";
  const CACHE_KEY = "smart-room-region-tree-v1";
  const TEXT = {
    sido: "\uC2DC/\uB3C4",
    sigungu: "\uC2DC/\uAD70/\uAD6C",
    dong: "\uC74D/\uBA74/\uB3D9",
    legalCode: "\uBC95\uC815\uB3D9 \uCF54\uB4DC",
    dealCode: "\uC2E4\uAC70\uB798 \uC870\uD68C \uCF54\uB4DC"
  };

  let regions = [];
  let selected = { sido: "", sigungu: "", legalDongCode: "" };
  let loading = false;
  let mountedAnchor;

  function createStyle() {
    if (document.getElementById("explore-region-widget-style")) return;
    const style = document.createElement("style");
    style.id = "explore-region-widget-style";
    style.textContent = `
      .quick-regions{grid-template-columns:1fr}
      .quick-regions button:not(:first-child){display:none}
      .region-grid{display:none}
      .explore-region-picker{display:grid;gap:10px;padding:12px;border-radius:16px;background:#f8fafc;border:1px solid #e5edf6}
      .explore-region-picker label{display:grid;gap:6px;color:#465569;font-size:12px;font-weight:900}
      .explore-region-picker select{width:100%;min-height:44px;padding:0 12px;border:1px solid #d3ddea;border-radius:14px;background:#fff;font:inherit;font-weight:800;color:#17202b}
      .explore-region-code{padding:10px 12px;border-radius:14px;background:#eef4ff;color:#1d4ed8;font-weight:900;line-height:1.45}
    `;
    document.head.appendChild(style);
  }

  function flattenRegions() {
    return regions.flatMap((sido) =>
      sido.sigungu.flatMap((sigungu) =>
        sigungu.eupmyeondong.map((dong) => ({ ...dong, sido: sido.sido, sigungu: sigungu.name }))
      )
    );
  }

  function unique(items) {
    return [...new Set(items.filter(Boolean))];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function optionHtml(items, current) {
    return items
      .map((item) => `<option value="${escapeHtml(item)}" ${item === current ? "selected" : ""}>${escapeHtml(item)}</option>`)
      .join("");
  }

  function normalizeSelection() {
    const flat = flattenRegions();
    if (!flat.length) return;
    const wise = flat.find((region) => region.lawdCode === DEFAULT_LAWD) || flat[0];

    if (!selected.sido || !flat.some((region) => region.sido === selected.sido)) selected.sido = wise.sido;

    const sigungus = unique(flat.filter((region) => region.sido === selected.sido).map((region) => region.sigungu));
    if (!selected.sigungu || !sigungus.includes(selected.sigungu)) {
      selected.sigungu = sigungus.includes(wise.sigungu) ? wise.sigungu : sigungus[0];
    }

    const dongs = flat.filter((region) => region.sido === selected.sido && region.sigungu === selected.sigungu);
    if (!selected.legalDongCode || !dongs.some((region) => region.legalDongCode === selected.legalDongCode)) {
      selected.legalDongCode = (dongs.find((region) => region.lawdCode === DEFAULT_LAWD) || dongs[0] || wise).legalDongCode;
    }
  }

  function setReactInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyLawdCode(lawdCode) {
    const input = [...document.querySelectorAll("input")].find((item) => item.maxLength === 5);
    if (input) setReactInputValue(input, lawdCode);
  }

  function applyKeyword(region) {
    const keywordInput = [...document.querySelectorAll('input[type="search"], input')].find((item) =>
      String(item.placeholder || "").includes("\uC9C0\uC5ED")
    );
    const keyword = [region?.sigungu, region?.eupmyeondong].filter(Boolean).join(" ");
    if (keywordInput && keyword) setReactInputValue(keywordInput, keyword);
  }

  function applyRegion(region) {
    if (!region) return;
    if (region.lawdCode) applyLawdCode(region.lawdCode);
    applyKeyword(region);
  }

  async function loadRegions() {
    if (regions.length || loading) return;
    try {
      const cached = window.localStorage.getItem(CACHE_KEY);
      if (cached) {
        regions = JSON.parse(cached);
        if (Array.isArray(regions) && regions.length) return;
      }
    } catch {
      regions = [];
    }
    loading = true;
    try {
      const response = await fetch(`${API_BASE_URL}/api/rent-fairness/regions`);
      regions = await response.json();
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(regions));
      } catch {}
    } finally {
      loading = false;
    }
  }

  function renderPicker(anchor) {
    normalizeSelection();
    const flat = flattenRegions();
    if (!flat.length) return;

    const sidos = unique(flat.map((region) => region.sido));
    const sigungus = unique(flat.filter((region) => region.sido === selected.sido).map((region) => region.sigungu));
    const dongs = flat.filter((region) => region.sido === selected.sido && region.sigungu === selected.sigungu);
    const selectedDong = dongs.find((region) => region.legalDongCode === selected.legalDongCode) || dongs[0];

    let picker = document.querySelector(".explore-region-picker");
    if (!picker) {
      picker = document.createElement("div");
      picker.className = "explore-region-picker";
      anchor.insertAdjacentElement("afterend", picker);
    }

    picker.innerHTML = `
      <label>${TEXT.sido}<select data-region-field="sido">${optionHtml(sidos, selected.sido)}</select></label>
      <label>${TEXT.sigungu}<select data-region-field="sigungu">${optionHtml(sigungus, selected.sigungu)}</select></label>
      <label>${TEXT.dong}<select data-region-field="dong">${dongs.map((dong) => `<option value="${escapeHtml(dong.legalDongCode)}" ${dong.legalDongCode === selected.legalDongCode ? "selected" : ""}>${escapeHtml(dong.eupmyeondong)}</option>`).join("")}</select></label>
      <div class="explore-region-code">${TEXT.legalCode}: ${escapeHtml(selectedDong?.legalDongCode ?? "-")}<br>${TEXT.dealCode}: ${escapeHtml(selectedDong?.lawdCode ?? "-")}</div>
    `;

    picker.querySelector('[data-region-field="sido"]').addEventListener("change", (event) => {
      selected = { sido: event.target.value, sigungu: "", legalDongCode: "" };
      renderPicker(anchor);
      const dong = flattenRegions().find((region) => region.legalDongCode === selected.legalDongCode);
      applyRegion(dong);
    });
    picker.querySelector('[data-region-field="sigungu"]').addEventListener("change", (event) => {
      selected = { ...selected, sigungu: event.target.value, legalDongCode: "" };
      renderPicker(anchor);
      const dong = flattenRegions().find((region) => region.legalDongCode === selected.legalDongCode);
      applyRegion(dong);
    });
    picker.querySelector('[data-region-field="dong"]').addEventListener("change", (event) => {
      selected = { ...selected, legalDongCode: event.target.value };
      normalizeSelection();
      const dong = flattenRegions().find((region) => region.legalDongCode === selected.legalDongCode);
      applyRegion(dong);
      renderPicker(anchor);
    });
  }

  async function mount() {
    createStyle();
    const quickRegions = document.querySelector(".quick-regions");
    if (!quickRegions) return;
    if (mountedAnchor === quickRegions && document.querySelector(".explore-region-picker")) return;
    mountedAnchor = quickRegions;
    await loadRegions();
    renderPicker(quickRegions);
  }

  const observer = new MutationObserver(() => mount());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(mount, 800);
  mount();
})();
