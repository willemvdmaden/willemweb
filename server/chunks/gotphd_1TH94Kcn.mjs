import { c as createComponent, r as renderTemplate, m as maybeRenderHead, u as unescapeHTML } from './astro/server_BwIe7afF.mjs';
import 'kleur/colors';
import 'clsx';

const html = "<p>I am thrilled to announce that today, on May 8th, 2024, I successfully defended my PhD thesis “Designing Positive AI: How optimizing for contextual wellbeing inspired a design method for artificial intelligence that promotes human flourishing” at the IT University of Copenhagen.</p>\n<p>This journey has been transformative, allowing me to explore the intersection of AI design, human wellbeing, and interactive systems. My research focused on developing methodologies for designing AI systems that not only serve their intended functions but actively contribute to human flourishing.</p>\n<p>Through my work, I’ve had the privilege of collaborating with exceptional researchers, engaging with fascinating questions about the future of human-AI interaction, and contributing to the growing field of positive computing and wellbeing-centered AI design.</p>\n<p>I want to express my deepest gratitude to my supervisors, colleagues, and everyone who supported me throughout this journey. As I move forward in my academic career, I remain committed to exploring how we can design AI systems that enhance human wellbeing and create positive societal impact.</p>\n<p><a href=\"https://repository.tudelft.nl/record/uuid:7a341d93-3a51-4df2-9d0a-fcade9008e63\">The full thesis is available here.</a></p>";

				const frontmatter = {"title":"Designing Positive AI: Successfully Defended my PhD Thesis","pubDate":"2024-05-08T00:00:00.000Z","description":"Reflecting on my journey exploring how to design AI systems that enhance human wellbeing","author":"Willem van der Maden","image":{"url":"/tehsis.png","alt":"PhD Defense Ceremony"},"minutesRead":"1 min read"};
				const file = "/Users/wiva/willemweb/src/content/posts/gotphd.md";
				const url = undefined;
				function rawContent() {
					return "\nI am thrilled to announce that today, on May 8th, 2024, I successfully defended my PhD thesis \"Designing Positive AI: How optimizing for contextual wellbeing inspired a design method for artificial intelligence that promotes human flourishing\" at the IT University of Copenhagen.\n\nThis journey has been transformative, allowing me to explore the intersection of AI design, human wellbeing, and interactive systems. My research focused on developing methodologies for designing AI systems that not only serve their intended functions but actively contribute to human flourishing.\n\nThrough my work, I've had the privilege of collaborating with exceptional researchers, engaging with fascinating questions about the future of human-AI interaction, and contributing to the growing field of positive computing and wellbeing-centered AI design.\n\nI want to express my deepest gratitude to my supervisors, colleagues, and everyone who supported me throughout this journey. As I move forward in my academic career, I remain committed to exploring how we can design AI systems that enhance human wellbeing and create positive societal impact.\n\n[The full thesis is available here.](https://repository.tudelft.nl/record/uuid:7a341d93-3a51-4df2-9d0a-fcade9008e63)";
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
