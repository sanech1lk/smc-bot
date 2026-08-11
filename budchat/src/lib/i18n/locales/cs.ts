import type { Dictionary } from "@/lib/i18n";

export const cs: Dictionary = {
  common: {
    save: "Uložit",
    cancel: "Zrušit",
    done: "Hotovo",
    delete: "Smazat",
    back: "Zpět",
    close: "Zavřít",
    saving: "Ukládáme…",
    networkError: "Chyba sítě, zkuste to znovu"
  },
  topBar: {
    backLabel: "Zpět",
    settingsLabel: "Nastavení",
    signOutLabel: "Odhlásit se"
  },
  auth: {
    tagline: "Messenger pro stavební čety",
    login: {
      emailPlaceholder: "E-mail",
      passwordPlaceholder: "Heslo",
      showPassword: "Zobrazit heslo",
      hidePassword: "Skrýt heslo",
      submit: "Přihlásit se",
      submitting: "Přihlašujeme…",
      invalidCredentials: "Nesprávný e-mail nebo heslo",
      forgotLink: "Zapomenuté heslo?",
      noAccount: "Nemáte účet?",
      registerLink: "Zaregistrovat se",
      demoAccess: "Demo přístup",
      roleAdmin: "stavbyvedoucí",
      roleWorker: "dělník",
      roleClient: "klient",
      resetSuccessNote: "Heslo bylo změněno — přihlaste se novým heslem"
    },
    register: {
      title: "Registrace",
      subtitle: "Vytvořte si účet v BudChat",
      inviteNote: "Byli jste pozváni na stavbu — objeví se hned po registraci",
      namePlaceholder: "Jméno",
      phonePlaceholder: "Telefon (nepovinné)",
      passwordPlaceholder: "Heslo (minimálně 6 znaků)",
      submit: "Zaregistrovat se",
      submitting: "Vytváříme účet…",
      haveAccount: "Už máte účet?",
      loginLink: "Přihlásit se",
      errorGeneric: "Registraci se nepodařilo dokončit",
      errorNetwork: "Chyba sítě, zkuste to znovu"
    },
    forgotPassword: {
      title: "Obnovení hesla",
      subtitleBefore: "Zadejte e-mail svého účtu",
      subtitleAfter: "Zkontrolujte poštu",
      sentTitle: "Pokud účet existuje, e-mail byl odeslán",
      sentNote: "Odkaz platí 1 hodinu. Nepřišel — zkontrolujte složku Spam.",
      backToLogin: "Zpět na přihlášení",
      submit: "Odeslat odkaz",
      submitting: "Odesíláme…",
      errorGeneric: "E-mail se nepodařilo odeslat"
    },
    resetPassword: {
      invalidTitle: "Odkaz už není platný",
      invalidNote: "Vyžádejte si obnovení hesla znovu.",
      requestLink: "Vyžádat odkaz",
      title: "Nové heslo",
      subtitle: "Zvolte si heslo pro přihlášení",
      newPasswordPlaceholder: "Nové heslo (minimálně 6 znaků)",
      confirmPasswordPlaceholder: "Zopakujte heslo",
      submit: "Uložit heslo",
      submitting: "Ukládáme…",
      errorMismatch: "Hesla se neshodují",
      errorGeneric: "Heslo se nepodařilo změnit"
    },
    footer: {
      prefix: "Pokračováním souhlasíte s",
      terms: "podmínkami použití",
      and: "a",
      privacy: "zásadami ochrany osobních údajů"
    }
  },
  projects: {
    tabsProjects: "Stavby",
    tabsDashboard: "Přehled",
    emptyTitle: "Zatím žádné stavby",
    emptyDescription: "Vytvořte první stavbu — fáze, chat a rozpočet se zobrazí automaticky.",
    emptyCta: "Vytvořit stavbu",
    newProjectLabel: "Nová stavba",
    dialog: {
      title: "Nová stavba",
      close: "Zavřít",
      namePlaceholder: "Název stavby",
      addressPlaceholder: "Adresa",
      currencyLabel: "Měna rozpočtu",
      stagesPrefix: "Fáze:",
      stagesHint: "Výchozí seznam se hodí pro rekonstrukci bytu — odstraňte nepotřebné nebo přidejte vlastní.",
      removeStagePrefix: "Odebrat fázi",
      newStagePlaceholder: "Nová fáze",
      submit: "Vytvořit",
      submitting: "Vytváříme…",
      errorNoStages: "Je potřeba alespoň jedna fáze",
      errorGeneric: "Stavbu se nepodařilo vytvořit"
    }
  },
  settings: {
    pageTitle: "Nastavení",
    pushSectionTitle: "Oznámení na zařízení",
    language: {
      sectionTitle: "Jazyk",
      rowTitle: "Jazyk rozhraní",
      autoDetectedNote: "Nastaven podle jazyka telefonu — kdykoli jej můžete změnit",
      sheetTitle: "Jazyk rozhraní",
      sheetHint: "Změní jazyk v celé aplikaci. Název BudChat se nepřekládá."
    },
    about: {
      sectionTitle: "O aplikaci",
      terms: "Podmínky použití",
      privacy: "Zásady ochrany osobních údajů",
      support: "Podpora"
    }
  }
};
