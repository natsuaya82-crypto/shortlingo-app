const Study = (() => {
  let mode = "dictionary";
  let cards = [];
  let cardIndex = 0;
  let flipped = false;

  function renderDictionary() {
    const words = STORE.getWordsByLang(STORE.language);
    const body = document.getElementById("study-body");

    if (!words.length) {
      body.innerHTML = `<p class="no-result">保存した単語がありません</p>`;
      return;
    }

    body.innerHTML = `<ul class="word-list">
      ${words.map(w => `
        <li class="word-item" data-id="${w.id}">
          <div class="word-info">
            <p class="word-text">${w.word}</p>
            <p class="word-meaning">${w.meaning_ja}</p>
            <p class="word-meta">動画 ${w.video_count}件</p>
          </div>
          <button class="btn-star ${w.starred ? "starred" : ""}" data-id="${w.id}">★</button>
        </li>`
      ).join("")}
    </ul>`;

    body.querySelectorAll(".btn-star").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id);
        const updated = await API.toggleStar(id);
        STORE.upsertWord(updated);
        btn.classList.toggle("starred", updated.starred);
      });
    });
  }

  function renderCard() {
    const body = document.getElementById("study-body");
    if (!cards.length) {
      body.innerHTML = `<p class="no-result">単語を保存するとカードが使えます</p>`;
      return;
    }

    const card = cards[cardIndex];
    body.innerHTML = `
      <div class="flashcard-wrap">
        <p class="flashcard-counter">${cardIndex + 1} / ${cards.length}</p>
        <div class="flashcard" id="flashcard">
          <div class="flashcard-inner">
            <p class="flashcard-front">${card.word}</p>
            <p class="flashcard-back hidden">${card.meaning_ja}</p>
          </div>
        </div>
        <p class="flashcard-hint">タップで意味を確認</p>
        <div class="flashcard-nav">
          <button id="fc-prev" class="btn-nav">← 前</button>
          <button id="fc-star" class="btn-star ${card.starred ? "starred" : ""}">★</button>
          <button id="fc-next" class="btn-nav">次 →</button>
        </div>
      </div>`;

    document.getElementById("flashcard").addEventListener("click", () => {
      flipped = !flipped;
      document.querySelector(".flashcard-front").classList.toggle("hidden", flipped);
      document.querySelector(".flashcard-back").classList.toggle("hidden", !flipped);
    });

    document.getElementById("fc-prev").addEventListener("click", () => {
      cardIndex = (cardIndex - 1 + cards.length) % cards.length;
      flipped = false;
      renderCard();
    });

    document.getElementById("fc-next").addEventListener("click", () => {
      cardIndex = (cardIndex + 1) % cards.length;
      flipped = false;
      renderCard();
    });

    document.getElementById("fc-star").addEventListener("click", async () => {
      const w = STORE.savedWords.find(w => w.id === card.word_id);
      if (!w) return;
      const updated = await API.toggleStar(w.id);
      STORE.upsertWord(updated);
      cards[cardIndex] = { ...card, starred: updated.starred };
      document.getElementById("fc-star").classList.toggle("starred", updated.starred);
    });
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll(".study-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.mode === m);
    });
    if (m === "dictionary") {
      renderDictionary();
    } else {
      loadCards();
    }
  }

  async function loadCards() {
    const body = document.getElementById("study-body");
    body.innerHTML = `<p class="no-result">読み込み中…</p>`;
    try {
      cards = await API.getFlashCards(STORE.language);
      cardIndex = 0;
      flipped = false;
      renderCard();
    } catch {
      body.innerHTML = `<p class="no-result">エラーが発生しました</p>`;
    }
  }

  function init() {
    const page = document.getElementById("page-study");
    page.innerHTML = `
      <div class="study-tabs">
        <button class="study-tab active" data-mode="dictionary">マイ辞書</button>
        <button class="study-tab" data-mode="cards">単語帳</button>
      </div>
      <div id="study-body" class="study-body"></div>`;

    page.querySelectorAll(".study-tab").forEach(tab => {
      tab.addEventListener("click", () => setMode(tab.dataset.mode));
    });

    renderDictionary();
  }

  return { init };
})();
