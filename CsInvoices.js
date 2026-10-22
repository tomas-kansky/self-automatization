/**
 * Use Case 3: Vydané faktury Česká spořitelna (odeslané na klientský e-mail).
 *
 * Monitoruje odeslané e-maily klientovi, ověřuje PDF přílohu s vaším DIČ,
 * detekuje Datum zdanitelného plnění (DUZP) a uloží fakturu do odpovídající složky
 * s pojmenováním např. "ČS_09_2026.pdf".
 */
function processCsInvoices() {
  const rootFolderId = CONFIG.INVOICE_ROOT_FOLDER_ID;
  if (!rootFolderId || rootFolderId === "YOUR_DRIVE_FOLDER_ID") {
    throw new Error("Není nastaveno ID kořenové složky Disku. Nastavte INVOICE_ROOT_FOLDER_ID ve Script Properties.");
  }

  const rawTargetVat = CONFIG.TARGET_VAT_ID;
  if (!rawTargetVat || rawTargetVat === "CZ1234567890") {
    throw new Error("Není nastaveno cílové DIČ. Nastavte TARGET_VAT_ID ve Script Properties.");
  }
  const normalizedTargetVat = normalizeIdentifier(rawTargetVat);

  const recipientEmail = CONFIG.CS_INVOICES.RECIPIENT_EMAIL;
  if (!recipientEmail || recipientEmail === "recipient@example.com") {
    throw new Error("Není nastaven e-mail příjemce pro ČS faktury. Nastavte CS_INVOICE_RECIPIENT_EMAIL ve Script Properties.");
  }

  const processedLabel = ensureLabel(CONFIG.CS_INVOICES.PROCESSED_LABEL);
  const ignoredLabel = ensureLabel(CONFIG.CS_INVOICES.IGNORED_LABEL);

  // Vyhledávací dotaz pro odeslané e-maily s PDF
  const searchQuery = `to:${recipientEmail} has:attachment filename:pdf -label:${CONFIG.CS_INVOICES.PROCESSED_LABEL} -label:${CONFIG.CS_INVOICES.IGNORED_LABEL} newer_than:${CONFIG.CS_INVOICES.SEARCH_WINDOW}`;
  const threads = GmailApp.search(searchQuery, 0, CONFIG.CS_INVOICES.MAX_THREADS);

  Logger.log(`[ČS Invoices] Nalezeno ${threads.length} odeslaných vláken k prověření.`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    let savedInvoicesCount = 0;
    let totalPdfCount = 0;
    let ocrErrorsCount = 0;

    for (const message of messages) {
      const attachments = message.getAttachments();

      for (const attachment of attachments) {
        const isPdf = attachment.getContentType() === "application/pdf" || 
                      attachment.getName().toLowerCase().endsWith(".pdf");

        if (!isPdf) {
          continue;
        }

        totalPdfCount++;
        const pdfBlob = attachment.copyBlob();
        const originalName = attachment.getName();

        Logger.log(`[ČS Invoices] Provádím OCR pro odeslanou přílohu: ${originalName}`);

        try {
          const extractedText = extractTextFromPdfOcr(pdfBlob, CONFIG.CS_INVOICES.OCR_LANGUAGE);
          const normalizedExtractedText = normalizeIdentifier(extractedText);

          // Kontrola, zda se ve faktuře nachází vaše DIČ (jako dodavatele)
          if (normalizedExtractedText.includes(normalizedTargetVat)) {
            Logger.log(`[ČS Invoices] ✅ Ověřeno vaše DIČ (${rawTargetVat}) v souboru: ${originalName}`);

            // Určení data zdanitelného plnění (DUZP) z textu faktury
            const taxDateInfo = extractTaxDateFromText(extractedText);
            
            let month = "";
            let year = "";
            let targetDate = message.getDate();

            if (taxDateInfo) {
              month = taxDateInfo.month;
              year = taxDateInfo.year;
              targetDate = taxDateInfo.date;
              Logger.log(`[ČS Invoices] 📅 Z textu zjištěno DUZP: ${taxDateInfo.day}.${month}.${year}`);
            } else {
              // Fallback na datum odeslání zprávy
              month = String(targetDate.getMonth() + 1).padStart(2, "0");
              year = String(targetDate.getFullYear());
              Logger.log(`[ČS Invoices] ℹ️ DUZP v textu nenalezeno, použito datum zprávy: ${month}/${year}`);
            }

            // Cílový název podle formátu: ČS_MM_YYYY.pdf (např. ČS_09_2026.pdf)
            const desiredFileName = `${CONFIG.CS_INVOICES.FILE_PREFIX}_${month}_${year}.pdf`;

            // Získání nebo vytvoření cílové složky MM/YYYY
            const targetFolder = getOrCreateMonthFolder(rootFolderId, targetDate);

            // Bezpečné uložení souboru na Google Disk
            const savedFile = saveFileSafe(targetFolder, pdfBlob, desiredFileName);
            savedInvoicesCount++;
            Logger.log(`[ČS Invoices] 💾 Faktura uložena jako: ${savedFile.getName()} do složky: ${targetFolder.getName()}`);
          } else {
            Logger.log(`[ČS Invoices] ℹ️ Vaše DIČ v souboru ${originalName} nenalezeno.`);
          }
        } catch (err) {
          ocrErrorsCount++;
          Logger.log(`[ČS Invoices] ⚠️ Chyba při zpracování OCR: ${err.message}`);
        }
      }
    }

    // Označení vlákna štítkem
    if (savedInvoicesCount > 0) {
      thread.addLabel(processedLabel);
      Logger.log(`[ČS Invoices] Vlákno označeno štítkem ${CONFIG.CS_INVOICES.PROCESSED_LABEL} (uloženo ${savedInvoicesCount} faktur).`);
    } else if (totalPdfCount > 0 && ocrErrorsCount === 0) {
      thread.addLabel(ignoredLabel);
      Logger.log(`[ČS Invoices] Vlákno označeno štítkem ${CONFIG.CS_INVOICES.IGNORED_LABEL}.`);
    } else if (ocrErrorsCount > 0) {
      Logger.log(`[ČS Invoices] ⚠️ Vlákno ponecháno bez štítku kvůli chybě OCR (${ocrErrorsCount}×), zkusí se znovu v dalším běhu.`);
    }
  }
}