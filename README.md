# Helix · Biomedical Studio

Przeglądarkowa aplikacja React do eksploracji sekwencji DNA, danych genów oraz struktur białkowych.

## Funkcje

- Edytor i import FASTA (`.fasta`, `.fa`, `.fna`, `.txt`, `.seq`), analiza składu nukleotydów, GC i liczby kodonów wykonywana lokalnie w przeglądarce oraz eksport FASTA.
- Wyszukiwanie genów Homo sapiens w NCBI Gene przez E-utilities; rekordy i lokalizacja genomowa prowadzą do źródłowego wpisu NCBI.
- Interaktywny podgląd struktur z RCSB Protein Data Bank przy użyciu 3Dmol.js. Przykładowe identyfikatory: `1CRN`, `1UBQ`, `4HHB`.
- Bez własnego serwera i bez bazy danych. Publiczne rekordy są pobierane bezpośrednio z API NCBI/RCSB. Sekwencja analizowana w edytorze pozostaje lokalna.
- Karta udostępniania Open Graph z autorską grafiką `public/helix-og.png` (1200 × 630) oraz opisem projektu demonstracyjnego.

Podgląd RCSB prezentuje zdeponowany model struktury; aplikacja nie wykonuje predykcji struktury de novo.

## Uruchomienie lokalne

Wymagany Node.js 20+ i npm.

```bash
npm install
npm run dev
```

## GitHub Pages

Projekt jest przygotowany dla repozytorium `Kondexor2000/data_science_biomedical`. Workflow `.github/workflows/deploy.yml` buduje aplikację i wdraża ją na GitHub Pages po każdym pushu do `main`. W ustawieniach repozytorium wybierz **Settings → Pages → Build and deployment → GitHub Actions**. Adres strony: <https://kondexor2000.github.io/data_science_biomedical/>.

## Źródła publiczne

- NCBI Gene / E-utilities: https://www.ncbi.nlm.nih.gov/gene/ oraz https://www.ncbi.nlm.nih.gov/books/NBK25501/
- RCSB Protein Data Bank API: https://www.rcsb.org/docs/programmatic-access/web-apis-overview
- 3Dmol.js: https://3dmol.org/
