/* empty css                                    */
import { c as createComponent, r as renderTemplate, b as renderComponent, d as createAstro, m as maybeRenderHead } from '../../chunks/astro/server_BwIe7afF.mjs';
import 'kleur/colors';
import { b as $$Layout, i as identity } from '../../chunks/Layout_BjBFPX6w.mjs';
import { g as getEntry } from '../../chunks/_astro_content_CZ9GtwFT.mjs';
import '@astrojs/internal-helpers/path';
import { $ as $$Image } from '../../chunks/_astro_assets_yyG3Vpem.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  const entry = await getEntry("posts", slug);
  if (!entry) {
    return Astro2.redirect("/blog");
  }
  const { Content, headings, remarkPluginFrontmatter } = await entry.render();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "seo": {
    title: entry.data.title,
    description: entry.data.description,
    image: entry.data.image.url
  } }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="mt-10 max-w-2xl mx-auto px-6"> <h1 class="font-bold text-3xl mb-4">${entry.data.title}</h1> <p class="opacity-60 mb-6"> ${entry.data.description} </p> <div class="flex gap-4 mb-6"> ${renderComponent($$result2, "Image", $$Image, { "src": identity.logo, "alt": identity.name, "width": 40, "height": 40, "class": "w-[40px] aspect-square object-cover rounded-full" })} <div> <p class="font-medium">${identity.name}</p> <p class="opacity-60"> ${entry.data.pubDate.toLocaleDateString()} · ${remarkPluginFrontmatter.minutesRead} </p> </div> </div> ${renderComponent($$result2, "Image", $$Image, { "src": entry.data.image.url, "alt": entry.data.image.alt, "width": 800, "height": 300, "class": "apsect-video w-full rounded-xl mb-10" })} <article class="prose prose-invert prose-a:text-blue-300 prose-a:underline-offset-4 prose-headings:mb-2 prose-p:text-[#b3b3b3]"> ${renderComponent($$result2, "Content", Content, {})} </article> </section> ` })}`;
}, "/Users/wiva/willemweb/src/pages/blog/[slug].astro", void 0);

const $$file = "/Users/wiva/willemweb/src/pages/blog/[slug].astro";
const $$url = "/blog/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
