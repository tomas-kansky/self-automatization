/**
 * Globální konfigurace a přístup k vlastnostem skriptu (Script Properties).
 *
 * Citlivé hodnoty (ID kořenové složky, DIČ, klientský e-mail) jsou bezpečně čteny z Google Script Properties.
 * Pokud ještě nejsou v cloudu nastaveny, použije se bezpečný zástupný text.
 */
const CONFIG = {
  // =========================================================================
  // Společné globální parametry pro všechny automatizace
  // =========================================================================
  
  // Sjednocené časové okno pro vyhledávání (např. "7d", "14d", "30d")
  // Změnou této jediné hodnoty se změní časové okno pro všechny tři procesy najednou.
  SEARCH_WINDOW: "7d",

  // Kořenová složka na Google Disku pro ukládání všech faktur
  get INVOICE_ROOT_FOLDER_ID() {
    return PropertiesService.getScriptProperties().getProperty("INVOICE_ROOT_FOLDER_ID") || "YOUR_DRIVE_FOLDER_ID";
  },

  // Hledané DIČ pro obecné i vydané faktury
  get TARGET_VAT_ID() {
    return PropertiesService.getScriptProperties().getProperty("TARGET_VAT_ID") || "CZ1234567890";
  },

  // =========================================================================
  // Specifické parametry pro jednotlivé moduly
  // =========================================================================

  // Parametry pro Use Case 1: RegioJet jízdenky a faktury
  REGIOJET: {
    SENDER: "jizdenky@regiojet.cz",
    SUBJECT_KEYWORD: "RegioJet: Elektronická jízdenka",
    PROCESSED_LABEL: "Processed_RJ",
    ATTACHMENT_KEYWORD: "invoice",
    get SEARCH_WINDOW() { return CONFIG.SEARCH_WINDOW; },
    MAX_THREADS: 20
  },

  // Parametry pro Use Case 2: Obecné přijaté faktury podle DIČ s OCR
  VAT_INVOICES: {
    PROCESSED_LABEL: "Invoices/Processed",
    IGNORED_LABEL: "Invoices/Ignored",
    get SEARCH_WINDOW() { return CONFIG.SEARCH_WINDOW; },
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
    get SEARCH_WINDOW() { return CONFIG.SEARCH_WINDOW; },
    FILE_PREFIX: "ČS",
    MAX_THREADS: 10,
    OCR_LANGUAGE: "cs"
  }
};