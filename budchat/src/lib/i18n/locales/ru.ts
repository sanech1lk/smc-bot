export const ru = {
  common: {
    save: "Сохранить",
    cancel: "Отмена",
    done: "Готово",
    delete: "Удалить",
    back: "Назад",
    close: "Закрыть",
    saving: "Сохраняем…",
    networkError: "Ошибка сети, попробуйте снова"
  },
  topBar: {
    backLabel: "Назад",
    settingsLabel: "Настройки",
    signOutLabel: "Выйти"
  },
  auth: {
    tagline: "Мессенджер для строительных бригад",
    login: {
      emailPlaceholder: "Email",
      passwordPlaceholder: "Пароль",
      showPassword: "Показать пароль",
      hidePassword: "Скрыть пароль",
      submit: "Войти",
      submitting: "Входим…",
      invalidCredentials: "Неверный email или пароль",
      forgotLink: "Забыли пароль?",
      noAccount: "Нет аккаунта?",
      registerLink: "Зарегистрироваться",
      demoAccess: "Демо-доступ",
      roleAdmin: "прораб",
      roleWorker: "рабочий",
      roleClient: "заказчик",
      resetSuccessNote: "Пароль изменён — войдите с новым паролем"
    },
    register: {
      title: "Регистрация",
      subtitle: "Создайте аккаунт в BudChat",
      inviteNote: "Вас пригласили на объект — он появится сразу после регистрации",
      namePlaceholder: "Имя",
      phonePlaceholder: "Телефон (необязательно)",
      passwordPlaceholder: "Пароль (минимум 6 символов)",
      submit: "Зарегистрироваться",
      submitting: "Создаём аккаунт…",
      haveAccount: "Уже есть аккаунт?",
      loginLink: "Войти",
      errorGeneric: "Не удалось зарегистрироваться",
      errorNetwork: "Ошибка сети, попробуйте снова"
    },
    forgotPassword: {
      title: "Восстановление пароля",
      subtitleBefore: "Введите email от вашего аккаунта",
      subtitleAfter: "Проверьте почту",
      sentTitle: "Если аккаунт существует, письмо отправлено",
      sentNote: "Ссылка действует 1 час. Не пришло — проверьте папку «Спам».",
      backToLogin: "Вернуться ко входу",
      submit: "Отправить ссылку",
      submitting: "Отправляем…",
      errorGeneric: "Не удалось отправить письмо"
    },
    resetPassword: {
      invalidTitle: "Ссылка недействительна",
      invalidNote: "Запросите восстановление пароля заново.",
      requestLink: "Запросить ссылку",
      title: "Новый пароль",
      subtitle: "Придумайте пароль для входа",
      newPasswordPlaceholder: "Новый пароль (минимум 6 символов)",
      confirmPasswordPlaceholder: "Повторите пароль",
      submit: "Сохранить пароль",
      submitting: "Сохраняем…",
      errorMismatch: "Пароли не совпадают",
      errorGeneric: "Не удалось изменить пароль"
    },
    footer: {
      prefix: "Продолжая, вы принимаете",
      terms: "условия использования",
      and: "и",
      privacy: "политику конфиденциальности"
    }
  },
  projects: {
    tabsProjects: "Объекты",
    tabsDashboard: "Сводка",
    emptyTitle: "Пока нет объектов",
    emptyDescription: "Создайте первый объект стройки — этапы, чат и смета появятся автоматически.",
    emptyCta: "Создать объект",
    newProjectLabel: "Новый объект",
    dialog: {
      title: "Новый объект",
      close: "Закрыть",
      namePlaceholder: "Название объекта",
      addressPlaceholder: "Адрес",
      currencyLabel: "Валюта сметы",
      stagesPrefix: "Этапы:",
      stagesHint: "Список по умолчанию подходит для ремонта квартиры — уберите лишние или добавьте свои.",
      removeStagePrefix: "Убрать этап",
      newStagePlaceholder: "Новый этап",
      submit: "Создать",
      submitting: "Создаём…",
      errorNoStages: "Нужен хотя бы один этап",
      errorGeneric: "Не удалось создать объект"
    }
  },
  settings: {
    pageTitle: "Настройки",
    pushSectionTitle: "Уведомления на устройство",
    language: {
      sectionTitle: "Язык",
      rowTitle: "Язык интерфейса",
      autoDetectedNote: "Определён по языку телефона — можно сменить в любой момент",
      sheetTitle: "Язык интерфейса",
      sheetHint: "Меняет язык во всём приложении. Название BudChat не переводится."
    },
    about: {
      sectionTitle: "О приложении",
      terms: "Условия использования",
      privacy: "Политика конфиденциальности",
      support: "Поддержка"
    }
  }
} as const;
