/**
 * Hlavní řídící třída (Master Orchestrator) sdružující a spouštějící všechny automatizace.
 *
 * Slouží jako jediný centrální vstupní bod pro Time-driven trigger,
 * takže není nutné vytvářet samostatný trigger pro každý skript zvlášť.
 */
class AutomationRunner {
  /**
   * Spustí postupně všechny registrované automatizace.
   * Každý běh je izolován v try-catch bloku, aby případná chyba v jednom procesu
   * neohrozila vykonání ostatních.
   */
  static runAll() {
    const startTime = new Date().getTime();
    Logger.log("==================================================");
    Logger.log("🚀 [AUTOMATION RUNNER] Zahájení dávkového zpracování");
    Logger.log("==================================================");

    const tasks = [
      {
        name: "Use Case 1: RegioJet jízdenky a faktury",
        fn: processRegioJetTickets
      },
      {
        name: "Use Case 2: Obecné přijaté faktury (OCR podle DIČ)",
        fn: processVatInvoices
      },
      {
        name: "Use Case 3: Vydané faktury Česká spořitelna",
        fn: processCsInvoices
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const task of tasks) {
      Logger.log(`\n▶️ Spouštím: ${task.name}...`);
      const taskStart = new Date().getTime();
      try {
        task.fn();
        const duration = ((new Date().getTime() - taskStart) / 1000).toFixed(1);
        Logger.log(`✅ ${task.name} dokončen za ${duration}s.`);
        successCount++;
      } catch (err) {
        const duration = ((new Date().getTime() - taskStart) / 1000).toFixed(1);
        Logger.log(`❌ ${task.name} selhal po ${duration}s s chybou: ${err.message}`);
        errorCount++;
      }
    }

    const totalDuration = ((new Date().getTime() - startTime) / 1000).toFixed(1);
    Logger.log("\n==================================================");
    Logger.log(`🏁 [AUTOMATION RUNNER] Hotovo za ${totalDuration}s. Úspěšně: ${successCount}, Chyb: ${errorCount}`);
    Logger.log("==================================================");
  }
}

/**
 * Hlavní funkce pro nastavení jediného časového spouštěče (Time-driven trigger).
 * Nastavte periodické spouštění (např. 1× denně nebo každých 6 hodin) právě na tuto funkci.
 */
function runAllAutomations() {
  AutomationRunner.runAll();
}