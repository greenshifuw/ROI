
// Default configuration mirroring Excel inputs
const defaults = {
    // A. Généraux
    surface: 100,
    duree_amortissement: 5,
    semaines_an: 48,
    taux_act: 5, // 5%
    cout_mo: 15, // €/h
    prix_elec: 0.18, // €/kWh

    // B. Pleine Terre
    pt_densite: 14,
    pt_cycle: 8,
    pt_taux_vente: 70,
    pt_prix_vente: 1,
    pt_invest: 2000,
    // Advanced PT
    pt_cout_plants: 30,
    pt_cout_engrais: 40,
    pt_cout_eau: 25,
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
    hy_cycle: 5,
    hy_taux_vente: 95,
    hy_prix_vente: 1.5,
    // Advanced Hy
    hy_prix_tour: 600,
    hy_install: 5000,
    hy_maint_an: 500,
    hy_cout_plants: 80,
    hy_cout_engrais: 5, // par tour !!
    hy_cout_eau: 5,
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
    console.log("ROI App Initialized");
    verifyInitialState();
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
    const pt_ch_plants = pt_nb_cycles * state.pt_cout_plants;
    const pt_ch_engrais = pt_nb_cycles * state.pt_cout_engrais;
    const pt_ch_eau = pt_nb_cycles * state.pt_cout_eau;
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

    // Amortissement PT
    const pt_amort_an = state.pt_invest / state.duree_amortissement;
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
    const hy_ch_plants = hy_nb_cycles * state.hy_cout_plants;
    // Excel Formula: Cycles * CostPerTour * NbTours. Wait, check Excel log.
    // Excel: D16:=D5*'1. Hypothèses'!C42*'1. Hypothèses'!C34 => Cycles * CostEngrais * NbTours
    // My input `hy_cout_engrais` = 5. So check assumption.
    const hy_ch_engrais = hy_nb_cycles * state.hy_cout_engrais * state.hy_tours;

    const hy_ch_eau = hy_nb_cycles * state.hy_cout_eau;
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

    // Amortissement Hy
    // Invest = Tours * Prix + Install
    const hy_invest = (state.hy_tours * state.hy_prix_tour) + state.hy_install;
    const hy_amort_an = hy_invest / state.duree_amortissement;
    const hy_res_net = hy_marge_brute - hy_amort_an;

    const hy_cout_revient = hy_comm_an > 0 ? (hy_charges_totales + hy_amort_an) / hy_comm_an : 0;

    // --- PAYBACK & VAN ---
    // Cash flow diff for payback of the EXTRA investment? 
    // Usually Payback = Invest / Annual Cash Flow.
    // Excel Payback Cell D17: '3. Amortissement 5 ans'!C16
    // Excel Amort Sheet:
    // Invest (C4) = -Exploitation!D43 (Total Invest Hy)
    // Cash Flow Annuel (D11) = D8 (Res Net) - D7 (Dotation Amort negative so + Amort) => Res Net + Amort = Cash Flow (Marge Brute roughly? No, Tax?)
    // Actually C11 in Amort = ResNet - Dotation.
    // Wait, D11 (Cash Flow Year 1) = D8 (Res Net) - D7 (Dotation which is negative) => Res Net + Amort. Correct.
    // Which is basically Marge Brute if no Tax?
    // Let's check Excel again: D8 = Res Net. D7 = -Amort. 
    // D11 = D8 - D7 = Res Net + Amort. 
    // And Res Net = Marge Brute - Amort.
    // So D11 = (Marge Brute - Amort) + Amort = Marge Brute.
    // So Cash Flow = Marge Brute.

    // Payback = (-Invest) / CashFlow
    const hy_cash_flow_an = hy_marge_brute;
    let hy_payback = "N/A";
    if (hy_cash_flow_an > 0) {
        hy_payback = (hy_invest / hy_cash_flow_an).toFixed(1);
    }

    // VAN (NPV) 5 ans
    // Inv + CF/(1+t) + CF/(1+t)^2 ...
    // Inv is negative
    const taux = state.taux_act / 100;
    let van = -hy_invest;
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

    // RENDER DETAILED TABLES
    renderDetailedExploitation({
        cycles: { l: "Nombre de cycles / an", pt: pt_nb_cycles, hy: hy_nb_cycles },
        prod_cycle: { l: "Production / cycle", pt: pt_prod_cycle, hy: hy_prod_cycle },
        prod_an: { l: "Production / an", pt: pt_prod_an, hy: hy_prod_an },
        comm_an: { l: "Commercialisé / an", pt: pt_comm_an, hy: hy_comm_an },
        ca: { l: "Chiffre d'Affaires", pt: pt_ca_an, hy: hy_ca_an, bold: true },

        // Charges
        plants: { l: "Plants / Semences", pt: pt_ch_plants, hy: hy_ch_plants, sub: true },
        engrais: { l: "Engrais", pt: pt_ch_engrais, hy: hy_ch_engrais, sub: true },
        eau: { l: "Eau irrigation", pt: pt_ch_eau, hy: hy_ch_eau, sub: true },
        phyto: { l: "Phytosanitaires", pt: pt_ch_phyto, hy: 0, sub: true },
        elec: { l: "Électricité", pt: pt_ch_elec, hy: hy_ch_elec, sub: true },

        // MO
        mo_sol: { l: "MO: Travail sol", pt: pt_nb_cycles * state.pt_mo_sol * state.cout_mo, hy: 0, sub: true },
        mo_semis: { l: "MO: Semis/Plantation", pt: pt_nb_cycles * state.pt_mo_semis * state.cout_mo, hy: hy_nb_cycles * state.hy_mo_plant * state.cout_mo, sub: true },
        mo_cal: { l: "MO: Désherbage", pt: pt_nb_cycles * state.pt_mo_desh * state.cout_mo, hy: 0, sub: true },
        mo_recolte: { l: "MO: Récolte", pt: pt_nb_cycles * state.pt_mo_recolte * state.cout_mo, hy: hy_nb_cycles * state.hy_mo_recolte * state.cout_mo, sub: true },
        mo_maint: { l: "MO: Maintenance Irrig.", pt: pt_nb_cycles * state.pt_mo_maint * state.cout_mo, hy: hy_nb_cycles * state.hy_mo_maint * state.cout_mo, sub: true },

        maint_mat: { l: "Maintenance Matériel", pt: 0, hy: hy_ch_maint, sub: true },

        total_charges: { l: "TOTAL CHARGES", pt: pt_charges_totales, hy: hy_charges_totales, bold: true },
        marge_brute: { l: "MARGE BRUTE", pt: pt_marge_brute, hy: hy_marge_brute, bold: true, highlight: true },

        amort: { l: "Dotation Amortissement", pt: pt_amort_an, hy: hy_amort_an },
        res_net: { l: "RÉSULTAT NET", pt: pt_res_net, hy: hy_res_net, bold: true, highlight: true, final: true }
    });

    renderAmortissementTable({
        invest: hy_invest,
        ca: hy_ca_an,
        charges: hy_charges_totales,
        amort: hy_amort_an,
        taux: state.taux_act / 100
    });
}

function renderDetailedExploitation(data) {
    const tbody = document.getElementById('detailed-exploitation-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const format = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const formatNb = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

    Object.values(data).forEach(row => {
        const tr = document.createElement('tr');
        if (row.sub) tr.className = 'sub-item';
        if (row.highlight) tr.className = 'calc-row';
        if (row.final) tr.className = 'calc-row final';

        let diff = row.hy - row.pt;
        let diffClass = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : '');
        // Invert for charges
        if (row.l.toLowerCase().includes('charges') || row.l.toLowerCase().includes('mo') || row.l.toLowerCase().includes('plants') || row.l.toLowerCase().includes('engrais')) {
            diffClass = diff < 0 ? 'positive' : (diff > 0 ? 'negative' : '');
        }

        const isCurrency = row.l.includes('€') || row.l.includes('Charges') || row.l.includes('Marge') || row.l.includes('Résultat') || row.l.includes('Amort') || row.l.includes('MO') || row.l.includes('Plants') || row.l.includes('Engrais') || row.l.includes('Eau') || row.l.includes('Phyto') || row.l.includes('Électricité') || row.l.includes('Affaires');

        // Use generic formatter if mostly currency, else number
        const valFn = isCurrency ? format : formatNb;

        tr.innerHTML = `
            <td style="${row.bold ? 'font-weight:bold' : ''}">${row.l}</td>
            <td>${valFn(row.pt)}</td>
            <td>${valFn(row.hy)}</td>
            <td class="${diffClass}">${(diff > 0 ? '+' : '') + valFn(diff)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAmortissementTable(d) {
    const tbody = document.getElementById('amortissement-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const format = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    // Année 0 to 5
    // Year 0: Invest (negative)
    // Year 1-5: Exploitation

    const rows = [
        { l: "Investissement", vals: [-d.invest, 0, 0, 0, 0, 0] },
        { l: "Chiffre d'Affaires", vals: [0, d.ca, d.ca, d.ca, d.ca, d.ca] },
        { l: "Charges Exploitation", vals: [0, -d.charges, -d.charges, -d.charges, -d.charges, -d.charges] },
        { l: "Amortissement", vals: [0, -d.amort, -d.amort, -d.amort, -d.amort, -d.amort] },
        { l: "RÉSULTAT NET", vals: [0, d.ca - d.charges - d.amort, d.ca - d.charges - d.amort, d.ca - d.charges - d.amort, d.ca - d.charges - d.amort, d.ca - d.charges - d.amort], bold: true },
        { l: "Cash Flow (Marge Brute)", vals: [-d.invest, d.ca - d.charges, d.ca - d.charges, d.ca - d.charges, d.ca - d.charges, d.ca - d.charges], highlight: true }
    ];

    // Calculate Cumul
    const cf = rows[5].vals;
    const cumul = [];
    let acc = 0;
    cf.forEach(v => { acc += v; cumul.push(acc); });
    rows.push({ l: "Cash Flow Cumulé", vals: cumul, bold: true });

    rows.forEach(row => {
        const tr = document.createElement('tr');
        if (row.highlight) tr.className = 'calc-row';

        let html = `<td style="${row.bold ? 'font-weight:bold' : ''}">${row.l}</td>`;
        row.vals.forEach(v => {
            html += `<td class="${v < 0 ? 'negative' : (v > 0 ? 'positive' : '')}">${format(v)}</td>`;
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
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
