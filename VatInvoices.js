/**
 * Use Case 2: Obecné přijaté faktury podle DIČ s využitím nativního Google OCR.
 *
 * Autonomně prohledává e-maily s PDF přílohami, provádí OCR čtení a hledá shodu
 * se zadaným DIČ odběratele. Úspěšně ověřené doklady ukládá na Google Disk,
 * neúspěšné označí štítkem Invoices/Ignored pro zabránění opakovanému skenování.
 */
function processVatInvoices() {
  const rootFolderId = CONFIG.INVOICE_ROOT_FOLDER_ID;
  if (!rootFolderId || rootFolderId === "YOUR_DRIVE_FOLDER_ID") {
    throw new Error("Není nastaveno ID kořenové složky Disku. Nastavte INVOICE_ROOT_FOLDER_ID ve Script Properties.");
  }

  const rawTargetVat = CONFIG.TARGET_VAT_ID;
  if (!rawTargetVat || rawTargetVat === "CZ1234567890") {
    throw new Error("Není nastaveno cílové DIČ. Nastavte TARGET_VAT_ID ve Script Properties.");
  }
  const normalizedTargetVat = normalizeIdentifier(rawTargetVat);

  const processedLabel = ensureLabel(CONFIG.VAT_INVOICES.PROCESSED_LABEL);
  const ignoredLabel = ensureLabel(CONFIG.VAT_INVOICES.IGNORED_LABEL);

  // Vyhledávací dotaz vylučující jak zpracované, tak ignorované e-maily
  const searchQuery = `has:attachment filename:pdf -label:${CONFIG.VAT_INVOICES.PROCESSED_LABEL} -label:${CONFIG.VAT_INVOICES.IGNORED_LABEL} newer_than:${CONFIG.VAT_INVOICES.SEARCH_WINDOW}`;
  const threads = GmailApp.search(searchQuery, 0, CONFIG.VAT_INVOICES.MAX_BATCH_SIZE);

  Logger.log(`[VAT Invoices] Nalezeno ${threads.length} kandidátních vláken k OCR analýze.`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    let matchedInvoicesCount = 0;
    let totalPdfAttachments = 0;

    for (const message of messages) {
      const attachments = message.getAttachments();
      
      for (const attachment of attachments) {
        const isPdf = attachment.getContentType() === "application/pdf" || 
                      attachment.getName().toLowerCase().endsWith(".pdf");
        
        if (!isPdf) {
          continue;
        }

        totalPdfAttachments++;
        const pdfBlob = attachment.copyBlob();
        const originalName = attachment.getName();

        Logger.log(`[VAT Invoices] Provádím OCR pro přílohu: ${originalName}`);
        
        try {
          const extractedText = extractTextFromPdfOcr(pdfBlob, CONFIG.VAT_INVOICES.OCR_LANGUAGE);
          const normalizedExtractedText = normalizeIdentifier(extractedText);

          if (normalizedExtractedText.includes(normalizedTargetVat)) {
            Logger.log(`[VAT Invoices] ✅ Nalezena shoda DIČ (${rawTargetVat}) v souboru: ${originalName}`);
            
            const targetFolder = getOrCreateMonthFolder(rootFolderId, message.getDate());
            saveFileSafe(targetFolder, pdfBlob, originalName);
            matchedInvoicesCount++;
          } else {
            Logger.log(`[VAT Invoices] ℹ️ DIČ v souboru ${originalName} nenalezeno.`);
          }
        } catch (err) {
          Logger.log(`[VAT Invoices] ⚠️ Chyba při OCR souboru ${originalName}: ${err.message}`);
        }
      }
    }

    // Vyhodnocení celého vlákna:
    if (matchedInvoicesCount > 0) {
      thread.addLabel(processedLabel);
      thread.moveToArchive();
      Logger.log(`[VAT Invoices] Vlákno označeno ${CONFIG.VAT_INVOICES.PROCESSED_LABEL} a archivováno (${matchedInvoicesCount} shod).`);
    } else if (totalPdfAttachments > 0) {
      // Vlákno mělo PDF, ale v žádném nebylo nalezeno vaše DIČ
      thread.addLabel(ignoredLabel);
      Logger.log(`[VAT Invoices] Vlákno označeno ${CONFIG.VAT_INVOICES.IGNORED_LABEL} (prevence re-processingu, zůstává v Inboxu).`);
    }
  }
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
      mimeType: "application/vnd.google-apps.document"
    };

    // Volání pokročilé služby Drive API (v2) s parametrem OCR
    // @ts-ignore
    const tempDoc = Drive.Files.insert(fileMetadata, pdfBlob, {
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
        Logger.log(`[VAT Invoices] Varování: Nepodařilo se smazat dočasný dokument ${tempDocId}: ${cleanupError.message}`);
      }
    }
  }
}
