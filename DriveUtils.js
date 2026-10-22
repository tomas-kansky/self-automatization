/**
 * Pomocné utility pro práci s Google Diskem, štítky v Gmailu a OCR.
 */

/**
 * Získá existující podsložku podle formátu "MM/YYYY" pod zadanou kořenovou složkou,
 * nebo ji vytvoří, pokud ještě neexistuje.
 *
 * @param {string} parentFolderId ID mateřské složky na Google Disku
 * @param {Date} [referenceDate=new Date()] Referenční datum (např. datum přijetí e-mailu)
 * @returns {GoogleAppsScript.Drive.Folder} Instance cílové složky
 */
function getOrCreateMonthFolder(parentFolderId, referenceDate) {
  const date = referenceDate || new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const folderName = `${month}/${year}`;

  const parentFolder = DriveApp.getFolderById(parentFolderId);
  const subFolders = parentFolder.getFoldersByName(folderName);

  if (subFolders.hasNext()) {
    return subFolders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Bezpečně uloží soubor do cílové složky s ochranou proti přepsání (kolizi názvů).
 * Pokud soubor se stejným názvem již ve složce existuje, přidá číselný suffix (např. _1, _2).
 *
 * @param {GoogleAppsScript.Drive.Folder} folder Cílová složka na Disku
 * @param {GoogleAppsScript.Base.Blob} blob Data souboru
 * @param {string} desiredName Požadovaný název souboru
 * @returns {GoogleAppsScript.Drive.File} Vytvořený soubor
 */
function saveFileSafe(folder, blob, desiredName) {
  let finalName = desiredName;
  const existingFiles = folder.getFilesByName(finalName);

  if (existingFiles.hasNext()) {
    const parts = desiredName.lastIndexOf(".") !== -1 
      ? [desiredName.substring(0, desiredName.lastIndexOf(".")), desiredName.substring(desiredName.lastIndexOf("."))]
      : [desiredName, ""];
    
    let counter = 1;
    while (folder.getFilesByName(`${parts[0]}_${counter}${parts[1]}`).hasNext()) {
      counter++;
    }
    finalName = `${parts[0]}_${counter}${parts[1]}`;
  }

  return folder.createFile(blob.copyBlob().setName(finalName));
}

/**
 * Zkontroluje existenci štítku v Gmailu a pokud neexistuje, vytvoří jej.
 *
 * @param {string} labelName Název štítku (např. "Processed_RJ" nebo "Invoices/Processed")
 * @returns {GoogleAppsScript.Gmail.GmailLabel} Instance štítku
 */
function ensureLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  return label;
}

/**
 * Normalizuje řetězec: odstraní bílé znaky, pomlčky a převede na velká písmena.
 *
 * @param {string} str Vstupní text
 * @returns {string} Normalizovaný text
 */
function normalizeIdentifier(str) {
  if (!str) return "";
  return String(str).replace(/[\s\-_]/g, "").toUpperCase();
}

/**
 * Převede binární data PDF na dočasný Google Dokument s OCR a extrahuje textový obsah.
 * Garantuje smazání vytvořeného dočasného dokumentu v bloku finally.
 *
 * @param {GoogleAppsScript.Base.Blob} pdfBlob Binární data PDF
 * @param {string} [language="cs"] Jazykový kód pro OCR
 * @returns {string} Extrahovaný text
 */
function extractTextFromPdfOcr(pdfBlob, language) {
  let tempDocId = null;
  try {
    const fileMetadata = {
      title: "temp_ocr_" + Date.now(),
      mimeType: "application/pdf"
    };

    const normalizedBlob = pdfBlob.copyBlob().setContentType("application/pdf");

    // Volání pokročilé služby Drive API (v2) s parametrem OCR
    // @ts-ignore
    const tempDoc = Drive.Files.insert(fileMetadata, normalizedBlob, {
      ocr: true,
      ocrLanguage: language || "cs"
    });

    tempDocId = tempDoc.id;

    // Načtení těla dokumentu
    const doc = DocumentApp.openById(tempDocId);
    return doc.getBody().getText();
  } finally {
    if (tempDocId) {
      try {
        DriveApp.getFileById(tempDocId).setTrashed(true);
      } catch (cleanupError) {
        Logger.log(`[DriveUtils] Varování: Nepodařilo se smazat dočasný dokument ${tempDocId}: ${cleanupError.message}`);
      }
    }
  }
}

/**
 * Pokusí se z textu faktury vyčíst Datum zdanitelného plnění (DUZP).
 *
 * @param {string} text Textový obsah faktury
 * @returns {{ month: string, year: string, day: string, date: Date } | null}
 */
function extractTaxDateFromText(text) {
  if (!text) return null;

  // Hledá formulace typu:
  // "Datum zdanitelného plnění: 30.09.2026"
  // "Datum zdan. plnění 30. 9. 2026"
  // "DUZP: 30.09.2026"
  const regex = /(?:datum\s+(?:uskute[cč]n[eě]n[ií]\s+)?(?:zdaniteln[eé]ho|zdan\.?)\s*pln[eě]n[ií]|duzp)[\s:]*([0-3]?\d)\s*[.\/-]\s*([0-1]?\d)\s*[.\/-]\s*(20\d{2})/i;
  const match = text.match(regex);

  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3];
    return {
      day: day,
      month: month,
      year: year,
      date: new Date(Number(year), Number(month) - 1, Number(day))
    };
  }

  return null;
}