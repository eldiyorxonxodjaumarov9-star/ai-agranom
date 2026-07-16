import type { Locale, Messages } from "./types";

const kk: Messages = {
  nav: { region: "Аймақ", weather: "Ауа райы", brand: "Agro Olam" },
  weather: {
    temperature: "Температура",
    humidity: "Ылғалдылық",
    wind: "Жел",
    rain: "Жаңбыр",
    windUnit: "км/сағ",
  },
  hero: {
    title: "Я AI Дехқон",
    subtitle: "Ауыл шаруашылығы бойынша интеллектуалды көмекшіңіз",
    description:
      "Өсімдік аурулары, тыңайтқыштар, өнімді қорғау, суару, өнімділік және заманауи агротехнологиялар туралы біліңіз.",
  },
  actions: {
    disease: {
      title: "Ауруды тану",
      subtitle: "Фотосурет бойынша ауруды анықтау",
      prompt: "Фотосурет бойынша өсімдік ауруын анықтап, емдеу бойынша ұсыныс беріңіз.",
    },
    diagnosis: {
      title: "AI Диагностика",
      subtitle: "Өсімдік фотосуретін жүктеңіз",
      prompt:
        "Өсімдік фотосуретін талдаңыз: ауру, зиянкес және қоректік заттар тапшылығын анықтаңыз.",
    },
    ask: {
      title: "Сұрақ қою",
      subtitle: "Я AI Дехқон кеңесін алыңыз",
    },
    voice: {
      title: "Дауысты көмекші",
      subtitle: "Дауыспен сұрақ қойыңыз",
    },
  },
  chat: {
    newChat: "Жаңа чат",
    chats: "Чаттар",
    rename: "Атын өзгерту",
    pin: "Бекіту",
    unpin: "Бекітуді алу",
    delete: "Жою",
    deleteTitle: "Чатты жою керек пе?",
    deleteBody: "Бұл чатты жойғыңыз келетініне сенімдісіз бе?",
    deleteCannotUndo: "Бұл әрекетті болдырмау мүмкін емес.",
    deleteConfirm: "Жою",
    cancel: "Болдырмау",
    close: "Жабу",
    send: "Жіберу",
    placeholder: "Сұрағыңызды жазыңыз...",
    emptyHint: "Сұрақ қойыңыз немесе өсімдік фотосуретін жүктеңіз",
    error: "Кешіріңіз, қазір жауап беру мүмкін болмады. Қайта көріңіз.",
    voiceUnsupported: "Бұл браузерде дауысты енгізу қолдау көрсетілмейді.",
    analyzeImages: "{count} өсімдік фотосуретін талдаңыз",
    file: "Файл",
    photo: "Фото",
    voice: "Дауыс",
    examples: [
      "Неге қызанақ жапырақтары сарыланады?",
      "Бидайға қандай тыңайтқыш жарайды?",
      "Қияр зиянкестерінен қалай құтылуға болады?",
      "Неге алма жапырақтары кебеді?",
    ],
  },
  bottomNav: {
    home: "Басты",
    ai: "AI",
    market: "Маркет",
    fav: "Таңдаулы",
    profile: "Профиль",
    settings: "Баптаулар",
  },
  marketplace: {
    note: "Маркетплейс — қосымша бөлім. Негізгі назар — Я AI Дехқон.",
  },
};

const ru: Messages = {
  nav: { region: "Регион", weather: "Погода", brand: "Agro Olam" },
  weather: {
    temperature: "Температура",
    humidity: "Влажность",
    wind: "Ветер",
    rain: "Дождь",
    windUnit: "км/ч",
  },
  hero: {
    title: "Я AI Дехқон",
    subtitle: "Ваш интеллектуальный помощник по сельскому хозяйству",
    description:
      "Узнайте о болезнях растений, удобрениях, защите культур, поливе, урожайности и современных агротехнологиях.",
  },
  actions: {
    disease: {
      title: "Распознать болезнь",
      subtitle: "Определение болезни по фотографии",
      prompt:
        "Определите болезнь растения по фотографии и дайте рекомендации по лечению.",
    },
    diagnosis: {
      title: "AI Диагностика",
      subtitle: "Загрузите фотографию растения",
      prompt:
        "Проанализируйте фотографию растения: определите болезнь, вредителей или дефицит питательных веществ.",
    },
    ask: {
      title: "Задать вопрос",
      subtitle: "Получите консультацию Я AI Дехқон",
    },
    voice: {
      title: "Голосовой помощник",
      subtitle: "Задайте вопрос голосом",
    },
  },
  chat: {
    newChat: "Новый чат",
    chats: "Чаты",
    rename: "Переименовать",
    pin: "Закрепить",
    unpin: "Открепить",
    delete: "Удалить",
    deleteTitle: "Удалить чат?",
    deleteBody: "Вы уверены, что хотите удалить этот чат?",
    deleteCannotUndo: "Это действие нельзя отменить.",
    deleteConfirm: "Удалить",
    cancel: "Отмена",
    close: "Закрыть",
    send: "Отправить",
    placeholder: "Напишите свой вопрос...",
    emptyHint: "Задайте вопрос или загрузите фото растения",
    error: "Извините, сейчас не удалось ответить. Пожалуйста, попробуйте ещё раз.",
    voiceUnsupported: "Голосовой ввод не поддерживается в этом браузере.",
    analyzeImages: "Проанализируйте {count} фотографий растения",
    file: "Файл",
    photo: "Фото",
    voice: "Голос",
    examples: [
      "Почему желтеют листья томата?",
      "Какое удобрение подходит для пшеницы?",
      "Как бороться с вредителями огурцов?",
      "Почему сохнут листья яблони?",
    ],
  },
  bottomNav: {
    home: "Главная",
    ai: "ИИ",
    market: "Маркет",
    fav: "Избранное",
    profile: "Профиль",
    settings: "Настройки",
  },
  marketplace: {
    note: "Маркетплейс — дополнительный раздел. Основной фокус — Я AI Дехқон.",
  },
};

const uz: Messages = {
  nav: { region: "Hudud", weather: "Ob-havo", brand: "Agro Olam" },
  weather: {
    temperature: "Harorat",
    humidity: "Namlik",
    wind: "Shamol",
    rain: "Yomg'ir",
    windUnit: "km/soat",
  },
  hero: {
    title: "Я AI Дехқон",
    subtitle: "Qishloq xo'jaligi bo'yicha intellektual yordamchingiz",
    description:
      "O'simlik kasalliklari, o'g'itlar, hosil himoyasi, sug'orish, hosildorlik va zamonaviy agrotexnologiyalar haqida bilib oling.",
  },
  actions: {
    disease: {
      title: "Kasallikni aniqlash",
      subtitle: "Fotosurat bo'yicha kasallikni aniqlash",
      prompt:
        "Fotosurat bo'yicha o'simlik kasalligini aniqlang va davolash bo'yicha tavsiya bering.",
    },
    diagnosis: {
      title: "AI Tashxis",
      subtitle: "O'simlik fotosuratini yuklang",
      prompt:
        "O'simlik fotosuratini tahlil qiling: kasallik, zararkunanda yoki ozuqa yetishmovchiligini aniqlang.",
    },
    ask: {
      title: "Savol berish",
      subtitle: "Я AI Дехқон maslahatini oling",
    },
    voice: {
      title: "Ovozli yordamchi",
      subtitle: "Ovoz bilan savol bering",
    },
  },
  chat: {
    newChat: "Yangi chat",
    chats: "Chatlar",
    rename: "Nomini o'zgartirish",
    pin: "Bog'lash",
    unpin: "Bog'lashni olib tashlash",
    delete: "O'chirish",
    deleteTitle: "Chatni o'chirish?",
    deleteBody: "Ushbu chatni o'chirmoqchimisiz?",
    deleteCannotUndo: "Bu amalni bekor qilib bo'lmaydi.",
    deleteConfirm: "O'chirish",
    cancel: "Bekor qilish",
    close: "Yopish",
    send: "Yuborish",
    placeholder: "Savolingizni yozing...",
    emptyHint: "Savol bering yoki o'simlik fotosuratini yuklang",
    error: "Kechirasiz, hozir javob berishda muammo bo'ldi. Iltimos, qayta urinib ko'ring.",
    voiceUnsupported: "Ushbu brauzerda ovozli kiritish qo'llab-quvvatlanmaydi.",
    analyzeImages: "{count} ta o'simlik rasmini tahlil qiling",
    file: "Fayl",
    photo: "Rasm",
    voice: "Ovoz",
    examples: [
      "Nega pomidor barglari sarg'aymoqda?",
      "Bug'doy uchun qanday o'g'it mos keladi?",
      "Bodring zararkunandalaridan qanday qutulish mumkin?",
      "Nega olma barglari qurimoqda?",
    ],
  },
  bottomNav: {
    home: "Bosh sahifa",
    ai: "AI",
    market: "Market",
    fav: "Sevimlilar",
    profile: "Profil",
    settings: "Sozlamalar",
  },
  marketplace: {
    note: "Marketpleys — qo'shimcha bo'lim. Asosiy e'tibor Я AI Дехқон ga.",
  },
};

const ky: Messages = {
  nav: { region: "Аймак", weather: "Аба ырайы", brand: "Agro Olam" },
  weather: {
    temperature: "Температура",
    humidity: "Нымдуулук",
    wind: "Жел",
    rain: "Жамгыр",
    windUnit: "км/саат",
  },
  hero: {
    title: "Я AI Дехқон",
    subtitle: "Айыл чарбасы боюнча интеллектуалдык жардамчыңыз",
    description:
      "Өсүмдүк оорулары, чыгымдуулуктар, өнүмдү коргоо, сугаруу, урдуктуулук жана заманбап агротехнологиялар жөнүндө билиңиз.",
  },
  actions: {
    disease: {
      title: "Ооруну таануу",
      subtitle: "Сүрөт боюнча ооруну аныктоо",
      prompt: "Сүрөт боюнча өсүмдүк оорусун аныктап, дарылоо боюнча сунуш бериңиз.",
    },
    diagnosis: {
      title: "AI Диагностика",
      subtitle: "Өсүмдүк сүрөтүн жүктөңүз",
      prompt:
        "Өсүмдүк сүрөтүн талдаңыз: оору, зыянкечтер же зат тапшылыгын аныктаңыз.",
    },
    ask: {
      title: "Суроо берүү",
      subtitle: "Я AI Дехқон кеңешин алыңыз",
    },
    voice: {
      title: "Үн жардамчысы",
      subtitle: "Үн менен суроо бериңиз",
    },
  },
  chat: {
    newChat: "Жаңы чат",
    chats: "Чаттар",
    rename: "Атын өзгөртүү",
    pin: "Бекитүү",
    unpin: "Бекитүүнү алуу",
    delete: "Өчүрүү",
    deleteTitle: "Чатты өчүрөсүзбү?",
    deleteBody: "Бул чатты өчүргүңүз келеби?",
    deleteCannotUndo: "Бул аракетти жокко чыгаруу мүмкүн эмес.",
    deleteConfirm: "Өчүрүү",
    cancel: "Жокко чыгаруу",
    close: "Жабуу",
    send: "Жөнөтүү",
    placeholder: "Сурооңузду жазыңыз...",
    emptyHint: "Суроо бериңиз же өсүмдүк сүрөтүн жүктөңүз",
    error: "Кечириңиз, азыр жооп берүү мүмкүн эмес. Кайра аракет кылыңыз.",
    voiceUnsupported: "Бул браузерде үн менен киргизүү колдоого алынбайт.",
    analyzeImages: "{count} өсүмдүк сүрөтүн талдаңыз",
    file: "Файл",
    photo: "Сүрөт",
    voice: "Үн",
    examples: [
      "Эмне үчүн помидор жалбырактары сары болуп жатат?",
      "Буудайга кандай чыгымдуулук ылайыктуу?",
      "Бадрың зыянкечтеринен кантип кутулуу керек?",
      "Эмне үчүн алма жалбырактары куруп жатат?",
    ],
  },
  bottomNav: {
    home: "Башкы",
    ai: "AI",
    market: "Маркет",
    fav: "Тандалган",
    profile: "Профиль",
    settings: "Жөндөөлөр",
  },
  marketplace: {
    note: "Маркетплейс — кошумча бөлүм. Негизги көңүл — Я AI Дехқон.",
  },
};

export const messages: Record<Locale, Messages> = { kk, ru, uz, ky };

export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.ru;
}

export function isNewChatTitle(title: string): boolean {
  return (Object.keys(messages) as Locale[]).some(
    (loc) => messages[loc].chat.newChat === title
  );
}

export function allNewChatTitles(): string[] {
  return (Object.keys(messages) as Locale[]).map(
    (loc) => messages[loc].chat.newChat
  );
}
