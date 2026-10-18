/**
 * Globální konfigurace a přístup k vlastnostem skriptu (Script Properties).
 *
 * Citlivé hodnoty (ID kořenové složky, DIČ) jsou bezpečně čteny z Google Script Properties.
 * Pokud ještě nejsou v cloudu nastaveny, použije se bezpečný zástupný text.
 */
const CONFIG = {
  // Kořenová složka na Google Disku pro ukládání všech faktur
  get INVOICE_ROOT_FOLDER_ID() {
    return PropertiesService.getScriptProperties().getProperty("INVOICE_ROOT_FOLDER_ID") || "YOUR_DRIVE_FOLDER_ID";
  },

  // Hledané DIČ odběratele pro obecné faktury (Use Case 2)
  get TARGET_VAT_ID() {
    return PropertiesService.getScriptProperties().getProperty("TARGET_VAT_ID") || "CZ1234567890";
  },

  // Parametry pro Use Case 1: RegioJet jízdenky a faktury
  REGIOJET: {
    SENDER: "jizdenky@regiojet.cz",
    SUBJECT_KEYWORD: "RegioJet: Elektronická jízdenka",
    PROCESSED_LABEL: "Processed_RJ",
    ATTACHMENT_KEYWORD: "invoice",
    SEARCH_WINDOW: "2d", // 2 dny pro bezpečné překlenutí přelomu půlnoci
    MAX_THREADS: 20
  },

  // Parametry pro Use Case 2: Obecné přijaté faktury podle DIČ s OCR
  VAT_INVOICES: {
    PROCESSED_LABEL: "Invoices/Processed",
    IGNORED_LABEL: "Invoices/Ignored",
    SEARCH_WINDOW: "7d",
    MAX_BATCH_SIZE: 10,  // Ochrana proti překročení 6minutového limitu GAS
    OCR_LANGUAGE: "cs"
  }
};
