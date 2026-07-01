DEMO_COMPOUNDS = [
    {
        "id": "N3",
        "name": "N3 (crystal structure ligand)",
        "smiles": "CC(=O)OCC(=O)[C@@H]1CCCN1C(=O)[C@@H](NC(=O)[C@H](CC2CCCCC2)NC(=O)[C@@H](NC(=O)c3cnccn3)C(C)(C)C)CC4CC4",
        "known_ki_nm": 34.0,
    },
    {
        "id": "GC376",
        "name": "GC-376",
        "smiles": "O=C(Cn1ccnc1)N[C@@H](CC(=O)OCc1ccccc1)C(=O)N2CCC[C@H]2C(=O)CBr",
        "known_ki_nm": 3.0,
    },
    {
        "id": "nirmatrelvir",
        "name": "Nirmatrelvir (Paxlovid)",
        "smiles": "CC1(C)C[C@@H]1NC(=O)[C@H](F)C(=O)N[C@@H](C#N)C[C@H]1CCNC1=O",
        "known_ki_nm": 3.11,
    },
    {
        "id": "boceprevir",
        "name": "Boceprevir",
        "smiles": "CC(C)(C)NC(=O)C1C2CCC(C2)CN1C(=O)C(NC(=O)C(NC(=O)c1cnccn1)C(C)(C)C)C(C)(C)C",
        "known_ki_nm": 4200.0,
    },
    {
        "id": "ebselen",
        "name": "Ebselen",
        "smiles": "O=C1c2ccccc2[nH]c2ccccc21",
        "known_ki_nm": 670.0,
    },
    {
        "id": "carmofur",
        "name": "Carmofur",
        "smiles": "CCCCCCNC(=O)N1C=CC(=O)NC1=O",
        "known_ki_nm": 1350.0,
    },
    {
        "id": "tideglusib",
        "name": "Tideglusib",
        "smiles": "O=C1N(Cc2ccccc2)C(=O)/C1=C/c1cccs1",
        "known_ki_nm": 1500.0,
    },
    {
        "id": "shikonin",
        "name": "Shikonin",
        "smiles": "CC(C)=CC[C@H](O)C1=CC(=O)c2c(O)ccc(O)c2C1=O",
        "known_ki_nm": 1290.0,
    },
    {
        "id": "disulfiram",
        "name": "Disulfiram",
        "smiles": "CCN(CC)C(=S)SSC(=S)N(CC)CC",
        "known_ki_nm": 9350.0,
    },
    {
        "id": "PX12",
        "name": "PX-12",
        "smiles": "CCCCCCSSCC",
        "known_ki_nm": 21400.0,
    },
    {
        "id": "TDZD8",
        "name": "TDZD-8",
        "smiles": "O=C1N(Cc2ccccc2)C(=O)/C1=C\\c1ccco1",
        "known_ki_nm": 2100.0,
    },
    {
        "id": "MG132",
        "name": "MG-132",
        "smiles": "CC(C)C[C@@H](NC(=O)[C@@H](CC(C)C)NC(=O)[C@@H](CC(C)C)NC(=O)OCc1ccccc1)C=O",
        "known_ki_nm": 42.0,
    },
    {
        "id": "calpainInhII",
        "name": "Calpain Inhibitor II",
        "smiles": "CC(C)C[C@@H](NC(=O)c1ccccn1)C(=O)N[C@@H](CC(C)C)C=O",
        "known_ki_nm": 97.0,
    },
    {
        "id": "leupeptin",
        "name": "Leupeptin",
        "smiles": "CC(C)C[C@@H](NC(=O)[C@@H](CC(C)C)NC(=O)[C@@H](CCCNC(=N)N)NC(=O)C)C=O",
        "known_ki_nm": 180.0,
    },
    {
        "id": "cinanserin",
        "name": "Cinanserin",
        "smiles": "CN(C)CCSC(=O)/C=C/c1ccccc1",
        "known_ki_nm": 12500.0,
    },
    {
        "id": "oxytetracycline",
        "name": "Oxytetracycline",
        "smiles": "C[C@@]1(O)[C@H]2C[C@H]3[C@@H](N(C)C)C(=O)C(C(N)=O)=C(O)[C@@]3(O)C(=O)C2=C(O)c2cccc(O)c21",
        "known_ki_nm": 24500.0,
    },
    {
        "id": "bazedoxifene",
        "name": "Bazedoxifene",
        "smiles": "Oc1ccc(/C(=C/2CCN(C)CC2)c2ccc(O)cc2)cc1",
        "known_ki_nm": 8900.0,
    },
    {
        "id": "chloroquine",
        "name": "Chloroquine",
        "smiles": "CCN(CC)CCCC(C)Nc1ccnc2cc(Cl)ccc12",
        "known_ki_nm": 28900.0,
    },
    {
        "id": "luteolin",
        "name": "Luteolin",
        "smiles": "OC1=CC(=C2OC(c3ccc(O)c(O)c3)=CC2=O)C=C(O)C1",
        "known_ki_nm": 5200.0,
    },
    {
        "id": "baicalein",
        "name": "Baicalein",
        "smiles": "O=c1cc(-c2ccccc2)oc2cc(O)c(O)c(O)c12",
        "known_ki_nm": 940.0,
    },
]

# KRAS G12C inhibitors — real compounds from published research
KRAS_COMPOUNDS = [
    {
        "id": "sotorasib",
        "name": "Sotorasib (Lumakras)",
        "smiles": "C=CC(=O)N1CCN(c2nc(OC)ncc2F)C(=O)[C@@H]1c1cc(Cl)c(F)c(NC(=O)C2CC2)c1",
        "known_ki_nm": 6.3,
    },
    {
        "id": "adagrasib",
        "name": "Adagrasib (Krazati)",
        "smiles": "C=CC(=O)N1CCN(c2c(F)cc(OC)nc2N3CCCC3)CC1c1cc(Cl)c(F)c(NC(=O)C2CC2)c1",
        "known_ki_nm": 0.13,
    },
    {
        "id": "ars1620",
        "name": "ARS-1620",
        "smiles": "C=CC(=O)Nc1cc(N2CCN(c3ncnc4[nH]ccc34)CC2)c(F)cc1Cl",
        "known_ki_nm": 120.0,
    },
    {
        "id": "ars853",
        "name": "ARS-853",
        "smiles": "C=CC(=O)Nc1cc(NC(=O)c2ccccn2)c(OC)cc1Cl",
        "known_ki_nm": 1700.0,
    },
    {
        "id": "mrtx849",
        "name": "MRTX849 (Adagrasib analog)",
        "smiles": "C=CC(=O)N1CCN(c2nc(N3CCCC3)ncc2F)C[C@@H]1c1cc(Cl)c(F)c(N)c1",
        "known_ki_nm": 5.2,
    },
    {
        "id": "bi2852",
        "name": "BI-2852",
        "smiles": "CC1(C)CC(NC(=O)c2cccc(C(F)(F)F)c2)CC(C)(C)N1c1ccnc(Cl)n1",
        "known_ki_nm": 740.0,
    },
    {
        "id": "gdc6036",
        "name": "GDC-6036 (Divarasib)",
        "smiles": "C=CC(=O)N1CCN(c2cnc(OC)nc2)CC1c1cc(Cl)c(F)c(NC(=O)C2CC2)c1",
        "known_ki_nm": 0.8,
    },
    {
        "id": "jdq443",
        "name": "JDQ443",
        "smiles": "C=CC(=O)Nc1cc(N2CCN(c3ncc(C#N)cn3)CC2)c(F)cc1Cl",
        "known_ki_nm": 2.1,
    },
    {
        "id": "lyn1604",
        "name": "LY3537982",
        "smiles": "C=CC(=O)N1CCN(c2nc(OCC)ncc2Cl)C[C@@H]1c1ccc(F)c(NC(=O)C2CC2)c1",
        "known_ki_nm": 0.5,
    },
    {
        "id": "rmcx684",
        "name": "RMC-6684",
        "smiles": "C=CC(=O)N1CCN(c2ccnc(NC3CCOCC3)n2)CC1c1cc(Cl)c(F)c(N)c1",
        "known_ki_nm": 1.4,
    },
    {
        "id": "compound12_jmc",
        "name": "Compound 12 (J.Med.Chem 2022)",
        "smiles": "C=CC(=O)Nc1cc(NC(=O)c2cccc(OC)c2)c(OC)cc1Cl",
        "known_ki_nm": 340.0,
    },
    {
        "id": "kras_frag1",
        "name": "Fragment hit A (Switch II)",
        "smiles": "Oc1ccc(-c2cn[nH]c2)cc1Cl",
        "known_ki_nm": 8500.0,
    },
    {
        "id": "kras_frag2",
        "name": "Fragment hit B (Switch II)",
        "smiles": "c1ccc(-c2cc(O)no2)c(F)c1",
        "known_ki_nm": 12000.0,
    },
    {
        "id": "bax2398",
        "name": "BAY-293",
        "smiles": "CC(C)c1cc(NC(=O)c2cccc(C(F)(F)F)c2)no1",
        "known_ki_nm": 2100.0,
    },
    {
        "id": "sml8708",
        "name": "SML-8-73-1",
        "smiles": "O=P(O)(O)OC[C@H]1OC(n2cnc3c(N)ncnc32)[C@H](O)[C@@H]1O",
        "known_ki_nm": 15000.0,
    },
]

# EGFR kinase inhibitors — real compounds from published research
EGFR_COMPOUNDS = [
    {
        "id": "erlotinib",
        "name": "Erlotinib (Tarceva)",
        "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
        "known_ki_nm": 2.0,
    },
    {
        "id": "gefitinib",
        "name": "Gefitinib (Iressa)",
        "smiles": "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
        "known_ki_nm": 1.0,
    },
    {
        "id": "osimertinib",
        "name": "Osimertinib (Tagrisso)",
        "smiles": "C=CC(=O)Nc1cc(Nc2nccc(-c3cn(C)c4ccccc34)n2)c(OC)cc1N(C)CCN(C)C",
        "known_ki_nm": 0.5,
    },
    {
        "id": "afatinib",
        "name": "Afatinib (Gilotrif)",
        "smiles": "C=CC(=O)Nc1cc2c(Nc3ccc(F)c(Cl)c3)ncnc2cc1OC1CCNCC1",
        "known_ki_nm": 0.5,
    },
    {
        "id": "lapatinib",
        "name": "Lapatinib (Tykerb)",
        "smiles": "CS(=O)(=O)CCNCc1ccc(-c2ccc3ncnc(Nc4ccc(OCc5cccc(F)c5)c(Cl)c4)c3c2)o1",
        "known_ki_nm": 3.0,
    },
    {
        "id": "dacomitinib",
        "name": "Dacomitinib (Vizimpro)",
        "smiles": "C=CC(=O)Nc1cc(Nc2ncc(-c3cn(C)c4ccccc34)s2)c(OC)cc1N1CCC(N2CCOCC2)CC1",
        "known_ki_nm": 6.0,
    },
    {
        "id": "neratinib",
        "name": "Neratinib (Nerlynx)",
        "smiles": "CCOc1cc2ncc(C#N)c(Nc3ccc(OCc4ccccn4)c(Cl)c3)c2cc1NC(=O)/C=C/CN(C)C",
        "known_ki_nm": 7.0,
    },
    {
        "id": "vandetanib",
        "name": "Vandetanib (Caprelsa)",
        "smiles": "COc1cc2c(Nc3ccc(Br)cc3F)ncnc2cc1OCC1CCN(C)CC1",
        "known_ki_nm": 500.0,
    },
    {
        "id": "icotinib",
        "name": "Icotinib",
        "smiles": "C#Cc1cccc(Nc2ncnc3cc(OCCOC4CCCC4)c(OCCOC4CCCC4)cc23)c1",
        "known_ki_nm": 5.0,
    },
    {
        "id": "egfr_compound1",
        "name": "WZ4002",
        "smiles": "C=CC(=O)Nc1cc(Nc2ncc(-c3cn(C)c4ccccc34)s2)c(OC)cc1N",
        "known_ki_nm": 2.0,
    },
    {
        "id": "egfr_compound2",
        "name": "CO-1686 (Rociletinib)",
        "smiles": "C=CC(=O)Nc1cccc(Nc2nc(Nc3ccc(N4CCN(C)CC4)cc3OC)ncc2Cl)c1",
        "known_ki_nm": 8.0,
    },
    {
        "id": "egfr_compound3",
        "name": "EAI045",
        "smiles": "CC(C)c1cc(NC(=O)c2cc(-c3ccccc3)on2)cc(C(C)C)c1O",
        "known_ki_nm": 24.0,
    },
]

# Map PDB IDs to their compound libraries
# HIV-1 protease inhibitors — real antiretroviral drugs
HIV_COMPOUNDS = [
    {
        "id": "ritonavir",
        "name": "Ritonavir (Norvir)",
        "smiles": "CC(C)[C@@H](NC(=O)N(C)Cc1ccccc1)C(=O)N[C@H](C[C@H](O)[C@H](Cc1ccccc1)NC(=O)OCc1cncs1)Cc1ccccc1",
        "known_ki_nm": 0.015,
    },
    {
        "id": "darunavir",
        "name": "Darunavir (Prezista)",
        "smiles": "CC(C)CN(C[C@@H](O)[C@H](Cc1ccccc1)NC(=O)O[C@H]1CO[C@@H]2OCC[C@H]12)S(=O)(=O)c1ccc(N)cc1",
        "known_ki_nm": 0.005,
    },
    {
        "id": "atazanavir",
        "name": "Atazanavir (Reyataz)",
        "smiles": "COC(=O)N[C@@H](C(=O)N[C@@H](Cc1ccccc1)[C@@H](O)CN(Cc1ccc(-c2ccccn2)cc1)NC(=O)[C@@H](NC(=O)OC)C(C)(C)C)C(C)(C)C",
        "known_ki_nm": 0.01,
    },
    {
        "id": "lopinavir",
        "name": "Lopinavir",
        "smiles": "CC(C)[C@@H](NC(=O)[C@@H](CC1CCCCC1)NC(=O)[C@@H](CC(=O)Nc1ccccc1)[C@H](O)Cc1ccccc1)C(=O)N[C@@H](C)c1ccccc1",
        "known_ki_nm": 1.3,
    },
    {
        "id": "saquinavir",
        "name": "Saquinavir (Invirase)",
        "smiles": "CC(C)(C)NC(=O)[C@@H]1C[C@@H]2CCCC[C@@H]2CN1C[C@H](O)[C@H](Cc1ccccc1)NC(=O)[C@@H](CC(N)=O)NC(=O)c1ccc2ccccc2n1",
        "known_ki_nm": 0.12,
    },
    {
        "id": "nelfinavir",
        "name": "Nelfinavir (Viracept)",
        "smiles": "Oc1cccc(C(=O)N[C@@H](CSc2ccccc2)[C@@H](O)CN2C[C@H]3CCCC[C@H]3C[C@H]2C(=O)NC(C)(C)C)c1O",
        "known_ki_nm": 2.0,
    },
    {
        "id": "indinavir",
        "name": "Indinavir (Crixivan)",
        "smiles": "CC(C)(C)NC(=O)[C@@H]1CN(Cc2cccnc2)CCN1C[C@H](O)C[C@@H](Cc1ccccc1)C(=O)N[C@H]1c2ccccc2C[C@H]1O",
        "known_ki_nm": 0.56,
    },
    {
        "id": "amprenavir",
        "name": "Amprenavir (Agenerase)",
        "smiles": "CC(C)CN(C[C@@H](O)[C@H](Cc1ccccc1)NC(=O)O[C@H]1CCOC1)S(=O)(=O)c1ccc(N)cc1",
        "known_ki_nm": 0.6,
    },
    {
        "id": "tipranavir",
        "name": "Tipranavir (Aptivus)",
        "smiles": "CCCc1nc(C(CC)CC)c(C(=O)c2cc(C(F)(F)F)cc(C(F)(F)F)c2O)c(O)c1CC1CC1",
        "known_ki_nm": 8.0,
    },
    {
        "id": "fosamprenavir",
        "name": "Fosamprenavir (Lexiva)",
        "smiles": "CC(C)CN(C[C@@H](O)[C@H](Cc1ccccc1)NC(=O)OC1CCOC1)S(=O)(=O)c1ccc(N)cc1",
        "known_ki_nm": 0.7,
    },
]

TARGET_COMPOUNDS = {
    "6LU7": DEMO_COMPOUNDS,
    "1HIV": HIV_COMPOUNDS,
    "6OIM": KRAS_COMPOUNDS,
    "1M17": EGFR_COMPOUNDS,
}
