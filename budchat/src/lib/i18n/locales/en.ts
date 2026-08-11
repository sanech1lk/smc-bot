import type { Dictionary } from "@/lib/i18n";

export const en: Dictionary = {
  common: {
    save: "Save",
    cancel: "Cancel",
    done: "Done",
    delete: "Delete",
    back: "Back",
    close: "Close",
    saving: "Saving…",
    networkError: "Network error, please try again"
  },
  topBar: {
    backLabel: "Back",
    settingsLabel: "Settings",
    signOutLabel: "Sign out"
  },
  auth: {
    tagline: "Messenger for construction crews",
    login: {
      emailPlaceholder: "Email",
      passwordPlaceholder: "Password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      submit: "Sign in",
      submitting: "Signing in…",
      invalidCredentials: "Incorrect email or password",
      forgotLink: "Forgot password?",
      noAccount: "No account yet?",
      registerLink: "Sign up",
      demoAccess: "Demo access",
      roleAdmin: "site manager",
      roleWorker: "worker",
      roleClient: "client",
      resetSuccessNote: "Password changed — sign in with your new password"
    },
    register: {
      title: "Sign up",
      subtitle: "Create your BudChat account",
      inviteNote: "You've been invited to a site — it will appear right after you sign up",
      namePlaceholder: "Name",
      phonePlaceholder: "Phone (optional)",
      passwordPlaceholder: "Password (6 characters minimum)",
      submit: "Sign up",
      submitting: "Creating account…",
      haveAccount: "Already have an account?",
      loginLink: "Sign in",
      errorGeneric: "Couldn't sign up",
      errorNetwork: "Network error, please try again"
    },
    forgotPassword: {
      title: "Password recovery",
      subtitleBefore: "Enter your account email",
      subtitleAfter: "Check your inbox",
      sentTitle: "If the account exists, an email was sent",
      sentNote: "The link is valid for 1 hour. Didn't get it — check your spam folder.",
      backToLogin: "Back to sign in",
      submit: "Send link",
      submitting: "Sending…",
      errorGeneric: "Couldn't send the email"
    },
    resetPassword: {
      invalidTitle: "This link is no longer valid",
      invalidNote: "Request password recovery again.",
      requestLink: "Request a link",
      title: "New password",
      subtitle: "Choose a password to sign in with",
      newPasswordPlaceholder: "New password (6 characters minimum)",
      confirmPasswordPlaceholder: "Repeat password",
      submit: "Save password",
      submitting: "Saving…",
      errorMismatch: "Passwords don't match",
      errorGeneric: "Couldn't change the password"
    },
    footer: {
      prefix: "By continuing, you accept the",
      terms: "terms of service",
      and: "and",
      privacy: "privacy policy"
    }
  },
  projects: {
    tabsProjects: "Sites",
    tabsDashboard: "Overview",
    emptyTitle: "No sites yet",
    emptyDescription: "Create your first construction site — stages, chat and the estimate appear automatically.",
    emptyCta: "Create a site",
    newProjectLabel: "New site",
    dialog: {
      title: "New site",
      close: "Close",
      namePlaceholder: "Site name",
      addressPlaceholder: "Address",
      currencyLabel: "Estimate currency",
      stagesPrefix: "Stages:",
      stagesHint: "The default list suits an apartment renovation — remove what you don't need or add your own.",
      removeStagePrefix: "Remove stage",
      newStagePlaceholder: "New stage",
      submit: "Create",
      submitting: "Creating…",
      errorNoStages: "At least one stage is required",
      errorGeneric: "Couldn't create the site"
    }
  },
  settings: {
    pageTitle: "Settings",
    pushSectionTitle: "Device notifications",
    language: {
      sectionTitle: "Language",
      rowTitle: "Interface language",
      autoDetectedNote: "Matched to your phone's language — change it any time",
      sheetTitle: "Interface language",
      sheetHint: "Changes the language across the whole app. The name BudChat isn't translated."
    },
    about: {
      sectionTitle: "About",
      terms: "Terms of service",
      privacy: "Privacy policy",
      support: "Support"
    }
  }
};
