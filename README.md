# Self Automation (Google Apps Script)

Automatizační skripty běžící na platformě Google Apps Script (GAS) vyvíjené lokálně pomocí nástroje Google Clasp.

## 📋 Specifikace a Use Cases

Kompletní popis architektury, filtrů a budoucího rozvoje naleznete v [USE_CASES.md](./USE_CASES.md).

- **Use Case 1 (RegioJet):** Automatické stahování a ukládání jízdenek/faktur z Gmailu na Google Disk podle měsíců.
- **Use Case 2 (Přijaté faktury podle DIČ s OCR):** Autonomní skenování přijatých PDF faktur pomocí nativního Google OCR a párování na DIČ.
- **Use Case 3 (Vydané faktury Česká spořitelna):** Sledování odeslaných faktur klientovi, detekce data zdanitelného plnění (DUZP) přes OCR a ukládání ve formátu `ČS_MM_YYYY.pdf`.
- **Master Orchestrator (`AutomationRunner`):** Centrální třída spouštějící všechny procesy v izolovaných blocích pod jediným časovým spouštěčem (`runAllAutomations`).

## 🛠️ Lokální vývoj s Clasp

Tento repozitář je připraven pro lokální editaci v jakémkoliv editoru s podporou našeptávání typů (`@types/google-apps-script`).

### První spuštění

1. Zkopírujte šablonu nastavení Clasp:
   ```bash
   cp .clasp.json.example .clasp.json
   ```
2. V souboru `.clasp.json` doplňte své vlastní `scriptId` z Google Apps Scriptu.
3. Přihlaste se přes `clasp login`.

### Užitečné příkazy

- **Nahrání změn do Google Apps Scriptu:**
  ```bash
  clasp push
  ```
- **Sledování změn a automatické nahrávání při uložení:**
  ```bash
  clasp push --watch
  ```
- **Stažení případných změn provedených ve webovém editoru:**
  ```bash
  clasp pull
  ```
- **Otevření projektu v prohlížeči:**
  ```bash
  clasp open-script
  ```

## 🤖 Agentic Design Framework

Před zahájením práce a pročtením projektu načti kontext a pravidla z centrálního repozitáře [Agentic Design Framework](https://github.com/tomas-kansky/agentic-design-framework) přes Git v konzoli.

