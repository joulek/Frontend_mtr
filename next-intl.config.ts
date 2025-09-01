// next-intl.config.ts
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
   localePrefix: 'as-needed' // permet que "/" → "/fr"
});

export default routing;
