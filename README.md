# HAI Frontend — Heart Affinity Index

## מבנה הפרויקט

```
hai_frontend/
├── public/index.html
├── src/
│   ├── App.js              ← ניתוב בין דפים
│   ├── App.css             ← עיצוב גלובלי
│   ├── firebase.js         ← חיבור Firebase
│   ├── index.js            ← נקודת כניסה
│   └── pages/
│       ├── IntakePage.js   ← טופס פרטי נבדק
│       ├── TestPage.js     ← הצגת גירויים + הקלטה
│       ├── ProcessingPage.js ← מסך המתנה לניתוח
│       ├── ResultsPage.js  ← דוח תוצאות + גרפים
│       └── HistoryPage.js  ← היסטוריית בדיקות
├── .env                    ← כתובת הבקאנד
└── package.json
```

## התקנה והפעלה

### 1. התקן Node.js
הורד מ: https://nodejs.org (גרסה 18 ומעלה)

### 2. התקן תלויות
```bash
cd hai_frontend
npm install
```

### 3. הפעל
```bash
npm start
```
הדפדפן יפתח אוטומטית ב: http://localhost:3000

### 4. ודא שהבקאנד רץ
בטרמינל נפרד:
```bash
cd hai_backend
python main.py
```

---

## זרימת המשתמש

```
IntakePage (/)
    ↓ שם + גיל + הסכמה
    ↓ POST /subjects + POST /sessions
TestPage (/test/:sessionId)
    ↓ הוראות → הקלטה → 16 גירויים
    ↓ POST /analyze/:sessionId
ProcessingPage (/processing/:sessionId)
    ↓ polling כל 2 שניות
    ↓ GET /sessions/:sessionId
ResultsPage (/results/:sessionId)
    ↓ גרפים + Top 3 + נרטיב
    ↓ GET /conclusions + /results
HistoryPage (/history)
    ↓ כל הסשנים מ-Firebase
    ↓ GET /sessions + /subjects
```

---

## הוספת גירויים אמיתיים

שים קבצים בתיקייה `public/stimuli/`:
```
art_1.jpg, art_2.mp3
sport_1.jpg, sport_2.mp3
nature_1.jpg, nature_2.mp3
science_1.jpg, science_2.mp3
tech_1.jpg, tech_2.mp3
culture_1.jpg, culture_2.mp3
care_1.jpg, care_2.mp3
growth_1.jpg, growth_2.mp3
```

כל תמונה: יחס 16:9, רזולוציה מינימלית 1280×720
כל קובץ שמע: MP3, 30 שניות, בלי מילים (אינסטרומנטלי)
