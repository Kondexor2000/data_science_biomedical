import React, { useEffect, useMemo, useRef, useState } from 'react';

const starter = `>BRCA1 · Homo sapiens · przykładowy fragment
ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAGTGTCCCATCTG
GTAAGTGTCTTCCATACCCAGATGTCTTCTTTGTCATTTTCTAAATGTAGATGATGATGATAAAGCAGGATTTTATGCAA`;
const tabs = [['overview','◫','Przegląd'],['sequences','⌁','Sekwencje DNA'],['genome','⌬','Analiza genomu'],['protein','◎','Struktury białek']];

function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }
function Logo() { return <div className="brand-mark"><span>⌁</span></div>; }

function App() {
  const [tab, setTab] = useState('overview');
  const [sequence, setSequence] = useState(starter);
  const [gene, setGene] = useState('BRCA1');
  const [geneInput, setGeneInput] = useState('BRCA1');
  const [geneResult, setGeneResult] = useState(null);
  const [geneLoading, setGeneLoading] = useState(false);
  const [geneError, setGeneError] = useState('');
  const [pdb, setPdb] = useState('1CRN');
  const [proteinInput, setProteinInput] = useState('1CRN');
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);
  const viewerRef = useRef(null);
  const viewerHost = useRef(null);

  const cleanSequence = useMemo(() => sequence.split('\n').filter(line => !line.startsWith('>')).join('').replace(/\s/g,'').toUpperCase().replace(/[^ACGTUN]/g,''), [sequence]);
  const stats = useMemo(() => {
    const counts = { A:0,C:0,G:0,T:0,N:0,U:0 };
    for (const c of cleanSequence) counts[c]++;
    const gc = cleanSequence.length ? ((counts.G + counts.C) / cleanSequence.length * 100) : 0;
    const codons = cleanSequence.match(/.{1,3}/g) || [];
    return { ...counts, gc, length: cleanSequence.length, codons: codons.length, complete: Math.floor(cleanSequence.length / 3) };
  }, [cleanSequence]);

  useEffect(() => {
    let cancelled = false;
    async function fetchGene() {
      setGeneLoading(true); setGeneError('');
      try {
        const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
        const search = await fetch(`${base}/esearch.fcgi?db=gene&retmode=json&retmax=1&term=${encodeURIComponent(`${gene}[Gene Name] AND Homo sapiens[Organism]`)}`);
        if (!search.ok) throw new Error('NCBI nie odpowiedziało. Sprawdź połączenie i spróbuj ponownie.');
        const result = await search.json(); const id = result.esearchresult?.idlist?.[0];
        if (!id) throw new Error(`Nie znaleziono genu „${gene}” w bazie NCBI Gene.`);
        const response = await fetch(`${base}/esummary.fcgi?db=gene&id=${id}&retmode=json`);
        if (!response.ok) throw new Error('Nie udało się pobrać opisu genu.');
        const summary = (await response.json()).result?.[id];
        if (!cancelled) setGeneResult({ id, name: summary?.name || gene, description: summary?.description || 'Brak opisu', chromosome: summary?.chromosome || '—', map: summary?.maplocation || '—', url: `https://www.ncbi.nlm.nih.gov/gene/${id}` });
      } catch (err) { if (!cancelled) setGeneError(err.message || 'Błąd pobierania danych.'); }
      finally { if (!cancelled) setGeneLoading(false); }
    }
    fetchGene(); return () => { cancelled = true; };
  }, [gene]);

  useEffect(() => {
    let dead = false;
    const host = viewerHost.current;
    if (!host) return;
    host.innerHTML = '';
    const loadViewer = async () => {
      try {
        const mod = await import('3dmol');
        if (dead) return;
        const createViewer = mod.createViewer || mod.default?.createViewer;
        if (!createViewer) throw new Error('Biblioteka 3Dmol.js niedostępna');
        const viewer = createViewer(host, { backgroundColor: '#101b16', antialias: true });
        viewerRef.current = viewer;
        const response = await fetch(`https://files.rcsb.org/download/${pdb.toUpperCase()}.pdb`);
        if (!response.ok) throw new Error('Nie znaleziono struktury');
        viewer.addModel(await response.text(), 'pdb');
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        viewer.zoomTo(); viewer.spin(true); viewer.render();
      } catch (err) { if (!dead) host.innerHTML = `<div class="viewer-error">Nie udało się pobrać struktury ${pdb.toUpperCase()}. Sprawdź identyfikator PDB i spróbuj ponownie.</div>`; }
    };
    loadViewer(); return () => { dead = true; if (viewerRef.current) { try { viewerRef.current.clear(); } catch {} viewerRef.current = null; } };
  }, [pdb]);

  function notify(message) { setToast(message); setTimeout(() => setToast(''), 2800); }
  function importFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { setSequence(String(reader.result || '')); setTab('sequences'); notify(`Zaimportowano ${file.name}`); };
    reader.readAsText(file); event.target.value = '';
  }
  function loadExample() { setSequence(starter); notify('Wczytano przykładowy fragment BRCA1'); }
  function downloadFasta() {
    const blob = new Blob([`>${gene} · eksport z Helix\n${cleanSequence.match(/.{1,60}/g)?.join('\n') || ''}\n`], { type:'text/plain' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${gene.toLowerCase()}-sequence.fasta`; link.click(); URL.revokeObjectURL(link.href);
  }
  function goGene(event) { event.preventDefault(); if (geneInput.trim()) setGene(geneInput.trim().toUpperCase()); }
  function goProtein(event) { event.preventDefault(); if (proteinInput.trim()) setPdb(proteinInput.trim().toUpperCase()); }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><Logo/><div><strong>helix<span>.</span></strong><small>BIOMEDICAL STUDIO</small></div></div>
      <div className="workspace-label">PRZESTRZEŃ ROBOCZA</div>
      <div className="workspace-card"><div className="workspace-icon">⌬</div><div><b>Projekt badawczy</b><small>Przestrzeń osobista</small></div><span className="chevron">⌄</span></div>
      <div className="nav-label">LABORATORIUM</div>
      <nav>{tabs.map(([id, icon, label]) => <button key={id} className={`nav-item ${tab===id?'active':''}`} onClick={()=>setTab(id)}><Icon>{icon}</Icon>{label}{id==='sequences'&&<span className="nav-count">01</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="data-status"><span className="status-dot"/><span><b>Źródła danych</b><small>Połączono · NCBI, RCSB PDB</small></span></div><div className="user-row"><div className="avatar">K</div><div><b>Badacz</b><small>Plan bezbazodanowy</small></div><span className="more">···</span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb"><span>Workspace</span><b>/</b><strong>{tabs.find(t=>t[0]===tab)?.[2]}</strong></div><div className="top-actions"><div className="connection"><span className="status-dot"/> Wszystkie systemy działają</div><button className="icon-button" aria-label="Powiadomienia">♧<i/></button><div className="top-avatar">K</div></div></header>
      <div className="page-content">
        {tab==='overview' && <>
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> PLATFORMa BADAWCZA <span className="eyebrow-line"/></div><h1>Odkrywaj kod <em>życia.</em></h1><p className="subtitle">Twoje środowisko do pracy z sekwencjami, genomami i strukturami białek.</p></div><button className="button button-quiet" onClick={()=>fileRef.current?.click()}><span>↑</span> Importuj dane</button></div>
          <section className="hero-card"><div className="hero-copy"><div className="pill"><span className="pill-dot"/> TWOJE LABORATORIUM W CHMURZE</div><h2>Od sekwencji<br/>do <em>struktury.</em></h2><p>Analizuj sekwencje DNA, eksploruj dane genomowe i oglądaj struktury białek z publicznych baz.</p><button className="button button-primary" onClick={()=>setTab('sequences')}>Rozpocznij analizę <span>↗</span></button><div className="hero-foot"><span>01</span> / 03 <i/> Publiczne dane naukowe</div></div><div className="helix-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orb orb-center">⌬</div><div className="orb orb-a">A</div><div className="orb orb-c">C</div><div className="orb orb-g">G</div><div className="orb orb-t">T</div><div className="orbit-label label-a">DNA / RNA</div><div className="orbit-label label-b">GENOMICS</div><div className="art-coords">52° 13′ 06.0″ N<br/>21° 00′ 42.0″ E</div></div><div className="hero-index">H—01</div></section>
          <div className="section-head"><div><div className="section-kicker">PANEL ROBOCZY</div><h3>Twoje narzędzia</h3></div><span className="section-note"><span className="status-dot"/> 3 moduły gotowe</span></div>
          <div className="tool-grid"><ToolCard index="01" icon="⌁" title="Sekwencje DNA" text="Wczytaj FASTA, zbadaj skład nukleotydów i zawartość GC." tag="ANALIZA SEKWENCJI" onClick={()=>setTab('sequences')}/><ToolCard index="02" icon="⌬" title="Analiza genomu" text="Wyszukuj geny w NCBI i odkrywaj ich kontekst biologiczny." tag="NCBI GENE" onClick={()=>setTab('genome')}/><ToolCard index="03" icon="◎" title="Struktury białek" text="Oglądaj interaktywne modele z Protein Data Bank." tag="RCSB PDB" onClick={()=>setTab('protein')}/></div>
          <footer className="footer"><span>HELIX BIOMEDICAL STUDIO <b>·</b> WERSJA 1.0</span><span>DANE PUBLICZNE <b>·</b> <a href="https://www.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">NCBI</a> &nbsp; <a href="https://www.rcsb.org/" target="_blank" rel="noreferrer">RCSB PDB</a></span></footer>
        </>}
        {tab==='sequences' && <>
          <PageHeading kicker="MODUŁ 01 / SEKWENCJE" title={<>Sekwencje <em>DNA</em></>} text="Wklej lub zaimportuj sekwencję nukleotydową, aby natychmiast poznać jej podstawowe parametry." />
          <div className="sequence-layout"><section className="panel sequence-panel"><div className="panel-head"><div><span className="panel-kicker">EDYTOR FASTA</span><h3>Próbka sekwencji</h3></div><div className="panel-actions"><button className="small-button" onClick={loadExample}>Przykład</button><button className="small-button" onClick={()=>fileRef.current?.click()}>↑ Importuj FASTA</button><input ref={fileRef} type="file" accept=".fasta,.fa,.fna,.txt,.seq" hidden onChange={importFile}/></div></div><textarea className="sequence-editor" value={sequence} onChange={e=>setSequence(e.target.value)} spellCheck="false" aria-label="Sekwencja FASTA"/><div className="editor-footer"><span><i className="status-dot"/> FASTA / DNA</span><span>{stats.length.toLocaleString('pl-PL')} nt · {sequence.split('\n').length} wiersze</span></div><div className="sequence-actions"><button className="button button-primary" onClick={()=>notify(`Przeanalizowano ${stats.length} nukleotydów`)}>Przelicz analizę <span>↗</span></button><button className="button button-quiet" onClick={downloadFasta}>↓ Eksportuj FASTA</button></div></section><section className="panel stats-panel"><div className="panel-head"><div><span className="panel-kicker">WYNIK ANALIZY</span><h3>Skład nukleotydów</h3></div><span className="live-chip"><i/> NA ŻYWO</span></div><div className="gc-card"><div><span className="metric-label">ZAWARTOŚĆ GC</span><strong>{stats.gc.toFixed(1)}<small>%</small></strong><span className="metric-hint">Guanina + cytozyna</span></div><div className="donut" style={{'--percent':`${stats.gc}%`}}><span>GC</span></div></div><div className="base-bars">{[['A','Adenina',stats.A,'#83c99b'],['C','Cytozyna',stats.C,'#7da9d3'],['G','Guanina',stats.G,'#d4b16a'],['T','Tymina',stats.T,'#d78978']].map(([b,n,v,color])=><div className="base-row" key={b}><span className="base-letter" style={{'--base':color}}>{b}</span><span className="base-name">{n}</span><div className="bar-track"><span style={{width:`${stats.length?v/stats.length*100:0}%`,background:color}}/></div><b>{stats.length?(v/stats.length*100).toFixed(1):'0.0'}%</b></div>)}</div><div className="stat-foot"><div><span>DŁUGOŚĆ</span><b>{stats.length.toLocaleString('pl-PL')} <small>nt</small></b></div><div><span>KODONY</span><b>{stats.codons.toLocaleString('pl-PL')} <small>łącznie</small></b></div><div><span>AMBIGUOUS</span><b>{stats.N} <small>nt</small></b></div></div></section></div>
          <div className="source-note">ⓘ Analiza składu jest wykonywana lokalnie w przeglądarce. Dane sekwencji nie są wysyłane na serwer.</div>
        </>}
        {tab==='genome' && <>
          <PageHeading kicker="MODUŁ 02 / EKSPLORATOR GENOMU" title={<>Poznaj swój <em>genom.</em></>} text="Szukaj genów człowieka w publicznej bazie NCBI Gene. Wyniki są pobierane na żywo." />
          <section className="panel gene-search-panel"><div className="panel-kicker">NCBI GENE · HOMO SAPIENS</div><form className="search-row" onSubmit={goGene}><span className="search-icon">⌕</span><input value={geneInput} onChange={e=>setGeneInput(e.target.value)} placeholder="Wpisz symbol genu, np. TP53" aria-label="Symbol genu"/><button className="button button-primary">Szukaj genu <span>↗</span></button></form><div className="quick-search">POPULARNE: {['TP53','BRCA1','EGFR','APOE'].map(x=><button key={x} onClick={()=>{setGeneInput(x);setGene(x)}}>{x}</button>)}</div></section>
          {geneLoading&&<div className="loading-card"><span className="spinner"/> Łączenie z NCBI Gene…</div>}{geneError&&<div className="error-card">⚠ {geneError}</div>}{geneResult&&<section className="panel gene-result"><div className="gene-result-top"><div><span className="panel-kicker">WYNIK Z NCBI GENE · ID {geneResult.id}</span><h2>{geneResult.name}<span> · Homo sapiens</span></h2><p>{geneResult.description}</p></div><a className="button button-quiet" href={geneResult.url} target="_blank" rel="noreferrer">Otwórz rekord NCBI ↗</a></div><div className="gene-metrics"><Metric label="CHROMOSOM" value={geneResult.chromosome}/><Metric label="LOKALIZACJA" value={geneResult.map}/><Metric label="BAZA DANYCH" value="NCBI Gene"/><Metric label="IDENTYFIKATOR" value={geneResult.id}/></div><div className="gene-map"><div className="chromosome"><span>p</span><i/><span>q</span></div><div className="gene-position"><span>Pozycja genu</span><b>{geneResult.map==='—'?'Lokalizacja dostępna w rekordzie NCBI':`Chr ${geneResult.chromosome} · ${geneResult.map}`}</b></div><span className="gene-marker">{geneResult.name}</span></div></section>}
          <div className="source-note">Dane genu pobierane przez NCBI E-utilities. <a href="https://www.ncbi.nlm.nih.gov/books/NBK25501/" target="_blank" rel="noreferrer">Dokumentacja NCBI E-utilities ↗</a></div>
        </>}
        {tab==='protein' && <>
          <PageHeading kicker="MODUŁ 03 / STRUKTURY BIAŁEK" title={<>Struktura ma <em>znaczenie.</em></>} text="Eksploruj przestrzenne struktury białek z archiwum Protein Data Bank w interaktywnym podglądzie 3D." />
          <section className="panel protein-search-panel"><div><span className="panel-kicker">RCSB PROTEIN DATA BANK</span><h3>Wybierz strukturę do eksploracji</h3></div><form className="pdb-search" onSubmit={goProtein}><input value={proteinInput} onChange={e=>setProteinInput(e.target.value.toUpperCase())} maxLength="4" aria-label="Identyfikator PDB"/><button className="button button-primary">Załaduj strukturę ↗</button></form><div className="quick-search">PRZYKŁADOWE STRUKTURY: {['1CRN','1UBQ','4HHB'].map(x=><button key={x} onClick={()=>{setProteinInput(x);setPdb(x)}}>{x}</button>)}</div></section>
          <div className="protein-layout"><section className="panel viewer-panel"><div className="panel-head"><div><span className="panel-kicker">PODGLĄD MOLEKULARNY · PDB {pdb}</span><h3>Model przestrzenny</h3></div><span className="live-chip"><i/> INTERAKTYWNY</span></div><div className="viewer-wrap"><div className="viewer-grid"/><div className="viewer-host" ref={viewerHost}/><div className="viewer-caption">Przeciągnij, aby obrócić <span>·</span> Scroll, aby przybliżyć</div><div className="viewer-axis">X <i/> Y <b/> Z</div></div><div className="viewer-footer"><span><i className="status-dot"/> Struktura pobrana z RCSB PDB</span><a href={`https://www.rcsb.org/structure/${pdb}`} target="_blank" rel="noreferrer">Rekord struktury ↗</a></div></section><aside className="panel structure-info"><span className="panel-kicker">INFORMACJE O STRUKTURZE</span><h3>{pdb}</h3><p>Wybrane białko z archiwum Protein Data Bank. Metadane i model są pobierane bezpośrednio z publicznego repozytorium.</p><div className="info-divider"/><Metric label="ŹRÓDŁO" value="RCSB PDB"/><Metric label="FORMAT MODELU" value="PDB · atomy i wiązania"/><Metric label="WIZUALIZACJA" value="3Dmol.js"/><div className="structure-tag">PUBLICZNY MODEL EKSPERYMENTALNY</div></aside></div>
          <div className="source-note">To narzędzie przegląda zdeponowane struktury PDB. Nie wykonuje predykcji struktury de novo ani modelowania obliczeniowego. <a href="https://www.rcsb.org/docs/programmatic-access/web-apis-overview" target="_blank" rel="noreferrer">API RCSB PDB ↗</a></div>
        </>}
        <footer className="footer inner-footer"><span>HELIX BIOMEDICAL STUDIO <b>·</b> WERSJA 1.0</span><span>DANE PUBLICZNE <b>·</b> <a href="https://www.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">NCBI</a> &nbsp; <a href="https://www.rcsb.org/" target="_blank" rel="noreferrer">RCSB PDB</a></span></footer>
      </div>
    </main>
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}

function ToolCard({index,icon,title,text,tag,onClick}) { return <button className="tool-card" onClick={onClick}><div className="tool-top"><span className="tool-icon">{icon}</span><span className="tool-index">{index}</span></div><h4>{title}</h4><p>{text}</p><div className="tool-bottom"><span>{tag}</span><b>↗</b></div></button>; }
function PageHeading({kicker,title,text}) { return <div className="page-heading"><div className="eyebrow"><span className="eyebrow-line"/> {kicker}</div><h1>{title}</h1><p className="subtitle">{text}</p></div>; }
function Metric({label,value}) { return <div className="metric"><span>{label}</span><b>{value}</b></div>; }

export default App;
