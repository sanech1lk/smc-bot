import type { Dictionary } from "@/lib/i18n";

export const de: Dictionary = {
  common: {
    save: "Speichern",
    cancel: "Abbrechen",
    done: "Fertig",
    delete: "Löschen",
    back: "Zurück",
    close: "Schließen",
    saving: "Speichert…",
    networkError: "Netzwerkfehler, bitte erneut versuchen"
  },
  topBar: {
    backLabel: "Zurück",
    settingsLabel: "Einstellungen",
    signOutLabel: "Abmelden"
  },
  auth: {
    tagline: "Messenger für Baubrigaden",
    login: {
      emailPlaceholder: "E-Mail",
      passwordPlaceholder: "Passwort",
      showPassword: "Passwort anzeigen",
      hidePassword: "Passwort verbergen",
      submit: "Anmelden",
      submitting: "Anmeldung läuft…",
      invalidCredentials: "Falsche E-Mail oder falsches Passwort",
      forgotLink: "Passwort vergessen?",
      noAccount: "Noch kein Konto?",
      registerLink: "Registrieren",
      demoAccess: "Demo-Zugang",
      roleAdmin: "Bauleiter",
      roleWorker: "Arbeiter",
      roleClient: "Kunde",
      resetSuccessNote: "Passwort geändert — mit dem neuen Passwort anmelden"
    },
    register: {
      title: "Registrierung",
      subtitle: "Konto in BudChat erstellen",
      inviteNote: "Sie wurden zu einer Baustelle eingeladen — sie erscheint direkt nach der Registrierung",
      namePlaceholder: "Name",
      phonePlaceholder: "Telefon (optional)",
      passwordPlaceholder: "Passwort (mindestens 6 Zeichen)",
      submit: "Registrieren",
      submitting: "Konto wird erstellt…",
      haveAccount: "Bereits ein Konto?",
      loginLink: "Anmelden",
      errorGeneric: "Registrierung fehlgeschlagen",
      errorNetwork: "Netzwerkfehler, bitte erneut versuchen"
    },
    forgotPassword: {
      title: "Passwort zurücksetzen",
      subtitleBefore: "E-Mail Ihres Kontos eingeben",
      subtitleAfter: "Postfach prüfen",
      sentTitle: "Falls das Konto existiert, wurde eine E-Mail gesendet",
      sentNote: "Der Link ist 1 Stunde gültig. Nichts erhalten — Spam-Ordner prüfen.",
      backToLogin: "Zurück zur Anmeldung",
      submit: "Link senden",
      submitting: "Wird gesendet…",
      errorGeneric: "E-Mail konnte nicht gesendet werden"
    },
    resetPassword: {
      invalidTitle: "Dieser Link ist nicht mehr gültig",
      invalidNote: "Fordern Sie die Passwortwiederherstellung erneut an.",
      requestLink: "Link anfordern",
      title: "Neues Passwort",
      subtitle: "Wählen Sie ein Passwort für die Anmeldung",
      newPasswordPlaceholder: "Neues Passwort (mindestens 6 Zeichen)",
      confirmPasswordPlaceholder: "Passwort wiederholen",
      submit: "Passwort speichern",
      submitting: "Speichert…",
      errorMismatch: "Die Passwörter stimmen nicht überein",
      errorGeneric: "Passwort konnte nicht geändert werden"
    },
    footer: {
      prefix: "Mit der Fortsetzung akzeptieren Sie die",
      terms: "Nutzungsbedingungen",
      and: "und die",
      privacy: "Datenschutzrichtlinie"
    }
  },
  projects: {
    tabsProjects: "Baustellen",
    tabsDashboard: "Übersicht",
    emptyTitle: "Noch keine Baustellen",
    emptyDescription: "Erstellen Sie Ihre erste Baustelle — Phasen, Chat und Kostenvoranschlag erscheinen automatisch.",
    emptyCta: "Baustelle erstellen",
    newProjectLabel: "Neue Baustelle",
    dialog: {
      title: "Neue Baustelle",
      close: "Schließen",
      namePlaceholder: "Name der Baustelle",
      addressPlaceholder: "Adresse",
      currencyLabel: "Währung des Kostenvoranschlags",
      stagesPrefix: "Phasen:",
      stagesHint: "Die Standardliste eignet sich für Wohnungsrenovierungen — Unnötiges entfernen oder eigene hinzufügen.",
      removeStagePrefix: "Phase entfernen",
      newStagePlaceholder: "Neue Phase",
      submit: "Erstellen",
      submitting: "Wird erstellt…",
      errorNoStages: "Mindestens eine Phase ist erforderlich",
      errorGeneric: "Baustelle konnte nicht erstellt werden"
    }
  },
  settings: {
    pageTitle: "Einstellungen",
    pushSectionTitle: "Benachrichtigungen auf dem Gerät",
    language: {
      sectionTitle: "Sprache",
      rowTitle: "Sprache der Oberfläche",
      autoDetectedNote: "An die Sprache Ihres Telefons angepasst — jederzeit änderbar",
      sheetTitle: "Sprache der Oberfläche",
      sheetHint: "Ändert die Sprache in der gesamten App. Der Name BudChat wird nicht übersetzt."
    },
    about: {
      sectionTitle: "Über die App",
      terms: "Nutzungsbedingungen",
      privacy: "Datenschutzrichtlinie",
      support: "Support"
    }
  }
};
