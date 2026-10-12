# Cloudflare-бэкенд «Живой летописи» (пробный, v1)

## Архитектура

```
Игра (index.html, публичный код)
  │  fetch, CORS открыт
  ▼
Worker lia-backend (свой URL, публичный — это нормально)
  │  env.AI — биндинг Workers AI (деньги/квоты аккаунта, наружу не торчат)
  │  env.GAME_KEY — опциональный общий ключ (Secret, только на сервере)
  ▼
Workers AI: llama-3.1-8b-instruct-fp8 (дефолт дешёвый; 2026-10-12: слаб для
сложных промптов — теряет имя героя и JSON) → **выбран qwen3-30b-a3b-fp8**
(перебор 2026-10-12: лучший баланс; запасной llama-3.3-70b тоже хорош, но
дороже). gemma-4-26b отдаёт пустой ответ — не использовать. Переключение
модели: параметр `model` в POST /text (белый список TEXT_MODELS).
```

Ключи и секреты живут **только** в Cloudflare (Variables and Secrets) и
никогда — в коде игры, в чате или в этом репозитории. В `worker.js` секретов
нет, его можно показывать кому угодно.

## Деплой с нуля (только браузер, без терминала)

1. **Аккаунт.** Cloudflare.com → Sign Up (почта + пароль) → подтвердить письмо.
   Карта для бесплатных лимитов не нужна: 10 000 нейронов/день включены.
2. **Воркер.** Dashboard → Workers & Pages → Create → Create Worker →
   имя `lia-backend` → Deploy → Edit code → вставить `worker.js` целиком →
   Save and deploy.
3. **Биндинг Workers AI** (без него `env.AI` пуст и будет 500).
   Worker → Settings → Bindings → Add binding → Workers AI →
   Variable name: `AI` → Add → redeploy (Deployments → последняя → Retry,
   либо любое новое сохранение кода).
4. **URL.** Settings → Domains & Routes → `*.workers.dev` — скопировать.
   Проверка: открыть `<URL>/health` в браузере → `{"ok":true,...}`.
5. **(Необязательно) Общий ключ.** Settings → Variables and Secrets →
   Add → Secret `GAME_KEY` = длинная случайная строка → Save → redeploy.
   Тот же ключ вписать в игру в `CF_GAME_KEY`. Это защита от случайных
   чужих запросов, не от взлома (ключ в публичном коде игры виден всем).

## Подключение игры

В `index.html`: `AI_BACKEND = "cloudflare"`, `CF_WORKER_URL = "<URL>"`.
Откат: `AI_BACKEND = "perchance"` — одна строка, код Cloudflare dormant.

## Наблюдение и лимиты

- Расход: Workers & Pages → lia-backend → Metrics / AI → нейроны по дням.
- Ориентир: сцена ~50 нейронов (~180 сцен/день бесплатно),
  кадр 768×512 ~500 нейронов (~18 кадров/день бесплатно).
- Ошибки/логи: Observability → Logs (или `wrangler tail`).
- Quota exceeded → воркер вернёт 500, игра молча откатится на плагин Perchance.

## Что дальше (не в этой пробе)

- Проверка Telegram initData в воркере вместо общего ключа.
- Кэш глав и уменьшение кадров (уже есть `sceneChanged`).
- При росте — Workers Paid ($5/мес) вместо фермы аккаунтов.
