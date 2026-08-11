import type { Dictionary } from "@/lib/i18n";

export const uk: Dictionary = {
  common: {
    save: "Зберегти",
    cancel: "Скасувати",
    done: "Готово",
    delete: "Видалити",
    back: "Назад",
    close: "Закрити",
    saving: "Зберігаємо…",
    networkError: "Помилка мережі, спробуйте ще раз"
  },
  topBar: {
    backLabel: "Назад",
    settingsLabel: "Налаштування",
    signOutLabel: "Вийти"
  },
  auth: {
    tagline: "Месенджер для будівельних бригад",
    login: {
      emailPlaceholder: "Email",
      passwordPlaceholder: "Пароль",
      showPassword: "Показати пароль",
      hidePassword: "Приховати пароль",
      submit: "Увійти",
      submitting: "Входимо…",
      invalidCredentials: "Неправильний email або пароль",
      forgotLink: "Забули пароль?",
      noAccount: "Немає акаунта?",
      registerLink: "Зареєструватися",
      demoAccess: "Демо-доступ",
      roleAdmin: "прораб",
      roleWorker: "робітник",
      roleClient: "замовник",
      resetSuccessNote: "Пароль змінено — увійдіть з новим паролем"
    },
    register: {
      title: "Реєстрація",
      subtitle: "Створіть акаунт у BudChat",
      inviteNote: "Вас запросили на об'єкт — він з'явиться одразу після реєстрації",
      namePlaceholder: "Ім'я",
      phonePlaceholder: "Телефон (необов'язково)",
      passwordPlaceholder: "Пароль (мінімум 6 символів)",
      submit: "Зареєструватися",
      submitting: "Створюємо акаунт…",
      haveAccount: "Вже є акаунт?",
      loginLink: "Увійти",
      errorGeneric: "Не вдалося зареєструватися",
      errorNetwork: "Помилка мережі, спробуйте ще раз"
    },
    forgotPassword: {
      title: "Відновлення пароля",
      subtitleBefore: "Введіть email вашого акаунта",
      subtitleAfter: "Перевірте пошту",
      sentTitle: "Якщо акаунт існує, лист надіслано",
      sentNote: "Посилання дійсне 1 годину. Не прийшло — перевірте папку «Спам».",
      backToLogin: "Повернутися до входу",
      submit: "Надіслати посилання",
      submitting: "Надсилаємо…",
      errorGeneric: "Не вдалося надіслати лист"
    },
    resetPassword: {
      invalidTitle: "Посилання недійсне",
      invalidNote: "Запросіть відновлення пароля знову.",
      requestLink: "Запросити посилання",
      title: "Новий пароль",
      subtitle: "Придумайте пароль для входу",
      newPasswordPlaceholder: "Новий пароль (мінімум 6 символів)",
      confirmPasswordPlaceholder: "Повторіть пароль",
      submit: "Зберегти пароль",
      submitting: "Зберігаємо…",
      errorMismatch: "Паролі не збігаються",
      errorGeneric: "Не вдалося змінити пароль"
    },
    footer: {
      prefix: "Продовжуючи, ви приймаєте",
      terms: "умови використання",
      and: "та",
      privacy: "політику конфіденційності"
    }
  },
  projects: {
    tabsProjects: "Об'єкти",
    tabsDashboard: "Зведення",
    emptyTitle: "Поки немає об'єктів",
    emptyDescription: "Створіть перший об'єкт будівництва — етапи, чат і кошторис з'являться автоматично.",
    emptyCta: "Створити об'єкт",
    newProjectLabel: "Новий об'єкт",
    dialog: {
      title: "Новий об'єкт",
      close: "Закрити",
      namePlaceholder: "Назва об'єкта",
      addressPlaceholder: "Адреса",
      currencyLabel: "Валюта кошторису",
      stagesPrefix: "Етапи:",
      stagesHint: "Список за замовчуванням підходить для ремонту квартири — приберіть зайве або додайте своє.",
      removeStagePrefix: "Прибрати етап",
      newStagePlaceholder: "Новий етап",
      submit: "Створити",
      submitting: "Створюємо…",
      errorNoStages: "Потрібен хоча б один етап",
      errorGeneric: "Не вдалося створити об'єкт"
    }
  },
  settings: {
    pageTitle: "Налаштування",
    pushSectionTitle: "Сповіщення на пристрій",
    language: {
      sectionTitle: "Мова",
      rowTitle: "Мова інтерфейсу",
      autoDetectedNote: "Визначена за мовою телефону — можна змінити будь-коли",
      sheetTitle: "Мова інтерфейсу",
      sheetHint: "Змінює мову в усьому застосунку. Назва BudChat не перекладається."
    },
    about: {
      sectionTitle: "Про застосунок",
      terms: "Умови використання",
      privacy: "Політика конфіденційності",
      support: "Підтримка"
    }
  }
};
