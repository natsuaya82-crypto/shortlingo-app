const STORE = (() => {
  const KEY = "shortlingo";

  const defaults = {
    language: "en",
    darkMode: true,
    savedWords: [],
    apiUrl: "",
  };

  function load() {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    } catch {
      return { ...defaults };
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = load();

  return {
    get language() { return state.language; },
    get darkMode() { return state.darkMode; },
    get savedWords() { return state.savedWords; },
    get apiUrl() { return state.apiUrl; },

    setLanguage(v) { state.language = v; save(state); },
    setDarkMode(v) {
      state.darkMode = v;
      save(state);
      document.documentElement.classList.toggle("dark", v);
    },
    setApiUrl(v) { state.apiUrl = v; save(state); },

    upsertWord(word) {
      const idx = state.savedWords.findIndex(w => w.id === word.id);
      if (idx >= 0) state.savedWords[idx] = word;
      else state.savedWords.unshift(word);
      save(state);
    },

    getWordsByLang(lang) {
      return state.savedWords.filter(w => w.language === lang);
    },
  };
})();

document.documentElement.classList.toggle("dark", STORE.darkMode);
