# My Sports

Suomenkielinen, responsiivinen TypeScript/Vite-PWA Manchester Unitedin ja Pittsburgh Steelersin otteluseurantaan. Ei backendia, tietokantaa, maksullisia palveluita tai API-avaimia. Sovellusta ei ole julkaistu eikä GitHub-tiliin ole tehty muutoksia.

## Käynnistä Windowsissa

### Helpoin tapa: yksi tiedosto

Kaksoisnapsauta **My Sports.html** -tiedostoa. Se avautuu oletusselaimeen ilman komentoriviä, Node.js:ää tai paikallista palvelinta. Tiedoston voi siirtää myös sellaisenaan toiseen kansioon tai tietokoneeseen. Ulkoasu, logot, ohjelmakoodi ja viimeisin ESPN-tilannekuva on upotettu samaan tiedostoon. Fonttina käytetään paikallista järjestelmäfonttia.

Tämä versio yrittää päivittää ottelutiedot suoraan ESPN:stä, mutta selain tai ESPN voi estää haun (testiympäristössä haku estyi). Silloin mukana toimitetut tai aiemmin tallennetut tiedot säilyvät ja sovellus varoittaa päivitysvirheestä. Niitä ei pidä tulkita ajantasaisiksi. Tiedosto ei hae uutta tilannekuvaa viereisistä JSON-tiedostoista. Videohaku tarvitsee verkkoyhteyden. Yhden paikallisen HTML-tiedoston versio ei ole asennettava PWA; siihen käytetään alempana kuvattua HTTPS-julkaisua.

Uuden yhden tiedoston version muodostaminen lähdekoodista: `npm.cmd run update:data` ja `npm.cmd run build:standalone`. Uusi tiedosto syntyy projektin juureen nimellä `My Sports.html`. Suoraan file://-osoitteesta ajettava tarkistus: `node scripts/check-standalone.mjs`. Tarkistus läpäisi: offline-avaus, molemmat joukkueet, upotetut logot, mobiilileveys, tuloksen näyttö/piilotus, joukkuekohtainen suoja, uudelleenlataus, videolinkit ja datan säilyminen verkkovirheessä. Sivusto- ja PWA-version 42 yksikkötestiä ja tuotantobuild läpäisivät myös muutoksen jälkeen.

### Sivusto- ja PWA-version paikallinen käyttö

Kaksoisnapsauta projektikansion **Kaynnista.cmd**-tiedostoa. Käynnistin asentaa tarvittaessa riippuvuudet, yrittää päivittää aidon ESPN-tilannekuvan, rakentaa tuotantoversion ja avaa osoitteen `http://localhost:4173/`. Pidä komentorivi avoinna. Lopetus: Ctrl+C. Jos portti 4173 on varattu, käynnistin valitsee automaattisesti seuraavan vapaan portin ja avaa oikean osoitteen selaimeen. Käytössä oleva osoite näkyy komentorivillä.

Edellytys: Node.js 22.12+ tai 24 LTS sekä npm. Tämän koneen Codex-ympäristössä käynnistin osaa käyttää myös projektin `work/package`-hakemistoon ladattua npm:ää. Muilla koneilla asenna tavallinen Node.js LTS.

PowerShellissä vaihtoehtoisesti:

```powershell
cd C:\Users\Admin\Documents\Codex\Urheilu
npm.cmd ci
npm.cmd run update:data
npm.cmd run build
npm.cmd run preview
```

Kehityskäyttö: `npm.cmd run dev` → `http://localhost:5173/`. Service worker rekisteröidään vain tuotantoversiossa. Älä avaa index.html-tiedostoa suoraan tiedostona. Verkkoasennus ja iPhone vaativat HTTPS-julkaisun; Windowsin localhost on myös sallittu PWA-ympäristö.

## Toiminta ja spoilerisuoja

- Molemmat joukkueet allekkain, edellinen ja seuraava ottelu, kilpailu, Suomen päivämäärä/kellonaika, laskuri ja paikalliset joukkueiden logot.
- Edellisen ottelun tulosta ei kirjoiteta DOMiin, saavutettavuusteksteihin, otsikoihin, kuviin tai attribuutteihin ennen **Näytä tulos** -painiketta. Tuloksen järjestys on kotijoukkue–vierasjoukkue.
- Paljastustila on ainoastaan muistissa ja sidottu joukkueeseen sekä ottelutunnisteeseen. Uusi ottelu, sivun lataus ja uusi sovellusistunto suojaavat tuloksen. Piilotus toimii myös välimuistidatalla. Voittaja-, tilasto-, sarjataulukko- ja tulosta sisältäviä API-otsikoita ei näytetä.
- Videopainike avaa suojatun katseluikkunan. Virallinen, ottelun summary-vastauksessa Game/Match/Full Highlights -koosteeksi tunnistettu ESPN-video näytetään omalla HTML-videosoittimella vain erillisen Toista kooste -painalluksen jälkeen. Otsikoita, esikatselukuvia, iframe-upotuksia tai automaattitoistoa ei käytetä. Suoraksi lähteeksi hyväksytään vain ESPN:n julkinen HTTPS-MP4, jonka tiedostonimi on läpinäkymätön UUID. Itse videon kuva tai selostus voi paljastaa tuloksen katselun alettua. Jos sopivaa lähdettä ei löydy tai toisto epäonnistuu, ulkoiselle sivulle siirtyminen vaatii erillisen spoilerivaroituksella merkityn valinnan. Videon avaaminen ei muuta tuloksen paljastustilaa. Videopainike tarkistaa edellisen ottelun ESPN-summary-vastauksen. Vain nimenomaisesti ESPN:n Highlights-videoksi luokiteltu koko ottelun kooste hyväksytään. Linkki muodostuu tarjoajan todellisesta numeerisesta videotunnisteesta. Otsikkoa ja esikatselukuvaa ei tuoda sovellukseen. Epävarmassa tapauksessa käytetään YouTube-hakua: molemmat joukkueet, UTC-ottelupäivä, highlights ja virallinen kanava. Haku ei takaa virallisten julkaisujen järjestystä. Ulkoinen sivu voi sisältää spoilereita.
- Päivitys käynnistyessä, palatessa aktiiviseksi, verkkoyhteyden palautuessa, käsin ja 15 minuutin välein aktiivisena. Viimeisimmän onnistuneen haun aika näkyy joukkuekortissa. Yli 30 minuuttia vanhasta datasta varoitetaan.
- Kunkin joukkueen kausihaku hyväksytään kokonaisuutena. Yksittäinen epäonnistunut kilpailuhaku ei aiheuta osittaista otteluvalintaa. Joukkueiden päivitykset ovat riippumattomia. Verkkovirhe säilyttää viimeisen toimivan datan.
- localStorage tallentaa onnistuneet normalisoidut tiedot. Se sisältää myös tulosarvot datana, mutta ei käyttäjän paljastustilaa. Spoilerisuoja suojaa käyttöliittymää, ei kehittäjätyökalujen tietosisältöä.

## ESPN: varmennetut kutsut ja kattavuus

Julkinen **epävirallinen** rajapinta, ei palvelutasolupausta. Lähtöosoite:

`https://site.api.espn.com/apis/site/v2/sports/`

| Tarkoitus | Polku ja parametrit |
| --- | --- |
| Unitedin pelatut ottelut kaikista kilpailuista | `soccer/all/teams/360/schedule?season=2026&fixture=false` |
| Unitedin tulevat ottelut | `soccer/all/teams/360/schedule?season=2026&fixture=true` |
| Kilpailukohtainen varmistus | `soccer/{slug}/teams/360/schedule?season=2026&fixture=true` sekä `false` |
| Steelers runkosarja | `football/nfl/teams/23/schedule?season=2026&seasontype=2` |
| Steelers pudotuspelit | sama, `seasontype=3` |
| Videotiedon tarkistus | `{sport}/{league}/summary?event={id}` |

Jalkapallon schedule-haku ilman `fixture=true` ei riitä tulevien otteluiden löytämiseen. Kaikki kilpailut sisältävä haku sisältää myös ystävyysottelut, joten hyväksytyt viralliset kilpailut rajataan `league.slug`-tunnisteella. Mukana Valioliiga (`eng.1`), FA Cup (`eng.fa`), liigacup (`eng.league_cup`), Mestarien liiga, Eurooppa-liiga, Konferenssiliiga, Community Shield sekä tunnistetut seura-MM- ja supercup-kilpailut. Uusi ESPN-kilpailutunniste vaatii hyväksyntälistan päivittämisen. Sovellus ei väitä kattavansa automaattisesti kaikkia tulevaisuudessa perustettavia kilpailuja.

Haut kattavat jalkapallon nykyisen kauden sekä viereiset kaudet. Nykykauden Valioliiga, molemmat cupit, kaikki kolme eurokilpailua ja Community Shield haetaan myös erikseen. Kauden raja on heinäkuussa. NFL:stä haetaan kalenterivuosi ja viereiset vuodet, aina runkosarja sekä pudotuspelit. Kaikki ottelut yhdistetään pysyvällä ID:llä ja järjestetään todellisen aloitusajan mukaan. Runkosarjan ja pudotuspelien ulkopuoliset NFL-ottelut sekä ystävyysottelut hylätään. Vapaaviikolla valitaan seuraava todellinen ottelu; offseasonilla näytetään vahvistamattoman seuraavan ottelun teksti, jos ohjelmaa ei ole julkaistu.

Päättyneeksi hyväksytään vain eksplisiittinen lopputila ja `completed=true` sekä `state=post`. Keskeytys, siirto, peruutus ja käynnissä oleva ottelu eivät käy. Vahvistamatonta kellonaikaa ei esitetä tarkkana eikä sille näytetä laskuria. Siirretty ottelu tulee takaisin tuleviin, kun ESPN julkaisee sille uuden normaalin Scheduled-tilan ja ajan. Europe/Helsinki-muotoilu käyttää selaimen Intl-tietokantaa ja huomioi kesäajan.

### Selaineston varareitti

23.11.2026 tehdyissä suorissa Node/PowerShell-hauissa ESPN palautti HTTP 200 ja `Access-Control-Allow-Origin: *`. **Headless Chromium sai samalta palvelulta Akamai HTTP 403 Access Denied -vastauksen ilman CORS-otsaketta**. Pelkkä palvelimen salliva CORS-otsake ei siten takaa toimivuutta kaikissa verkoissa tai selaimissa.

Sovellus yrittää suoraa selainhakua. Jos se epäonnistuu, käytetään samalta sivustolta `data/united.json` ja `data/steelers.json` -tilannekuvia. Ne tuotetaan samoilla normalisointisäännöillä oikeasta ESPN-datasta (`npm.cmd run update:data`). Alkuperäistä hakuaikaa ei muuteta lataushetkeksi. Vanhempi tilannekuva ei korvaa selaimen uudempaa välimuistia. Service worker ei välimuistita näitä JSON-hakuja.

Mukana toimitettu tilannekuva on haettu 23.11.2026; se ei päivity itsestään pelkällä paikallisella tiedostopalvelimella. Paikallinen käynnistin päivittää sen käynnistyessä. Julkaistun version GitHub Actions -työnkulku yrittää päivittää sen noin 15 minuutin välein ennen uudelleenjulkaisua. Actions-ajastus voi viivästyä ja käyttämättömän julkisen repositorion ajastus voidaan GitHubissa poistaa käytöstä. Jos ESPN estää myös Actions-haut, julkaisu epäonnistuu ja edellinen julkaisu säilyy. Sovelluksen hakuaika ja vanhentumisvaroitus kertovat tilanteen. Staattinen Pages-sovellus ei voi taata reaaliaikaista dataa ESPN-eston ja tilannekuvapäivityksen häiriön aikana. Maksullista palvelua tai CORS-proxyä ei käytetä.

## Testit ja niiden ajaminen

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run verify:live
npx.cmd playwright install chromium
# Käynnistä toisessa ikkunassa: npm.cmd run preview
npm.cmd run test:browser
```

`verify:live` tarvitsee verkkoyhteyden ja tarkistaa molempien joukkueiden edellisen sekä seuraavan ottelun näyttämättä tuloksia. `update:data` tarvitsee verkon vain datan muodostamiseen; varsinainen frontend-build ja yksikkötestit toimivat ilman ESPN-yhteyttä.

Toteutuksen yhteydessä 23.11.2026:

- **42/42 Vitest-testiä läpäisi**: kaikki tehtävänannon 16 testiryhmää, todellisista ESPN-vastauksista tallennetut kiinteät esimerkit, NFL-harjoitusottelut ja pudotuspelit, rangaistuspotkutuloksen suojaus, kesäajan molemmat vaihdot, virheelliset vastaukset, timeout, XSS, videolinkit ja varatilannekuvan oikea hakuaika.
- **TypeScript-tarkistus ja Vite-tuotantobuild läpäisivät.**
- **Oikea ESPN-data:** United 87 yksilöllistä virallista ottelua haetuissa kausissa; mukana Valioliiga, FA Cup, liigacup ja Mestarien liiga. Steelers 35 runkosarja-/pudotuspeliottelua. Molempien edellinen ja seuraava löytyivät. Eurooppa-liigan ja Konferenssiliigan nykykauden kutsut olivat kelvollisia mutta tyhjiä; niitä ei väitetä Unitedin tämän kauden kilpailuiksi.
- **Chromium-selaintesti läpäisi sekä juuripolussa että `/my-sports/`-alihakemistossa:** 390 px mobiili ja 1440 px työpöytä, ei vaakaylivuotoa, tulospainikkeet, joukkuekohtainen suoja, uudelleenlataus, uuden päättyneen ottelun suoja, verkkovirheen jälkeinen tietojen säilyminen, service worker, manifest/ikonit, offline-uudelleenlataus ja offline-logot. Todellinen data tuli varatilannekuvasta ESPN:n selaineston vuoksi. Ottelun vaihtumis- ja verkkovirhetilanteet simuloitiin hallituilla vastauksilla.
- Näkymien kuvakaappaukset tarkastettiin silmämääräisesti.
- **Ei testattu:** fyysinen iPhone/Safari-asennus, Windows Edgen asennusdialogi, oikea GitHub-julkaisu tai ajastetun työnkulun toiminta GitHubissa. Asennusvalmius ja paikallinen offline-toiminta tarkistettiin Chromiumilla. Videopainikkeiden kohdeosoitteet tarkistettiin; ulkoisten videoiden saatavuutta, maarajoituksia ja hakutulosten järjestystä ei taata.

Tekniset paikalliset raportit ja kuvakaappaukset syntyvät gitistä pois rajattuun `work/`-hakemistoon. Testien otteluesimerkit ovat `tests/fixtures/`-hakemistossa.

## Julkaise GitHub Pagesiin

Tätä vaihetta ei ole suoritettu. Luo itse esimerkiksi julkinen `my-sports`-repositorio ja lisää tämän projektin lähdetiedostot. Älä lisää `node_modules`, `dist` tai `work`-hakemistoja. Julkisen repositorion Pages ja tavalliset Actions-ajot ovat käytettävissä GitHubin maksuttoman palvelun rajoissa; yksityisen repositorion saatavuus/kiintiöt riippuvat tilauksesta.

1. Avaa repositorion **Settings → Pages → Source → GitHub Actions**.
2. Salli tarvittaessa repositorion Actions-työnkulut.
3. Avaa **Actions → Deploy My Sports → Run workflow**.
4. Työnkulku asentaa riippuvuudet, hakee ESPN-tilannekuvat, suorittaa testit, rakentaa ja julkaisee `dist`-hakemiston Pagesiin.
5. Avaa deploy-ajon ilmoittama HTTPS-osoite, tavallisesti `https://KÄYTTÄJÄ.github.io/my-sports/`.

Mukana oleva workflow on käsin ajettava ja ajastettu noin 15 minuutin välein. Ajastus alkaa toimia vasta, kun tiedostot ovat GitHubin oletushaarassa ja Actions sallittu. Muutos ei yksin julkaise sovellusta tässä paikallisessa ympäristössä. Päivitys ei tee git-committeja dataan, vaan tilannekuva on julkaisuartefaktissa. Jos et halua automaattista julkaisua, poista YAML:n `schedule`-osa ja aja työ käsin. Datakuvien jatkuva ajantasaisuus riippuu tästä julkaisupäivityksestä, jos suora ESPN-haku on estetty.

Viten `base: './'`, suhteellinen manifest/start_url/scope, workerin sijainnista johdetut polut ja build-kohtainen worker-välimuistitunniste tukevat alihakemistoa. Uusi service worker aktivoituu, kun vanhat sovellusikkunat suljetaan; sulje ja avaa sovellus uudelleen julkaisupäivityksen jälkeen.

## Asenna iPhoneen ja Windowsiin

**iPhone:** avaa julkaistu HTTPS-osoite Safarissa → Jaa → Lisää Koti-valikkoon → Lisää. Avaa omasta My Sports -kuvakkeesta. Ensimmäinen avaaminen tarvitsee verkkoyhteyden. Sen jälkeen sovelluskuori ja viimeksi onnistuneet ottelut toimivat offline-tilassa; videohaku tarvitsee verkon.

**Windows:** avaa julkaistu osoite tai paikallinen tuotantoversio Microsoft Edgessä → asennuskuvake osoiterivillä tai valikko → Sovellukset → Asenna tämä sivusto sovelluksena. Jos selain tarjoaa asennustapahtuman, sovelluksen oma **Asenna My Sports** -painike tulee näkyviin. Sovellus avautuu omassa ikkunassa.

## Rakenne ja ylläpito

- `src/api.ts`: ESPN-haut, aikakatkaisu, kaudet, kilpailut ja videokoosteen tarkistus.
- `src/model.ts`: normalisointi, yksilöinti/valinta, spoileritila, aika ja turvalliset videolinkit.
- `src/data.ts`: suora haku ja samalta sivustolta ladattava varatilannekuva.
- `src/cache.ts`: validoitu välimuisti, tallennusvirheiden käsittely.
- `src/ui.ts`, `src/main.ts`, `src/style.css`: turvallinen HTML, tapahtumat, päivitykset ja responsiivinen ulkoasu.
- `public/sw.js`, manifest ja ikonit: PWA ja offline-kuori. Google Fonts on ulkoinen ulkoasulisä; järjestelmäfontti toimii ilman sitä.
- `scripts/update-data.mjs`: staattinen ESPN-tilannekuva; ei erillistä palvelinta.
- `scripts/browser-check.mjs`: tuotantoversion selain- ja offline-tarkistus. Osoitteen voi antaa `TEST_URL`-ympäristömuuttujalla.

ESPN:n epävirallinen tietorakenne, kilpailutunnisteet, aikataulut ja tilakoodit voivat muuttua. Vanhentuneella datalla ei väitetä ottelutilannetta reaaliaikaiseksi. ESPN:n logosyötteistä tallennetut seuralogot ovat niiden oikeudenhaltijoiden tunnuksia; sovellus ei ole seurojen, NFL:n tai ESPN:n virallinen tuote.

## Steelersin noin viiden minuutin virallinen kooste

Steelersin videovalinta suosii varmennettua 4–6 minuutin virallista ottelukoostetta. Nykyisen ottelun Steelers.com-kooste on 5:40; sen kesto tarkistettiin virallisen sivun normaalisti lataamasta videosoittimen metadatasta. Videotunniste, päivämäärä ja molemmat joukkueet sidotaan täsmälleen ESPN-ottelutunnisteeseen. Väärän ottelun tai väärän pituisen videon viitettä ei hyväksytä.

Pitkä kooste avataan käyttäjän erillisestä valinnasta Steelersin omalle sivulle, koska toisto tarvitsee palvelun oman videosoittimen. Sovellus ei kopioi, tallenna tai käytä sen kirjautumis-/toistotunnisteita eikä upota palvelun sivua. Ulkoisen sivun otsikot ja kuvat voivat paljastaa tuloksen, mistä kerrotaan painikkeessa ja katseluikkunassa. Lyhyt ESPN-kooste (nyt 0:52) jää vaihtoehdoksi oman sovelluksen sisälle ilman otsikkoa tai esikatselukuvaa.

`npm.cmd run update:data` tarkistaa Steelersin virallisen pelipäiväarkiston ja etsii edellisen ottelun koko ottelun koosteen. Playwright/Chromium avaa löytyneen virallisen sivun normaalisti ja lukee videosoittimen vastauksesta vain keston. Varmennettu neutraali viite tallennetaan `src/official-videos.json`-luetteloon ja tilannekuvaan. Jos selainta tai verkkoyhteyttä ei ole tai sopivaa 4–6 minuutin videota ei löydy, pidempää versiota ei luvata: vanhat ottelukohtaiset viitteet säilyvät, eikä niitä siirretä uuteen otteluun. Luettelon muutos tulee HTML-tiedostoon vasta uudella `build:standalone`-rakennuksella. GitHub-työnkulkuun on lisätty selaimen asennus tätä tarkistusta varten; työnkulkua ei ole ajettu GitHubissa.

Tämän muutoksen tarkistukset: 46/46 automaattista testiä läpäisi, tuotanto- ja yhden tiedoston rakennukset onnistuivat, file://-selaintesti läpäisi. Pitkän 5:40-vaihtoehdon ensisijaisuus, oikea kohdeosoite, 0:52-vaihtoehto sekä otsikoiden, kuvien, tuloksen ja automaattisen medialatauksen puuttuminen tarkistettiin myös selaimessa. Kesto varmennettiin palvelun metadatasta; koko 5:40-videota ei katsottu läpi eikä sen saatavuutta kaikissa maissa tai selaimissa voida taata.

## Kompakti mobiilinakyma

Esittelyotsikot, iskulauseet, yleinen tulossuojateksti ja yhden tiedoston ohjelaatikko on poistettu. Paivityspainike on ylapalkissa, korttien valit ovat tiiviit ja aikajalaskuri on yhdella rivilla. Tulossuoja, videot, hakuaikaleimat ja virhevaroitukset sailyvat. 390 px leveydella nakyman korkeus oli selaintestissa 1080 px ja 320 px leveydella 1163 px. Ei vaakaylivuotoa; painikkeiden korkeus vahintaan 44 px. 46 automaattista testia ja molemmat rakennukset lapaisivat muutoksen jalkeen.


## Jo käynnissä olevan sovelluksen avaaminen

Kaynnista.cmd etsii ensin tämän projektin jo käynnissä olevan My Sportsin ja avaa sen osoitteen selaimeen. Tällöin uutta palvelinta, datapäivitystä tai rakennusta ei käynnistetä. Samanaikaiset käynnistykset suojataan projektikohtaisella Windows-mutexilla. Jos palvelinta ei ole, käynnistin päivittää ja rakentaa sovelluksen sekä käynnistää yhden palvelimen. Sen tunniste ja viimeksi käytetty portti mahdollistavat uudelleenkäytön myös vaihtoehtoisessa portissa. Muita paikallisia sovelluksia ei suljeta. Palvelimen komentorivi-ikkuna on pidettävä auki; Ctrl+C sulkee palvelimen. Lähdekoodimuutokset otetaan käyttöön sulkemalla vanha palvelin ja käynnistämällä uudelleen.

Tarkistus: node scripts/check-local-server.mjs. Todellisilla paikallisilla palvelimilla varmennettiin muun samannimisen sovelluksen ohittaminen, varatun portin säilyttäminen, saman My Sportsin tunnistus toistuvasti sekä poikkeavan portin muistaminen. Myös PowerShell-käynnistimen uudelleenkäyttöhaara tarkistettiin; se löysi jo käynnissä olevan sovelluksen ja ohitti rakentamisen.
