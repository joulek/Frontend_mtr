import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  const finalLocale = locale || 'fr'; // ou 'en', selon ta langue par défaut
  const messages = (await import(`../messages/${finalLocale}.json`)).default;
  return {messages, locale: finalLocale};
});
