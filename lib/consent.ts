/**
 * Analytics consent (Google Consent Mode v2), region-aware.
 *
 * - Visitors whose browser time zone is in Europe (the EEA, the UK and
 *   Switzerland all sit in "Europe/..." zones, plus a few Atlantic and Arctic
 *   ones) or covers Quebec are asked first: Google Analytics doesn't load at
 *   all until they accept, and never loads if they decline.
 * - Everyone else gets analytics by default, with "Cookie settings" in the
 *   footer to turn it off.
 * - Global Privacy Control counts as a decline, everywhere, until the visitor
 *   makes a choice of their own.
 * - Consent Mode's region defaults are the backstop when the time zone guess
 *   is wrong (a European IP with a non-European clock): Google itself treats
 *   analytics storage as denied for EEA, UK, Swiss and Quebec IPs until
 *   consent.
 * - The site runs no ads, so the ad_* signals are denied everywhere.
 * - The choice lives in the n8-consent cookie on .n8builds.dev, shared with
 *   n8builds.dev and portfolio.n8builds.dev, which run the same code. This
 *   file is a port of n8builds.dev's lib/consent.ts (n8watkins/n8builds-web):
 *   keep the cookie name, domain, values and behaviour identical to it.
 *
 * The bootstrap runs from the root layout's <head> with the request's CSP
 * nonce (lib/csp.ts); 'strict-dynamic' then lets it add gtag.js.
 *
 * The bootstrap below is a tiny inline script in <head>, so the defaults are
 * in place before gtag.js can load. gtag.js itself (about 180 KB, and half a
 * second of script on a phone) waits until the visitor first scrolls, taps,
 * clicks or types, or GA_GRACE_MS after the page has loaded, whichever comes
 * first, and then for the browser to be idle: on a phone it used to run right
 * after load, while the visitor was trying to use the page. Commands queued
 * before then (the page_view among them) are sent once it loads.
 */

/**
 * How long after the load event gtag.js waits for a first interaction before
 * loading anyway, so a visitor who only reads is still counted.
 */
export const GA_GRACE_MS = 5000

/** The first interactions that load gtag.js early (see GA_GRACE_MS). */
const GA_WAKE_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel']

export type ConsentChoice = 'granted' | 'denied'

/**
 * The cookie holding the visitor's choice ("granted" or "denied"). On
 * n8builds.dev and its subdomains it is set on Domain=.n8builds.dev, so one
 * answer covers n8builds.dev, portfolio.n8builds.dev and
 * net-trailers.n8builds.dev (all read and write it). It records consent, so it
 * is strictly necessary and needs none itself.
 */
export const CONSENT_COOKIE = 'n8-consent'

/** The shared parent domain the cookie is set on (when the site runs there). */
export const CONSENT_COOKIE_DOMAIN = 'n8builds.dev'

/** How long the choice is kept: about 12 months. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

/**
 * The first version's localStorage key. Read only when there is no cookie
 * (and copied into it), and still written as a fallback for browsers that
 * block cookies.
 */
export const CONSENT_STORAGE_KEY = 'n8-analytics-consent'

/** Fired on window to open the consent banner (the footer's "Cookie settings"). */
export const CONSENT_OPEN_EVENT = 'n8:consent-open'

/** Fired on window after the choice changes; detail is the new ConsentChoice. */
export const CONSENT_CHANGE_EVENT = 'n8:consent-change'

/**
 * Where analytics needs opt-in consent, for gtag's `region` parameter (ISO
 * 3166-1 countries and ISO 3166-2 subdivisions): the EEA (EU 27 plus
 * Iceland, Liechtenstein, Norway), the United Kingdom, Switzerland, and
 * Quebec (Law 25).
 */
export const CONSENT_REGIONS = [
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
    'IS',
    'LI',
    'NO',
    'GB',
    'CH',
    'CA-QC',
] as const

/**
 * Time zones that get the banner besides every "Europe/..." zone: the
 * European ones under Atlantic/ and Arctic/, and the ones covering Quebec
 * (America/Toronto, which most of Quebec and Ontario share, its old alias
 * America/Montreal, the Ontario zones folded into it, and Blanc-Sablon on
 * Quebec's Lower North Shore).
 */
export const EXTRA_CONSENT_TIME_ZONES = [
    'Atlantic/Reykjavik',
    'Atlantic/Canary',
    'Atlantic/Madeira',
    'Atlantic/Azores',
    'Atlantic/Faroe',
    'Arctic/Longyearbyen',
    'America/Toronto',
    'America/Montreal',
    'America/Nipigon',
    'America/Thunder_Bay',
    'America/Blanc-Sablon',
] as const

/** Whether a visitor in this IANA time zone should be asked before analytics. */
export function isConsentTimeZone(timeZone: string | undefined | null): boolean {
    if (!timeZone) return false
    return (
        timeZone.startsWith('Europe/') ||
        (EXTRA_CONSENT_TIME_ZONES as readonly string[]).includes(timeZone)
    )
}

const DENIED_ADS = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }

/**
 * The inline <head> script. It sets the Consent Mode defaults, reads the
 * choice (the shared cookie first, then the old localStorage key), honours
 * Global Privacy Control as a decline when there is no choice, configures GA,
 * and loads gtag.js only when analytics is allowed: after the first
 * interaction or GA_GRACE_MS after load, then idle (an Accept loads it at once).
 * It exposes `window.n8Consent` (ConsentApi) for the banner.
 */
export function consentBootstrapScript(gaId: string): string {
    // Inside this template literal a regex escape needs a doubled backslash:
    // a single "\s" would reach the browser as "s", and the cookie would be
    // found only when it comes first in document.cookie.
    const regionDefault = { analytics_storage: 'denied', ...DENIED_ADS, region: CONSENT_REGIONS }
    const globalDefault = { analytics_storage: 'granted', ...DENIED_ADS, wait_for_update: 500 }
    const j = JSON.stringify
    return `(function(){
var w=window,d=document,l=w.location,id=${j(gaId)},C=${j(CONSENT_COOKIE)},D=${j(CONSENT_COOKIE_DOMAIN)},K=${j(CONSENT_STORAGE_KEY)};
w.dataLayer=w.dataLayer||[];
function gtag(){w.dataLayer.push(arguments)}
w.gtag=gtag;
gtag('consent','default',${j(regionDefault)});
gtag('consent','default',${j(globalDefault)});
function valid(v){return v==='granted'||v==='denied'?v:null}
function onDomain(){var h=l.hostname;return h===D||h.slice(-D.length-1)==='.'+D}
function readCookie(){var m=d.cookie.match(/(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)/);return m?valid(m[1]):null}
function writeCookie(v){d.cookie=C+'='+v+'; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax'+(onDomain()?'; Domain=.'+D:'')+(l.protocol==='https:'?'; Secure':'')}
var c=readCookie();
if(!c){try{c=valid(w.localStorage.getItem(K))}catch(e){}if(c)writeCookie(c)}
var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
var ask=tz.indexOf('Europe/')===0||${j(EXTRA_CONSENT_TIME_ZONES)}.indexOf(tz)>-1;
var gpc=!c&&!!w.navigator&&w.navigator.globalPrivacyControl===true;
var state=c||(gpc?'denied':ask?'pending':'granted');
if(c||gpc)gtag('consent','update',{analytics_storage:state});
gtag('js',new Date());
gtag('config',id);
var loaded=false,waiting=false,E=${j(GA_WAKE_EVENTS)};
function load(){if(loaded)return;loaded=true;var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);d.head.appendChild(s)}
function later(){var idle=w.requestIdleCallback||function(f){return w.setTimeout(f,1)};idle(load)}
function wake(){if(!waiting)return;waiting=false;E.forEach(function(e){w.removeEventListener(e,wake,true)});later()}
function arm(){w.setTimeout(wake,${GA_GRACE_MS})}
function start(){if(loaded||waiting)return;waiting=true;E.forEach(function(e){w.addEventListener(e,wake,{capture:true,passive:true})});if(d.readyState==='complete')arm();else w.addEventListener('load',arm,{once:true})}
function clearGa(){d.cookie.split(';').forEach(function(p){var n=p.split('=')[0].trim();if(n.indexOf('_ga')!==0)return;var h=l.hostname.split('.');for(var i=0;i<h.length;i++){d.cookie=n+'=; Max-Age=0; Path=/; Domain='+h.slice(i).join('.')}d.cookie=n+'=; Max-Age=0; Path=/'})}
var n8={state:state,choice:c,ask:ask,gpc:gpc,set:function(v){writeCookie(v);try{w.localStorage.setItem(K,v)}catch(e){}n8.choice=v;n8.state=v;gtag('consent','update',{analytics_storage:v});if(v==='granted'){waiting=true;wake()}else clearGa();try{w.dispatchEvent(new CustomEvent(${j(CONSENT_CHANGE_EVENT)},{detail:v}))}catch(e){}}};
w.n8Consent=n8;
if(state==='granted')start();
})();`
}

export interface ConsentApi {
    /**
     * "granted" or "denied" once known (a choice, Global Privacy Control, or
     * the default outside the asked time zones); "pending" while a visitor who
     * is asked hasn't chosen.
     */
    state: ConsentChoice | 'pending'
    /** The stored choice, or null when the visitor hasn't made one. */
    choice: ConsentChoice | null
    /** Whether this visitor is asked before analytics (a European or Quebec time zone). */
    ask: boolean
    /** Whether Global Privacy Control turned analytics off (only when there is no choice). */
    gpc: boolean
    /** Store and apply a choice (loads GA on "granted", clears GA cookies on "denied"). */
    set: (choice: ConsentChoice) => void
}

declare global {
    interface Window {
        n8Consent?: ConsentApi
    }
}

/** The consent API from the bootstrap script, or undefined (no GA configured, or on the server). */
export function getConsent(): ConsentApi | undefined {
    return typeof window === 'undefined' ? undefined : window.n8Consent
}
