/* empty css                                 */
import { c as createComponent, r as renderTemplate, b as renderComponent, m as maybeRenderHead } from '../chunks/astro/server_BwIe7afF.mjs';
import 'kleur/colors';
import { p as publicationsPageContent, b as $$Layout } from '../chunks/Layout_BjBFPX6w.mjs';
import { $ as $$PublicationCard } from '../chunks/PublicationCard_CbVAm0Ne.mjs';
export { renderers } from '../renderers.mjs';

const $$Publications = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "seo": publicationsPageContent.seo }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="mt-10 max-w-3xl mx-auto px-6"> <h1 class="font-bold text-3xl mb-1">Publications</h1> <p class="opacity-60 mb-10">${publicationsPageContent.subtitle}</p> <div class="grid grid-cols-1 group"> ${publicationsPageContent.publications.map((publication) => (
    // Changed from projects
    renderTemplate`${renderComponent($$result2, "PublicationCard", $$PublicationCard, { ...publication })}`
  ))} </div> </section> ` })}`;
}, "/Users/wiva/willemweb/src/pages/publications.astro", void 0);

const $$file = "/Users/wiva/willemweb/src/pages/publications.astro";
const $$url = "/publications";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Publications,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
