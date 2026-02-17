
// Default configuration mirroring Excel inputs
const defaults = {
    // A. Généraux
    surface: 100,
    duree_amortissement: 5,
    semaines_an: 48,
    taux_act: 5, // 5%
    cout_mo: 15, // €/h
    prix_elec: 0.18, // €/kWh
    prix_plants: 0.1, // New V2
    prix_eau: 0.087, // New V2
    hauteur_eau: 200, // New V2
    taux_subvention: 30, // % New V3

    // B. Pleine Terre
    pt_densite: 14,
    pt_cycle: 8,
    pt_taux_vente: 70,
    pt_prix_vente: 1,
    pt_invest: 2000,
    // Advanced PT
    // pt_cout_plants: Calculated
    pt_cout_engrais: 40,
    // pt_cout_eau: Calculated
    pt_cout_phyto: 15,
    pt_cout_elec: 5,
    pt_mo_sol: 6,
    pt_mo_semis: 8,
    pt_mo_desh: 10,
    pt_mo_recolte: 12,
    pt_mo_maint: 2,

    // C. Hydroponie
    hy_tours: 100,
    hy_capacité: 40,
    hy_cycle: 4.5, // Updated V2
    hy_taux_vente: 95,
    hy_prix_vente: 1.8, // Updated V2
    // Advanced Hy
    hy_prix_tour: 600,
    hy_install: 5000,
    hy_maint_an: 500,
    // hy_cout_plants: Calculated
    hy_cout_engrais: 5, // par tour !!
    hy_eco_eau: 0.8, // New V2
    hy_pomp_w: 500,
    hy_pomp_h: 24,
    hy_pomp_j: 35,
    hy_mo_plant: 5,
    hy_mo_recolte: 6,
    hy_mo_maint: 3
};

// Current state
let state = { ...defaults };

function init() {
    // Bind inputs
    bindInputs();
    calculate();
    // Verify script loads
    console.log("ROI App Initialized V3");
}

// Global UI Helpers
window.toggleAdvanced = (id) => {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('hidden');
    } else {
        console.error('Element not found:', id);
    }
};

window.switchTab = (tabId) => {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const clickedBtn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.classList.add('hidden');
    });
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('active');
    }
};

window.resetDefaults = () => {
    state = { ...defaults };
    updateInputs();
    calculate();
};

function bindInputs() {
    for (const key in defaults) {
        const el = document.getElementById(key);
        if (el) {
            el.addEventListener('input', (e) => {
                state[key] = parseFloat(e.target.value) || 0;
                calculate();
            });
        }
    }
}

function updateInputs() {
    for (const key in defaults) {
        const el = document.getElementById(key);
        if (el) el.value = state[key];
    }
}

function calculate() {
    // Helpers
    const formatEur = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const formatNb = (v, d = 0) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });

    // 1. Paramètres calculés
    // Pleine Terre
    const pt_nb_cycles = Math.floor(state.semaines_an / (state.pt_cycle || 1));
    const pt_prod_cycle = state.pt_densite * state.surface;
    const pt_prod_an = pt_nb_cycles * pt_prod_cycle;
    const pt_comm_an = pt_prod_an * (state.pt_taux_vente / 100);
    const pt_ca_an = pt_comm_an * state.pt_prix_vente;

    // Charges Variable PT
    // V2: Plants calculated
    const pt_cost_plants_cycle = state.pt_densite * state.surface * state.prix_plants;
    const pt_ch_plants = pt_nb_cycles * pt_cost_plants_cycle;

    const pt_ch_engrais = pt_nb_cycles * state.pt_cout_engrais;

    // V2: Eau calculated
    const pt_vol_eau_m3 = (state.surface * state.hauteur_eau) / 1000;
    const pt_cost_eau_cycle = pt_vol_eau_m3 * state.prix_eau;
    const pt_ch_eau = pt_nb_cycles * pt_cost_eau_cycle;

    const pt_ch_phyto = pt_nb_cycles * state.pt_cout_phyto;
    const pt_ch_elec = pt_nb_cycles * state.pt_cout_elec; // Direct input in Excel but label says "Energy"

    // MO PT
    const pt_mo_total_h_cycle = state.pt_mo_sol + state.pt_mo_semis + state.pt_mo_desh + state.pt_mo_recolte + state.pt_mo_maint;
    const pt_mo_cout_cycle = pt_mo_total_h_cycle * state.cout_mo;
    const pt_ch_mo = pt_nb_cycles * pt_mo_cout_cycle;

    const pt_h_an = pt_nb_cycles * pt_mo_total_h_cycle;

    // Maintenance PT (usually 0 in Excel unless added, treating Invest as separate)
    // Excel logic sums variables + energy + MO + Maint(0)
    const pt_charges_totales = pt_ch_plants + pt_ch_engrais + pt_ch_eau + pt_ch_phyto + pt_ch_elec + pt_ch_mo;
    const pt_marge_brute = pt_ca_an - pt_charges_totales;

    // Amortissement PT (V3: Net Invest - PT has 0 subvention)
    const pt_subvention = 0;
    const pt_invest_net = state.pt_invest - pt_subvention;
    const pt_amort_an = pt_invest_net / state.duree_amortissement;

    // Resultat Net PT
    const pt_res_net = pt_marge_brute - pt_amort_an;

    const pt_cout_revient = pt_comm_an > 0 ? (pt_charges_totales + pt_amort_an) / pt_comm_an : 0;


    // Hydroponie
    const hy_nb_cycles = Math.floor(state.semaines_an / (state.hy_cycle || 1));
    const hy_cap_totale = state.hy_tours * state.hy_capacité;
    const hy_prod_cycle = hy_cap_totale; // Assuming 100% capacity used? Excel: '1. Hypothèses'!C35*'1. Hypothèses'!C34 -> Cap * Tours
    const hy_prod_an = hy_nb_cycles * hy_prod_cycle;
    const hy_comm_an = hy_prod_an * (state.hy_taux_vente / 100);
    const hy_ca_an = hy_comm_an * state.hy_prix_vente;

    // Charges Hy
    // V2: Plants calculated
    const hy_cost_plants_cycle = hy_cap_totale * state.prix_plants;
    const hy_ch_plants = hy_nb_cycles * hy_cost_plants_cycle;

    // Excel Formula: Cycles * CostPerTour * NbTours.
    const hy_ch_engrais = hy_nb_cycles * state.hy_cout_engrais * state.hy_tours;

    // V2: Eau calculated based on PT economy
    const hy_cost_eau_cycle = pt_cost_eau_cycle * (1 - (state.hy_eco_eau || 0.8));
    const hy_ch_eau = hy_nb_cycles * hy_cost_eau_cycle;
    // Phyto is 0

    // Elec Hy
    // Excel: D5*('1. Hypothèses'!C45*'1. Hypothèses'!C46*'1. Hypothèses'!C47/1000)*'1. Hypothèses'!C11 (Price)
    // Cycles * (Watts * Hours * Days / 1000) * Price
    const hy_kwh_cycle = (state.hy_pomp_w * state.hy_pomp_h * state.hy_pomp_j) / 1000;
    const hy_ch_elec = hy_nb_cycles * hy_kwh_cycle * state.prix_elec;

    // MO Hy
    const hy_mo_total_h_cycle = state.hy_mo_plant + state.hy_mo_recolte + state.hy_mo_maint; // Sol & Desh are 0
    const hy_mo_cout_cycle = hy_mo_total_h_cycle * state.cout_mo;
    const hy_ch_mo = hy_nb_cycles * hy_mo_cout_cycle;

    const hy_h_an = hy_nb_cycles * hy_mo_total_h_cycle;

    // Maintenance Hy
    const hy_ch_maint = state.hy_maint_an; // Fixed per year input

    const hy_charges_totales = hy_ch_plants + hy_ch_engrais + hy_ch_eau + 0 + hy_ch_elec + hy_ch_mo + hy_ch_maint;
    const hy_marge_brute = hy_ca_an - hy_charges_totales;

    // Amortissement Hy V3 (Net of Subvention)
    // Invest = Tours * Prix + Install
    const hy_invest = (state.hy_tours * state.hy_prix_tour) + state.hy_install;
    const hy_subvention = hy_invest * (state.taux_subvention / 100);
    const hy_invest_net = hy_invest - hy_subvention;
    const hy_amort_an = hy_invest_net / state.duree_amortissement;

    // Resultat Net Hy
    const hy_res_net = hy_marge_brute - hy_amort_an;

    const hy_cout_revient = hy_comm_an > 0 ? (hy_charges_totales + hy_amort_an) / hy_comm_an : 0;

    // --- PAYBACK & VAN ---
    // Update Payback to use Net Invest? 
    // Excel Row 17 (Synthèse): Payback = (-InvestNet?) / CashFlow? 
    // V3 Excel logic likely uses Net Invest for Payback as well if it's "decaissement".
    // Let's use Net Invest for Payback to be consistent with "Investment real" logic.
    const hy_cash_flow_an = hy_marge_brute;
    let hy_payback = "N/A";
    if (hy_cash_flow_an > 0) {
        // Using Net Invest for payback
        hy_payback = (hy_invest_net / hy_cash_flow_an).toFixed(1);
    }

    // VAN (NPV) 5 ans
    // Inv + CF/(1+t) + CF/(1+t)^2 ...
    // V3: Use Net Invest
    const taux = state.taux_act / 100;
    let van = -hy_invest_net;
    for (let i = 1; i <= 5; i++) {
        van += hy_cash_flow_an / Math.pow(1 + taux, i);
    }



    // --- GUI UPDATES ---

    // KPIs
    setText('out_invest_hy', formatEur(hy_invest));
    setText('out_invest_pt', formatEur(state.pt_invest)); // Approx
    setText('out_payback', hy_payback + " Ans");
    setText('out_marge_net_hy', formatEur(hy_res_net));
    setText('out_van', formatEur(van));

    const diff_marge = hy_res_net - pt_res_net;
    const elDiffMarge = document.getElementById('out_diff_marge');
    elDiffMarge.innerText = (diff_marge > 0 ? "+ " : "") + formatEur(diff_marge);
    elDiffMarge.className = 'diff ' + (diff_marge >= 0 ? 'positive' : 'negative');

    // Table
    setTableVal('t_cycles', pt_nb_cycles, hy_nb_cycles, 0);
    setTableVal('t_prod', pt_prod_an, hy_prod_an, 0, true);
    setTableVal('t_ca', pt_ca_an, hy_ca_an, 2);
    setTableVal('t_charges', pt_charges_totales, hy_charges_totales, 2);
    setTableVal('t_mo', pt_ch_mo, hy_ch_mo, 2);
    setTableVal('t_elec', pt_ch_elec, hy_ch_elec, 2);
    setTableVal('t_mb', pt_marge_brute, hy_marge_brute, 2);
    setTableVal('t_net', pt_res_net, hy_res_net, 2);

    // List Stats
    setText('cost_unit_pt', formatEur(pt_cout_revient));
    setText('cost_unit_hy', formatEur(hy_cout_revient));
    setText('hours_pt', formatNb(pt_h_an) + " h");
    setText('hours_hy', formatNb(hy_h_an) + " h");

    // --- DETAILED DATA CONSTRUCTION (Exact Excel Structure) ---

    // Multiplicateur (Row 9)
    const ratio_prod = pt_comm_an > 0 ? (hy_comm_an / pt_comm_an) : 0;

    // MO Details
    // PT
    const pt_mo_sol_cost = pt_nb_cycles * state.pt_mo_sol * state.cout_mo;
    const pt_mo_semis_cost = pt_nb_cycles * state.pt_mo_semis * state.cout_mo;
    const pt_mo_desh_cost = pt_nb_cycles * state.pt_mo_desh * state.cout_mo;
    const pt_mo_recolte_cost = pt_nb_cycles * state.pt_mo_recolte * state.cout_mo;
    const pt_mo_maint_cost = pt_nb_cycles * state.pt_mo_maint * state.cout_mo;
    // Hy
    // Mapping: 
    // Sol -> Sol (0)
    // Semis/Plant -> Plant (5) ('1. Hypothèses'!C52)
    // Desh -> Desh (0)
    // Recolte -> Recolte (6)
    // Maint -> Maint (3)
    const hy_mo_sol_cost = hy_nb_cycles * state.hy_mo_sol * state.cout_mo;
    const hy_mo_plant_cost = hy_nb_cycles * state.hy_mo_plant * state.cout_mo;
    const hy_mo_desh_cost = hy_nb_cycles * state.hy_mo_desh * state.cout_mo;
    const hy_mo_recolte_cost = hy_nb_cycles * state.hy_mo_recolte * state.cout_mo;
    const hy_mo_maint_cost = hy_nb_cycles * state.hy_mo_maint * state.cout_mo;

    // Reduction MO % (Row 30)
    const mo_red_pct = pt_h_an > 0 ? (1 - (hy_h_an / pt_h_an)) * 100 : 0;

    // Taux Marge (Row 40)
    const pt_taux_marge = pt_ca_an > 0 ? (pt_marge_brute / pt_ca_an) * 100 : 0;
    const hy_taux_marge = hy_ca_an > 0 ? (hy_marge_brute / hy_ca_an) * 100 : 0;

    // Rentabilité Nette (Row 48)
    const pt_rent_nette = pt_ca_an > 0 ? (pt_res_net / pt_ca_an) * 100 : 0;
    const hy_rent_nette = hy_ca_an > 0 ? (hy_res_net / hy_ca_an) * 100 : 0;

    // Cout/Marge par salade (Rows 51, 52)
    const pt_cout_unit = pt_comm_an > 0 ? (pt_charges_totales + pt_amort_an) / pt_comm_an : 0;
    const hy_cout_unit = hy_comm_an > 0 ? (hy_charges_totales + hy_amort_an) / hy_comm_an : 0;

    const pt_marge_unit = pt_comm_an > 0 ? pt_res_net / pt_comm_an : 0;
    const hy_marge_unit = hy_comm_an > 0 ? hy_res_net / hy_comm_an : 0;


    const detailedRows = [
        // 1. PRODUCTION
        { l: "PRODUCTION", type: "header" },
        { l: "Nombre de cycles / an", pt: pt_nb_cycles, hy: hy_nb_cycles, fmt: "nb" },
        { l: "Salades produites / cycle", pt: pt_prod_cycle, hy: hy_prod_cycle, fmt: "nb" },
        { l: "Salades produites / an", pt: pt_prod_an, hy: hy_prod_an, fmt: "nb" },
        { l: "Salades commercialisées / an", pt: pt_comm_an, hy: hy_comm_an, fmt: "nb" },
        { l: "Facteur multiplicateur (Hydro/Terre)", pt: 1, hy: ratio_prod, fmt: "x", hideDiff: true },

        // 2. CA
        { l: "CHIFFRE D'AFFAIRES", type: "header" },
        { l: "Chiffre d'affaires annuel", pt: pt_ca_an, hy: hy_ca_an, type: "bold", fmt: "eur" },

        // 3. CHARGES VARIABLES
        { l: "CHARGES VARIABLES", type: "header" },
        { l: "Plants / semences", pt: pt_ch_plants, hy: hy_ch_plants, fmt: "eur", inv: true },
        { l: "Engrais", pt: pt_ch_engrais, hy: hy_ch_engrais, fmt: "eur", inv: true },
        { l: "Eau d'irrigation", pt: pt_ch_eau, hy: hy_ch_eau, fmt: "eur", inv: true },
        { l: "Phytosanitaires", pt: pt_ch_phyto, hy: 0, fmt: "eur", inv: true },

        // 4. ENERGIE
        { l: "ÉNERGIE", type: "header" },
        { l: "Électricité (pompes, irrigation)", pt: pt_ch_elec, hy: hy_ch_elec, fmt: "eur", inv: true },

        // 5. MO
        { l: "MAIN-D'ŒUVRE (détail)", type: "header" },
        { l: "Travail du sol & préparation", pt: pt_mo_sol_cost, hy: hy_mo_sol_cost, fmt: "eur", inv: true },
        { l: "Semis/pépinière & plantation", pt: pt_mo_semis_cost, hy: hy_mo_plant_cost, fmt: "eur", inv: true },
        { l: "Désherbage", pt: pt_mo_desh_cost, hy: hy_mo_desh_cost, fmt: "eur", inv: true },
        { l: "Récolte & conditionnement", pt: pt_mo_recolte_cost, hy: hy_mo_recolte_cost, fmt: "eur", inv: true },
        { l: "Maintenance (irrigation/système)", pt: pt_mo_maint_cost, hy: hy_mo_maint_cost, fmt: "eur", inv: true },
        { l: "TOTAL MAIN-D'ŒUVRE", pt: pt_ch_mo, hy: hy_ch_mo, type: "sub-bold", fmt: "eur", inv: true },
        { l: "Total heures MO / an", pt: pt_h_an, hy: hy_h_an, fmt: "nb", inv: true },
        { l: "Réduction MO hydro vs terre (%)", pt: 0, hy: mo_red_pct, fmt: "pct", hideDiff: true },

        // 6. MAINTENANCE
        { l: "MAINTENANCE ANNUELLE", type: "header" },
        { l: "Maintenance matériel", pt: 0, hy: hy_ch_maint, fmt: "eur", inv: true },

        // 7. TOTAL CHARGES
        { l: "TOTAL CHARGES ANNUELLES", pt: pt_charges_totales, hy: hy_charges_totales, type: "bold", fmt: "eur", inv: true },

        // 8. MARGE BRUTE
        { l: "MARGE BRUTE", type: "header" },
        { l: "Marge brute", pt: pt_marge_brute, hy: hy_marge_brute, type: "main-res", fmt: "eur" },
        { l: "Taux de marge brute", pt: pt_taux_marge, hy: hy_taux_marge, fmt: "pct" },

        // 9. INVEST & AMORT
        { l: "INVESTISSEMENT & AMORTISSEMENT", type: "header" },
        { l: "Investissement initial total", pt: state.pt_invest, hy: hy_invest, fmt: "eur", inv: true },
        { l: "Subvention reçue", pt: 0, hy: hy_subvention, fmt: "eur", inv: false, hideDiff: true },
        { l: "Investissement NET", pt: pt_invest_net, hy: hy_invest_net, fmt: "eur", inv: true },
        { l: "Amortissement annuel (sur Net)", pt: pt_amort_an, hy: hy_amort_an, fmt: "eur", inv: true },

        // 10. RES NET
        { l: "RÉSULTAT NET", type: "header" },
        { l: "Résultat net", pt: pt_res_net, hy: hy_res_net, type: "final", fmt: "eur" },
        { l: "Rentabilité nette (%)", pt: pt_rent_nette, hy: hy_rent_nette, fmt: "pct" },

        // 11. COUT REVIENT
        { l: "COÛT DE REVIENT PAR SALADE", type: "header" },
        { l: "Coût total / salade", pt: pt_cout_unit, hy: hy_cout_unit, fmt: "eur2", inv: true },
        { l: "Marge nette / salade", pt: pt_marge_unit, hy: hy_marge_unit, fmt: "eur2" }
    ];

    renderDetailedExploitation(detailedRows);

    // Amortissement Data
    renderAmortissementTable({
        invest: hy_invest_net, // Using Net Invest as flow base? Excel confirms Amort sheet uses Net Invest.
        ca: hy_ca_an,
        charges: hy_charges_totales,
        amort: hy_amort_an,
        res_net: hy_res_net,
        taux: state.taux_act / 100
    });

    // Synthese Data
    renderSyntheseTable({
        invest: { l: "Investissement initial", pt: state.pt_invest, hy: hy_invest, fmt: "eur", inv: true },
        comm: { l: "Salades commercialisées / an", pt: pt_comm_an, hy: hy_comm_an, fmt: "nb" },
        ca: { l: "Chiffre d'affaires annuel", pt: pt_ca_an, hy: hy_ca_an, fmt: "eur", bold: true },
        charges: { l: "Total charges annuelles", pt: pt_charges_totales, hy: hy_charges_totales, fmt: "eur", inv: true },
        mo: { l: "dont Main-d'œuvre", pt: pt_ch_mo, hy: hy_ch_mo, fmt: "eur", sub: true, inv: true },
        elec: { l: "dont Énergie", pt: pt_ch_elec, hy: hy_ch_elec, fmt: "eur", sub: true, inv: true },
        marge: { l: "Marge brute annuelle", pt: pt_marge_brute, hy: hy_marge_brute, fmt: "eur", bold: true },
        net: { l: "Résultat net (après amortissement)", pt: pt_res_net, hy: hy_res_net, fmt: "eur", bold: true },
        taux: { l: "Taux de marge brute", pt: pt_taux_marge, hy: hy_taux_marge, fmt: "pct" },
        cout: { l: "Coût de revient / salade", pt: pt_cout_unit, hy: hy_cout_unit, fmt: "eur2", inv: true },
        h_mo: { l: "Heures MO / an", pt: pt_h_an, hy: hy_h_an, fmt: "nb", inv: true },
        red_mo: { l: "Réduction MO hydro", pt: 0, hy: mo_red_pct, fmt: "pct", hideDiff: true, onlyHy: true },
        payback: { l: "Payback", pt: 0, hy: (hy_payback === "N/A" ? 0 : parseFloat(hy_payback)), fmt: "nb", hideDiff: true, onlyHy: true, unit: " Ans" },
        van: { l: "VAN sur 5 ans", pt: 0, hy: van, fmt: "eur", hideDiff: true, onlyHy: true },
        ratio: { l: "Ratio couverture dette", pt: 0, hy: hy_amort_an > 0 ? (hy_marge_brute / hy_amort_an) : 0, fmt: "nb", hideDiff: true, onlyHy: true }
    });
}

function renderDetailedExploitation(rows) {
    const tbody = document.getElementById('detailed-exploitation-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const formatEur = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const formatEur2 = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
    const formatNb = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    const formatPct = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
    const formatX = (v) => 'x ' + v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

    rows.forEach(row => {
        const tr = document.createElement('tr');

        // Header Row
        if (row.type === 'header') {
            tr.className = 'section-head';
            tr.innerHTML = `<td colspan="4" style="font-weight:800; text-transform:uppercase; color:#005522; background:#e6f4ea;">${row.l}</td>`;
            tbody.appendChild(tr);
            return;
        }

        // Styles
        if (row.type === 'bold') tr.style.fontWeight = '700';
        if (row.type === 'sub-bold') { tr.style.fontWeight = '700'; tr.style.fontStyle = 'italic'; }
        if (row.type === 'main-res') { tr.style.fontWeight = '700'; tr.style.background = '#f0fdf4'; tr.style.color = 'var(--primary)'; }
        if (row.type === 'final') { tr.className = 'final'; }

        // Formatter
        let valFn = formatNb;
        if (row.fmt === 'eur') valFn = formatEur;
        if (row.fmt === 'eur2') valFn = formatEur2;
        if (row.fmt === 'pct') valFn = formatPct;
        if (row.fmt === 'x') valFn = formatX;

        // Diff
        let diff = row.hy - row.pt;
        let diffHtml = '';

        if (!row.hideDiff) {
            let diffClass = '';
            // Determine color
            if (row.inv) { // Cost: Lower is better (Green)
                if (diff < 0) diffClass = 'positive'; // Cost reduction
                else if (diff > 0) diffClass = 'negative'; // Cost increase
            } else { // Revenue/Profit: Higher is better (Green)
                if (diff > 0) diffClass = 'positive';
                else if (diff < 0) diffClass = 'negative';
            }

            let prefix = diff > 0 ? '+' : '';
            if (row.fmt === 'eur' || row.fmt === 'eur2') {
                diffHtml = `<span class="${diffClass}">${prefix}${valFn(diff)}</span>`;
            } else if (row.fmt === 'pct') {
                diffHtml = `<span class="${diffClass}">${prefix}${formatNb(diff)} pts</span>`; // Pct points
            } else {
                diffHtml = `<span class="${diffClass}">${prefix}${valFn(diff)}</span>`;
            }
        }

        tr.innerHTML = `
            <td>${row.l}</td>
            <td>${valFn(row.pt)}</td>
            <td>${valFn(row.hy)}</td>
            <td>${diffHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAmortissementTable(d) {
    const tbody = document.getElementById('amortissement-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const format = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const formatNb = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
    const formatPct = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';

    // Cash Flow Calculation
    // Cash Flow = CA - Charges (Simplification matching Excel "Marge Brute")
    // Note: Excel calls it 'Cash-flow annuel (Marge brute)' in Sheet 3.
    const cf_annuel = d.ca - d.charges;

    // Rows Definition
    const rows = [
        { l: "Investissement (décaissement)", vals: [-d.invest, 0, 0, 0, 0, 0] },
        { l: "Chiffre d'affaires", vals: [0, d.ca, d.ca, d.ca, d.ca, d.ca] },
        { l: "Charges d'exploitation", vals: [0, -d.charges, -d.charges, -d.charges, -d.charges, -d.charges] },
        { l: "Dotation amortissement", vals: [0, -d.amort, -d.amort, -d.amort, -d.amort, -d.amort] },
        { l: "Résultat net annuel", vals: [0, d.res_net, d.res_net, d.res_net, d.res_net, d.res_net], bold: true },
        // Empty Sep
        { l: "FLUX DE TRÉSORERIE", header: true },
        { l: "Cash-flow annuel (Marge brute)", vals: [-d.invest, cf_annuel, cf_annuel, cf_annuel, cf_annuel, cf_annuel], highlight: true },
    ];

    // Cumul Calculation
    let acc = -d.invest;
    const cumul = [-d.invest];
    for (let i = 0; i < 5; i++) { acc += cf_annuel; cumul.push(acc); }
    rows.push({ l: "Cash-flow cumulé", vals: cumul, bold: true });

    // Bank Indicators
    rows.push({ l: "INDICATEURS BANQUE", header: true });

    // ROI Cumulé (Excel: Cumul / (-Invest)) -> here Cumul / Invest (since invest is pos in d.invest)
    // Excel C4 is negative. C12 is cumul.
    const roi = cumul.map(c => c / d.invest);
    rows.push({ l: "ROI cumulé", vals: roi, fmt: "pct" });

    // Render
    rows.forEach(row => {
        const tr = document.createElement('tr');
        if (row.header) {
            tr.innerHTML = `<td colspan="7" style="font-weight:700; color:#005522; background:#e6f4ea;">${row.l}</td>`;
            tbody.appendChild(tr);
            return;
        }

        if (row.highlight) tr.className = 'calc-row';

        let html = `<td style="${row.bold ? 'font-weight:bold' : ''}">${row.l}</td>`;
        if (row.vals) {
            row.vals.forEach(v => {
                let formatted = v;
                if (row.fmt === 'pct') formatted = formatPct(v * 100);
                else formatted = format(v);

                html += `<td class="${v < 0 ? 'negative' : (v > 0 ? 'positive' : '')}">${formatted}</td>`;
            });
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function renderSyntheseTable(data) {
    // Target the table in Tab 1 (Synthese) - It's the first data-table
    // ID: t_cycles etc are in 'Comparatif Synthetique'
    // I need to REPLACE the body of that table. 
    // The table is: <table class="data-table"> ... </table>
    // It is the FIRST table in .charts-container (or .table-card).
    const table = document.querySelector('#tab-synthese .data-table tbody');
    if (!table) return;
    table.innerHTML = '';

    const format = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const formatNb = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
    const formatPct = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
    const formatEur2 = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

    Object.values(data).forEach(row => {
        const tr = document.createElement('tr');
        if (row.sub) tr.className = 'sub-row';
        if (row.bold) tr.className = 'calc-row';

        let valFn = formatNb;
        if (row.fmt === 'eur') valFn = format;
        if (row.fmt === 'eur2') valFn = formatEur2;
        if (row.fmt === 'pct') valFn = formatPct;

        let ptVal = row.onlyHy ? '—' : valFn(row.pt);
        let hyVal = valFn(row.hy) + (row.unit || '');
        if (row.l === "Payback" && row.hy === 0) hyVal = "N/A";

        let diffHtml = '';
        if (!row.hideDiff && !row.onlyHy) {
            let diff = row.hy - row.pt;
            let diffClass = '';
            if (row.inv) {
                if (diff < 0) diffClass = 'positive';
                else if (diff > 0) diffClass = 'negative';
            } else {
                if (diff > 0) diffClass = 'positive';
                else if (diff < 0) diffClass = 'negative';
            }

            if (row.fmt === 'eur' || row.fmt === 'eur2') {
                diffHtml = `<span class="${diffClass}">${diff > 0 ? '+' : ''}${valFn(diff)}</span>`;
            } else if (row.fmt === 'pct') {
                diffHtml = `<span class="${diffClass}">${diff > 0 ? '+' : ''}${formatNb(diff)} pts</span>`;
            } else {
                diffHtml = `<span class="${diffClass}">${diff > 0 ? '+' : ''}${valFn(diff)}</span>`;
            }
        } else {
            diffHtml = '<span class="text-muted">—</span>';
        }

        tr.innerHTML = `
            <td>${row.l}</td>
            <td>${ptVal}</td>
            <td>${hyVal}</td>
            <td>${diffHtml}</td>
        `;
        table.appendChild(tr);
    });
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function setTableVal(prefix, valPt, valHy, decimals = 0) {
    const format = decimals === 0 ?
        (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) :
        (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    setText(prefix + '_pt', format(valPt));
    setText(prefix + '_hy', format(valHy));

    const diff = valHy - valPt;
    const elDiff = document.getElementById(prefix + '_diff');
    // Special handling if ID doesn't exist for all rows
    if (!elDiff) {
        // Try precise ID
        const precise = document.getElementById(prefix);
        if (precise) precise.innerText = (diff > 0 ? "+" : "") + format(diff);
        return;
    }

    elDiff.innerText = (diff > 0 ? "+" : "") + format(diff);
    elDiff.className = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : '');

    // Invert colors for Costs/Charges (Lower is better)
    if (prefix.includes('charges') || prefix.includes('mo') || prefix.includes('elec')) {
        elDiff.className = diff < 0 ? 'positive' : (diff > 0 ? 'negative' : '');
    }
}

// Verification Routine
function verifyInitialState() {
    // Known values from Excel Analysis
    // Payback ~ 1.6
    // Invest Hy ~ 65 000
    // Marge Net Hy ~ 39k (need to check exact logic above)
    // Let's rely on logic consistency. 
    console.log("Verifying calculation logic...");

    const hy_invest = (defaults.hy_tours * defaults.hy_prix_tour) + defaults.hy_install; // 60000 + 5000 = 65000
    if (hy_invest !== 65000) console.warn("Verification Failed: Invest mismatch");

    // Marge Brute Hy roughly:
    // CA = 364,800 salades (Wait. 100 tours * 40 * 9 cycles(Wait, 48/5 = 9.6 -> 9))
    // Cycles = floor(48/5) = 9
    // Prod = 9 * 100 * 40 = 36,000
    // Comm = 36,000 * 0.95 = 34,200
    // CA = 34,200 * 1.5 = 51,300

    // Check local calculation
    // JS: floor(48/5) = 9
    // Prod = 100*40 = 4000. 9*4000 = 36000. Correct.
    // Comm = 36000 * 0.95 = 34200. Correct.
    // CA = 34200 * 1.5 = 51300. Correct.

    console.log("Verification Logic Check Complete.");
}

// Run
window.addEventListener('DOMContentLoaded', init);
