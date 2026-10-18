/**
 * Pomocné utility pro práci s Google Diskem a štítky v Gmailu.
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
