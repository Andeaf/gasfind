# GasFind ⛽

Aplicație pentru telefon (PWA) cu harta benzinăriilor din Europa și prețurile lor la zi, din surse oficiale gratuite.

- Pe hartă, fiecare benzinărie are prețul carburantului ales. Culoarea arată cât de ieftină e față de celelalte din zonă: **verde** e cea mai ieftină, **roșu** cea mai scumpă.
- Atingi o benzinărie și vezi toate prețurile, ora actualizării și distanța până la ea. Butonul **„Navighează cu Google Maps”** pornește navigația direct în Google Maps.
- Butonul cu săgeată deschide lista celor mai ieftine benzinării din zona vizibilă.
- Merge pe Android și pe iPhone, fără magazin de aplicații. Nu costă nimic.

## Ce date sunt disponibile

| Țara | Sursa (oficială, gratuită) | Ce vezi |
|---|---|---|
| România | Consiliul Concurenței – Monitorul Prețurilor | Petrom, OMV, Rompetrol, Lukoil, MOL, Socar, Gazprom. Prețurile sunt raportate zilnic, noaptea. Benzinăriile independente (ex. Oscar) apar fără preț. |
| Republica Moldova | ANRE – e-Carburanți | toate stațiile, prețuri în MDL, actualizate zilnic |
| Franța | prix-carburants.gouv.fr | toate stațiile, actualizate la ~10 minute |
| Spania | Ministerio para la Transición Ecológica (Geoportal) | toate stațiile, actualizate la ~30 de minute |
| Portugalia (continentală) | DGEG | toate stațiile, fiecare schimbare de preț |
| Italia | MIMIT – Osservaprezzi | toate stațiile, live (prețul self-service) |
| Germania | Tankerkönig (datele MTS-K) | toate stațiile, live. **Necesită o cheie gratuită** (vezi mai jos). |
| Austria | E-Control – Spritpreisrechner | doar cele mai ieftine ~5 stații din zonă; așa publică legea austriacă |
| Slovenia | goriva.si | toate stațiile |
| Croația | Ministerul Economiei (mzoe-gor.hr) | toate stațiile |
| Restul Europei | OpenStreetMap | benzinăriile apar pe hartă, dar fără preț |

În restul Europei (Ungaria, Bulgaria, Grecia, Polonia, Cehia, Slovacia, Olanda, Belgia, Luxemburg, Elveția, Marea Britanie, țările nordice și baltice) nu există surse gratuite de prețuri pe stație.

## 1. Publicare gratuită pe internet (Vercel)

Aplicația are nevoie de un mic server care citește sursele de date. Serverul rulează gratuit pe Vercel (planul Hobby, pentru uz personal). Ai nevoie doar de Node.js, pe care îl ai deja.

Deschide CMD și rulează:

```
cd /d D:\GasFind
npx vercel login
npx vercel --prod
```

- La `login` alege **Continue with GitHub**. Contul Vercel se creează gratuit, fără card.
- La prima publicare răspunde **Enter** (valorile implicite) la întrebări: *Set up and deploy* → Y, *Link to existing project* → N, nume `gasfind`, director `./`.
- La final primești adresa aplicației, de forma `https://gasfind-xxxx.vercel.app`.

Varianta fără linie de comandă:
1. Urcă folderul într-un repository GitHub (fără `node_modules`).
2. Pe vercel.com, alege **Add New → Project** și importă repository-ul.
3. Apasă **Deploy**. Setările sunt deja în `vercel.json`.

## 2. Germania: cheia Tankerkönig (gratuită)

1. Cere cheia pe https://onboarding.tankerkoenig.de (nume și email). O primești pe email.
2. Adaug-o în Vercel și publică din nou:

```
npx vercel env add TANKERKOENIG_API_KEY production
npx vercel --prod
```

Poți pune cheia și din site: **Project → Settings → Environment Variables**, apoi faci din nou Deploy.

Fără cheie, aplicația merge normal, dar benzinăriile din Germania apar fără preț. Nu folosi cheia demo din documentația Tankerkönig: e doar pentru teste.

## 3. Instalare pe telefon

- **Android (Chrome):** deschide adresa aplicației, apoi meniul **⋮ → Instalează aplicația** (sau **Adaugă pe ecranul de pornire**).
- **iPhone (Safari):** deschide adresa, apoi **Partajează → Adaugă pe ecranul principal**.
- La prima pornire, permite accesul la locație ca harta să se centreze pe tine.

## Rulare pe calculator (opțional)

```
cd /d D:\GasFind
node server.js
```

Apoi deschide http://localhost:3000.

- Pentru date de test, fără internet: `set GASFIND_MOCK=1 && node server.js`.
- Cheia pentru Germania se poate pune local într-un fișier `.env`: vezi `.env.example`.
- Testele automate rulează cu `npm test`.

## Cum funcționează

```
public/            aplicația (HTML, CSS, JS, MapLibre, iconițe, service worker)
api/               funcțiile Vercel: /api/config, /api/tile, /api/detail
lib/handler.js     logica API-ului (aceeași pe Vercel și local)
lib/sources/*.js   câte un adaptor pentru fiecare sursă de date
lib/data/          contururile țărilor (Natural Earth) și numele stațiilor franceze (OSM)
server.js          server local
test/              teste (mostre reale din fiecare sursă)
```

Harta e împărțită în „dale”. Telefonul cere prețurile doar pentru zona vizibilă, iar serverul le păstrează în cache între 10 minute și 3 ore, după cât de des se schimbă sursa. Așa aplicația e rapidă și nu încarcă serverele oficiale.

Fișiere pe care le poți regenera (după `npm install`):
- `node scripts/copy-vendor.js` — MapLibre GL
- `node scripts/build-countries.js` — contururile țărilor

## Limitări de știut

- **Tankerkönig (Germania):** permite puține cereri pe minut. Dacă muți harta repede prin Germania, unele zone se încarcă după un minut.
- **E-Control (Austria):** la testare (27 sept. 2026) era în mentenanță, așa că adaptorul a fost scris după documentație. Dacă nu răspunde, stațiile austriece apar fără preț.
- **OpenStreetMap:** serverele Overpass sunt uneori aglomerate. Benzinăriile fără preț pot apărea cu întârziere.
- **Monitorul Prețurilor:** serverul lor trimite un certificat HTTPS incomplet. Aplicația adaugă corect certificatul intermediar lipsă (`lib/certs.js`), fără să dezactiveze verificarea securității.
- Prețurile sunt informative. Verifică la pompă.

## Costuri

**Zero.** Folosești doar servicii gratuite:
- Vercel Hobby
- OpenFreeMap pentru hartă (fără cheie, fără limite)
- surse de date publice

DGEG (Portugalia) permite doar folosirea necomercială, așa că aplicația e pentru uz personal.

## Surse și licențe

- Hartă: OpenFreeMap, © contribuitorii OpenStreetMap (ODbL)
- MapLibre GL JS: licență BSD-3
- Contururi țări: Natural Earth (domeniu public)
- Nume stații Franța: OpenStreetMap (ODbL)
- Prețuri: Consiliul Concurenței, ANRE, Ministère de l'Économie (Licence Ouverte 2.0), MITECO, DGEG, MIMIT (IODL 2.0), Tankerkönig / MTS-K (CC BY 4.0), E-Control, goriva.si, Ministarstvo gospodarstva RH
