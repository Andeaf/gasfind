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

export const DE_LEGACY = {
  ok: true, license: 'CC BY 4.0 -  https://creativecommons.tankerkoenig.de', data: 'MTS-K', status: 'ok',
  stations: [
    { id: '474e5046-deaf-4f9b-9a32-9797b778f047', name: 'TotalEnergies Berlin', brand: 'TotalEnergies', street: 'Margarete-Sommer-Str.', place: 'Berlin', lat: 52.530831, lng: 13.440946, dist: 1.1, diesel: 2.409, e5: false, e10: 2.259, isOpen: false, houseNumber: '2', postCode: 1067 },
  ],
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
