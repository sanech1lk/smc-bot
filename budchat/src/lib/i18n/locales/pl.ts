import type { Dictionary } from "@/lib/i18n";

export const pl: Dictionary = {
  common: {
    save: "Zapisz",
    cancel: "Anuluj",
    done: "Gotowe",
    delete: "Usuń",
    back: "Wstecz",
    close: "Zamknij",
    saving: "Zapisywanie…",
    networkError: "Błąd sieci, spróbuj ponownie"
  },
  topBar: {
    backLabel: "Wstecz",
    settingsLabel: "Ustawienia",
    signOutLabel: "Wyloguj się"
  },
  auth: {
    tagline: "Komunikator dla ekip budowlanych",
    login: {
      emailPlaceholder: "Email",
      passwordPlaceholder: "Hasło",
      showPassword: "Pokaż hasło",
      hidePassword: "Ukryj hasło",
      submit: "Zaloguj się",
      submitting: "Logowanie…",
      invalidCredentials: "Nieprawidłowy email lub hasło",
      forgotLink: "Nie pamiętasz hasła?",
      noAccount: "Nie masz konta?",
      registerLink: "Zarejestruj się",
      demoAccess: "Dostęp demo",
      roleAdmin: "kierownik budowy",
      roleWorker: "pracownik",
      roleClient: "klient",
      resetSuccessNote: "Hasło zmienione — zaloguj się nowym hasłem"
    },
    register: {
      title: "Rejestracja",
      subtitle: "Utwórz konto w BudChat",
      inviteNote: "Zostałeś zaproszony do obiektu — pojawi się od razu po rejestracji",
      namePlaceholder: "Imię",
      phonePlaceholder: "Telefon (opcjonalnie)",
      passwordPlaceholder: "Hasło (minimum 6 znaków)",
      submit: "Zarejestruj się",
      submitting: "Tworzenie konta…",
      haveAccount: "Masz już konto?",
      loginLink: "Zaloguj się",
      errorGeneric: "Nie udało się zarejestrować",
      errorNetwork: "Błąd sieci, spróbuj ponownie"
    },
    forgotPassword: {
      title: "Odzyskiwanie hasła",
      subtitleBefore: "Podaj email swojego konta",
      subtitleAfter: "Sprawdź pocztę",
      sentTitle: "Jeśli konto istnieje, wiadomość została wysłana",
      sentNote: "Link jest ważny 1 godzinę. Nie dotarł — sprawdź folder Spam.",
      backToLogin: "Wróć do logowania",
      submit: "Wyślij link",
      submitting: "Wysyłanie…",
      errorGeneric: "Nie udało się wysłać wiadomości"
    },
    resetPassword: {
      invalidTitle: "Link jest nieprawidłowy",
      invalidNote: "Poproś o odzyskanie hasła ponownie.",
      requestLink: "Poproś o link",
      title: "Nowe hasło",
      subtitle: "Wymyśl hasło do logowania",
      newPasswordPlaceholder: "Nowe hasło (minimum 6 znaków)",
      confirmPasswordPlaceholder: "Powtórz hasło",
      submit: "Zapisz hasło",
      submitting: "Zapisywanie…",
      errorMismatch: "Hasła nie są zgodne",
      errorGeneric: "Nie udało się zmienić hasła"
    },
    footer: {
      prefix: "Kontynuując, akceptujesz",
      terms: "regulamin",
      and: "oraz",
      privacy: "politykę prywatności"
    }
  },
  projects: {
    tabsProjects: "Obiekty",
    tabsDashboard: "Podsumowanie",
    emptyTitle: "Brak obiektów",
    emptyDescription: "Utwórz pierwszy obiekt budowy — etapy, czat i kosztorys pojawią się automatycznie.",
    emptyCta: "Utwórz obiekt",
    newProjectLabel: "Nowy obiekt",
    dialog: {
      title: "Nowy obiekt",
      close: "Zamknij",
      namePlaceholder: "Nazwa obiektu",
      addressPlaceholder: "Adres",
      currencyLabel: "Waluta kosztorysu",
      stagesPrefix: "Etapy:",
      stagesHint: "Domyślna lista pasuje do remontu mieszkania — usuń zbędne lub dodaj własne.",
      removeStagePrefix: "Usuń etap",
      newStagePlaceholder: "Nowy etap",
      submit: "Utwórz",
      submitting: "Tworzenie…",
      errorNoStages: "Potrzebny jest przynajmniej jeden etap",
      errorGeneric: "Nie udało się utworzyć obiektu"
    }
  },
  settings: {
    pageTitle: "Ustawienia",
    pushSectionTitle: "Powiadomienia na urządzeniu",
    language: {
      sectionTitle: "Język",
      rowTitle: "Język interfejsu",
      autoDetectedNote: "Dopasowany do języka telefonu — możesz go zmienić w każdej chwili",
      sheetTitle: "Język interfejsu",
      sheetHint: "Zmienia język w całej aplikacji. Nazwa BudChat nie jest tłumaczona."
    },
    about: {
      sectionTitle: "O aplikacji",
      terms: "Regulamin",
      privacy: "Polityka prywatności",
      support: "Wsparcie"
    }
  }
};
