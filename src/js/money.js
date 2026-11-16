  /* ---------- CONTRACT 101: money in a project's own currency ----------
     One file for the app and the client portal (build.py puts it into both, right after _open.js). A client project's currency
     is an ISO 4217 code (p.cur). Amounts stay whole numbers in that currency: nothing is ever converted, a currency is only what
     the numbers are in. Written as the reader's language writes money ($4,800 in English, 4.800.000 ₫ in Tiếng Việt). */
  /* every country and the currency it pays in (ISO 3166 -> ISO 4217, as of 2026: Bulgaria in the euro, Curaçao and Sint Maarten
     on the Caribbean guilder) */
  var SD_CC = 'AD EUR AE AED AF AFN AG XCD AI XCD AL ALL AM AMD AO AOA AQ USD AR ARS AS USD AT EUR AU AUD AW AWG AX EUR AZ AZN ' +
    'BA BAM BB BBD BD BDT BE EUR BF XOF BG EUR BH BHD BI BIF BJ XOF BL EUR BM BMD BN BND BO BOB BQ USD BR BRL BS BSD BT BTN BV NOK ' +
    'BW BWP BY BYN BZ BZD CA CAD CC AUD CD CDF CF XAF CG XAF CH CHF CI XOF CK NZD CL CLP CM XAF CN CNY CO COP CR CRC CU CUP CV CVE ' +
    'CW XCG CX AUD CY EUR CZ CZK DE EUR DJ DJF DK DKK DM XCD DO DOP DZ DZD EC USD EE EUR EG EGP EH MAD ER ERN ES EUR ET ETB FI EUR ' +
    'FJ FJD FK FKP FM USD FO DKK FR EUR GA XAF GB GBP GD XCD GE GEL GF EUR GG GBP GH GHS GI GIP GL DKK GM GMD GN GNF GP EUR GQ XAF ' +
    'GR EUR GS GBP GT GTQ GU USD GW XOF GY GYD HK HKD HM AUD HN HNL HR EUR HT HTG HU HUF ID IDR IE EUR IL ILS IM GBP IN INR IO USD ' +
    'IQ IQD IR IRR IS ISK IT EUR JE GBP JM JMD JO JOD JP JPY KE KES KG KGS KH KHR KI AUD KM KMF KN XCD KP KPW KR KRW KW KWD KY KYD ' +
    'KZ KZT LA LAK LB LBP LC XCD LI CHF LK LKR LR LRD LS LSL LT EUR LU EUR LV EUR LY LYD MA MAD MC EUR MD MDL ME EUR MF EUR MG MGA ' +
    'MH USD MK MKD ML XOF MM MMK MN MNT MO MOP MP USD MQ EUR MR MRU MS XCD MT EUR MU MUR MV MVR MW MWK MX MXN MY MYR MZ MZN NA NAD ' +
    'NC XPF NE XOF NF AUD NG NGN NI NIO NL EUR NO NOK NP NPR NR AUD NU NZD NZ NZD OM OMR PA USD PE PEN PF XPF PG PGK PH PHP PK PKR ' +
    'PL PLN PM EUR PN NZD PR USD PS ILS PT EUR PW USD PY PYG QA QAR RE EUR RO RON RS RSD RU RUB RW RWF SA SAR SB SBD SC SCR SD SDG ' +
    'SE SEK SG SGD SH SHP SI EUR SJ NOK SK EUR SL SLE SM EUR SN XOF SO SOS SR SRD SS SSP ST STN SV USD SX XCG SY SYP SZ SZL TC USD ' +
    'TD XAF TF EUR TG XOF TH THB TJ TJS TK NZD TL USD TM TMT TN TND TO TOP TR TRY TT TTD TV AUD TW TWD TZ TZS UA UAH UG UGX UM USD ' +
    'US USD UY UYU UZ UZS VA EUR VC XCD VE VES VG USD VI USD VN VND VU VUV WF XPF WS WST XK EUR YE YER YT EUR ZA ZAR ZM ZMW ZW ZWG';
  var SD_CUR_OF = {}, SD_CURS = [];
  (function () { var a = SD_CC.split(' '), i; for (i = 0; i < a.length; i += 2) { SD_CUR_OF[a[i]] = a[i + 1]; if (SD_CURS.indexOf(a[i + 1]) < 0) SD_CURS.push(a[i + 1]); } SD_CURS.sort(); })();
  function sdCurOk(c) { return typeof c === 'string' && /^[A-Z]{3}$/.test(c); }
  function sdCur(c) { return sdCurOk(c) ? c : 'USD'; }
  function sdMoneyLoc() { return window.SDI18N && SDI18N.lang === 'vi' ? 'vi-VN' : 'en-US'; }
  var SD_MF = {};
  function sdMoneyFmt(cur) {
    var loc = sdMoneyLoc(), k = loc + cur, f = SD_MF[k];
    if (f === undefined) { try { f = new Intl.NumberFormat(loc, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }); } catch (e) { f = null; } SD_MF[k] = f; }
    return f;
  }
  function sdMoney(n, cur) {
    var c = sdCur(cur), f = sdMoneyFmt(c), r = Math.round(+n || 0);
    return f ? f.format(r) : c + ' ' + String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  /* what the currency is called, in the reader's language ("US Dollar", "Đô la Mỹ"); its code when the browser cannot say */
  function sdCurName(cur) { try { return new Intl.DisplayNames([sdMoneyLoc()], { type: 'currency' }).of(cur) || cur; } catch (e) { return cur; } }
  /* its sign alone ("$", "₫", "€"), as the formatted amount shows it */
  function sdCurSign(cur) {
    var f = sdMoneyFmt(sdCur(cur)), s = '';
    try { if (f && f.formatToParts) f.formatToParts(1).forEach(function (x) { if (x.type === 'currency') s = x.value; }); } catch (e) {}
    return s || sdCur(cur);
  }
  /* the <option>s of a currency picker: every currency by its code, with its name; `sel` chosen (kept even when not in the list) */
  function sdCurOptions(sel) {
    sel = sdCur(sel);
    var l = SD_CURS.indexOf(sel) < 0 ? SD_CURS.concat([sel]).sort() : SD_CURS;
    return l.map(function (c) { var n = sdCurName(c); return '<option value="' + c + '"' + (c === sel ? ' selected' : '') + '>' + c + (n && n !== c ? ' · ' + String(n).replace(/[&<>"]/g, '') : '') + '</option>'; }).join('');
  }
