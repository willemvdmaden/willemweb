import '@astrojs/internal-helpers/path';
import 'cookie';
import 'kleur/colors';
import 'es-module-lexer';
import './chunks/astro-designed-error-pages_gsh_6-0v.mjs';
import { j as decodeKey } from './chunks/astro/server_BwIe7afF.mjs';
import 'clsx';
import { compile } from 'path-to-regexp';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getRouteGenerator(segments, addTrailingSlash) {
  const template = segments.map((segment) => {
    return "/" + segment.map((part) => {
      if (part.spread) {
        return `:${part.content.slice(3)}(.*)?`;
      } else if (part.dynamic) {
        return `:${part.content}`;
      } else {
        return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    }).join("");
  }).join("");
  let trailing = "";
  if (addTrailingSlash === "always" && segments.length) {
    trailing = "/";
  }
  const toPath = compile(template + trailing);
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    const path = toPath(sanitizedParams);
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware(_, next) {
      return next();
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/wiva/willemweb/","adapterName":"@astrojs/node","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/node.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"inline","value":"const e=document.getElementById(\"link-menu-button\"),n=document.getElementById(\"link-menu\"),i=document.getElementById(\"open-indicator\");e.addEventListener(\"click\",()=>{n.classList.contains(\"opacity-0\")?(n.classList.remove(\"pointer-events-none\"),n.classList.remove(\"opacity-0\"),i.innerText=\"-\"):(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});document.addEventListener(\"click\",t=>{const s=t.target===e||e.contains(t.target),c=t.target===n||n.contains(t.target);!s&&!c&&(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});\n"}],"styles":[{"type":"external","src":"/_astro/about.C_2GBsHd.css"}],"routeData":{"route":"/about","isIndex":false,"type":"page","pattern":"^\\/about\\/?$","segments":[[{"content":"about","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/about.astro","pathname":"/about","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"inline","value":"const e=document.getElementById(\"link-menu-button\"),n=document.getElementById(\"link-menu\"),i=document.getElementById(\"open-indicator\");e.addEventListener(\"click\",()=>{n.classList.contains(\"opacity-0\")?(n.classList.remove(\"pointer-events-none\"),n.classList.remove(\"opacity-0\"),i.innerText=\"-\"):(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});document.addEventListener(\"click\",t=>{const s=t.target===e||e.contains(t.target),c=t.target===n||n.contains(t.target);!s&&!c&&(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});\n"}],"styles":[{"type":"external","src":"/_astro/about.C_2GBsHd.css"}],"routeData":{"route":"/blog/[slug]","isIndex":false,"type":"page","pattern":"^\\/blog\\/([^/]+?)\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/blog/[slug].astro","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"inline","value":"const e=document.getElementById(\"link-menu-button\"),n=document.getElementById(\"link-menu\"),i=document.getElementById(\"open-indicator\");e.addEventListener(\"click\",()=>{n.classList.contains(\"opacity-0\")?(n.classList.remove(\"pointer-events-none\"),n.classList.remove(\"opacity-0\"),i.innerText=\"-\"):(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});document.addEventListener(\"click\",t=>{const s=t.target===e||e.contains(t.target),c=t.target===n||n.contains(t.target);!s&&!c&&(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});\n"}],"styles":[{"type":"external","src":"/_astro/about.C_2GBsHd.css"}],"routeData":{"route":"/blog","isIndex":true,"type":"page","pattern":"^\\/blog\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/blog/index.astro","pathname":"/blog","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"inline","value":"const e=document.getElementById(\"link-menu-button\"),n=document.getElementById(\"link-menu\"),i=document.getElementById(\"open-indicator\");e.addEventListener(\"click\",()=>{n.classList.contains(\"opacity-0\")?(n.classList.remove(\"pointer-events-none\"),n.classList.remove(\"opacity-0\"),i.innerText=\"-\"):(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});document.addEventListener(\"click\",t=>{const s=t.target===e||e.contains(t.target),c=t.target===n||n.contains(t.target);!s&&!c&&(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});\n"}],"styles":[{"type":"external","src":"/_astro/about.C_2GBsHd.css"}],"routeData":{"route":"/positive-ai","isIndex":false,"type":"page","pattern":"^\\/positive-ai\\/?$","segments":[[{"content":"positive-ai","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/positive-ai.astro","pathname":"/positive-ai","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"inline","value":"const e=document.getElementById(\"link-menu-button\"),n=document.getElementById(\"link-menu\"),i=document.getElementById(\"open-indicator\");e.addEventListener(\"click\",()=>{n.classList.contains(\"opacity-0\")?(n.classList.remove(\"pointer-events-none\"),n.classList.remove(\"opacity-0\"),i.innerText=\"-\"):(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});document.addEventListener(\"click\",t=>{const s=t.target===e||e.contains(t.target),c=t.target===n||n.contains(t.target);!s&&!c&&(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});\n"}],"styles":[{"type":"external","src":"/_astro/about.C_2GBsHd.css"}],"routeData":{"route":"/publications","isIndex":false,"type":"page","pattern":"^\\/publications\\/?$","segments":[[{"content":"publications","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/publications.astro","pathname":"/publications","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"inline","value":"const e=document.getElementById(\"link-menu-button\"),n=document.getElementById(\"link-menu\"),i=document.getElementById(\"open-indicator\");e.addEventListener(\"click\",()=>{n.classList.contains(\"opacity-0\")?(n.classList.remove(\"pointer-events-none\"),n.classList.remove(\"opacity-0\"),i.innerText=\"-\"):(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});document.addEventListener(\"click\",t=>{const s=t.target===e||e.contains(t.target),c=t.target===n||n.contains(t.target);!s&&!c&&(n.classList.add(\"pointer-events-none\"),n.classList.add(\"opacity-0\"),i.innerText=\"+\")});\n"}],"styles":[{"type":"external","src":"/_astro/about.C_2GBsHd.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["\u0000astro:content",{"propagation":"in-tree","containsHead":false}],["/Users/wiva/willemweb/src/pages/blog/[slug].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/blog/[slug]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astrojs-ssr-virtual-entry",{"propagation":"in-tree","containsHead":false}],["/Users/wiva/willemweb/src/pages/blog/index.astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/blog/index@_@astro",{"propagation":"in-tree","containsHead":false}],["/Users/wiva/willemweb/src/pages/about.astro",{"propagation":"none","containsHead":true}],["/Users/wiva/willemweb/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/wiva/willemweb/src/pages/positive-ai.astro",{"propagation":"none","containsHead":true}],["/Users/wiva/willemweb/src/pages/publications.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(o,t)=>{let i=async()=>{await(await o())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener(\"change\",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var l=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let a of e)if(a.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=l;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000@astro-page:node_modules/astro/dist/assets/endpoint/node@_@js":"pages/_image.astro.mjs","\u0000@astro-page:src/pages/about@_@astro":"pages/about.astro.mjs","\u0000@astro-page:src/pages/blog/[slug]@_@astro":"pages/blog/_slug_.astro.mjs","\u0000@astro-page:src/pages/blog/index@_@astro":"pages/blog.astro.mjs","\u0000@astro-page:src/pages/positive-ai@_@astro":"pages/positive-ai.astro.mjs","\u0000@astro-page:src/pages/publications@_@astro":"pages/publications.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000noop-middleware":"_noop-middleware.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","/Users/wiva/willemweb/node_modules/astro/dist/env/setup.js":"chunks/astro/env-setup_Cr6XTFvb.mjs","\u0000@astrojs-manifest":"manifest_B0G5fNrA.mjs","/Users/wiva/willemweb/src/content/posts/gotphd.md?astroContentCollectionEntry=true":"chunks/gotphd_DlqvCTFO.mjs","/Users/wiva/willemweb/src/content/posts/movetoitu.md?astroContentCollectionEntry=true":"chunks/movetoitu_UO4Dmqw5.mjs","/Users/wiva/willemweb/src/content/posts/gotphd.md?astroPropagatedAssets":"chunks/gotphd_CODakybh.mjs","/Users/wiva/willemweb/src/content/posts/movetoitu.md?astroPropagatedAssets":"chunks/movetoitu_CSf0Npb0.mjs","\u0000astro:asset-imports":"chunks/_astro_asset-imports_D9aVaOQr.mjs","\u0000astro:data-layer-content":"chunks/_astro_data-layer-content_BcEe_9wP.mjs","/Users/wiva/willemweb/src/content/posts/gotphd.md":"chunks/gotphd_1TH94Kcn.mjs","/Users/wiva/willemweb/src/content/posts/movetoitu.md":"chunks/movetoitu_C4Tr8TRf.mjs","/astro/hoisted.js?q=0":"_astro/hoisted.Byshf39-.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/about.C_2GBsHd.css","/favicon.svg","/flame.png","/itu.webp","/navbar-logo.webp","/tehsis.png","/thesis.jpeg","/willem-logo.webp","/fonts/InterVariable.woff2","/images/publications/a-framework-for-designing-ai-systems-that-support-community-wellbeing.jpg","/images/publications/creative-ai-for-hri-design-explorations.jpg","/images/publications/death-of-the-design-researcher-creating-knowledge-resources-for-designers-using-generative-ai.jpg","/images/publications/designing-positive-ai.jpg","/images/publications/developing-and-evaluating-a-design-method-for-positive-artificial-intelligence.jpg","/images/publications/drs.png","/images/publications/evaluating-ai-alignment-with-human-emotions.jpg","/images/publications/iasdr.jpg","/images/publications/improved-emotional-alignment-of-ai-and-humans-human-ratings-of-emotions-expressed-by-stable-diffusion-v1-dall-e-2-and-dall-e-3.png","/images/publications/positive-ai-key-challenges-for-designing-wellbeing-aligned-artificial-intelligence.png","/images/publications/positiveai.png","/images/publications/resonance-as-a-design-strategy-for-ai-and-social-robots.jpg","/images/publications/supporting-mental-health-self-care-discovery-through-a-chatbot.jpg","/images/publications/towards-a-design-research-framework-with-generative-ai.jpg","/images/publications/trustworthy-embodied-conversational-agents-for-healthcare-a-design-exploration-of-embodied-conversat.jpg"],"buildFormat":"directory","checkOrigin":false,"serverIslandNameMap":[],"key":"B14xYNtMVKrqb7SoU3rj5/QJ+Qj1D69aPjdXmE+G8gw=","experimentalEnvGetSecretEnabled":false});

export { manifest };
