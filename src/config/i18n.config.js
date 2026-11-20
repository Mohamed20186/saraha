import i18next from "i18next";
import Backend from "i18next-fs-backend";
import i18nextMiddleware from "i18next-http-middleware";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: "en",

    supportedLngs: ["en", "ar"],

    preload: ["en", "ar"],

    ns: ["common"],

    defaultNS: "common",

    load: "languageOnly",

    backend: {
      loadPath: path.join(
        __dirname,
        "../locales/{{lng}}/{{ns}}.json"
      ),
    },

    detection: {
      order: ["header"],
      lookupHeader: "accept-language",
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18nextMiddleware.handle(i18next);