/* empty css                                 */
import { c as createComponent, r as renderTemplate, b as renderComponent, m as maybeRenderHead } from '../chunks/astro/server_BwIe7afF.mjs';
import 'kleur/colors';
import { b as $$Layout, i as identity } from '../chunks/Layout_BjBFPX6w.mjs';
export { renderers } from '../renderers.mjs';

const $$PositiveAi = createComponent(($$result, $$props, $$slots) => {
  const seo = {
    title: "Positive AI | Willem van der Maden",
    description: "Research on designing AI systems that enhance human wellbeing and flourishing",
    image: identity.logo
  };
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "seo": seo }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="mt-10 max-w-2xl mx-auto px-6"> <h1 class="font-bold text-3xl mb-8">Positive AI</h1> <div class="prose prose-invert max-w-none"> <p class="text-lg mb-6">
Positive AI is an approach to artificial intelligence that actively promotes human flourishing and wellbeing through intentional design and implementation.
</p> <h2 class="text-2xl font-semibold mt-12 mb-4">Core Principles</h2> <p class="mb-6">
At its heart, Positive AI aims to create AI systems that not only avoid harm but actively contribute to human wellbeing. This involves understanding how AI can support psychological needs, foster meaningful interactions, and enhance human capabilities.
</p> <h2 class="text-2xl font-semibold mt-12 mb-4">Research Focus</h2> <p class="mb-6">
Our research explores how to design AI systems that:
</p> <ul class="list-disc pl-6 mb-6"> <li class="mb-3">Support individual and community wellbeing</li> <li class="mb-3">Enhance human capabilities rather than replace them</li> <li class="mb-3">Foster meaningful human-AI interactions</li> <li class="mb-3">Promote psychological flourishing</li> </ul> <h2 class="text-2xl font-semibold mt-12 mb-4">Current Projects</h2> <p class="mb-6">
We are currently working on developing frameworks and methodologies for designing AI systems that actively promote wellbeing. This includes creating design principles, evaluation metrics, and practical tools for implementing Positive AI approaches.
</p> <h2 class="text-2xl font-semibold mt-12 mb-4">Get Involved</h2> <p class="mb-6">
If you're interested in Positive AI research or would like to collaborate, please feel free to reach out. We're always looking to connect with researchers, practitioners, and organizations who share our vision of AI that promotes human flourishing.
</p> </div> </section> ` })}`;
}, "/Users/wiva/willemweb/src/pages/positive-ai.astro", void 0);

const $$file = "/Users/wiva/willemweb/src/pages/positive-ai.astro";
const $$url = "/positive-ai";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$PositiveAi,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
