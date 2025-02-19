import { c as createComponent, r as renderTemplate, m as maybeRenderHead, a as addAttribute, b as renderComponent, d as createAstro } from './astro/server_BwIe7afF.mjs';
import 'kleur/colors';
import '@astrojs/internal-helpers/path';
import { $ as $$Image } from './_astro_assets_yyG3Vpem.mjs';
import { M as Markdown } from './component_CFl6bfzU.mjs';

const $$Astro = createAstro();
const $$PublicationCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$PublicationCard;
  const { title, description, image, date, url, authors, venue, type } = Astro2.props;
  const year = new Date(date).getFullYear();
  const formattedAuthors = authors.join(", ");
  return renderTemplate`${maybeRenderHead()}<article class="block p-6 hover:bg-gray-800/50 rounded-lg transition-colors"> <a${addAttribute(url, "href")} target="_blank" class="flex gap-6"> <div class="w-48 flex-shrink-0"> <div class="bg-gray-700 rounded-lg aspect-video"> ${image && renderTemplate`${renderComponent($$result, "Image", $$Image, { "width": 1920, "height": 1080, "src": image, "alt": title, "class": "w-full h-full object-cover rounded-lg" })}`} </div> </div> <div class="flex-1"> <div class="flex items-baseline justify-between gap-2 mb-2"> <h2 class="font-medium text-lg text-white">${title}</h2> <span class="text-gray-400 whitespace-nowrap">${year}</span> </div> <div class="text-gray-300 text-sm mb-1"> ${formattedAuthors} </div> ${venue && renderTemplate`<div class="text-gray-400 text-sm italic"> ${venue} </div>`} ${description && renderTemplate`<div class="mt-2 text-gray-400 text-sm"> ${renderComponent($$result, "Markdown", Markdown, { "of": description })} </div>`} </div> </a> </article>`;
}, "/Users/wiva/willemweb/src/components/PublicationCard.astro", void 0);

export { $$PublicationCard as $ };
