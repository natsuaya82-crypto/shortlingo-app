const Search = (() => {
  let initialized = false;

  function renderResult(result) {
    const page = document.getElementById("page-search");
    const body = page.querySelector(".search-results");
    if (!body) return;

    if (!result.groups.length) {
      body.innerHTML = `<p class="no-result">結果が見つかりませんでした</p>`;
      return;
    }

    body.innerHTML = result.groups.map(g => `
      <div class="kwic-group">
        <h3 class="kwic-heading">${g.emoji} ${g.pos}：${g.meaning}</h3>
        ${g.entries.map(e => e.is_generated ? `
          <div class="kwic-entry generated">
            <p class="kwic-text">${e.text}</p>
            <p class="kwic-generated-label">Gemini補完</p>
          </div>` : `
          <div class="kwic-entry">
            <p class="kwic-text">${e.text}</p>
            ${e.text_ja ? `<p class="kwic-ja">${e.text_ja}</p>` : ""}
            ${e.youtube_id ? `<p class="kwic-play">▶ 動画を再生</p>` : ""}
          </div>`
        ).join("")}
      </div>`
    ).join("");

    // 単語保存ボタン
    const saveBtn = page.querySelector("#search-save-word");
    if (saveBtn) {
      saveBtn.dataset.word = result.word;
      saveBtn.classList.remove("hidden");
    }
  }

  async function doSearch(q) {
    const page = document.getElementById("page-search");
    const body = page.querySelector(".search-results");
    const saveBtn = page.querySelector("#search-save-word");
    if (saveBtn) saveBtn.classList.add("hidden");
    body.innerHTML = `<p class="no-result">検索中…</p>`;
    try {
      const result = await API.searchWord(q, STORE.language);
      renderResult(result);
    } catch {
      body.innerHTML = `<p class="no-result">エラーが発生しました</p>`;
    }
  }

  function init() {
    const page = document.getElementById("page-search");
    if (initialized) return;
    initialized = true;

    page.innerHTML = `
      <div class="search-header">
        <form id="search-form" class="search-form">
          <input id="search-input" class="search-input" type="text"
            placeholder="単語を入力 (例: train)" autocomplete="off" />
          <button type="submit" class="btn-primary">検索</button>
        </form>
        <button id="search-save-word" class="btn-save-word hidden">★ この単語を保存</button>
      </div>
      <div class="search-results">
        <p class="no-result">単語を入力して検索</p>
      </div>`;

    page.querySelector("#search-form").addEventListener("submit", e => {
      e.preventDefault();
      const q = page.querySelector("#search-input").value.trim();
      if (q) doSearch(q);
    });

    page.querySelector("#search-save-word").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const word = btn.dataset.word;
      if (!word) return;
      btn.textContent = "保存中…";
      btn.disabled = true;
      try {
        const w = await API.saveWord(word, STORE.language, "");
        const starred = await API.toggleStar(w.id);
        STORE.upsertWord(starred);
        btn.textContent = "★ 保存済み";
      } catch {
        btn.textContent = "エラー";
        btn.disabled = false;
      }
    });
  }

  return { init };
})();
