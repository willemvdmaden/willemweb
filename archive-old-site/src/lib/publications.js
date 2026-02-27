import { promises as fs } from 'fs';
import * as path from 'path';

// Simple BibTeX parser (avoiding npm dependency issues)
function parseBibtex(content) {
    const entries = [];
    // Match @type{key, ... }
    const entryRegex = /@(\w+)\s*\{\s*([^,]+)\s*,([^@]*?)(?=\n\s*@|\n*$)/gs;

    let match;
    while ((match = entryRegex.exec(content)) !== null) {
        const type = match[1].toLowerCase();
        const key = match[2].trim();
        const fieldsStr = match[3];

        const entry = {
            type,
            key,
            fields: {}
        };

        // Parse fields: fieldname = {value} or fieldname = "value"
        const fieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
            const fieldName = fieldMatch[1].toLowerCase();
            const value = (fieldMatch[2] || fieldMatch[3] || '').trim();
            entry.fields[fieldName] = value;
        }

        entries.push(entry);
    }

    return entries;
}

// Map BibTeX types to display labels
function getTypeLabel(type) {
    const labels = {
        'article': 'Journal',
        'inproceedings': 'Conference',
        'phdthesis': 'Dissertation',
        'misc': 'Preprint',
    };
    return labels[type] || 'Publication';
}

// Check if entry is a preprint (arXiv)
function isPreprint(entry) {
    return entry.fields.archiveprefix?.toLowerCase() === 'arxiv' ||
        entry.fields.eprint ||
        (entry.fields.journal?.toLowerCase().includes('arxiv'));
}

// Check if entry is under review (should be filtered out)
function isUnderReview(entry) {
    const note = entry.fields.note?.toLowerCase() || '';
    return note.includes('under review');
}

// Format authors for display
function formatAuthors(authorString) {
    if (!authorString) return '';
    // Split on " and " and clean up
    return authorString
        .split(/\s+and\s+/i)
        .map(a => a.trim())
        .join(', ');
}

// Clean up BibTeX formatting from titles
function cleanTitle(title) {
    if (!title) return '';
    return title
        .replace(/\\&/g, '&')
        .replace(/\\_/g, '_')
        .replace(/[\{\}]/g, '') // Remove { and } used for capitalization protection
        .replace(/--/g, '–');   // Replace double hyphen with en-dash
}

// Get publication venue
function getVenue(entry) {
    return entry.fields.booktitle || entry.fields.journal || entry.fields.school || '';
}

// Get DOI or URL link
function getLink(entry) {
    if (entry.fields.doi) {
        const doi = entry.fields.doi;
        return doi.startsWith('http') ? doi : `https://doi.org/${doi}`;
    }
    return entry.fields.url || '';
}

// Parse note field for badges
function parseBadges(note) {
    if (!note) return [];
    const badges = [];

    const lowerNote = note.toLowerCase();
    if (lowerNote.includes('honorable mention')) {
        badges.push({ text: 'Honorable Mention', type: 'award' });
    }
    // "Under review" is filtered out, so we don't need a badge for it

    if (lowerNote.includes('accepted') || lowerNote.includes('revise')) {
        badges.push({ text: 'Accepted', type: 'status' });
    }

    return badges;
}

// Map thumbnail field names to actual existing image files
const thumbnailMap = {
    'dissertation.jpg': 'designing-positive-ai.jpg',
    'positive-ai-method.jpg': 'developing-and-evaluating-a-design-method-for-positive-artificial-intelligence.jpg',
    'framework-community.jpg': 'a-framework-for-designing-ai-systems-that-support-community-wellbeing.jpg',
    'drs2022.jpg': 'drs.png',
    'resonance.jpg': 'resonance-as-a-design-strategy-for-ai-and-social-robots.jpg',
    'ai-emotions.jpg': 'evaluating-ai-alignment-with-human-emotions.jpg',
    'mental-health-chatbot.jpg': 'supporting-mental-health-self-care-discovery-through-a-chatbot.jpg',
    'centers-margins.jpg': 'chi2025.png',
    'trustworthy-eca.jpg': 'trustworthy-embodied-conversational-agents-for-healthcare-a-design-exploration-of-embodied-conversat.jpg',
    'creative-ai-hri.jpg': 'creative-ai-for-hri-design-explorations.jpg',
    'death-design-researcher.jpg': 'death-of-the-design-researcher-creating-knowledge-resources-for-designers-using-generative-ai.jpg',
    'towards-framework.jpg': 'towards-a-design-research-framework-with-generative-ai.jpg',
    'positive-ai-challenges.jpg': 'positive-ai-key-challenges-for-designing-wellbeing-aligned-artificial-intelligence.png',
    'unseen-hand.jpg': 'iasdr.jpg',
    'autonomous-vehicles.jpg': 'iasdr.jpg',
};

function mapThumbnail(thumbnail) {
    if (!thumbnail) return null;
    return thumbnailMap[thumbnail] || thumbnail;
}

export async function loadPublications() {
    const bibPath = path.join(process.cwd(), 'publications.bib');
    const content = await fs.readFile(bibPath, 'utf-8');
    const entries = parseBibtex(content);

    const publications = entries
        .filter(entry => !isUnderReview(entry))  // Filter out "Under review" papers
        .map(entry => ({
            key: entry.key,
            type: isPreprint(entry) ? 'Preprint' : getTypeLabel(entry.type),
            title: cleanTitle(entry.fields.title || ''),
            year: parseInt(entry.fields.year) || 0,
            authors: formatAuthors(entry.fields.author),
            venue: getVenue(entry),
            link: getLink(entry),
            thumbnail: mapThumbnail(entry.fields.thumbnail),
            featured: entry.fields.featured?.toLowerCase() === 'true',
            badges: parseBadges(entry.fields.note),
        }));

    // Sort by year descending, then by title
    return publications.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return a.title.localeCompare(b.title);
    });
}

export async function getFeaturedPublications(limit = 4) {
    const all = await loadPublications();
    const featured = all.filter(p => p.featured);
    return featured.slice(0, limit);
}

export async function getPublicationsByYear() {
    const all = await loadPublications();
    const byYear = {};

    for (const pub of all) {
        const year = pub.year || 'Unknown';
        if (!byYear[year]) {
            byYear[year] = [];
        }
        byYear[year].push(pub);
    }

    // Return sorted by year descending
    return Object.entries(byYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, pubs]) => ({ year, publications: pubs }));
}
