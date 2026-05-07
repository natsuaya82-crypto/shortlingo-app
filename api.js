const API = (() => {
  function base() {
    const url = STORE.apiUrl;
    return url ? `${url}/api` : "/api";
  }

  async function get(path, params = {}) {
    const url = new URL(base() + path, location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function post(path, body) {
    const r = await fetch(base() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function put(path) {
    const r = await fetch(base() + path, { method: "PUT" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  return {
    getFeed: (lang) => get("/feed", { lang }),
    searchWord: (q, lang) => get("/search", { q, lang }),
    saveWord: (word, language, meaning_ja) => post("/words", { word, language, meaning_ja }),
    getWords: (lang) => get("/words", { lang }),
    toggleStar: (id) => put(`/words/${id}/star`),
    getFlashCards: (lang, include_videos = false) => get("/flashcards", { lang, include_videos }),
  };
})();
