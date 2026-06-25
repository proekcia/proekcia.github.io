/* =========================================================
   PERSONA — Конфігуратор фотокниги · КОНФІГУРАЦІЯ
   ---------------------------------------------------------
   Єдине джерело правди для конфігуратора.
   Щоб додати формат / пакет / колір — редагуйте лише цей файл,
   решта (UI, ціна, візуалізатор) підлаштується автоматично.

   Ціна = базова ціна (формат × пакет)
        + (розвороти - мінімум пакета) × ціна дод. розвороту
   ========================================================= */
window.PERSONA_CONFIG = {

  currency: 'USD',
  currencySymbol: '$',

  /* ---- Пакети ----
     minSpreads — мінімальна (вона ж стартова) к-сть розворотів
     match      — назви з таблиці порівняння (кнопки "Обрати …")
     (ціна дод. розвороту тепер залежить від формату — див. formats[].extraSpread) */
  packages: [
    { id: 'light',   name: 'Light',   minSpreads: 5,  texture: 'linen-light.jpg',
      match: ['light'],   tagline: 'Чиста естетика' },
    { id: 'premium', name: 'Premium', minSpreads: 10, texture: 'linen.jpg',
      match: ['premium'], tagline: 'Італійські матеріали' },
    { id: 'grand',   name: 'Grand',   minSpreads: 10, texture: 'linen.jpg',
      match: ['grand'],   tagline: 'Флагманське видання', featured: true },
  ],

  /* ---- Формати ----
     scale   — візуальний масштаб книги у візуалізаторі (30×30 = 1)
     base    — базова ціна за пакетами { packageId: price } */
  formats: [
    { id: '20', name: '20 × 20', dims: '20×20 см', scale: 0.84, extraSpread: 3,
      base: { light: 35, premium: 65, grand: 110 } },
    { id: '25', name: '25 × 25', dims: '25×25 см', scale: 0.92, extraSpread: 4,
      base: { light: 40, premium: 80, grand: 130 } },
    { id: '30', name: '30 × 30', dims: '30×30 см', scale: 1.0, extraSpread: 5,
      base: { light: 55, premium: 100, grand: 150 } },
  ],

  /* ---- Типи обкладинки ---- */
  covers: [
    { id: 'fabric', name: 'Тканинна',     type: 'fabric', hint: 'Італійський палітурний матеріал + напис' },
    { id: 'photo',  name: 'Фотообкладинка', type: 'photo',  hint: 'Ваше фото на всю обкладинку' },
  ],

  /* ---- Кольори тканини (12) ----
     Преміальна приглушена палітра. foil обчислюється автоматично за яскравістю. */
  fabricColors: [
    { id: 'ivory',      name: 'Слонова кістка', hex: '#E9E3D7' },
    { id: 'pearl',      name: 'Перлина',        hex: '#D8D0C2' },
    { id: 'sand',       name: 'Пісок',          hex: '#CBB79B' },
    { id: 'camel',      name: 'Кемел',          hex: '#B0895F' },
    { id: 'terracotta', name: 'Теракота',       hex: '#A6573F' },
    { id: 'powder',     name: 'Пудра',          hex: '#C7A19B' },
    { id: 'marsala',    name: 'Марсала',        hex: '#6E2B33' },
    { id: 'sage',       name: 'Шавлія',         hex: '#9AA187' },
    { id: 'forest',     name: 'Хвоя',           hex: '#3C4A3E' },
    { id: 'slate',      name: 'Сланець',        hex: '#5C6A73' },
    { id: 'navy',       name: 'Опівнічний',     hex: '#2C384B' },
    { id: 'graphite',   name: 'Графіт',         hex: '#2A2A2A' },
  ],

  /* ---- Розвороти ---- */
  spreads: {
    max: 200,  // верхня межа
    step: 1,
  },

  /* ---- Дефолти при старті ---- */
  defaults: {
    packageId: 'grand',
    formatId: '30',
    coverId: 'fabric',
    colorId: 'ivory',
    text: '',
  },
};
