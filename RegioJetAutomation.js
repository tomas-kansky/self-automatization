function processInvoicesAutomatically() {
  const targetSender = "jizdenky@regiojet.cz";
  const requiredSubjectText = "RegioJet: Elektronická jízdenka";
  const processedLabelName = "Processed_RJ";
  const parentFolderId = PropertiesService.getScriptProperties().getProperty("INVOICE_ROOT_FOLDER_ID") || "YOUR_DRIVE_FOLDER_ID";
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  
  const targetFolderName = `${month}/${year}`;
  const todayFormatted = `${year}/${month}/${day}`;
  
  let label = GmailApp.getUserLabelByName(processedLabelName);
  if (!label) {
    label = GmailApp.createLabel(processedLabelName);
  }
  
  const folder = getOrCreateSubFolder(parentFolderId, targetFolderName);
  
  const searchQuery = `from:${targetSender} subject:"${requiredSubjectText}" filename:invoice after:${todayFormatted} -label:${processedLabelName}`;
  const threads = GmailApp.search(searchQuery, 0, 20);
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      const subject = message.getSubject();
      if (!subject.includes(requiredSubjectText)) {
        continue;
      }
      
      const match = subject.match(/(\d{2}\.\d{2})/);
      const dateStr = match ? match[1] : null;
      
      const attachments = message.getAttachments();
      for (const attachment of attachments) {
        if (attachment.getName().toLowerCase().includes("invoice")) {
          const extension = attachment.getName().split(".").pop();
          const newName = dateStr ? `RJ_${dateStr}.${extension}` : attachment.getName();
          folder.createFile(attachment.copyBlob().setName(newName));
        }
      }
    }
    thread.addLabel(label);
    thread.moveToArchive();
  }
}

function getOrCreateSubFolder(parentFolderId, subFolderName) {
  const parentFolder = DriveApp.getFolderById(parentFolderId);
  const subFolders = parentFolder.getFoldersByName(subFolderName);
  if (subFolders.hasNext()) {
    return subFolders.next();
  }
  return parentFolder.createFolder(subFolderName);
}