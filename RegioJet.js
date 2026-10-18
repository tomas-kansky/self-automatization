/**
 * Use Case 1: Zpracování jízdenek a daňových dokladů od RegioJet.
 *
 * Funkce je navržena pro spouštění časovým spouštěčem (Time-driven trigger).
 * Vyhledá e-maily od jizdenky@regiojet.cz, stáhne faktury a jízdenky,
 * uloží je do měsíčních složek na Disku, označí štítkem a archivuje.
 */
function processRegioJetTickets() {
  const rootFolderId = CONFIG.INVOICE_ROOT_FOLDER_ID;
  if (!rootFolderId || rootFolderId === "YOUR_DRIVE_FOLDER_ID") {
    throw new Error("Není nastaveno ID kořenové složky Disku. Nastavte INVOICE_ROOT_FOLDER_ID ve Script Properties.");
  }

  const processedLabel = ensureLabel(CONFIG.REGIOJET.PROCESSED_LABEL);
  
  // Bezpečný dotaz s časovým oknem 2 dny a vyloučením již zpracovaných vláken
  const searchQuery = `from:${CONFIG.REGIOJET.SENDER} subject:"${CONFIG.REGIOJET.SUBJECT_KEYWORD}" filename:${CONFIG.REGIOJET.ATTACHMENT_KEYWORD} newer_than:${CONFIG.REGIOJET.SEARCH_WINDOW} -label:${CONFIG.REGIOJET.PROCESSED_LABEL}`;
  const threads = GmailApp.search(searchQuery, 0, CONFIG.REGIOJET.MAX_THREADS);

  Logger.log(`[RegioJet] Nalezeno ${threads.length} nezpracovaných vláken.`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    let savedInvoicesCount = 0;

    for (const message of messages) {
      const subject = message.getSubject();
      if (!subject.includes(CONFIG.REGIOJET.SUBJECT_KEYWORD)) {
        continue;
      }

      // Extrakce data cesty z předmětu (např. "18.10")
      const dateMatch = subject.match(/(\d{2}\.\d{2})/);
      const travelDateStr = dateMatch ? dateMatch[1] : null;

      // Cílová podsložka podle data přijetí e-mailu (účetní období)
      const targetFolder = getOrCreateMonthFolder(rootFolderId, message.getDate());

      const attachments = message.getAttachments();
      for (const attachment of attachments) {
        const attachmentName = attachment.getName();
        if (attachmentName.toLowerCase().includes(CONFIG.REGIOJET.ATTACHMENT_KEYWORD)) {
          const extension = attachmentName.includes(".") ? attachmentName.split(".").pop() : "pdf";
          const newFileName = travelDateStr 
            ? `RJ_${travelDateStr}.${extension}` 
            : attachmentName;

          saveFileSafe(targetFolder, attachment.copyBlob(), newFileName);
          savedInvoicesCount++;
          Logger.log(`[RegioJet] Uložen soubor: ${newFileName} do ${targetFolder.getName()}`);
        }
      }
    }

    // Označení celého vlákna a přesun do archivu
    thread.addLabel(processedLabel);
    thread.moveToArchive();
    Logger.log(`[RegioJet] Vlákno označeno štítkem ${CONFIG.REGIOJET.PROCESSED_LABEL} a archivováno (uloženo ${savedInvoicesCount} souborů).`);
  }
}

/**
 * Zpětná kompatibilita pro stávající triggery nastavené na starý název funkce.
 */
function processInvoicesAutomatically() {
  processRegioJetTickets();
}
