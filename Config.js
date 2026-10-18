/**
 * Globální konfigurace a přístup k vlastnostem skriptu (Script Properties).
 *
 * Citlivé hodnoty (ID kořenové složky, DIČ, klientský e-mail) jsou bezpečně čteny z Google Script Properties.
 * Pokud ještě nejsou v cloudu nastaveny, použije se bezpečný zástupný text.
 */
const CONFIG = {
  // Kořenová složka na Google Disku pro ukládání všech faktur
  get INVOICE_ROOT_FOLDER_ID() {
    return PropertiesService.getScriptProperties().getProperty("INVOICE_ROOT_FOLDER_ID") || "YOUR_DRIVE_FOLDER_ID";
  },

  // Hledané DIČ pro obecné i vydané faktury
  get TARGET_VAT_ID() {
    return PropertiesService.getScriptProperties().getProperty("TARGET_VAT_ID") || "CZ1234567890";
  },

  // Parametry pro Use Case 1: RegioJet jízdenky a faktury
  REGIOJET: {
    SENDER: "jizdenky@regiojet.cz",
    SUBJECT_KEYWORD: "RegioJet: Elektronická jízdenka",
    PROCESSED_LABEL: "Processed_RJ",
    ATTACHMENT_KEYWORD: "invoice",
    SEARCH_WINDOW: "7d", // Sjednocené okno 7 dní
    MAX_THREADS: 20
  },

  // Parametry pro Use Case 2: Obecné přijaté faktury podle DIČ s OCR
  VAT_INVOICES: {
    PROCESSED_LABEL: "Invoices/Processed",
    IGNORED_LABEL: "Invoices/Ignored",
    SEARCH_WINDOW: "7d",
    MAX_BATCH_SIZE: 10,  // Ochrana proti překročení 6minutového limitu GAS
    OCR_LANGUAGE: "cs"
  },

  // Parametry pro Use Case 3: Vydané faktury Česká spořitelna
  CS_INVOICES: {
    get RECIPIENT_EMAIL() {
      return PropertiesService.getScriptProperties().getProperty("CS_INVOICE_RECIPIENT_EMAIL") || "recipient@example.com";
    },
    PROCESSED_LABEL: "Invoices/Processed_CS",
    IGNORED_LABEL: "Invoices/Ignored_CS",
    SEARCH_WINDOW: "30d", // 30denní okno pro spolehlivé zachycení měsíční fakturace
    FILE_PREFIX: "ČS",
    MAX_THREADS: 10,
    OCR_LANGUAGE: "cs"
  }
};