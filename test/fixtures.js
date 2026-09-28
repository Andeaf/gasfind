// Mostre reduse din răspunsuri REALE ale surselor (verificate pe 26–27 sept. 2026).

export const FR_ROWS = [
  { id: 92230008, adresse: '192 Avenue Louis Roche', ville: 'Gennevilliers', cp: '92230', geom: { lon: 2.3044, lat: 48.9327 }, pop: 'R', gazole_prix: 2.449, gazole_maj: '2026-09-18T13:42:54+00:00', sp95_prix: 2.279, sp95_maj: '2026-09-18T13:42:54+00:00', e10_prix: 2.249, e10_maj: '2026-09-18T13:42:54+00:00', sp98_prix: 2.319, sp98_maj: '2026-09-18T13:42:54+00:00', gplc_prix: null, gplc_maj: null, carburants_indisponibles: ['E85', 'GPLc'], horaires_automate_24_24: 'Non' },
  { id: 75012001, adresse: 'Autoroute A6', ville: 'Paris', cp: '75012', geom: { lon: 2.39, lat: 48.83 }, pop: 'A', gazole_prix: 2.5, gazole_maj: '2026-01-10T12:00:00+00:00', sp95_prix: 2.1, sp95_maj: '2026-09-18T10:00:00+00:00', carburants_indisponibles: ['SP95'], horaires_automate_24_24: 'Oui' },
];

export const ES_JSON = {
  Fecha: '26/09/2026 23:59:04',
  ListaEESSPrecio: [
    { 'C.P.': '42146', 'Dirección': 'CARRERA N-234, 376,5', Horario: 'L-D: 7:00-23:00', Latitud: '41,805583', Localidad: 'ABEJAR', 'Longitud (WGS84)': '-2,786306', Margen: 'D', Municipio: 'Abejar', 'Precio Gasoleo A': '2,025', 'Precio Gasoleo Premium': '2,075', 'Precio Gasolina 95 E5': '2,045', 'Precio Gasolina 98 E5': '2,205', 'Precio Gases licuados del petróleo': '', Provincia: 'SORIA', 'Remisión': 'OM', 'Rótulo': 'REPSOL', 'Tipo Venta': 'P', IDEESS: '6230', IDMunicipio: '6160', IDProvincia: '42', IDCCAA: '08' },
    { 'C.P.': '42001', 'Dirección': 'CALLE PRIVADA 1', Horario: '', Latitud: '41,76', Localidad: 'SORIA', 'Longitud (WGS84)': '-2,46', 'Precio Gasoleo A': '1,500', 'Rótulo': 'COOPERATIVA', 'Tipo Venta': 'R', IDEESS: '9999', IDProvincia: '42' },
  ],
};

export const PT_JSON = {
  status: true, mensagem: 'sucesso',
  resultado: [
    { Id: 67360, Nome: 'INTERMARCHE VILAR FORMOSO', TipoPosto: 'Área comercial (Hipermercados)', Municipio: 'Almeida', Preco: '1,939 €', Marca: 'INTERMARCHÉ', Combustivel: 'Gasóleo simples', DataAtualizacao: '2026-09-22 08:45', Distrito: 'Guarda', Morada: 'Sitio da Represa', Localidade: 'Vilar Formoso', CodPostal: '6355-289', Latitude: 40.61817, Longitude: -6.84339, Quantidade: 2930 },
    { Id: 67360, Nome: 'INTERMARCHE VILAR FORMOSO', Preco: '1,849 €', Marca: 'INTERMARCHÉ', Combustivel: 'Gasolina simples 95', DataAtualizacao: '2026-09-21 07:00', Morada: 'Sitio da Represa', Localidade: 'Vilar Formoso', CodPostal: '6355-289', Latitude: 40.61817, Longitude: -6.84339 },
    { Id: 67360, Nome: 'INTERMARCHE VILAR FORMOSO', Preco: '2,099 €', Marca: 'INTERMARCHÉ', Combustivel: 'Gasolina especial 98', DataAtualizacao: '2026-09-21 07:00', Latitude: 40.61817, Longitude: -6.84339 },
    { Id: 67360, Nome: 'INTERMARCHE VILAR FORMOSO', Preco: '1,999 €', Marca: 'INTERMARCHÉ', Combustivel: 'Gasolina 98', DataAtualizacao: '2026-09-20 07:00', Latitude: 40.61817, Longitude: -6.84339 },
    { Id: 1, Nome: 'X', Preco: '1,5 €', Marca: 'Y', Combustivel: 'Gasóleo colorido', Latitude: 40, Longitude: -8 },
  ],
};

export const IT_JSON = {
  success: true, center: { lat: 45.463, lng: 9.187 },
  results: [
    { id: 47183, name: '8212', fuels: [
      { id: 123305621, price: 2.289, name: 'Benzina', fuelId: 1, isSelf: false },
      { id: 123226789, price: 2.279, name: 'Benzina', fuelId: 1, isSelf: true },
      { id: 123242784, price: 2.129, name: 'Gasolio', fuelId: 2, isSelf: false },
      { id: 123242783, price: 2.129, name: 'Gasolio', fuelId: 2, isSelf: true },
    ], location: { lat: 45.47795827726888, lng: 9.223964594897586 }, insertDate: '2026-09-26T22:05:27+02:00', address: null, brand: 'Tamoil', distance: '3.05' },
    { id: 35560, name: '2227', fuels: [
      { id: 1, price: 2.139, name: 'Benzina', fuelId: 1, isSelf: false },
      { id: 2, price: 2.409, name: 'Gasolio', fuelId: 2, isSelf: false },
      { id: 3, price: 2.289, name: 'Benzina WR 100', fuelId: 7, isSelf: true },
      { id: 4, price: 0.899, name: 'GPL', fuelId: 4, isSelf: false },
      { id: 5, price: 2.5, name: 'HVOlution', fuelId: 394, isSelf: false },
    ], location: { lat: 45.435904471365184, lng: 9.231637716293335 }, insertDate: '2026-09-26T22:04:14+02:00', address: null, brand: 'Pompe Bianche' },
  ],
};

export const DE_V4 = {
  stations: [
    { country: 'de', id: '1c4f126b-1f3c-4b38-9692-05c400ea8e61', name: 'Sprint Berlin Kniprodestr.', brand: 'Sprint', street: 'Kniprodestr. 25', postalCode: '10407', place: 'Berlin', coords: { lat: 52.53389, lng: 13.444949 }, isOpen: true, openingTimes: [], dist: 1.51, fuels: [
      { category: 'gasoline', name: 'Super E5', price: 2.309, lastChange: { amount: -0.01, timestamp: '2026-09-26T19:26:48+02' } },
      { category: 'gasoline', name: 'Super E10', price: 2.249, lastChange: { amount: -0.01, timestamp: '2026-09-26T19:26:48+02' } },
      { category: 'diesel', name: 'Diesel', price: 2.389, lastChange: { amount: -0.01, timestamp: '2026-09-26T20:50:18+02' } },
    ] },
  ],
  searchCenter: { lat: 52.52, lng: 13.405 }, apiVersion: '4.0.7', timestamp: '2026-09-26T23:58:23+02', license: 'CC BY http://www.tankerkoenig.de',
};

export const AT_LIST = [
  { id: 1234, name: 'BP Wien Triester Straße', location: { address: 'Triester Straße 50', postalCode: '1100', city: 'Wien', latitude: 48.17, longitude: 16.35 }, prices: [{ fuelType: 'DIE', amount: 1.699, label: 'Diesel' }], open: true, distance: 1.2 },
  { id: 5678, name: 'Shell Wien', location: { address: 'Gürtel 1', postalCode: '1050', city: 'Wien', latitude: 48.19, longitude: 16.34 }, prices: [], open: true, distance: 2.0 },
];

export const SI_RESULTS = [
  { pk: 2048, franchise: 1, name: 'PETROL LJUBLJANA - TIVOLSKA', address: 'TIVOLSKA CESTA 43', lat: 46.0580724, lng: 14.50344546, prices: { 95: 1.748, 98: null, 100: 2.101, dizel: 2.012, 'dizel-premium': null, 'avtoplin-lpg': 0.976, KOEL: null, hvo: null, cng: null, lng: null }, distance: 223.6, direction: '', open_hours: '00:00-23:59\n', zip_code: '1000' },
];
export const SI_FRANCHISES = { 1: 'Petrol d.d., Ljubljana' };

export const HR_JSON = {
  postajas: [
    { id: 1425, naziv: 'SLANO', adresa: 'Banići 40', mjesto: 'Banići', obveznik_id: 5, long: '42.798694', lat: '17.850944', cjenici: [
      { id: 5558660, gorivo_id: 829, cijena: 1.64 }, { id: 5558713, gorivo_id: 780, cijena: 2.1 },
      { id: 5558820, gorivo_id: 830, cijena: 1.72 }, { id: 5558767, gorivo_id: 831, cijena: 1.91 }, { id: 5558865, gorivo_id: 832, cijena: 0.86 },
    ] },
  ],
  gorivos: [
    { id: 829, naziv: 'Eurosuper 95 BS', obveznik_id: 5, vrsta_goriva_id: 2 },
    { id: 780, naziv: 'Eurosuper 100', obveznik_id: 5, vrsta_goriva_id: 6 },
    { id: 830, naziv: 'Eurodizel BS', obveznik_id: 5, vrsta_goriva_id: 8 },
    { id: 831, naziv: 'Eurodizel Class', obveznik_id: 5, vrsta_goriva_id: 7 },
    { id: 832, naziv: 'Autoplin', obveznik_id: 5, vrsta_goriva_id: 9 },
  ],
  obvezniks: [{ id: 5, naziv: 'Tifon d.o.o.' }],
};

export const MD_LIST = [
  { x: 2970407.854, y: 6151928.615, station_type: 1, station_status: 1, bua: 'Criva', lev2: 'Briceni', station_name: 'Agro Destinație', idno: '1014602003113', company_name: 'AGRODESTINAȚIE S.R.L.', diesel: 36.82, gasoline: 34.28, gpl: null, fullstreet: null, addrnum: null, roadkm: 4 },
  { x: 3203000, y: 5946000, station_status: 4, station_name: 'Inactivă', diesel: 30, gasoline: 30 },
];

export const RO_DIESEL = {
  Stations: [
    { id: '041SC1', name: 'Suceava 1 (1 Decembrie)', updatedate: '26/09/2026 00:16 ', network: { id: 'ROMPETROL', name: 'Rompetrol' }, addr: { addrstring: 'Str. 1 Decembrie 1918 FN, 720262, Suceava', location: { Lat: 47.635426, Lon: 26.233215 }, uatid: '146263' } },
    { id: 'R1091', name: '2 SUCEAVA', updatedate: '25/09/2026 01:05 ', network: { id: 'PETROM', name: 'PETROM' }, addr: { addrstring: 'str. Cernauti', zipcode: '720021', location: { Lat: 47.65294, Lon: 26.25794 }, uatid: '146263' } },
  ],
  Products: [
    { catprod: { id: '21', name: 'Motorină standard' }, distance: 0.24, id: '15', name: 'Motorina Standard', network: { id: 'PETROM' }, price: 10.91, stationid: 'R1091' },
    { catprod: { id: '21', name: 'Motorină standard' }, distance: 0.6, id: '9', name: 'Diesel', network: { id: 'ROMPETROL' }, price: 10.89, stationid: '041SC1' },
  ],
};
export const RO_PETROL = {
  Stations: [RO_DIESEL.Stations[1]],
  Products: [{ catprod: { id: '11', name: 'Benzină standard' }, network: { id: 'PETROM' }, price: 9.79, stationid: 'R1091' }],
};

export const OSM_JSON = {
  elements: [
    { type: 'node', id: 101, lat: 47.64, lon: 26.21, tags: { amenity: 'fuel', name: 'Oscar', brand: 'Oscar', 'fuel:diesel': 'yes', 'fuel:lpg': 'yes' } },
    { type: 'way', id: 202, center: { lat: 47.65, lon: 26.22 }, tags: { amenity: 'fuel', operator: 'Gulf', 'addr:street': 'Calea Unirii', 'addr:housenumber': '5', 'addr:city': 'Suceava' } },
    { type: 'node', id: 303, lat: 47.66, lon: 26.23, tags: { amenity: 'fuel', access: 'private', name: 'Flotă' } },
  ],
};

// Belgia: be.STAT „Tarif officiel produits pétroliers – dernière mise à jour” (JSON), 27–28 sept. 2026
export const BE_BESTAT = {
  facts: [
    {"Groupe de produits":"Essences","Produit":"Essence 95 RON E5 (€/L)","Jour":"28SEP26","Prix TVA excl.":1.7752,"Difference TVA incl.":null,"Prix TVA incl.":2.148},
    {"Groupe de produits":"Essences","Produit":"Essence 95 RON E10 (€/L)","Jour":"28SEP26","Prix TVA excl.":1.7421,"Difference TVA incl.":null,"Prix TVA incl.":2.108},
    {"Groupe de produits":"Essences","Produit":"Essence 98 RON E5 (€/L)","Jour":"28SEP26","Prix TVA excl.":1.919,"Difference TVA incl.":null,"Prix TVA incl.":2.322},
    {"Groupe de produits":"Gasoil Diesel routier","Produit":"Diesel B7 (€/L)","Jour":"28SEP26","Prix TVA excl.":2.0612,"Difference TVA incl.":null,"Prix TVA incl.":2.494},
    {"Groupe de produits":"Gasoil Diesel routier","Produit":"Diesel B10 (€/L)","Jour":"28SEP26","Prix TVA excl.":2.0545,"Difference TVA incl.":null,"Prix TVA incl.":2.486},
    {"Groupe de produits":"Gasoil de chauffage","Produit":"Gasoil chauffage (H0/H7) (à la pompe) (€/L)","Jour":"28SEP26","Prix TVA excl.":1.4182,"Difference TVA incl.":null,"Prix TVA incl.":1.716},
    {"Groupe de produits":"Butane + LPG","Produit":"Autogas LPG (à la pompe) (€/L)","Jour":"28SEP26","Prix TVA excl.":0.8033,"Difference TVA incl.":null,"Prix TVA incl.":0.972},
    {"Groupe de produits":"Fuel Oil","Produit":"Fuel oil extra lourd 1% S (en camion citerne) (€/T)","Jour":"28SEP26","Prix TVA excl.":null,"Difference TVA incl.":null,"Prix TVA incl.":null},
    {"Groupe de produits":"Gasoil Diesel routier","Produit":"Diesel B7 (€/L)","Jour":"27SEP26","Prix TVA excl.":null,"Difference TVA incl.":null,"Prix TVA incl.":2.494},
  ],
};

// Luxemburg: LUSTAT SDMX CSV (labels=both), fluxurile DF_E5301 (benzină), DF_E5302 (motorină), DF_E5305 (GPL)
export const LU_SDMX = [
  `DATAFLOW,MEASURE: Measure,UNIT_MEASURE: Unit of measure,FREQ: Frequency,MOTOR_ENERGY: Motor Energy,COMMON_PRODUCT: Common products,BASE_PERIOD: Base period,CONSTR_TRADE: Construction trades,ACTIVITY: Economic activity (NACE Rev.2),BUILDING_TYPE: Building type,MARKET: Market,PRODUCT_CPA_2_2: Products (CPA 2.2),TIME_TRANS: Time transformation,NRG_SRC: Energy source,TIME_PERIOD: Time period,OBS_VALUE,UNIT_MULT: Unit multiplier,OBS_STATUS: Observation status,DECIMALS: Decimals,COMMENT_DSET: Comments on the dataset levels,COMMENT_OBS: Comments to the observation value,COMMENT_TS_CONSTR_TRADE: Detailed description of the group of series
LU1:DSD_PRIX_ESSENCE@DF_E5301(1.0),PRIX: Fuel prices,EUR_LI: Euro per liter,I: Irregular,SP98: 98 octane unleaded petrol,_Z: Not Applicable,_Z: Not Applicable,_Z: Not Applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not aplicable,_Z: Not applicable,2026-09-24,2.059,0: Units,,3: Three,,,
LU1:DSD_PRIX_ESSENCE@DF_E5301(1.0),PRIX: Fuel prices,EUR_LI: Euro per liter,I: Irregular,SP95: 95 octane unleded petrol,_Z: Not Applicable,_Z: Not Applicable,_Z: Not Applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not aplicable,_Z: Not applicable,2026-09-24,1.835,0: Units,,3: Three,,,
LU1:DSD_PRIX_ESSENCE@DF_E5301(1.0),PRIX: Fuel prices,EUR_LI: Euro per liter,I: Irregular,SP95: 95 octane unleded petrol,_Z: Not Applicable,_Z: Not Applicable,_Z: Not Applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not aplicable,_Z: Not applicable,2026-09-18,1.849,0: Units,,3: Three,,,`,
  `DATAFLOW,MEASURE: Measure,UNIT_MEASURE: Unit of measure,FREQ: Frequency,MOTOR_ENERGY: Motor Energy,COMMON_PRODUCT: Common products,BASE_PERIOD: Base period,CONSTR_TRADE: Construction trades,ACTIVITY: Economic activity (NACE Rev.2),BUILDING_TYPE: Building type,MARKET: Market,PRODUCT_CPA_2_2: Products (CPA 2.2),TIME_TRANS: Time transformation,NRG_SRC: Energy source,TIME_PERIOD: Time period,OBS_VALUE,UNIT_MULT: Unit multiplier,OBS_STATUS: Observation status,DECIMALS: Decimals,COMMENT_DSET: Comments on the dataset levels,COMMENT_OBS: Comments to the observation value,COMMENT_TS_CONSTR_TRADE: Detailed description of the group of series
LU1:DSD_PRIX_ESSENCE@DF_E5302(1.0),PRIX: Fuel prices,EUR_LI: Euro per liter,I: Irregular,DIE: Diesel,_Z: Not Applicable,_Z: Not Applicable,_Z: Not Applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not aplicable,_Z: Not applicable,2026-09-25,2.095,0: Units,,3: Three,,,
LU1:DSD_PRIX_ESSENCE@DF_E5302(1.0),PRIX: Fuel prices,EUR_LI: Euro per liter,I: Irregular,DIE: Diesel,_Z: Not Applicable,_Z: Not Applicable,_Z: Not Applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not aplicable,_Z: Not applicable,2026-09-23,2.055,0: Units,,3: Three,,,`,
  `DATAFLOW,MEASURE: Measure,UNIT_MEASURE: Unit of measure,FREQ: Frequency,MOTOR_ENERGY: Motor Energy,COMMON_PRODUCT: Common products,BASE_PERIOD: Base period,CONSTR_TRADE: Construction trades,ACTIVITY: Economic activity (NACE Rev.2),BUILDING_TYPE: Building type,MARKET: Market,PRODUCT_CPA_2_2: Products (CPA 2.2),TIME_TRANS: Time transformation,NRG_SRC: Energy source,TIME_PERIOD: Time period,OBS_VALUE,UNIT_MULT: Unit multiplier,OBS_STATUS: Observation status,DECIMALS: Decimals,COMMENT_DSET: Comments on the dataset levels,COMMENT_OBS: Comments to the observation value,COMMENT_TS_CONSTR_TRADE: Detailed description of the group of series
LU1:DSD_PRIX_ESSENCE@DF_E5305(1.0),PRIX: Fuel prices,EUR_LI: Euro per liter,I: Irregular,LPG: Liquefied petroleum gases (LPG),_Z: Not Applicable,_Z: Not Applicable,_Z: Not Applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not applicable,_Z: Not aplicable,_Z: Not applicable,2026-09-17,0.83,0: Units,,3: Three,,,`,
];

// Serbia: RSS must.gov.rs (scurtat) și anunțul de preț maxim din 25 sept. 2026 (fragment)
export const RS_RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>МУСТ</title>
<item><title>Лазаревић са амбасадором Аустрије Еном Дрофеником: Растућа трговинска сарадња, Експо 2027 у фокусу </title>
        <link>https://must.gov.rs/vest/22147</link>
                <description>
            <p class="isselectedend">Аустрија је један од најзначајнијих привредних партнера Србије – трећи је највећи страни инвеститор, изузетно важан спољнотрговински партнер и значајно тржиште за српски...</description></item>
<item><title>ОБАВЕШТЕЊЕ О НАЈВИШОЈ МАЛОПРОДАЈНОЈ ЦЕНИ ДЕРИВАТА НАФТЕ EVRO DIZEL И EVRO PREMIJUM BMB 95</title>
        <link>https://must.gov.rs/vest/22207</link>
                <description>
            <p>У складу са чланом 3. став 4. Уредбе о ограничењу висине цена деривата нафте („Сл. гласник РС 75/2026"), утврђује се највиша малопродајна цена деривата нафте за период од 15 часова 25. септем...</description></item>
</channel></rss>`;
export const RS_NOTICE = `<html><body><article><div class="article-date">
                                                                                                            25. септембар 2026.                                </div>
<h1>ОБАВЕШТЕЊЕ О НАЈВИШОЈ МАЛОПРОДАЈНОЈ ЦЕНИ ДЕРИВАТА НАФТЕ EVRO DIZEL И EVRO PREMIJUM BMB 95</h1>
<p>У складу са чланом 3. став 4. Уредбе о ограничењу висине цена деривата нафте (&bdquo;Сл. гласник РС 75/2026"), утврђује се највиша малопродајна цена деривата нафте за период од 15 часова 25. септембра 2026.године до 15 часова 02. октобра 2026. године, и то за:</p>                                    </div>
                                    <div class="text-content">
    <div class='text_center'><div class='clearfix'></div><div class='printable'><div><ol>
<li>EVRO DIZEL, у износу 236,00 динара за један литар и</li>
<li>EVRO PREMIJUM BMB 95 у износу 207,00 динара за један литар.</li>
</ol>
<p>Такође, у складу са чланом 3. став 6. наведене уредбе, обавештавају се привредни субјекти који обављају делатност трговине моторним и другим горивима на станицама за снабдевање превозних средстава да су дужни да утврђене малопродајне цене деривата нафте примене одмах по објављивању на званичној интернет страници Министарства унутрашње и спољне трговине.</p></div><div style="overflow: auto; clear: both;"></div></div></div><div class='text_center'><div class='clearfix'></div><div class='printable'><div style="overflow: auto; clear: both;"></div></div></div></div>                                </div>
                                <div class="article-slider-container">
                                    <div class="col-lg-5">
                                        <div id="article-slider-gallery" class="flexslider">
                                            <ul class="slides">
                                                                                            </ul>
</article></body></html>`;

// Muntenegru: lista de articole din wapi.gov.me (scurtată) și articolul „Nove cijene goriva od 22.09.2026” (fragment)
export const ME_LIST = { data: { data: [{"id":170211,"title":"Nove cijene goriva od 22.09.2026","slug":"nove-cijene-goriva-od-22092026","published_at":"2026-09-21 19:47:11"},{"id":170009,"title":"Crna Gora i Švedska: prostor za snažnije partnerstvo u energetici","slug":"crna-gora-i-svedska-prostor-za-snaznije-partnerstvo-u-energetici","published_at":"2026-09-15 17:00:00"},{"id":169972,"title":"Nove cijene goriva od 15.09.2026","slug":"nove-cijene-goriva-od-15092026","published_at":"2026-09-14 20:01:31"}] } };
export const ME_ARTICLE = `<html><body><main><h1>Nove cijene goriva od 22.09.2026</h1>
<span _ngcontent-sc243="" class="font-medium">Objavljeno: </span><span _ngcontent-sc243="" class="font-light"> 21.09.2026. <span _ngcontent-sc243="">•</span> 19:47 </span></span><!----><span _ngcontent-sc243="" class="block text-gray-200 text-18 leading-100"><span _ngcontent-sc243="" class="font-medium">Autor: </span><!----><a _ngcontent-sc243="" class="font-light text-cyprus hover:underline" title="Ministarstvo energetike i rudarstva" aria-label="Ministarstvo energetike i rudarstva" href="/pretraga?author=1985"> Ministarstvo energetike i rudarstva </a><!----></span><!----></div></app-article-meta><span class="block border-t border-gray-300 mt-4 mb-8"></span><app-article-toc _nghost-sc244=""><!----></app-article-toc><app-article-body><section class="relative ui-article-spacing"><div id="ui-article" class="ui-article"><div><div><p>Poštovani,</p><p>Obavještavamo vas da od 22. septembra 2026. godine važe sljedeće maksimalne maloprodajne cijene naftnih derivata:</p><p><strong>EUROSUPER 98 1.78 €/l (+0.02)<br><br>EUROSUPER 95 1.74 €/l (+0.02)<br><br>EURODIZEL 1.95 €/l (+0.05)<br><br>LOŽ ULJE 2.07 €/l (+0,09)</strong></p><p>Obračun maksimalnih maloprodajnih cijena navedenih derivata izvršen je u skladu sa Odlukom o umanjenju iznosa akcize za promet bezolovnog benzina i gasnih ulja po kojoj je akciza na benzin snizena 30% a na dizel 40 %, koja je donijeta na danasnjoj sjednici Vlade i Uredbom o načinu obračuna maksimalne maloprodajne cijene određenih vrsta naftnih derivata („Službeni list Crne Gore“, br. 40/26).</p><p>Navedene cijene važiće od 22. do 28. septembra 2026. godine.</p><p>Naredni obračun biće izvršen 28. septembra 2026. godine, nakon čega će biti objavljene cijene koje će važiti od 29. septembra 2026. godine.</p>
</main></body></html>`;

// Cursuri: NBS (rândul EUR din lista cursului mediu), NBRM (JSON), BCE (XML scurtat, ratele sunt ilustrative)
export const NBS_HTML = `<table><tr>
                        <td>EUR</td>
                        <td>978</td>
                            <td>&#x415;&#x41C;&#x423;</td>
                        <td>1</td>
                                <td>117,4831</td>
                    </tr></table>`;
export const NBRM_JSON = [{"rBr":180,"datum":"2026-09-26T00:00:00","valuta":"840","oznaka":"USD","drzava":"С А Д","nomin":1,"kupoven":53.7546,"sreden":54.0247,"prodazen":54.2948,"drzavaAng":"USA","drzavaAl":"SHBA","nazivMak":"САД долар","nazivAng":"US dollar","nazivAl":"Dollari Amerikan","datum_f":"2026-09-25T00:00:00"},{"rBr":180,"datum":"2026-09-27T00:00:00","valuta":"978","oznaka":"EUR","drzava":"ЕМУ","nomin":1,"kupoven":61.2964,"sreden":61.6044,"prodazen":61.9124,"drzavaAng":"EMU","drzavaAl":"UEM","nazivMak":"евро","nazivAng":"Euro","nazivAl":"Euro","datum_f":"2026-09-25T00:00:00"},{"rBr":180,"datum":"2026-09-27T00:00:00","valuta":"840","oznaka":"USD","drzava":"С А Д","nomin":1,"kupoven":53.7546,"sreden":54.0247,"prodazen":54.2948,"drzavaAng":"USA","drzavaAl":"SHBA","nazivMak":"САД долар","nazivAng":"US dollar","nazivAl":"Dollari Amerikan","datum_f":"2026-09-25T00:00:00"}];
export const ECB_XML = `<gesmes:Envelope><Cube><Cube time='2026-09-25'><Cube currency='USD' rate='1.1712'/><Cube currency='DKK' rate='7.4635'/><Cube currency='GBP' rate='0.8712'/><Cube currency='RON' rate='5.2811'/><Cube currency='CZK' rate='24.318'/></Cube></Cube></gesmes:Envelope>`;

// Danemarca: răspunsuri reale (27 sept. 2026) de la API-urile publice ale companiilor, câte 2 stații
export const DK_OK = {"items":[{"facility_number":1034,"street":"Bramhalevej","house_number":"2","postal_code":6100,"city":"Haderslev","coordinates":{"latitude":55.295925,"longitude":9.424641},"last_updated_time":"2026-09-27T22:24:52.5594073+02:00","prices":[{"product_name":"Blyfri 95","price":18.09},{"product_name":"Svovlfri Diesel","price":19.19},{"product_name":"Oktan 100","price":20.29}]},{"facility_number":1030,"street":"Sydmotorvejen","house_number":"380","postal_code":4733,"city":"Tappernøje","coordinates":{"latitude":55.169491,"longitude":11.956868},"last_updated_time":"2026-09-27T22:24:52.5594073+02:00","prices":[{"product_name":"Blyfri 95","price":18.09},{"product_name":"Svovlfri Diesel","price":19.19},{"product_name":"Oktan 100","price":20.29}]}]};
export const DK_SHELL = [{"stationId":"D001","brand":"Shell","owner":"Shell","street":"SDR. FASANVEJ 90","houseNumber":null,"postalCode":"2500","city":"VALBY","coordinates":{"latitude":"55.667926","longitude":"12.517055"},"prices":[{"fuelType":"Autobenzin","octane":"98","productName":"V-Power","price":"20.59","currency":"DKK","lastUpdated":"2026-09-25T12:00:00.000"},{"fuelType":"Autodiesel","octane":null,"productName":"FuelSave Diesel","price":"19.19","currency":"DKK","lastUpdated":"2026-09-25T12:00:00.000"},{"fuelType":"Autobenzin","octane":"95","productName":"Blyfri 95","price":"18.09","currency":"DKK","lastUpdated":"2026-09-25T12:00:00.000"}]},{"stationId":"D002","brand":"Shell","owner":"Shell","street":"SLOTSHERRENSVEJ 221","houseNumber":null,"postalCode":"2610","city":"RØDOVRE","coordinates":{"latitude":"55.700899","longitude":"12.460803"},"prices":[{"fuelType":"Autodiesel","octane":null,"productName":"V-Power Diesel","price":"20.19","currency":"DKK","lastUpdated":"2026-09-25T12:00:12.437"},{"fuelType":"Autobenzin","octane":"98","productName":"V-Power","price":"20.59","currency":"DKK","lastUpdated":"2026-09-25T12:00:12.437"},{"fuelType":"Autodiesel","octane":null,"productName":"FuelSave Diesel","price":"19.19","currency":"DKK","lastUpdated":"2026-09-25T12:00:12.437"},{"fuelType":"Autobenzin","octane":"95","productName":"Blyfri 95","price":"18.09","currency":"DKK","lastUpdated":"2026-09-25T12:00:12.437"}]}];
export const DK_Q8 = {"data":{"pageNumber":1,"pageSize":2000,"totalRecords":3,"totalPages":1,"stationsPrices":[{"stationId":"8001","stationName":"F24","address":"Dronningemaen 34 Svendborg 5700 Danmark","products":[{"productId":"1","productName":"GoEasy 95 Extra E5","price":19.69,"unit":"L","priceChangeDate":"2026-09-20T00:03:00"},{"productId":"2","productName":"GoEasy 95 E10","price":18.59,"unit":"L","priceChangeDate":"2026-09-20T00:03:00"},{"productId":"6","productName":"GoEasy Diesel","price":19.69,"unit":"L","priceChangeDate":"2026-09-20T00:03:00"}]},{"stationId":"8001","stationName":"F24","address":"Dronningemaen 34 Svendborg 5700 Danmark","products":[{"productId":"1","productName":"GoEasy 95 Extra E5","price":19.19,"unit":"L","priceChangeDate":"2026-09-26T00:03:00"},{"productId":"2","productName":"GoEasy 95 E10","price":18.09,"unit":"L","priceChangeDate":"2026-09-26T00:03:00"},{"productId":"6","productName":"GoEasy Diesel","price":19.19,"unit":"L","priceChangeDate":"2026-09-26T00:03:00"}]},{"stationId":"8003","stationName":"Q8 Service","address":"Hummeltoftevej 45 Virum 2830 Danmark","products":[{"productId":"1","productName":"GoEasy 95 Extra E5","price":19.29,"unit":"L","priceChangeDate":"2026-09-26T00:05:32.727"},{"productId":"2","productName":"GoEasy 95 E10","price":18.19,"unit":"L","priceChangeDate":"2026-09-26T00:05:32.727"},{"productId":"6","productName":"GoEasy Diesel","price":19.29,"unit":"L","priceChangeDate":"2026-09-26T00:05:32.727"},{"productId":"8","productName":"GoEasy Diesel Extra","price":20.19,"unit":"L","priceChangeDate":"2026-09-26T00:05:32.727"}]}]},"success":true};
export const DK_OIL_95 = [{"station_id":4500250,"station_name":"OIL! tank & go Assens","address":"Nørre Allé 12, 5610 Assens","gps":"55.2739 N, 9.9074 E","95E10":18.09,"updated":"2026-09-25 11:00:00"},{"station_id":4500276,"station_name":"OIL! tank & go Bolbro, Odense","address":"Bystævnevej 3, Bolbro, 5200 Odense V","gps":"55.3945 N, 10.3471 E","95E10":18.09,"updated":"2026-09-25 11:00:00"}];
export const DK_OIL_DIESEL = [{"station_id":4500250,"station_name":"OIL! tank & go Assens","address":"Nørre Allé 12, 5610 Assens","gps":"55.2739 N, 9.9074 E","updated":"2026-09-25 11:00:00","DieselB7":19.19},{"station_id":4500276,"station_name":"OIL! tank & go Bolbro, Odense","address":"Bystævnevej 3, Bolbro, 5200 Odense V","gps":"55.3945 N, 10.3471 E","updated":"2026-09-25 11:00:00","DieselB7":19.19}];
export const DK_OIL_NOPRICE = [{"station_id":4500250,"station_name":"OIL! tank & go Assens","address":"Nørre Allé 12, 5610 Assens","gps":"55.2739 N, 9.9074 E","updated":"2026-09-25 11:00:00"},{"station_id":4500276,"station_name":"OIL! tank & go Bolbro, Odense","address":"Bystævnevej 3, Bolbro, 5200 Odense V","gps":"55.3945 N, 10.3471 E","updated":"2026-09-25 11:00:00"}];
export const DK_CK = {"sites":[{"id":"10103","name":"CIRCLE K HASSERIS","address":{"street":"Hasseris Bymidte 2","city":"Aalborg","state":"Aalborg Kommune","postalCode":"9000","country":"DK"},"fuelPrices":[{"code":"1030921","displayName":"miles 95","price":18.19,"currency":"DKK","volumeUnit":"LITER","lastUpdated":"2026-09-25T08:59:00.700Z"},{"code":"1030928","displayName":"miles diesel","price":19.29,"currency":"DKK","volumeUnit":"LITER","lastUpdated":"2026-09-25T08:59:00.700Z"},{"code":"1030876","displayName":"miles+ diesel","price":20.19,"currency":"DKK","volumeUnit":"LITER","lastUpdated":"2026-09-25T08:59:00.700Z"},{"code":"1030941","displayName":"miles+ 95","price":19.09,"currency":"DKK","volumeUnit":"LITER","lastUpdated":"2026-09-25T08:59:00.700Z"}]},{"id":"10107","name":"INGO BYLDERUP-BOV","address":{"street":"Bygaden 29","city":"Bylderup-Bov","state":"Aabenraa Kommune","postalCode":"6372","country":"DK"},"fuelPrices":[{"code":"592327","displayName":"Benzin 95","price":18.09,"currency":"DKK","volumeUnit":"LITER","lastUpdated":"2026-09-25T09:04:40.746Z"},{"code":"797325","displayName":"Diesel","price":19.19,"currency":"DKK","volumeUnit":"LITER","lastUpdated":"2026-09-25T09:04:40.746Z"},{"code":"1030971","displayName":"UPGRADE 95","price":18.78,"currency":"DKK","volumeUnit":"LITER","lastUpdated":"2026-09-25T09:04:40.746Z"}]}]};
// coordonatele acestor stații din lib/data/dk-sites.js (geocodate cu DAWA)
export const DK_SITES = {"q8:8001":[55.063482,10.606397],"q8:8003":[55.78226,12.484487],"ck:10103":[57.036734,9.884071],"ck:10107":[54.895508,9.089078]};

// Cipru: pagina GET a observatorului (formular + token) și tabelul POST (Αμόλυβδη 95), rânduri reale din 27 sept. 2026
export const CY_GET = `<html><body><form action="/MCIT/MCIT/PetroleumPrices" method="post"><input name="__RequestVerificationToken" type="hidden" value="TOKEN-DIN-FORMULAR" />        <div class="form-horizontal">
            <!-- 
            <div class="form-group">
                <div class="col-md-12">
                    <label class="note-requiredfields">Τα πεδία που σημειώνονται με αστερίσκο (*) είναι υποχρεωτικά.</label>
                </div>
            </div> Note_RequiredFields 
            -->

            <div class="form-group">
                <label class="control-label control-label-left col-md-3 required" for="Entity_PetroleumType">Είδος Καυσίμου</label>
                <div class="col-md-8">
                    <select class="form-control petroleumType select-css" data-val="true" data-val-number="The field Είδος Καυσίμου must be a number." data-val-required="Το πεδίο είναι υποχρεωτικό." id="Entity_PetroleumType" name="Entity.PetroleumType"><option value="">-- Select --</option>
<option value="1">Αμόλυβδη 95</option>
<option value="2">Αμόλυβδη 98</option>
<option value="5">Κηροζίνη</option>
<option value="4">Πετρέλαιο Θέρμανσης</option>
<option value="3">Πετρέλαιο κίνησης</option>
</select>
                    <span class="field-validation-valid" data-valmsg-for="Entity.PetroleumType" data-valmsg-replace="true"></span>
                </div>
            </div> <!-- Entity.PetroleumType -->

            <div class="form-group">
                <label class="control-label control-label-left col-md-3" for="Entity_StationCityEnum">Επαρχία</label>
                <div class="col-md-8">
                    <select class="form-control city select-css" id="Entity_StationCityEnum" name="Entity.StationCityEnum"><option selected="selected" value="All">Όλες</option>
<option value="Famagusta">Αμμόχωστος</option>
<option value="Larnaca">Λάρνακα</option>
<option value="Limassol">Λεμεσός</option>
<option value="Nicosia">Λευκωσία</option>
<option value="Paphos">Πάφος</option>
</select>
                    <span class="field-validation-valid" data-valmsg-for="Entity.StationCityEnum" data-valmsg-replace="true"></span>
                </div>
            </div> <!-- Entity.StationCityEnum -->

            <div class="form-group">
                <div class="col-md-3">
                    <label class="control-label control-label-left" for="Entity_District">Επιλογή Περιοχών (Δυνατότητα επιλογής πολλαπλών περιοχών)</label>
                    
                </div>
                <div class="col-md-8">
                    <select class="form-control districts" id="Entity_District" multiple="" name="Entity.District"></select>
                    
                    
                    <span class="field-validation-valid" data-valmsg-for="Entity.District" data-valmsg-replace="true"></span>
                </div>
            </div>

            <div class="form-group" style="display: none">
                <label class="control-label control-label-left col-md-3">Επιλεγμένες Περιοχές</label>
                <div class="col-md-8">
                    <textarea class="form-control stationDistrict" cols="20" hidden="hidden" id="Entity_StationDistrict" name="Entity.StationDistrict" readonly="readonly" rows="5">
</textarea>
                </div>
            </div>

            <div class="form-group">
                <div class="col-md-3 col-sm-3">
                    <label class="control-label"></label>
                </div>

                <div class="col-md-8 col-sm-8">
                    <button type="submit" style="width: 100%">Submit</button>
                </div>
            </div>
        </div>
</form></body></html>`;
export const CY_POST_95 = `<html><body><div>Μέση Τιμή σε € (Παγκύπρια) 1.726</div><table id="petroleumPriceDetailsFootable" class="table"><thead>
                <tr>
                    <th data-name="companyName" class="fooicon fooicon-sort"><b>Σήμα</b></th>
                    <th data-name="stationName" data-breakpoints="xs"><b>Πρατήριο</b></th>
                    <th data-name="address" class="fooicon" data-sortable="false"><b>Διεύθυνση</b></th>  
                    <th data-name="district" class="fooicon" data-breakpoints="xs sm" data-sortable="false"><b>Περιοχή/Χωριό</b></th>
                    <th data-name="price" class="fooicon fooicon-sort"><b>Τιμή</b></th>
                </tr>
                </thead><tbody>
<tr>
                            <td class="">ESSO</td>
                            <td class="">	I.G. MAKRIS ENTERPRISES LTD</td>
                            <td class="">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=35.1845138888889%2C33.3895" target="_blank">Καντάρας 58 Τ.Κ 1037
 τηλ: 22433430</a>                            </td>
                            <td class="">Καϊμακλί</td>
                            <td class="">1.717</td>
                        </tr>
<tr>
                            <td class="">PETROLINA</td>
                            <td class="">	MICHALIS KNEKNAS TRADING LTD</td>
                            <td class="">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=35.148666%2C33.212235" target="_blank">Γρηγόρη Αυξεντίου 76, Κοκκινοτριμιθιά Τ.Κ 2660
 τηλ: 22834160</a>                            </td>
                            <td class="">Κοκκινοτριμιθιά</td>
                            <td class="">1.695</td>
                        </tr>
<tr>
                            <td class="isOffLine">FILL N GO</td>
                            <td class="isOffLine">FILL N GO STATIONS LTD</td>
                            <td class="isOffLine">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=34.92639%2C%2033.44032" target="_blank">Λεωφ. Λάρνακος 1 Τ.Κ 7648
 τηλ: 22532828</a>                            </td>
                            <td class="isOffLine">Πυργά</td>
                            <td class="isOffLine">1.669</td>
                        </tr>
<tr>
                            <td class="">ΑΝΕΞΑΡΤΗΤΟ ΠΡΑΤΗΡΙΟ</td>
                            <td class="">ARTEMIS A. GEORGIOU PETROL STATION LTD</td>
                            <td class="">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=34%C2%B039%2713.5%22N%2032%C2%B058%2726.3%22E" target="_blank">Λεωφ. Κωνσταντίνου &amp; Ευριπίδου 1 Τ.Κ 4651
 τηλ: 25873040</a>                            </td>
                            <td class="">Τραχώνι</td>
                            <td class="">1.747</td>
                        </tr>
<tr>
                            <td class="">JACKOSON</td>
                            <td class="">JACKOSON ENTERPRISES LIMITED</td>
                            <td class="">
Δρόμος Παλαιχωρίου - Αγρού Τ.Κ 4860                             </td>
                            <td class="">Αγρός</td>
                            <td class="">1.707</td>
                        </tr>
</tbody></table></body></html>`;
export const CY_POST_DIESEL = `<html><body><div>Μέση Τιμή σε € (Παγκύπρια) 1.726</div><table id="petroleumPriceDetailsFootable" class="table"><thead>
                <tr>
                    <th data-name="companyName" class="fooicon fooicon-sort"><b>Σήμα</b></th>
                    <th data-name="stationName" data-breakpoints="xs"><b>Πρατήριο</b></th>
                    <th data-name="address" class="fooicon" data-sortable="false"><b>Διεύθυνση</b></th>  
                    <th data-name="district" class="fooicon" data-breakpoints="xs sm" data-sortable="false"><b>Περιοχή/Χωριό</b></th>
                    <th data-name="price" class="fooicon fooicon-sort"><b>Τιμή</b></th>
                </tr>
                </thead><tbody>
<tr>
                            <td class="">ESSO</td>
                            <td class="">	I.G. MAKRIS ENTERPRISES LTD</td>
                            <td class="">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=35.1845138888889%2C33.3895" target="_blank">Καντάρας 58 Τ.Κ 1037
 τηλ: 22433430</a>                            </td>
                            <td class="">Καϊμακλί</td>
                            <td class="">1.767</td> </tr>
<tr>
                            <td class="">PETROLINA</td>
                            <td class="">	MICHALIS KNEKNAS TRADING LTD</td>
                            <td class="">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=35.148666%2C33.212235" target="_blank">Γρηγόρη Αυξεντίου 76, Κοκκινοτριμιθιά Τ.Κ 2660
 τηλ: 22834160</a>                            </td>
                            <td class="">Κοκκινοτριμιθιά</td>
                            <td class="">1.745</td> </tr>
<tr>
                            <td class="isOffLine">FILL N GO</td>
                            <td class="isOffLine">FILL N GO STATIONS LTD</td>
                            <td class="isOffLine">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=34.92639%2C%2033.44032" target="_blank">Λεωφ. Λάρνακος 1 Τ.Κ 7648
 τηλ: 22532828</a>                            </td>
                            <td class="isOffLine">Πυργά</td>
                            <td class="isOffLine">1.719</td> </tr>
<tr>
                            <td class="">ΑΝΕΞΑΡΤΗΤΟ ΠΡΑΤΗΡΙΟ</td>
                            <td class="">ARTEMIS A. GEORGIOU PETROL STATION LTD</td>
                            <td class="">
<a class="multiLine normalFontWeight" data-ajax="false" href="/MCIT/MCIT/PetroleumPrices/DisplayMap?coordinates=34%C2%B039%2713.5%22N%2032%C2%B058%2726.3%22E" target="_blank">Λεωφ. Κωνσταντίνου &amp; Ευριπίδου 1 Τ.Κ 4651
 τηλ: 25873040</a>                            </td>
                            <td class="">Τραχώνι</td>
                            <td class="">1.797</td> </tr>
<tr>
                            <td class="">JACKOSON</td>
                            <td class="">JACKOSON ENTERPRISES LIMITED</td>
                            <td class="">
Δρόμος Παλαιχωρίου - Αγρού Τ.Κ 4860                             </td>
                            <td class="">Αγρός</td>
                            <td class="">1.757</td> </tr>
</tbody></table></body></html>`;
export const CY_SET_COOKIE = 'ASP.NET_SessionId_Efef=sesiune-de-test; path=/; HttpOnly; SameSite=Lax, __RequestVerificationToken=TOKEN-COOKIE-DE-TEST; path=/; HttpOnly';
