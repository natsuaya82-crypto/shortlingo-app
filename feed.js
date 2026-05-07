const Feed = (() => {
  let videos = [];
  let players = {};       // youtube_id → YT.Player
  let activeId = null;
  let captionTimers = {}; // youtube_id → intervalId
  let ytReady = false;
  let pendingInit = false;

  window.onYouTubeIframeAPIReady = () => {
    ytReady = true;
    if (pendingInit) renderCards();
  };

  // ── 字幕マッチ ──────────────────────────────────────
  function currentCaption(captions, sec) {
    return captions.find(c => sec >= c.start_sec && sec <= c.end_sec) || null;
  }

  // ── スワイプ検出 ─────────────────────────────────────
  function addSwipe(el, onRight) {
    let sx = 0, sy = 0;
    el.addEventListener("touchstart", e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = Math.abs(e.changedTouches[0].clientY - sy);
      if (dx > 60 && dy < 80) onRight();
    }, { passive: true });
  }

  // ── 単語ポップアップ ─────────────────────────────────
  function showWordPopup(word, language, meaning = "") {
    const existing = document.getElementById("word-popup");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "word-popup";
    el.className = "popup-backdrop";
    el.innerHTML = `
      <div class="popup-sheet" id="popup-sheet">
        <div class="popup-handle"></div>
        <p class="popup-word">${word}</p>
        <p class="popup-meaning">${meaning || "（意味を確認中）"}</p>
        <div class="popup-actions">
          <button class="btn-save" id="popup-save">★ 保存</button>
        </div>
      </div>`;

    el.addEventListener("click", e => {
      if (!document.getElementById("popup-sheet").contains(e.target)) el.remove();
    });

    document.getElementById("popup-save").addEventListener("click", async () => {
      const btn = document.getElementById("popup-save");
      btn.textContent = "保存中…";
      btn.disabled = true;
      try {
        const w = await API.saveWord(word, language, meaning);
        const starred = await API.toggleStar(w.id);
        STORE.upsertWord(starred);
        btn.textContent = "★ 保存済み";
      } catch {
        btn.textContent = "エラー";
      }
    });

    document.body.appendChild(el);
  }

  // ── 字幕テキストビュー（歌詞スタイル）────────────────
  function showTextView(captions, language, container) {
    const existing = container.querySelector(".text-view");
    if (existing) { existing.remove(); return; }

    const el = document.createElement("div");
    el.className = "text-view";

    const lines = captions.map(c => {
      const words = c.text.split(/(\s+)/);
      const spans = words.map(part =>
        /\s+/.test(part)
          ? " "
          : `<span class="tappable-word" data-word="${part.replace(/[^a-zA-Z가-힣]/g, "")}">${part}</span>`
      ).join("");
      return `<div class="text-line" data-start="${c.start_sec}" data-end="${c.end_sec}">
        <p class="text-original">${spans}</p>
        ${c.text_ja ? `<p class="text-ja">${c.text_ja}</p>` : ""}
      </div>`;
    }).join("");

    el.innerHTML = `
      <button class="text-view-close">✕</button>
      <h2 class="text-view-title">歌詞・字幕</h2>
      <div class="text-view-body">${lines}</div>`;

    el.querySelector(".text-view-close").addEventListener("click", () => el.remove());

    el.querySelectorAll(".tappable-word").forEach(span => {
      span.addEventListener("click", () => {
        const w = span.dataset.word;
        if (w.length >= 2) showWordPopup(w, language);
      });
    });

    container.appendChild(el);
  }

  // ── カード描画 ───────────────────────────────────────
  function renderCards() {
    const page = document.getElementById("page-feed");
    page.innerHTML = "";

    videos.forEach((video, i) => {
      const card = document.createElement("div");
      card.className = "video-card";
      card.dataset.id = video.youtube_id;

      const playerId = `yt-${video.youtube_id}`;
      const langLabel = video.language === "en" ? "🇺🇸 English" : "🇰🇷 한국어";

      const hasCaptions = video.captions.length > 0;
      card.innerHTML = `
        <div class="video-player"><div id="${playerId}"></div></div>
        <div class="video-tap-overlay"></div>
        <div class="video-lang-badge">${langLabel}</div>
        <div class="caption-strip">
          <div class="caption-row">
            <div class="caption-texts" id="cap-${video.youtube_id}">
              ${!hasCaptions ? '<span class="cap-none">字幕なし</span>' : ''}
            </div>
            ${hasCaptions ? '<button class="btn-lyrics">全文 ↑</button>' : ''}
          </div>
        </div>`;

      page.appendChild(card);

      addSwipe(card, () => showTextView(video.captions, video.language, card));

      // タップで再生/一時停止
      card.querySelector(".video-tap-overlay").addEventListener("click", () => {
        const p = players[video.youtube_id];
        if (!p) return;
        if (p.getPlayerState() === YT.PlayerState.PLAYING) {
          p.pauseVideo();
        } else {
          p.playVideo();
        }
      });

      const lyricsBtn = card.querySelector(".btn-lyrics");
      if (lyricsBtn) {
        lyricsBtn.addEventListener("click", e => {
          e.stopPropagation();
          showTextView(video.captions, video.language, card);
        });
      }

      if (ytReady) {
        players[video.youtube_id] = new YT.Player(playerId, {
          width: "100%",
          height: "100%",
          videoId: video.youtube_id,
          playerVars: {
            autoplay: 0, controls: 0, modestbranding: 1,
            rel: 0, playsinline: 1, loop: 1,
            playlist: video.youtube_id,
            iv_load_policy: 3, fs: 0, disablekb: 1,
          },
          events: {
            onReady: (e) => {
              const iframe = e.target.getIframe();
              iframe.style.cssText =
                "position:absolute;top:0;left:0;width:100%;height:100%;border:none;pointer-events:none;";
              if (video.youtube_id === activeId) e.target.playVideo();
            },
          },
        });
      }
    });

    // IntersectionObserver で再生/停止
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.dataset.id;
        if (entry.isIntersecting) {
          activeId = id;
          players[id]?.playVideo();
          startCaptionSync(id);
          Object.keys(players).forEach(k => {
            if (k !== id) { players[k]?.pauseVideo(); stopCaptionSync(k); }
          });
        }
      });
    }, { threshold: 0.6 });

    page.querySelectorAll(".video-card").forEach(el => observer.observe(el));
  }

  function startCaptionSync(youtubeId) {
    stopCaptionSync(youtubeId);
    const video = videos.find(v => v.youtube_id === youtubeId);
    if (!video || video.captions.length === 0) return;

    captionTimers[youtubeId] = setInterval(() => {
      const player = players[youtubeId];
      if (!player || typeof player.getCurrentTime !== "function") return;
      const sec = player.getCurrentTime();
      const cap = currentCaption(video.captions, sec);

      // キャプションストリップ更新
      const el = document.getElementById(`cap-${youtubeId}`);
      if (el) {
        if (cap) {
          const words = cap.text.split(/(\s+)/);
          const spans = words.map(part =>
            /\s+/.test(part)
              ? " "
              : `<span class="tappable-word" data-word="${part.replace(/[^a-zA-Z가-힣]/g, "")}">${part}</span>`
          ).join("");
          el.innerHTML = `
            <div class="caption-text-line">${spans}</div>
            ${cap.text_ja ? `<div class="caption-ja">${cap.text_ja}</div>` : ""}`;
          el.querySelectorAll(".tappable-word").forEach(span => {
            span.addEventListener("click", () => {
              const w = span.dataset.word;
              if (w.length >= 2) showWordPopup(w, video.language);
            });
          });
        } else {
          el.innerHTML = "";
        }
      }

      // テキストビュー（歌詞表示）のハイライト更新
      const card = document.querySelector(`.video-card[data-id="${youtubeId}"]`);
      const textView = card?.querySelector(".text-view");
      if (textView) {
        let activeEl = null;
        textView.querySelectorAll(".text-line").forEach(line => {
          const s = parseFloat(line.dataset.start);
          const e = parseFloat(line.dataset.end);
          const active = sec >= s && sec <= e;
          line.classList.toggle("text-line-active", active);
          if (active) activeEl = line;
        });
        if (activeEl) {
          const body = textView.querySelector(".text-view-body");
          if (body) {
            const offset = activeEl.offsetTop - body.clientHeight / 2 + activeEl.offsetHeight / 2;
            body.scrollTo({ top: offset, behavior: "smooth" });
          }
        }
      }
    }, 250);
  }

  function stopCaptionSync(youtubeId) {
    if (captionTimers[youtubeId]) {
      clearInterval(captionTimers[youtubeId]);
      delete captionTimers[youtubeId];
    }
  }

  // ── ローディング表示 ─────────────────────────────────
  function showLoading() {
    const page = document.getElementById("page-feed");
    page.innerHTML = `<div class="loading">動画を取得中…</div>`;
  }

  // ── 公開API ──────────────────────────────────────────
  async function init() {
    showLoading();
    try {
      videos = await API.getFeed(STORE.language);
      if (videos.length === 0) {
        document.getElementById("page-feed").innerHTML =
          `<div class="loading">動画を準備中です。30秒後に再読み込みしてください。</div>`;
        return;
      }
      if (ytReady) renderCards();
      else pendingInit = true;
    } catch (e) {
      document.getElementById("page-feed").innerHTML =
        `<div class="loading">取得失敗。バックエンドが起動しているか確認してください。</div>`;
    }
  }

  return { init };
})();
