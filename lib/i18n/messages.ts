import type { Locale, Messages } from "./types";
import uzLocale from "../../locales/uz.json";
import ruLocale from "../../locales/ru.json";
import kkLocale from "../../locales/kk.json";
import kyLocale from "../../locales/ky.json";

type LocaleBrand = {
  appName: string;
  metaTitle: string;
  metaDescription: string;
};

const brands: Record<Locale, LocaleBrand> = {
  uz: uzLocale,
  ru: ruLocale,
  kk: kkLocale,
  ky: kyLocale,
};

function buildMessages(locale: Locale): Messages {
  const { appName, metaTitle, metaDescription } = brands[locale];

  if (locale === "kk") {
    return {
      appName,
      metaTitle,
      metaDescription,
      nav: { region: "Аймақ", weather: "Ауа райы", brand: appName },
      weather: {
        temperature: "Температура",
        humidity: "Ылғалдылық",
        wind: "Жел",
        rain: "Жаңбыр",
        windUnit: "км/сағ",
      },
      hero: {
        title: appName,
        subtitle: "Ауыл шаруашылығы бойынша интеллектуалды көмекшіңіз",
        description:
          "Өсімдік аурулары, тыңайтқыштар, өнімді қорғау, суару, өнімділік және заманауи агротехнологиялар туралы біліңіз.",
      },
      actions: {
        disease: {
          title: "Ауруды тану",
          subtitle: "Фотосурет бойынша ауруды анықтау",
          prompt:
            "Фотосурет бойынша өсімдік ауруын анықтап, емдеу бойынша ұсыныс беріңіз.",
        },
        diagnosis: {
          title: "AI Диагностика",
          subtitle: "Өсімдік фотосуретін жүктеңіз",
          prompt:
            "Өсімдік фотосуретін талдаңыз: ауру, зиянкес және қоректік заттар тапшылығын анықтаңыз.",
        },
        ask: {
          title: "Сұрақ қою",
          subtitle: `${appName} кеңесін алыңыз`,
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
        welcome: `Сәлеметсіз бе! Мен ${appName}. Егін күтімі, тыңайтқыш, аурулар, зиянкестер, суару және басқа агро мәселелер бойынша көмектесе аламын. Сұрағыңызды жазыңыз!`,
        ariaLabel: `${appName} chat`,
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
        note: `Маркетплейс — қосымша бөлім. Негізгі назар — ${appName}.`,
        heroBlurb: `Өнімдер, қызметтер және ${appName} кеңестері бір жерде`,
        askCta: `${appName} сұрау`,
        talkAria: `${appName} сөйлесу`,
        footerBlurb: `Өнімдер, қызметтер және ${appName} бір жерде.`,
        helpLink: appName,
        catalogNote: `${appName} тек каталогтағы қолжетімді өнімдерді ұсынады.`,
      },
      ui: {
        footerBlurb: `${appName} платформасы. Marketplace — кейін.`,
        copyright: appName,
        featuresTitle: `${appName} платформасы`,
        featuresSubtitle: "Қарапайым чатбот емес — кәсіби диқан агенті",
        voiceFeature: `PDF Report + Voice ${appName}`,
        quickActionsHint: `Бір басумен ${appName} бағыттаңыз`,
        pdfReportTitle: `${appName} — Professional Report`,
        pdfAnalysis: `2. ${appName} талдауы және ұсыныс`,
      },
    };
  }

  if (locale === "ru") {
    return {
      appName,
      metaTitle,
      metaDescription,
      nav: { region: "Регион", weather: "Погода", brand: appName },
      weather: {
        temperature: "Температура",
        humidity: "Влажность",
        wind: "Ветер",
        rain: "Дождь",
        windUnit: "км/ч",
      },
      hero: {
        title: appName,
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
          subtitle: `Получите консультацию ${appName}`,
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
        error:
          "Извините, сейчас не удалось ответить. Пожалуйста, попробуйте ещё раз.",
        voiceUnsupported: "Голосовой ввод не поддерживается в этом браузере.",
        analyzeImages: "Проанализируйте {count} фотографий растения",
        file: "Файл",
        photo: "Фото",
        voice: "Голос",
        welcome: `Здравствуйте! Я ${appName}. Могу помочь по уходу за культурами, удобрениям, болезням, вредителям, поливу и другим агро-вопросам. Напишите ваш вопрос!`,
        ariaLabel: `${appName} chat`,
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
        note: `Маркетплейс — дополнительный раздел. Основной фокус — ${appName}.`,
        heroBlurb: `Товары, услуги и советы ${appName} в одном месте`,
        askCta: `Спросить у ${appName}`,
        talkAria: `Поговорить с ${appName}`,
        footerBlurb: `Товары, услуги и ${appName} в одном месте.`,
        helpLink: appName,
        catalogNote: `${appName} рекомендует только товары из каталога.`,
      },
      ui: {
        footerBlurb: `Платформа ${appName}. Marketplace — позже.`,
        copyright: appName,
        featuresTitle: `Платформа ${appName}`,
        featuresSubtitle: "Не обычный чат-бот — профессиональный агент-земледелец",
        voiceFeature: `PDF Report + Voice ${appName}`,
        quickActionsHint: `Одним нажатием к ${appName}`,
        pdfReportTitle: `${appName} — Professional Report`,
        pdfAnalysis: `2. Анализ и рекомендации ${appName}`,
      },
    };
  }

  if (locale === "ky") {
    return {
      appName,
      metaTitle,
      metaDescription,
      nav: { region: "Аймак", weather: "Аба ырайы", brand: appName },
      weather: {
        temperature: "Температура",
        humidity: "Нымдуулук",
        wind: "Жел",
        rain: "Жамгыр",
        windUnit: "км/саат",
      },
      hero: {
        title: appName,
        subtitle: "Айыл чарбасы боюнча интеллектуалдык жардамчыңыз",
        description:
          "Өсүмдүк оорулары, чыгымдуулуктар, өнүмдү коргоо, сугаруу, урдуктуулук жана заманбап агротехнологиялар жөнүндө билиңиз.",
      },
      actions: {
        disease: {
          title: "Ооруну таануу",
          subtitle: "Сүрөт боюнча ооруну аныктоо",
          prompt:
            "Сүрөт боюнча өсүмдүк оорусун аныктап, дарылоо боюнча сунуш бериңиз.",
        },
        diagnosis: {
          title: "AI Диагностика",
          subtitle: "Өсүмдүк сүрөтүн жүктөңүз",
          prompt:
            "Өсүмдүк сүрөтүн талдаңыз: оору, зыянкечтер же зат тапшылыгын аныктаңыз.",
        },
        ask: {
          title: "Суроо берүү",
          subtitle: `${appName} кеңешин алыңыз`,
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
        welcome: `Салам! Мен ${appName}. Өсүмдүк багуу, жер семирткич, оорулар, зыянкечтер, сугаруу жана башка агро маселелер боюнча жардам бере алам. Сурооңузду жазыңыз!`,
        ariaLabel: `${appName} chat`,
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
        note: `Маркетплейс — кошумча бөлүм. Негизги көңүл — ${appName}.`,
        heroBlurb: `Продукциялар, кызматтар жана ${appName} кеңештери бир жерде`,
        askCta: `${appName} суроо`,
        talkAria: `${appName} менен сүйлөшүү`,
        footerBlurb: `Продукциялар, кызматтар жана ${appName} бир жерде.`,
        helpLink: appName,
        catalogNote: `${appName} каталогдогу жеткиликтүү продукцияларды гана сунуштайт.`,
      },
      ui: {
        footerBlurb: `${appName} платформасы. Marketplace — кийин.`,
        copyright: appName,
        featuresTitle: `${appName} платформасы`,
        featuresSubtitle: "Жөнөкөй чатбот эмес — кесипкөй дыйкан агент",
        voiceFeature: `PDF Report + Voice ${appName}`,
        quickActionsHint: `Бир басуу менен ${appName} багыттаңыз`,
        pdfReportTitle: `${appName} — Professional Report`,
        pdfAnalysis: `2. ${appName} анализи жана сунуш`,
      },
    };
  }

  // uz (default)
  return {
    appName,
    metaTitle,
    metaDescription,
    nav: { region: "Hudud", weather: "Ob-havo", brand: appName },
    weather: {
      temperature: "Harorat",
      humidity: "Namlik",
      wind: "Shamol",
      rain: "Yomg'ir",
      windUnit: "km/soat",
    },
    hero: {
      title: appName,
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
        subtitle: `${appName} maslahatini oling`,
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
      error:
        "Kechirasiz, hozir javob berishda muammo bo'ldi. Iltimos, qayta urinib ko'ring.",
      voiceUnsupported: "Ushbu brauzerda ovozli kiritish qo'llab-quvvatlanmaydi.",
      analyzeImages: "{count} ta o'simlik rasmini tahlil qiling",
      file: "Fayl",
      photo: "Rasm",
      voice: "Ovoz",
      welcome: `Assalomu alaykum! Men ${appName}. Ekin parvarishi, o'g'itlash, kasalliklar, zararkunandalar, sug'orish va boshqa agro masalalar bo'yicha yordam bera olaman. Savolingizni yozing!`,
      ariaLabel: `${appName} chat`,
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
      note: `Marketpleys — qo'shimcha bo'lim. Asosiy e'tibor ${appName} ga.`,
      heroBlurb: `Mahsulotlar, xizmatlar va ${appName} maslahatlari bir joyda`,
      askCta: `${appName} dan so'rash`,
      talkAria: `${appName} bilan gaplashish`,
      footerBlurb: `Mahsulotlar, xizmatlar va ${appName} bir joyda.`,
      helpLink: appName,
      catalogNote: `${appName} faqat katalogdagi mavjud mahsulotlarni tavsiya qiladi.`,
    },
    ui: {
      footerBlurb: `${appName} platformasi. Marketplace — keyin.`,
      copyright: appName,
      featuresTitle: `${appName} platformasi`,
      featuresSubtitle: "Oddiy chatbot emas — professional dehqon agent",
      voiceFeature: `PDF Report + Voice ${appName}`,
      quickActionsHint: `Bir bosishda ${appName} ga yo'naling`,
      pdfReportTitle: `${appName} — Professional Report`,
      pdfAnalysis: `2. ${appName} tahlili va tavsiya`,
    },
  };
}

const cache: Record<Locale, Messages> = {
  uz: buildMessages("uz"),
  ru: buildMessages("ru"),
  kk: buildMessages("kk"),
  ky: buildMessages("ky"),
};

export const messages: Record<Locale, Messages> = cache;

export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.ru;
}

export function getAppName(locale: Locale): string {
  return brands[locale]?.appName ?? brands.ru.appName;
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
