export const STORAGE_KEY_UI_LANG = "uiLanguage";

/** @type {readonly ["en", "es"]} */
export const SUPPORTED_LANGS = ["en", "es"];

/** @param {unknown} code @returns {code is "en" | "es"} */
export function isSupportedLang(code) {
  return code === "en" || code === "es";
}

/** @returns {"en" | "es"} */
export function defaultLangFromNavigator() {
  const n = (typeof navigator !== "undefined" && navigator.language
    ? navigator.language
    : "en"
  ).toLowerCase();
  return n.startsWith("es") ? "es" : "en";
}

/** @type {Record<string, Record<"en" | "es", string>>} */
const MESSAGES = {
  "family.internet": {
    en: "Internet & routing",
    es: "Internet y enrutamiento",
  },
  "family.dns": { en: "DNS", es: "DNS" },
  "family.cdn": {
    en: "CDN & edge",
    es: "CDN y edge",
  },
  "family.cloud": {
    en: "Cloud & hosting",
    es: "Nube y alojamiento",
  },
  "family.dev": {
    en: "Developer platforms",
    es: "Plataformas para desarrolladores",
  },
  "family.saas": {
    en: "SaaS, identity & collaboration",
    es: "SaaS, identidad y colaboración",
  },
  "family.payments": { en: "Payments", es: "Pagos" },
  "family.ai": { en: "AI & APIs", es: "IA y APIs" },
  "family.security": {
    en: "Observability & security reference",
    es: "Observabilidad y referencia de seguridad",
  },

  "badge.official": { en: "Official", es: "Oficial" },
  "badge.academic": { en: "Research", es: "Investigación" },
  "badge.trusted-third": { en: "3rd party", es: "Tercero" },
  "badge.aggregator": { en: "Aggregator", es: "Agregador" },
  "badge.custom": { en: "Yours", es: "Tuyos" },

  "header.tagline": {
    en: "Official status pages & public Internet health signals",
    es: "Páginas oficiales de estado y señales públicas de salud de Internet",
  },
  "header.windowHint": {
    en: "Drag the title bar to move. Resize from any edge.",
    es: "Arrastra la barra de título para mover. Redimensiona desde cualquier borde.",
  },
  "header.closeAria": { en: "Close window", es: "Cerrar ventana" },
  "header.closeTitle": { en: "Close", es: "Cerrar" },

  "lang.label": { en: "Language", es: "Idioma" },

  "search.label": { en: "Search links", es: "Buscar enlaces" },
  "search.placeholder": {
    en: "Search by name, URL, or section…",
    es: "Buscar por nombre, URL o sección…",
  },
  "search.noResults": {
    en: "No links match your search. Clear the box to see all sections.",
    es: "Ningún enlace coincide. Borra el texto para ver todas las secciones.",
  },
  "search.resultsCount": {
    en: "{n} matches",
    es: "{n} coincidencias",
  },

  "custom.sectionAria": {
    en: "Your custom links",
    es: "Tus enlaces personalizados",
  },
  "custom.barLabel": { en: "Your links", es: "Tus enlaces" },
  "custom.add": { en: "Add", es: "Añadir" },
  "custom.hide": { en: "Hide", es: "Ocultar" },
  "custom.field.section": { en: "Section", es: "Sección" },
  "custom.field.title": { en: "Title", es: "Título" },
  "custom.field.url": { en: "URL", es: "URL" },
  "custom.placeholder.url": {
    en: "https://…",
    es: "https://…",
  },
  "custom.save": { en: "Save", es: "Guardar" },
  "custom.cancel": { en: "Cancel", es: "Cancelar" },
  "custom.edit": { en: "Edit", es: "Editar" },
  "custom.remove": { en: "Remove", es: "Quitar" },
  "custom.err.title": {
    en: "Please enter a title.",
    es: "Escribe un título.",
  },
  "custom.err.url": {
    en: "Enter a valid http(s) URL.",
    es: "Introduce una URL http(s) válida.",
  },
  "custom.confirmRemove": {
    en: "Remove this link from your list?",
    es: "¿Quitar este enlace de tu lista?",
  },

  "footer.disclaimer": {
    en:
      "Directory of public links only. The authoritative source is always each provider. " +
      "This extension does not access or monitor your network. " +
      "Links you add are stored only on this device in this browser.",
    es:
      "Solo es un directorio de enlaces públicos. La fuente autoritativa es siempre cada proveedor. " +
      "Esta extensión no accede ni vigila tu red. " +
      "Los enlaces que añadas se guardan solo en este dispositivo y en este navegador.",
  },
  "footer.version": {
    en: "Extension version {v}",
    es: "Versión de la extensión {v}",
  },
  "footer.versionTitle": {
    en: "Matches the installed package (manifest.json).",
    es: "Coincide con el paquete instalado (manifest.json).",
  },

  "brand.footerAria": {
    en: "AI4Context — open website",
    es: "AI4Context — abrir sitio web",
  },
  "brand.byPrefix": { en: "by", es: "por" },

  "meta.snapshot": {
    en: "Data snapshot: {date}",
    es: "Instantánea de datos: {date}",
  },

  "doc.title": {
    en: "Ecosystem Status Hub",
    es: "Ecosystem Status Hub",
  },

  "error.generic": {
    en: "Could not load directory.",
    es: "No se pudo cargar el directorio.",
  },
  "error.invalidData": {
    en: "Invalid links data.",
    es: "Datos de enlaces no válidos.",
  },
  "error.loadHttp": {
    en: "Failed to load links (HTTP {status}).",
    es: "No se pudieron cargar los enlaces (HTTP {status}).",
  },
};

/**
 * @param {"en" | "es"} lang
 * @param {string} key
 * @param {Record<string, string | number>=} vars
 */
export function translate(lang, key, vars) {
  const row = MESSAGES[key];
  let s = row?.[lang] ?? row?.en ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/**
 * @param {"en" | "es"} lang
 * @param {string} sourceType
 */
export function badgeKeyForSourceType(sourceType) {
  switch (sourceType) {
    case "official":
      return "badge.official";
    case "academic":
      return "badge.academic";
    case "trusted-third":
      return "badge.trusted-third";
    case "aggregator":
      return "badge.aggregator";
    case "custom":
      return "badge.custom";
    default:
      return "badge.trusted-third";
  }
}
