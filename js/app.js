window.GameApp = {
  state: {
    hp: 100,
    gold: 20,
    inventory: ["кинжал", "хлеб"],
    statuses: [],
    day: 1,
    dayLabel: "день 1",
    chapter: { number: 1, title: "Глава I: Начало пути" },
    history: [], // полная история (для журнала и отладки)
    recentWindow: [], // последние ходы — уходят модели дословно
    anchorSummary: "", // сжатая память о прошлом
    compressionCount: 0, // сколько раз сжимали
    journal: [],
    npcs: {},
    companions: [],
    world: "dark-fantasy",
    mood: "grim",
    heroName: "Безымянный",
    heroCard: null,
    gameStarted: false,
    startSeed: null,
    usedPhrases: [],
    imageLimitReached: false,
    imageFailures: {},
    waitingForRateLimit: false,
  },

  // ============ Константы сжатия ============
  MAX_RECENT: 10, // сколько ходов хранить дословно
  COMPRESS_TRIGGER: 14, // при каком размере окна запускать сжатие
  MAX_ANCHOR_LENGTH: 2500, // максимум символов в анкерном резюме

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  buildStartSeed() {
    var times = [
      "глубокий предрассветный сумрак",
      "рассвет, когда мир серый и мокрый",
      "утро после дождя",
      "полдень, солнце в зените",
      "жаркий день перед грозой",
      "предзакатный час, длинные тени",
      "сумерки, когда зажигают огни",
      "первая звезда",
      "глубокая ночь, все спят",
      "час волка, когда не спит никто",
    ];
    var weather = [
      "сухой туман, пахнет гарью",
      "мелкий дождь, всё блестит",
      "безветрие, слышно каждый шорох",
      "резкий ветер с севера",
      "мокрая духота, тучи давят",
      "ясное небо, но холодно",
      "град только прошёл, на земле лёд",
      "пыльная мгла, солнце как медяк",
      "роса на траве, мир ещё не проснулся",
      "безмолвие, ни зверя, ни птицы",
    ];
    var contexts = [
      "караван остановился на перепутье",
      "праздник закончился, все расходятся",
      "люди собираются у колодца",
      "торговый день подходит к концу",
      "кто-то играет на дудке, толпа слушает",
      "пристань принимает последнюю лодку",
      "ворота вот-вот закроют на ночь",
      "кто-то читает указ вслух",
      "дети играют на площади",
      "процессия идёт к храму",
      "двое дерутся, толпа смотрит",
      "женщина ищет пропавшего сына",
      "старик рассказывает небылицу за монету",
      "шум, будто обвалилась стена",
      "погоня — кто-то бежит по улице",
      "все вдруг замолчали и смотрят в одну сторону",
    ];
    var people = [
      "двое спорят, третий молчит",
      "старик зовёт тебя по имени, хотя ты его не знаешь",
      "девочка протягивает тебе что-то",
      "стражник проверяет бумаги",
      "женщина в чёрном смотрит не мигая",
      "купец машет рукой, будто ждал",
      "монах читает по слогам",
      "пьяный хохочет слишком громко",
      "чужеземец говорит на чужом языке",
      "кто-то роняет монету и нагибается",
      "двое шепчутся, глядя на тебя",
      "ребёнок плачет, никто не подходит",
      "слепой на паперти вдруг поворачивает голову в твою сторону",
      "женщина с корзиной спрашивает дорогу",
      "мальчишка-подмастерье зовёт на помощь",
    ];
    var tone = [
      "странное известие, которое всё меняет",
      "тихое наблюдение, трещина в обычном дне",
      "случайная встреча с тем, кого ты не ждал",
      "неожиданное предложение, от которого трудно отказаться",
      "тревожное ожидание чего-то неминуемого",
      "обычный день, в котором что-то не так",
      "мелкая просьба, за которой прячется большое дело",
      "незнакомая дорога сама зовёт за собой",
      "чужая беда, к которой тебя тянет",
      "обещание, данное когда-то, всплывает в памяти",
    ];
    var role = [
      "случайный свидетель — ты просто оказался рядом",
      "новоприбывший, тебя никто не знает",
      "местный, но не свой — все тебя помнят, но не доверяют",
      "гость по приглашению, сам не знаешь чьему",
      "человек с поручением, которое не помнишь от кого",
      "путник, который решил задержаться на день",
      "работник, которого наняли ещё вчера",
      "родственник, которого давно не видели",
      "должник, о котором все забыли, кроме одного",
      "наёмник без заказа, пока без дела",
      "молодой, но уже с чужой тайной за пазухой",
      "возвращающийся домой после долгого отсутствия",
    ];
    var place = [
      "небольшое торговое поселение на тракте",
      "деревня в предгорьях, где добывают камень",
      "рыболовецкая слобода у залива",
      "монастырь, окружённый виноградниками",
      "застава на границе двух королевств",
      "переправа через большую реку",
      "шахтёрский лагерь у подножия холма",
      "усадьба обедневшего рыцаря",
      "портовый городок с чужеземными кораблями",
      "ярмарочная площадь перед большим праздником",
      "пивоварня и мельница у ручья",
      "приют у дороги для уставших путников",
      "городок ремесленников — кузнецы, гончары, ткачи",
      "пограничный трактир, где встречаются чужие",
      "крепость барона, но не внутри — у стен",
      "старый мост, у которого всегда кто-то есть",
      "горный перевал с маленькой часовней",
      "хутор в степи, где никто не живёт постоянно",
      "лесопильня и деревня вокруг неё",
      "соляная варница у моря",
    ];

    var roll = Math.floor(Math.random() * 1000000);
    return [
      "seed=" + roll,
      "время: " + this.pick(times),
      "погода: " + this.pick(weather),
      "контекст: " + this.pick(contexts),
      "люди: " + this.pick(people),
      "тон завязки: " + this.pick(tone),
      "роль героя: " + this.pick(role),
      "тип места: " + this.pick(place),
    ].join("\n");
  },

  init() {
    updateHUD(this.state);
    document.getElementById("btn-start").onclick = () => this.startPrologue();
    document.getElementById("btn-enter").onclick = () => this.enterGame();
    document.getElementById("btn-send").onclick = () => this.sendCustom();
    document.getElementById("custom-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.sendCustom();
    });
    document.getElementById("btn-journal").onclick = () => this.toggleJournal();
    document.getElementById("btn-journal-close").onclick = () =>
      this.closeJournal();
    document.getElementById("journal-overlay").onclick = (e) => {
      if (e.target.id === "journal-overlay") this.closeJournal();
    };
    document.getElementById("btn-restart").onclick = () => this.restart();
    document.getElementById("btn-new-game").onclick = () => location.reload();
    document.getElementById("btn-same-world").onclick = () =>
      this.restart(true);
  },

  // ============ Антиповтор ============
  addUsedPhrases(text) {
    if (!text) return;
    var sentences = String(text).split(/[.!?]\s+/);
    var phrases = [];
    sentences.forEach(function (s) {
      var words = s.trim().split(/\s+/);
      if (words.length >= 3 && words.length <= 8) {
        phrases.push(words.join(" "));
      }
    });
    this.state.usedPhrases = (this.state.usedPhrases || [])
      .concat(phrases)
      .slice(-30);
  },

  buildAvoidPhrases() {
    if (!this.state.usedPhrases || !this.state.usedPhrases.length) return "";
    var uniq = [];
    var seen = {};
    for (
      var i = this.state.usedPhrases.length - 1;
      i >= 0 && uniq.length < 20;
      i--
    ) {
      var p = this.state.usedPhrases[i];
      if (!seen[p]) {
        seen[p] = 1;
        uniq.push(p);
      }
    }
    return uniq
      .map(function (p) {
        return "- " + p;
      })
      .join("\n");
  },

  // ============ Ремонт JSON ============
  tryParseJson(rawText) {
    let s = String(rawText || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(s);
    } catch (e1) {}

    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(s);
      } catch (e2) {}
    }

    let fixed = s
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([}\]"\d])\s*\n\s*"/g, '$1,"')
      .replace(/([}\]"\d])\s+"/g, '$1,"');

    try {
      return JSON.parse(fixed);
    } catch (e3) {}

    try {
      let inString = false;
      let escaped = "";
      for (let i = 0; i < fixed.length; i++) {
        const ch = fixed[i];
        const prev = fixed[i - 1];
        if (ch === '"' && prev !== "\\") inString = !inString;
        if (inString && (ch === "\n" || ch === "\r")) {
          escaped += "\\n";
        } else {
          escaped += ch;
        }
      }
      return JSON.parse(escaped);
    } catch (e4) {}

    try {
      const cleaned = fixed.replace(/[\u0000-\u001F\u007F-\u009F]+/g, " ");
      return JSON.parse(cleaned);
    } catch (e5) {}

    try {
      fixed = fixed
        .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ': "$1"');
      return JSON.parse(fixed);
    } catch (e6) {
      console.error("JSON repair failed:", e6);
      return null;
    }
  },

  buildWorldState() {
    var lines = [];
    lines.push("Текущая глава: " + this.state.chapter.title);
    if (this.state.companions.length) {
      lines.push("Спутники: " + this.state.companions.join(", "));
    } else {
      lines.push("Спутников нет.");
    }
    if (this.state.heroCard) {
      lines.push(
        "Герой: " +
          (this.state.heroName || "безымянный") +
          (this.state.heroCard.age
            ? " | возраст: " + this.state.heroCard.age
            : "") +
          (this.state.heroCard.trait
            ? " | черта: " + this.state.heroCard.trait
            : "") +
          (this.state.heroCard.weakness
            ? " | слабость: " + this.state.heroCard.weakness
            : ""),
      );
    }
    var npcNames = Object.keys(this.state.npcs);
    if (npcNames.length) {
      lines.push("Известные NPC (ВНУТРЕННИЕ ДАННЫЕ):");
      npcNames.forEach((name) => {
        var n = this.state.npcs[name];
        lines.push(
          "- " +
            n.name +
            " (" +
            n.role +
            ", " +
            n.attitude +
            "): " +
            (n.relation || "") +
            " | цель: " +
            (n.goal || "") +
            (n.history ? " | история: " + n.history : "") +
            (n.description ? " | внешность: " + n.description : ""),
        );
      });
    } else {
      lines.push("Известных NPC пока нет.");
    }
    return lines.join("\n");
  },

  // ============ Сжатие истории ============
  async compressHistory() {
    if (this.state.recentWindow.length <= this.COMPRESS_TRIGGER) return;

    // Берём ходы, выпадающие из окна
    const toCompress = this.state.recentWindow.slice(0, -this.MAX_RECENT);
    const keep = this.state.recentWindow.slice(-this.MAX_RECENT);

    if (toCompress.length === 0) return;

    // Строим фрагмент для сжатия
    const fragment = toCompress
      .map((m) => {
        const role = m.role === "user" ? "Игрок" : "Мир";
        return role + ": " + m.content.slice(0, 500);
      })
      .join("\n\n");

    showLoader("Летописец подводит итоги");
    try {
      const res = await sendSummarizeRequest(
        fragment,
        this.state.anchorSummary,
      );
      const newSummary = res.summary || "";

      if (newSummary) {
        this.state.anchorSummary = this.state.anchorSummary
          ? this.state.anchorSummary + "\n\n" + newSummary
          : newSummary;

        if (this.state.anchorSummary.length > this.MAX_ANCHOR_LENGTH) {
          this.state.anchorSummary =
            "...(ранее)... " +
            this.state.anchorSummary.slice(-(this.MAX_ANCHOR_LENGTH - 100));
        }

        this.state.recentWindow = keep;
        this.state.compressionCount++;
        console.log(
          "[COMPRESS] #" +
            this.state.compressionCount +
            ", window=" +
            keep.length +
            ", anchor=" +
            this.state.anchorSummary.length +
            " chars",
        );
      } else {
        console.warn("Compression returned empty summary");
      }
    } catch (e) {
      console.warn("Compression failed:", e);
      // Если RATE_LIMIT — просто уменьшаем окно без резюме
      if (e && e.code === "RATE_LIMIT") {
        this.state.recentWindow = keep;
        console.warn("Rate limit — обрезали окно без сжатия");
      }
    } finally {
      hideLoader();
    }
  },

  async startPrologue() {
    const name =
      document.getElementById("input-name").value.trim() || "Безымянный";
    this.state.heroName = name;
    this.state.world = document.getElementById("select-world").value;
    this.state.mood = document.getElementById("select-mood").value;

    const worldLabels = {
      "dark-fantasy": "мрачное средневековье",
      "high-fantasy": "высокое фэнтези",
      northern: "северные саги",
      eastern: "восточные земли",
    };
    const moodLabels = {
      grim: "жестокое и мрачное",
      heroic: "героическое",
      mystery: "таинственное",
      realistic: "исторически реалистичное",
    };

    document.getElementById("prologue-title").textContent = "Пролог";
    document.getElementById("prologue-text").textContent =
      name +
      ", ты стоишь на пороге своего пути. Мир: " +
      worldLabels[this.state.world] +
      ". " +
      "Настроение истории: " +
      moodLabels[this.state.mood] +
      ".";
    document.querySelector("#prologue-goal .goal-text").textContent =
      "Выжить. Стать легендой. Или сгинуть в безвестности.";

    document.getElementById("prologue-hero-card-slot").innerHTML = "";
    document.getElementById("btn-enter").disabled = true;
    showScreen("prologue");

    await this.generateHeroCard();
  },

  async generateHeroCard() {
    if (this.state.heroCard) {
      renderHeroCardInPrologue(this.state.heroCard);
      document.getElementById("btn-enter").disabled = false;
      return;
    }

    showPrologueLoader();
    const instruction =
      "Сгенерируй ТОЛЬКО hero_card для героя по имени " +
      this.state.heroName +
      ". Сеттинг: " +
      this.state.world +
      ". Настроение: " +
      this.state.mood +
      ". " +
      'Не начинай сцену, не давай вариантов. Верни JSON с полем "hero_card" и пустыми остальными полями. ' +
      "Поля hero_card: name, age, origin, trait, skill, weakness, pockets (массив из 3-5 объектов {icon, label}). " +
      "БЕЗ поля role. narrative: пустая строка. divider: пустая строка. scene_title: пустая строка. " +
      "chapter_update: null. npc_cards: []. npc_updates: []. npc_removed: []. npc_lines: []. " +
      "choices: []. stats_update: { hp: 0, gold: 0, inventory_add: [], inventory_remove: [], statuses: [], day: 1 }. " +
      "effects: []. image_prompt: пустая строка. is_final: false. final: null.";

    try {
      // hero_card требует больше токенов — передаём maxTokens: 1500
      const res = await sendTextRequest(
        [],
        instruction,
        "",
        "openai/gpt-oss-120b",
        "",
        "",
        "",
        1500,
      );
      hidePrologueLoader();
      const data = this.tryParseJson(res.text);

      if (data && data.hero_card) {
        this.state.heroCard = data.hero_card;
        renderHeroCardInPrologue(this.state.heroCard);
      } else {
        this.state.heroCard = {
          name: this.state.heroName,
          age: "в расцвете сил",
          origin: "скиталец без прошлого",
          trait: "недоверчив, но честен",
          skill: "замечает то, что другим не видно",
          weakness: "не выносит замкнутых пространств",
          pockets: [
            { icon: "🪙", label: "Монета с щербинкой" },
            { icon: "🔥", label: "Кремень и огниво" },
            { icon: "🧵", label: "Моток суровой нити" },
          ],
        };
        renderHeroCardInPrologue(this.state.heroCard);
      }
      document.getElementById("btn-enter").disabled = false;
    } catch (err) {
      hidePrologueLoader();
      console.warn("Hero card fetch failed, using fallback", err);
      this.state.heroCard = {
        name: this.state.heroName,
        age: "в расцвете сил",
        origin: "скиталец без прошлого",
        trait: "недоверчив, но честен",
        skill: "замечает то, что другим не видно",
        weakness: "не выносит замкнутых пространств",
        pockets: [
          { icon: "🪙", label: "Монета с щербинкой" },
          { icon: "🔥", label: "Кремень и огниво" },
          { icon: "🧵", label: "Моток суровой нити" },
        ],
      };
      renderHeroCardInPrologue(this.state.heroCard);
      document.getElementById("btn-enter").disabled = false;
    }
  },

  enterGame() {
    showScreen("game");
    this.startGame();
  },

  async startGame() {
    if (this.state.gameStarted) return;
    this.state.gameStarted = true;

    if (typeof _npcLineCache !== "undefined") _npcLineCache.clear();
    this.state.usedPhrases = [];
    this.state.startSeed = this.buildStartSeed();
    this.state.imageFailures = {};
    this.state.recentWindow = [];
    this.state.anchorSummary = "";
    this.state.compressionCount = 0;
    console.log("[START SEED]", this.state.startSeed);

    clearLog();
    clearImageFallback();
    renderEffects([]);
    renderChoices([], function () {});
    clearSceneImage();
    showLoader("Начинаем путь");
    lockChoices(true);

    const instruction =
      "Начни игру. Сеттинг: " +
      this.state.world +
      ". Настроение: " +
      this.state.mood +
      ". " +
      "Имя героя: " +
      this.state.heroName +
      ". HP: " +
      this.state.hp +
      ", золото: " +
      this.state.gold +
      ". " +
      "В [СТАРТОВЫЙ КЛЮЧ] указаны параметры стартовой сцены. СОЧИНИ уникальную сцену строго по этим параметрам. " +
      "Герой в обычной ситуации, не ранен. Опиши первую сцену. " +
      'hero_card уже сгенерирован, верни "hero_card": null. Дай 3 варианта действий.';

    try {
      const res = await sendTextRequest(
        [],
        instruction,
        "",
        "openai/gpt-oss-120b",
        this.state.startSeed,
        "",
        "",
        1400,
      );
      hideLoader();
      _setScrollAnchor();
      this.processResponse(res.text);
    } catch (err) {
      hideLoader();
      if (err.code === "RATE_LIMIT") {
        addNarrative(
          "⏳ Лимит токенов. Подождите " +
            (err.retryAfter || 8) +
            " секунд и попробуйте снова.",
        );
      } else {
        addNarrative("⚠️ Ошибка связи с Ткачом судеб. Попробуйте позже.");
      }
      lockChoices(false);
    }
  },

  async handleChoice(text) {
    // Добавляем в окно и полную историю
    this.state.recentWindow.push({ role: "user", content: text });
    this.state.history.push({ role: "user", content: text });

    _setScrollAnchor();
    addHeroLine(text);
    this.state.journal.push({ day: "День " + this.state.day, text: text });
    scrollToAnchor();
    showLoader("Разворачиваем последствия");
    lockChoices(true);

    const worldState = this.buildWorldState();
    const avoidPhrases = this.buildAvoidPhrases();

    try {
      const res = await sendTextRequest(
        this.state.recentWindow,
        "",
        worldState,
        "openai/gpt-oss-120b",
        "",
        avoidPhrases,
        this.state.anchorSummary,
      );
      hideLoader();
      _setScrollAnchor();
      this.processResponse(res.text);

      // Сжимаем, если окно выросло
      await this.compressHistory();
    } catch (err) {
      hideLoader();
      if (err.code === "RATE_LIMIT") {
        addNarrative(
          "⏳ Лимит токенов. Подождите " +
            (err.retryAfter || 8) +
            " секунд и попробуйте снова.",
        );
      } else {
        addNarrative("⚠️ Произошла ошибка. Попробуйте переформулировать.");
      }
      lockChoices(false);
    }
  },

  sendCustom() {
    const input = document.getElementById("custom-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    this.handleChoice(text);
  },

  processResponse(rawText) {
    const data = this.tryParseJson(rawText);

    if (!data) {
      const match = rawText.match(/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (match) {
        try {
          const narrative = JSON.parse('"' + match[1] + '"');
          addNarrative(narrative);
          this.addUsedPhrases(narrative);
          this.state.recentWindow.push({
            role: "assistant",
            content: narrative,
          });
          this.state.history.push({ role: "assistant", content: rawText });
        } catch (e) {
          addNarrative("⚠️ Не удалось разобрать ответ. Попробуйте снова.");
        }
      } else {
        addNarrative(
          "⚠️ Ответ нейросети повреждён. Попробуйте другое действие.",
        );
      }
      lockChoices(false);
      scrollToAnchor();
      return;
    }

    if (data.chapter_update && data.chapter_update.title) {
      const newTitle = data.chapter_update.title;
      if (newTitle !== this.state.chapter.title) {
        this.state.chapter.title = newTitle;
        this.state.chapter.number = (this.state.chapter.number || 1) + 1;
        setChapterBadge(newTitle);
        showChapterToast("📖 " + newTitle);
        addDivider(newTitle);
      }
    } else {
      setChapterBadge(this.state.chapter.title);
    }

    if (data.scene_title) {
      document.getElementById("scene-title").textContent = data.scene_title;
    }

    if (data.divider && !data.chapter_update) addDivider(data.divider);

    if (data.narrative && data.narrative.trim() !== "") {
      addNarrative(data.narrative);
      this.addUsedPhrases(data.narrative);
    } else if (!data.hero_card) {
      // Пустой narrative и нет hero_card — модель оборвалась
      addNarrative(
        "⚠️ Сцена не сгенерировалась — модель вернула пустой ответ. Попробуйте другое действие.",
      );
      console.warn("[EMPTY NARRATIVE]", data);
    }
    // Карточка героя — только первый ход
    if (data.hero_card) addHeroCard(data.hero_card);

    // NPC — внутренние данные
    if (Array.isArray(data.npc_cards)) {
      data.npc_cards.forEach((npc) => {
        if (!npc || !npc.name) return;
        this.state.npcs[npc.name] = npc;
        if (
          npc.role === "companion" &&
          this.state.companions.indexOf(npc.name) === -1
        ) {
          this.state.companions.push(npc.name);
        }
      });
    }

    if (Array.isArray(data.npc_updates)) {
      data.npc_updates.forEach((upd) => {
        if (!upd || !upd.name) return;
        if (this.state.npcs[upd.name]) {
          this.state.npcs[upd.name].attitude =
            upd.attitude || this.state.npcs[upd.name].attitude;
          if (upd.note) this.state.npcs[upd.name].relation_note = upd.note;
        }
      });
    }

    if (Array.isArray(data.npc_removed)) {
      data.npc_removed.forEach((name) => {
        if (this.state.npcs[name]) {
          delete this.state.npcs[name];
          const idx = this.state.companions.indexOf(name);
          if (idx > -1) this.state.companions.splice(idx, 1);
        }
      });
    }

    if (Array.isArray(data.npc_lines)) {
      data.npc_lines.forEach((l) => addNpcLine(l.name, l.text, l.note));
    }

    if (data.stats_update) {
      const u = data.stats_update;
      if (typeof u.hp === "number")
        this.state.hp = Math.max(0, this.state.hp + u.hp);
      if (typeof u.gold === "number")
        this.state.gold = Math.max(0, this.state.gold + u.gold);
      if (Array.isArray(u.inventory_add))
        this.state.inventory.push.apply(this.state.inventory, u.inventory_add);
      if (Array.isArray(u.inventory_remove)) {
        const self = this;
        u.inventory_remove.forEach((it) => {
          const i = self.state.inventory.indexOf(it);
          if (i > -1) self.state.inventory.splice(i, 1);
        });
      }
      if (Array.isArray(u.statuses)) this.state.statuses = u.statuses;
      if (typeof u.day === "number") this.state.day = u.day;
      this.state.dayLabel = "день " + this.state.day;
      updateHUD(this.state);
    }

    if (Array.isArray(data.effects)) renderEffects(data.effects);

    // Сохраняем ответ в оба буфера
    this.state.recentWindow.push({ role: "assistant", content: rawText });
    this.state.history.push({ role: "assistant", content: rawText });

    if (data.is_final) {
      lockChoices(false);
      this.showFinal(data.final || {});
      return;
    }

    const choices =
      Array.isArray(data.choices) && data.choices.length
        ? data.choices
        : ["Осмотреться", "Идти дальше", "Отдохнуть"];
    const self = this;
    renderChoices(choices, (t) => self.handleChoice(t));
    lockChoices(false);

    setTimeout(() => scrollToAnchor(), 50);

    if (data.image_prompt) {
      clearImageFallback();
      this.generateImage(data.image_prompt);
    }
  },

  showFinal(final) {
    renderFinal(final);
    showScreen("final");
  },

  async generateImage(prompt) {
    if (this.state.imageLimitReached) {
      const title = document.getElementById("scene-title").textContent || "";
      showImageFallback(title, "limit");
      return;
    }

    const promptKey = String(prompt || "").slice(0, 120);
    if (this.state.imageFailures[promptKey]) {
      const title = document.getElementById("scene-title").textContent || "";
      showImageFallback(title, this.state.imageFailures[promptKey]);
      return;
    }

    try {
      const res = await sendImageRequest(prompt);
      if (res && res.dataUrl) {
        clearImageFallback();
        setSceneImage(res.dataUrl);
      } else {
        const title = document.getElementById("scene-title").textContent || "";
        this.state.imageFailures[promptKey] = "error";
        showImageFallback(title, "error");
      }
    } catch (e) {
      const title = document.getElementById("scene-title").textContent || "";
      const reason = e && e.code === "IMAGE_LIMIT" ? "limit" : "error";

      if (reason === "limit") {
        this.state.imageLimitReached = true;
        console.warn(
          "Image limit reached. Fallback mode enabled for the rest of the session.",
        );
      }

      this.state.imageFailures[promptKey] = reason;
      showImageFallback(title, reason);
    }
  },

  toggleJournal() {
    const overlay = document.getElementById("journal-overlay");
    const visible = overlay.style.display !== "none";
    if (!visible) {
      renderJournal(this.state.journal);
      overlay.style.display = "flex";
    } else {
      overlay.style.display = "none";
    }
  },

  closeJournal() {
    document.getElementById("journal-overlay").style.display = "none";
  },

  restart(sameWorld) {
    if (!sameWorld) {
      location.reload();
      return;
    }
    if (typeof _npcLineCache !== "undefined") _npcLineCache.clear();
    this.state.hp = 100;
    this.state.gold = 20;
    this.state.inventory = ["кинжал", "хлеб"];
    this.state.statuses = [];
    this.state.day = 1;
    this.state.dayLabel = "день 1";
    this.state.history = [];
    this.state.recentWindow = [];
    this.state.anchorSummary = "";
    this.state.compressionCount = 0;
    this.state.journal = [];
    this.state.chapter = { number: 1, title: "Глава I: Начало пути" };
    this.state.npcs = {};
    this.state.companions = [];
    this.state.gameStarted = false;
    this.state.startSeed = null;
    this.state.usedPhrases = [];
    this.state.imageLimitReached = false;
    this.state.imageFailures = {};
    clearImageFallback();
    updateHUD(this.state);
    showScreen("game");
    this.startGame();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  window.GameApp.init();
});
