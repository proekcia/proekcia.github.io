# Handoff: Original / Artworks Website

## Проект
Статичный сайт-лендинг для бренда Original / Artworks (мерч на заказ).

**Файлы:**
- `/Users/kirsava/Downloads/Original Artwork/index.html`
- `/Users/kirsava/Downloads/Original Artwork/style.css`
- `/Users/kirsava/Downloads/Original Artwork/images/` — все фото

**Текущая версия CSS:** `style.css?v=29` (строка 7 в index.html — увеличивай на 1 при каждом изменении CSS, иначе браузер кэширует старый файл)

---

## Важные правила

1. **НЕ присылай превью/скриншоты** — пользователь проверяет сама
2. **Всегда увеличивай версию CSS** (`?v=N`) при каждом изменении style.css, иначе браузер не подтянет изменения
3. Для hard-refresh: Cmd+Shift+R

---

## Архитектура дизайна

### Флюидная верстка
- Desktop: `px / 1440 × 100 = vw`
- Mobile: `px / 375 × 100 = vw`
- Минимальный размер текста: `max(12px, Xvw)`
- Nav — `position: fixed; top: 0; z-index: 100`
- Все секции — `position: relative; width: 100%; height: 100vh`
- Внутренние элементы — `position: absolute` с % координатами

### Брейкпоинты
- Mobile: `@media (max-width: 768px)`
- Tablet: `@media (min-width: 769px) and (max-width: 1199px)`
- Short viewport: `@media (max-height: 750px) and (min-width: 769px)`

---

## Структура секций (HTML порядок)

1. **HERO** — `.hero` — лого + фиксированный nav
2. **COLLECTION** — `.collection` — карточки товаров
3. **CRAFTSMANSHIP** — `.craft` — табы: MATERIAL / CONSTRUCTION / FINISHING
4. **CUSTOMIZATION** — `.customization` — опции кастомизации
5. **OUR WORKS** — `.ourworks` — текст + фотострип
6. **PRICING** — `.pricing` — калькулятор цены + фото
7. **HOW IT WORKS** — `.howitworks` — 5 шагов с фото
8. Mobile nav (скрытый на десктопе)

### Nav links (оба — desktop и mobile):
COLLECTION · CRAFTSMANSHIP · CUSTOMIZATION · OUR WORKS · PRICING · HOW IT WORKS · FAQ

---

## Ключевые CSS паттерны

### Nav центрирование
```css
.hero__nav-right {
  position: absolute; left: 0; right: 0;
  display: flex; justify-content: center; align-items: center;
  pointer-events: none;
}
.hero__nav-links { pointer-events: all; }
.hero__nav-start { margin-left: auto; flex-shrink: 0; }
```

### Позиции заголовков секций (desktop)
Все заголовки: `top: 12.07vh`
- CRAFTSMANSHIP: `left: 0.97vw` (внутри левой 50% панели)
- CUSTOMIZATION: `left: 1.06vw` (внутри правой панели `left: 50%`)
- OUR WORKS: `left: 0.06vw` (внутри `ourworks__info` с `left: 51.02%`) → эффективно ~51% от края
- HOW IT WORKS: `left: 51.02%; top: 12.07vh` (прямой потомок секции)

### Мобильная верстка секций
CUSTOMIZATION, OUR WORKS, PRICING на мобиле переведены из absolute в нормальный поток:
```css
/* Паттерн для мобиля */
.section { height: auto; overflow: visible; }
.section__inner { position: static; }
```
CUSTOMIZATION использует `display: contents` + `order` для переупорядочивания элементов.

---

## OUR WORKS

### Desktop
```css
.ourworks__info { position: absolute; left: 51.02%; right: 0; top: 0; bottom: 57%; }
.ourworks__label { position: absolute; left: 0.06vw; top: 0; }
.ourworks__text { position: absolute; left: 0.06vw; top: 17.02%; right: 3.88vw; bottom: 0; overflow: hidden; }
.ourworks__scroll-wrap { position: absolute; left: 0; right: 0; top: 46%; bottom: 0; }
```
- Отступ между текстом и фотострипом: info заканчивается на 43% (`bottom: 57%`), фото начинаются на 46% → 3% белого зазора

---

## PRICING

### Desktop
- Левая панель: `.pricing__panel` (калькулятор)
- Правая панель: `.pricing__visual` — фото `images/PRICE CALCULATOR.webp` + заголовок поверх:
```html
<img src="images/PRICE%20CALCULATOR.webp">
<h2 class="pricing__visual-title">Your next merch<br>starts here.</h2>
```
```css
.pricing__visual-title {
  position: absolute; bottom: 8%; left: 6%; right: 6%;
  font-weight: 700; font-size: clamp(28px, 4.5vw, 72px);
  line-height: 1.15; color: #fff;
}
```

### Stepper (3 отдельных элемента)
```css
.pricing__stepper { display: flex; align-items: stretch; height: 3.56vh; gap: 3px; }
.pricing__step-btn { width: 3.56vh; background: #F4F4F4; border: none; }
.pricing__step-val { flex: 1; background: #fff; border: 1px solid rgba(0,0,0,0.15); }
```

### Mobile
- Фото появляется НИЖЕ калькулятора, на всю ширину
```css
.pricing__visual { order: 2; position: static; width: 100%; height: 100vw; }
.pricing__panel { order: 1; }
```

---

## HOW IT WORKS

### HTML структура
```html
<section class="howitworks" id="how-it-works">
  <p class="howitworks__label">HOW IT WORKS</p>
  <div class="howitworks__steps">
    <div class="howitworks__step howitworks__step--1">
      <p class="howitworks__step-num">1. GET IN TOUCH</p>
      <p class="howitworks__step-body">Reach out through the website...</p>
      <div class="howitworks__step-photo"><img src="images/Get%20in%20touch.webp" alt="Get in touch"></div>
    </div>
    <!-- steps 2-5: Brief & Approval, Production, Quality control, Packaging & delivery -->
  </div>
</section>
```

Фото в папке images: `Get in touch.webp`, `Brief & Approval.webp`, `Production.webp`, `Quality control.webp`, `Packaging & delivery.webp`

### Desktop CSS
```css
.howitworks { position: relative; width: 100%; height: 100vh; background: #fff; overflow: hidden; }
.howitworks__label { position: absolute; left: 51.02%; top: 12.07vh; font-weight: 700; font-size: max(14px, 1.25vw); z-index: 2; }
.howitworks__steps { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; }
.howitworks__step { flex: 0 0 20%; position: relative; padding-left: 0.97vw; padding-right: 0.5vw; }
.howitworks__step-num { position: absolute; top: 42%; left: 0.97vw; right: 0.5vw; font-weight: 700; font-size: max(12px, 0.694vw); }
.howitworks__step-body { position: absolute; top: 45%; bottom: 43%; left: 0.97vw; right: 0.5vw; font-size: max(12px, 0.694vw); overflow: hidden; }
.howitworks__step-photo { position: absolute; left: 0; right: 0; top: 57%; bottom: 0; overflow: hidden; }
.howitworks__step-photo img { width: 100%; height: 100%; object-fit: cover; }
```

### Mobile CSS (внутри `@media (max-width: 768px)`)
- Шаги идут вертикально, фото на всю ширину экрана
- Секция: `height: auto; padding: 8.53vw 4.27vw 0`
- Шаг: `padding: 6.4vw 0` (без горизонтального padding — текст выровнен по заголовку HOW IT WORKS)
- Фото: `width: calc(100% + 8.54vw); margin-left: -4.27vw; margin-right: -4.27vw; height: 56vw`

---

## Незавершённые задачи

1. **FAQ секция** — в nav есть ссылка `#faq`, но секции нет в HTML. Нужно создать
2. **Фото для CUSTOMIZATION** — 5 блоков (`custom__photo`) с пустыми `src=""`:
   - `custom__photo--garment` (GARMENT COLOR)
   - `custom__photo--silk` (SILKSCREEN)
   - `custom__photo--dtg` (DTG PRINT)
   - `custom__photo--embroidery` (EMBROIDERY)
   - `custom__photo--neck` (NECK LABEL)
3. **ORDER SAMPLE** кнопка — нет функциональности
4. **HOW IT WORKS заголовок** — пользователь говорил что он не совпадает с заголовками других секций. Текущее положение: `left: 51.02%; top: 12.07vh`. Возможно требует доработки

---

## Имена файлов изображений (URL-encoded)

```
images/PRICE%20CALCULATOR.webp
images/Get%20in%20touch.webp
images/Brief%20%26%20Approval.webp
images/Production.webp
images/Quality%20control.webp
images/Packaging%20%26%20delivery.webp
```

---

## Типичные проблемы и решения

| Проблема | Решение |
|---|---|
| Изменения не видны в браузере | Увеличить `?v=N` в index.html строка 7 |
| Текст уходит за границы на мобиле | Секция absolute → `height: auto`, элементы → `position: static` |
| `overflow: hidden` обрезает текст | Уменьшать `bottom:` контейнера, а не добавлять `padding-bottom` |
| Фото в HOW IT WORKS квадратные | `top: 57%; bottom: 0` даёт высоту 43% vh — при стандартных экранах портрет |
