/**
 * Catalogo di archetipi, tropi e regole classiche del giallo, da aggiungere al caso con un clic.
 * Testi originali di Sinapsi (descrizioni sintetiche, nessuna citazione).
 */
export const TROPES_CATALOG = [
    // --- Archetipi di personaggio ---------------------------------------------------------------------
    { kind: 'archetype', name: 'Investigatore geniale', description: 'Mente deduttiva fuori dal comune, spesso eccentrica; risolve dove gli altri falliscono.' },
    { kind: 'archetype', name: 'Spalla / narratore', description: 'Compagno dell\'investigatore, meno acuto: dà voce ai dubbi del lettore e ne filtra la visione.' },
    { kind: 'archetype', name: 'Poliziotto ufficiale ottuso', description: 'Rappresenta l\'indagine di routine; arriva alla soluzione sbagliata o troppo tardi.' },
    { kind: 'archetype', name: 'Investigatore dilettante', description: 'Non professionista (anziana signora, prete, scrittore) che sfrutta intuito e conoscenza delle persone.' },
    { kind: 'archetype', name: 'Detective hard-boiled', description: 'Cinico, solitario, moralmente ambiguo; si muove in un mondo corrotto.' },
    { kind: 'archetype', name: 'Vittima che tutti odiavano', description: 'La vittima aveva nemici ovunque: ogni personaggio ha un movente.' },
    { kind: 'archetype', name: 'Erede impaziente', description: 'Guadagna dalla morte della vittima: il sospettato più ovvio per il denaro.' },
    { kind: 'archetype', name: 'Domestico che sa tutto', description: 'Maggiordomo, governante o cameriera: vede e sente tutto, ma spesso non viene interrogato.' },
    { kind: 'archetype', name: 'Straniero misterioso', description: 'Nuovo arrivato dal passato oscuro: attira i sospetti del gruppo.' },
    { kind: 'archetype', name: 'Femme / homme fatale', description: 'Seduce e manipola; motivazioni ambigue fino alla fine.' },
    { kind: 'archetype', name: 'Testimone inattendibile', description: 'Ha visto qualcosa ma è ubriaco, spaventato, bugiardo o confuso.' },
    { kind: 'archetype', name: 'Colpevole insospettabile', description: 'Il personaggio più simpatico, debole o fuori discussione.' },
    { kind: 'archetype', name: 'Complice', description: 'Aiuta il colpevole (alibi, depistaggio) per amore, paura o denaro.' },
    { kind: 'archetype', name: 'Seconda vittima', description: 'Sapeva troppo: viene eliminata a metà storia, rilanciando la tensione.' },

    // --- Tropi / espedienti ------------------------------------------------------------------------------
    { kind: 'trope', name: 'Camera chiusa', description: 'Delitto in un luogo chiuso dall\'interno: il "come" è il mistero principale.' },
    { kind: 'trope', name: 'Delitto impossibile', description: 'Il crimine sembra fisicamente irrealizzabile (orari, luoghi, forze).' },
    { kind: 'trope', name: 'Luogo isolato', description: 'Villa, isola, treno bloccato dalla neve: il colpevole è per forza tra i presenti.' },
    { kind: 'trope', name: 'Alibi di ferro', description: 'Il colpevole ha un alibi apparentemente perfetto, costruito con cura.' },
    { kind: 'trope', name: 'Falsa pista', description: 'Un indizio piazzato per portare lettore e investigatore nella direzione sbagliata.' },
    { kind: 'trope', name: 'Ora della morte manipolata', description: 'Orologi fermati, riscaldamento, testimoni: l\'orario del delitto non è quello creduto.' },
    { kind: 'trope', name: 'Scambio di identità', description: 'Qualcuno non è chi dice di essere (gemelli, sosia, travestimenti, identità rubate).' },
    { kind: 'trope', name: 'Vittima sbagliata', description: 'L\'assassino voleva uccidere qualcun altro.' },
    { kind: 'trope', name: 'Messaggio del morente', description: 'La vittima lascia un indizio criptico prima di morire.' },
    { kind: 'trope', name: 'Riunione finale dei sospettati', description: 'L\'investigatore raduna tutti e ricostruisce il delitto fino a smascherare il colpevole.' },
    { kind: 'trope', name: 'Il colpevole è il narratore', description: 'Chi racconta nasconde di essere il colpevole (va gestito con lealtà).' },
    { kind: 'trope', name: 'Doppio colpo di scena', description: 'Dopo la prima soluzione, una seconda rivelazione ribalta tutto.' },
    { kind: 'trope', name: 'Veleno', description: 'Arma silenziosa e differita: allarga la finestra dell\'opportunità.' },
    { kind: 'trope', name: 'Lettera anonima / ricatto', description: 'Qualcuno conosce un segreto e lo usa: movente per un delitto.' },

    // --- Regole del genere (fair play) -----------------------------------------------------------------
    { kind: 'rule', name: 'Il colpevole compare presto', description: 'Il colpevole deve essere presentato nella prima parte della storia.' },
    { kind: 'rule', name: 'Tutti gli indizi al lettore', description: 'Ogni indizio usato dall\'investigatore deve essere mostrato anche al lettore.' },
    { kind: 'rule', name: 'Niente soprannaturale', description: 'La soluzione deve essere razionale, senza forze sovrannaturali.' },
    { kind: 'rule', name: 'Niente veleni sconosciuti', description: 'Nessun mezzo misterioso che richieda lunghe spiegazioni scientifiche finali.' },
    { kind: 'rule', name: 'Niente coincidenze risolutive', description: 'Il caso non si risolve per caso o per una confessione spontanea.' },
    { kind: 'rule', name: 'L\'investigatore non è il colpevole', description: 'A meno di una scelta consapevole e leale verso il lettore.' },
    { kind: 'rule', name: 'Gemelli e sosia solo se annunciati', description: 'Se esistono, il lettore deve saperlo prima della soluzione.' },
    { kind: 'rule', name: 'La spalla non nasconde i suoi pensieri', description: 'Il narratore-spalla non tace al lettore ciò che pensa.' },
];
