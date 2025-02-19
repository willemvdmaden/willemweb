import { c as createComponent, r as renderTemplate, m as maybeRenderHead, u as unescapeHTML } from './astro/server_BwIe7afF.mjs';
import 'kleur/colors';
import 'clsx';

const html = "<p>I’m excited to announce that I’ve started my position as a Postdoctoral Researcher at the IT University of Copenhagen (ITU). In this role, I’ll be continuing my research on human-AI interaction, focusing on designing systems that enhance wellbeing and improve user experiences.</p>\n<p>ITU’s strong focus on human-centered computing and its interdisciplinary approach to technology research makes it an ideal environment for extending my work on positive AI design. I’m particularly looking forward to collaborating with the talented researchers here and contributing to the university’s innovative research community.</p>\n<p>Building on my doctoral research, I’ll be exploring new directions in AI system design, investigating how we can create more meaningful and beneficial interactions between humans and artificial intelligence. This position offers an exciting opportunity to bridge theoretical frameworks with practical applications in designing AI systems that genuinely support human flourishing.</p>\n<p>I’m grateful for this opportunity and eager to share updates about my research as it progresses. If you’re interested in collaboration or would like to learn more about my work, feel free to reach out!</p>";

				const frontmatter = {"title":"New Chapter: Starting as a Postdoctoral Researcher at ITU","pubDate":"2024-01-15T00:00:00.000Z","description":"Beginning my postdoctoral research journey at the IT University of Copenhagen","author":"Willem van der Maden","image":{"url":"/itu.webp","alt":"IT University of Copenhagen"},"minutesRead":"1 min read"};
				const file = "/Users/wiva/willemweb/src/content/posts/movetoitu.md";
				const url = undefined;
				function rawContent() {
					return "\nI'm excited to announce that I've started my position as a Postdoctoral Researcher at the IT University of Copenhagen (ITU). In this role, I'll be continuing my research on human-AI interaction, focusing on designing systems that enhance wellbeing and improve user experiences.\n\nITU's strong focus on human-centered computing and its interdisciplinary approach to technology research makes it an ideal environment for extending my work on positive AI design. I'm particularly looking forward to collaborating with the talented researchers here and contributing to the university's innovative research community.\n\nBuilding on my doctoral research, I'll be exploring new directions in AI system design, investigating how we can create more meaningful and beneficial interactions between humans and artificial intelligence. This position offers an exciting opportunity to bridge theoretical frameworks with practical applications in designing AI systems that genuinely support human flourishing.\n\nI'm grateful for this opportunity and eager to share updates about my research as it progresses. If you're interested in collaboration or would like to learn more about my work, feel free to reach out!";
				}
				function compiledContent() {
					return html;
				}
				function getHeadings() {
					return [];
				}

				const Content = createComponent((result, _props, slots) => {
					const { layout, ...content } = frontmatter;
					content.file = file;
					content.url = url;

					return renderTemplate`${maybeRenderHead()}${unescapeHTML(html)}`;
				});

export { Content, compiledContent, Content as default, file, frontmatter, getHeadings, rawContent, url };
