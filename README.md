# GasFind ⛽

Aplicație pentru telefon (PWA) cu harta benzinăriilor din Europa și prețurile lor la zi, din surse oficiale gratuite.

- Pe hartă, fiecare benzinărie are prețul carburantului ales. Culoarea arată cât de ieftină e față de celelalte din zonă: **verde** e cea mai ieftină, **roșu** cea mai scumpă.
- Atingi o benzinărie și vezi toate prețurile, ora actualizării și distanța până la ea. Butonul **„Navighează cu Google Maps”** pornește navigația direct în Google Maps.
- Butonul cu săgeată deschide lista celor mai ieftine benzinării din zona vizibilă.
- În țările fără prețuri pe stație, fișa benzinăriei arată **prețul de referință** al țării (media națională sau prețul maxim legal), marcat clar că nu e prețul stației.
- Merge pe Android și pe iPhone, fără magazin de aplicații. Nu costă nimic.

## Ce date sunt disponibile

### Prețuri pe stație

| Țara | Sursa (oficială, gratuită) | Ce vezi |
|---|---|---|
| România | Consiliul Concurenței – Monitorul Prețurilor | Petrom, OMV, Rompetrol, Lukoil, MOL, Socar, Gazprom. Prețurile sunt raportate zilnic, noaptea. Benzinăriile independente (ex. Oscar) apar fără preț. |
| Republica Moldova | ANRE – e-Carburanți | toate stațiile, prețuri în MDL, actualizate zilnic |
| Franța | prix-carburants.gouv.fr | toate stațiile, actualizate la ~10 minute |
| Spania | Ministerio para la Transición Ecológica (Geoportal) | toate stațiile, actualizate la ~30 de minute |
| Portugalia (continentală) | DGEG | toate stațiile, fiecare schimbare de preț |
| Italia | MIMIT – Osservaprezzi | toate stațiile, live (prețul self-service) |
| Germania | Tankerkönig (datele MTS-K), CC BY 4.0 | toate stațiile, live. **Necesită o cheie gratuită** (vezi mai jos). Limita e de o cerere pe minut, așa că prețurile se încarcă treptat, o zonă pe minut; până atunci stațiile apar din OpenStreetMap, fără preț. |
| Austria | E-Control – Spritpreisrechner | doar cele mai ieftine ~5 stații din zonă; așa publică legea austriacă |
| Slovenia | goriva.si | toate stațiile |
| Croația | Ministerul Economiei (mzoe-gor.hr) | toate stațiile |
| Danemarca | API-urile publice ale companiilor OK, Shell, Q8/F24, OIL!, Circle K și INGO (obligatorii prin lege din 2026) | ~1.600 de stații, live. Go'on și Uno-X apar doar cu chei (opțional, vezi mai jos). Restul benzinăriilor vin din OpenStreetMap. |
| Cipru | Observatorul prețurilor la carburanți al Ministerului Energiei, Comerțului și Industriei (data.gov.cy, CC BY-SA 4.0) | toate stațiile (~320), în timp real. Fișa arată marca și localitatea, iar dedesubt firma care operează stația. |
| Restul Europei | OpenStreetMap (copie săptămânală) | benzinăriile apar pe hartă fără preț, cu prețul de referință al țării în fișă |

### Prețuri de referință (pe țară, nu pe stație)

| Țara | Sursa | Tip | Actualizare |
|---|---|---|---|
| toate statele UE (și RO, AT pentru stațiile fără preț) | Buletinul petrolier săptămânal al Comisiei Europene (CC BY 4.0) | medie națională | săptămânal (prețurile de luni apar joia) |
| Belgia | SPF Economie, prin Statbel be.STAT (CC BY 4.0) | preț maxim legal | zilnic |
| Luxemburg | Ministère de l'Économie, prin STATEC/LUSTAT (data.public.lu, CC0) | preț maxim legal | la fiecare schimbare |
| Serbia | Ministarstvo unutrašnje i spoljne trgovine (must.gov.rs) | preț maxim legal, RSD | săptămânal (vineri) |
| Muntenegru | Ministarstvo energetike i rudarstva (gov.me) | preț maxim legal | săptămânal (luni) |

Prețurile de referință apar doar în fișa stațiilor fără preț și într-o bandă discretă sub butoanele de carburant, când zona vizibilă e într-o țară fără prețuri pe stație. Nu intră în colorarea hărții și nici în lista celor mai ieftine.

Fără sursă gratuită (nici pe stație, nici de referință): Marea Britanie (Fuel Finder cere cont GOV.UK One Login), Elveția, Norvegia, Macedonia de Nord, Albania. Grecia publică prețurile pe stație doar în spatele unui reCAPTCHA care interzice explicit accesul automat, iar Cehia (preț maxim, doar în octombrie 2026) doar în PDF-uri greu de citit; ambele rămân pe media UE.

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

Proiectul acesta e legat de repository-ul GitHub `Andeaf/gasfind`: fiecare push pe ramura `main` publică automat o nouă versiune în producție, iar push-urile pe alte ramuri creează versiuni de previzualizare.

## 2. Germania: cheia Tankerkönig (gratuită)

1. Cere cheia pe https://onboarding.tankerkoenig.de (nume și email). O primești pe email după ce confirmi adresa.
2. Adaug-o în Vercel și publică din nou:

```
npx vercel env add TANKERKOENIG_API_KEY production
npx vercel --prod
```

Poți pune cheia și din site: **Project → Settings → Environment Variables**, apoi faci din nou Deploy.

Regulile Tankerkönig (din emailul de activare): o cerere pe minut per cheie, rază de cel mult 25 km, cereri doar când utilizatorul se uită la hartă, atribuire obligatorie (aplicația o afișează), iar datele nu se dau firmelor din industria petrolieră. Aplicația respectă limita atât pe server, cât și în telefon. Fără cheie, aplicația merge normal, dar benzinăriile din Germania apar fără preț. Nu folosi cheia demo din documentația Tankerkönig: e doar pentru teste.

## 3. Chei opționale: Danemarca (Go'on și Uno-X)

Cele cinci API-uri daneze mari merg fără cheie. Pentru celelalte două:

- **Go'on** (~200 de stații): completezi formularul de pe https://goon.nu/faa-adgang-til-api/ (nume și email); cheia vine automat pe email în câteva minute. Limita: o cerere la 30 de secunde.
  ```
  npx vercel env add GOON_API_KEY production
  ```
- **Uno-X** (~280 de stații): trimiți un email la info@unox.dk cu subiectul „Adgang til pris-API” și primești un `client_id` și un `client_secret` (OAuth2, client credentials). Limita: o cerere la 30 de secunde.
  ```
  npx vercel env add UNOX_CLIENT_ID production
  npx vercel env add UNOX_CLIENT_SECRET production
  ```

După ce adaugi cheile, publică din nou cu `npx vercel --prod`. Aplicația descarcă lista fiecărei companii cel mult o dată la 10 minute.

## 4. Marea Britanie: Fuel Finder (necesită cont)

Sistemul guvernamental Fuel Finder (licență OGL v3.0) dă prețurile tuturor benzinăriilor din Regatul Unit, dar numai cu cont: îți faci un **GOV.UK One Login**, apoi te înregistrezi ca „information recipient” pe https://www.developer.fuel-finder.service.gov.uk/access-latest-fuelprices (portalul răspunde 403 din afara Regatului Unit, deci e nevoie de o conexiune din UK sau de emailul echipei Fuel Finder). Primești un `client_id` și un `client_secret` (OAuth2). Adaptorul nu e încă scris, pentru că documentația API-ului e disponibilă doar după autentificare.

## 5. Actualizări și verificări automate (GitHub Actions)

Două workflow-uri rulează singure, în fiecare luni, pe GitHub (gratuit, în minutele incluse în cont):

- **OSM săptămânal** (`.github/workflows/osm.yml`, 01:23 UTC): descarcă din Overpass benzinăriile OpenStreetMap țară cu țară, cu pauze și reîncercări, le salvează în `lib/data/osm/` și face commit pe `main`, deci Vercel publică singur noua copie. O țară care nu răspunde rămâne pe copia anterioară, iar workflow-ul pică (vezi mai jos). Ultimul pas așteaptă publicarea pe Vercel și pică dacă ea eșuează. Atunci o repornești din Vercel: **Deployments → … → Redeploy**.
- **Verificare producție** (`.github/workflows/verificare.yml`, 06:17 UTC): cere câte o dală de la fiecare sursă, cu un parametru care ocolește cache-ul, plus prețurile de referință. Pică dacă o sursă nu răspunde, nu are stații sau are date vechi (prețuri mai vechi de 7 zile, copie OSM mai veche de 10 zile), ori dacă lipsesc țări din prețurile de referință (UE-27, plus maximele legale din Belgia, Luxemburg, Serbia și Muntenegru). Germania e sărită: Tankerkönig permite cereri doar la acțiunea unui utilizator.

Când un workflow pică, GitHub îți trimite email (setarea implicită: **Settings → Notifications → Actions → Only notify for failed workflows**). Rezultatul fiecărei surse apare și în pagina rulării (**Actions → Verificare producție**). Le poți porni oricând manual din **Actions → Run workflow**, sau local: `node scripts/check-prod.js`.

Commit-urile automate au ca autor contul tău (Andeaf): pe planul Hobby, Vercel nu publică dintr-un repository privat commit-uri ale altor autori, inclusiv ale botului GitHub Actions.

## 6. Instalare pe telefon

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
- Cheile se pot pune local într-un fișier `.env`: vezi `.env.example`.
- Testele automate rulează cu `npm test`.

## Cum funcționează

```
public/            aplicația (HTML, CSS, JS, MapLibre, iconițe, service worker)
api/               funcțiile Vercel: /api/config, /api/tile, /api/detail, /api/ref
lib/handler.js     logica API-ului (aceeași pe Vercel și local)
lib/sources/*.js   câte un adaptor pentru fiecare sursă de prețuri pe stație
lib/ref/*.js       câte un adaptor pentru fiecare sursă de prețuri de referință (pe țară)
lib/ref.js         agregarea prețurilor de referință; lib/fx.js cursurile valutare (BCE, BNM, NBS, NBRM)
lib/xlsx.js        cititor XLSX fără dependențe (Buletinul petrolier UE)
lib/data/          contururile țărilor (Natural Earth), numele stațiilor franceze (OSM),
                   coordonatele stațiilor daneze Q8/F24 și Circle K/INGO (DAWA)
lib/data/osm/      copia săptămânală a benzinăriilor OpenStreetMap, pe dale de 0,25° (generată)
scripts/           generatoarele de date și verificarea producției (check-prod.js)
.github/workflows/ copia OSM și verificarea, în fiecare luni
server.js          server local
test/              teste (mostre reale din fiecare sursă)
```

Harta e împărțită în „dale”. Telefonul cere prețurile doar pentru zona vizibilă, iar serverul le păstrează în cache între 10 minute și 3 ore, după cât de des se schimbă sursa. Sursele care dau toată țara într-un răspuns (Danemarca, Cipru, Spania, Portugalia, prețurile de referință) sunt descărcate o singură dată și refolosite. Benzinăriile OpenStreetMap vin din copia săptămânală din `lib/data/osm/`. Așa aplicația e rapidă și nu încarcă serverele oficiale.

Dacă telefonul primește o dală mai veche decât dublul duratei ei de cache, o afișează, dar o cere din nou după 5 secunde și, la nevoie, după încă 20. Asta se întâmplă de obicei cu ultima copie salvată în telefon, folosită când nu e semnal sau serverul a dat eroare. CDN-ul Vercel servește o copie expirată cel mult până la triplul duratei de cache și o reîmprospătează în fundal.

Fișiere pe care le poți regenera (după `npm install`):
- `node scripts/copy-vendor.js` — MapLibre GL
- `node scripts/build-countries.js` — contururile țărilor
- `node scripts/build-dk-sites.js` — coordonatele stațiilor daneze Q8/F24 și Circle K/INGO (API-urile lor nu le dau; geocodare o singură dată cu DAWA, API-ul oficial al adreselor daneze; rulează când apar stații noi)
- `node scripts/build-osm.js` — copia OpenStreetMap (fără `npm install`; durează de la ~30 de minute la câteva ore, după cât de încărcate sunt serverele Overpass; are un buget de 210 minute, după care țările rămase păstrează copia anterioară; `--only=HU,BG` reîncarcă doar câteva țări). De obicei o face workflow-ul de luni.

## Limitări de știut

- **Tankerkönig (Germania):** o cerere pe minut. Când muți harta prin Germania, zonele noi primesc prețuri una pe minut, iar între timp stațiile apar din OpenStreetMap, fără preț.
- **E-Control (Austria):** a fost în mentenanță la sfârșitul lui septembrie 2026 (HTTP 507); merge din nou. Dacă nu răspunde, stațiile austriece apar fără preț.
- **OpenStreetMap:** benzinăriile fără preț vin dintr-o copie refăcută în fiecare luni, deci o stație nou cartată apare cu până la o săptămână întârziere. Overpass (în timp real, des aglomerat) e folosit doar pentru o țară care lipsește din copie.
- **Monitorul Prețurilor:** serverul lor trimite un certificat HTTPS incomplet. Aplicația adaugă corect certificatul intermediar lipsă (`lib/certs.js`), fără să dezactiveze verificarea securității.
- **Cipru:** serverul observatorului răspunde în 12–22 s la fiecare cerere, oricât de mică ar fi zona cerută. Toată insula e o singură dală, deci un singur utilizator așteaptă descărcarea, o dată la 30 de minute; ceilalți primesc răspunsul din cache.
- **Serbia:** site-ul ministerului e publicat sub licență CC BY-NC-ND 3.0 RS; aplicația afișează doar valorile (fapte), cu sursa și data. Anunțul săptămânal e găsit în pagina de vești; fluxul RSS (folosit înainte) răspunde 403 din octombrie 2026. Firewall-ul site-ului blochează temporar adresele care fac multe cereri la rând.
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
- Benzinării fără preț: © contribuitorii OpenStreetMap (ODbL 1.0). Copia din `lib/data/osm/` e o bază de date derivată și rămâne sub ODbL 1.0 (https://www.openstreetmap.org/copyright).
- Coordonate stații Danemarca (Q8/F24, Circle K/INGO): DAWA – Danmarks Adressers Web API (date publice daneze)
- Prețuri pe stație: Consiliul Concurenței, ANRE, Ministère de l'Économie (Licence Ouverte 2.0), MITECO, DGEG, MIMIT (IODL 2.0), Tankerkönig / MTS-K (CC BY 4.0), E-Control, goriva.si, Ministarstvo gospodarstva RH, OK / Shell (DCC Energi) / Q8 Danmark / OIL! / Circle K Danmark / INGO (API-uri publice obligatorii prin legea daneză), Ministerul Energiei, Comerțului și Industriei din Cipru (CC BY-SA 4.0)
- Prețuri de referință: Comisia Europeană – Weekly Oil Bulletin (CC BY 4.0), SPF Economie / Statbel (CC BY 4.0), STATEC / data.public.lu (CC0), Ministarstvo unutrašnje i spoljne trgovine Republike Srbije, Ministarstvo energetike i rudarstva Crne Gore
- Cursuri valutare: Banca Centrală Europeană, Banca Națională a Moldovei, Narodna banka Srbije, Narodna banka na Republika Severna Makedonija
