const User = (() => {
  let initialized = false;

  function init() {
    const page = document.getElementById("page-user");
    if (initialized) return;
    initialized = true;

    page.innerHTML = `
      <div class="user-page">
        <h2 class="user-title">設定</h2>

        <section class="user-section">
          <h3 class="user-section-label">学習言語</h3>
          <div class="lang-buttons">
            <button class="btn-lang ${STORE.language === "en" ? "active" : ""}" data-lang="en">🇺🇸 英語</button>
            <button class="btn-lang ${STORE.language === "ko" ? "active" : ""}" data-lang="ko">🇰🇷 韓国語</button>
          </div>
        </section>

        <section class="user-section">
          <h3 class="user-section-label">表示</h3>
          <div class="user-row" id="darkmode-row">
            <span>ダークモード</span>
            <div class="toggle ${STORE.darkMode ? "on" : ""}" id="darkmode-toggle">
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </section>

        <section class="user-section">
          <h3 class="user-section-label">バックエンドURL</h3>
          <div class="api-url-row">
            <input id="api-url-input" class="search-input" type="url"
              placeholder="https://your-app.onrender.com"
              value="${STORE.apiUrl}" />
            <button id="api-url-save" class="btn-primary">保存</button>
          </div>
          <p class="user-hint">ローカル起動時は空欄でOK</p>
        </section>

        <section class="user-section">
          <h3 class="user-section-label">アカウント</h3>
          <div class="user-row disabled"><span>ログイン</span><span class="user-row-sub">準備中</span></div>
          <div class="user-row disabled"><span>プレミアム</span><span class="user-row-sub">準備中</span></div>
        </section>
      </div>`;

    // 言語切り替え
    page.querySelectorAll(".btn-lang").forEach(btn => {
      btn.addEventListener("click", () => {
        STORE.setLanguage(btn.dataset.lang);
        page.querySelectorAll(".btn-lang").forEach(b => b.classList.toggle("active", b === btn));
      });
    });

    // ダークモード
    page.querySelector("#darkmode-row").addEventListener("click", () => {
      STORE.setDarkMode(!STORE.darkMode);
      page.querySelector("#darkmode-toggle").classList.toggle("on", STORE.darkMode);
    });

    // API URL 保存
    page.querySelector("#api-url-save").addEventListener("click", () => {
      const val = page.querySelector("#api-url-input").value.trim().replace(/\/$/, "");
      STORE.setApiUrl(val);
      const btn = page.querySelector("#api-url-save");
      btn.textContent = "保存済み ✓";
      setTimeout(() => btn.textContent = "保存", 1500);
    });
  }

  return { init };
})();
