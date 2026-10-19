import { promises as fs } from 'fs';
import * as path from 'path';

// Simple BibTeX parser (avoiding npm dependency issues)
function parseBibtex(content) {
    const entries = [];
    // Match @type{key, ... } up to the next entry header; field values may contain "@" (e.g. HEAL@CHI'25)
    const entryRegex = /^@(\w+)\s*\{\s*([^,]+)\s*,([\s\S]*?)(?=^@\w+\s*\{|(?![\s\S]))/gm;

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

// Workshop proposals and workshop papers: "workshop" in title/venue
function isWorkshopEntry(entry) {
    const text = `${entry.fields.title || ''} ${entry.fields.booktitle || ''}`.toLowerCase();
    return text.includes('workshop');
}

// An explicit `kind` field wins over the heuristics below, e.g. a preprint presented at a workshop
const kindLabels = {
    'journal': 'Journal',
    'conference': 'Conference',
    'dissertation': 'Dissertation',
    'workshop': 'Workshop',
    'preprint': 'Preprint',
};

function getType(entry) {
    const kind = entry.fields.kind?.toLowerCase();
    if (kind && kindLabels[kind]) return kindLabels[kind];
    if (isPreprint(entry)) return 'Preprint';
    if (isWorkshopEntry(entry)) return 'Workshop';
    return getTypeLabel(entry.type);
}

// Within a year: full papers first, then workshops, then preprints
const typeRank = { 'Journal': 0, 'Conference': 0, 'Dissertation': 0, 'Workshop': 1, 'Preprint': 2 };

// Check if entry is under review (should be filtered out)
function isUnderReview(entry) {
    const note = entry.fields.note?.toLowerCase() || '';
    return note.includes('under review');
}

// Format authors for display
function formatAuthors(authorString) {
    if (!authorString) return '';
    // Split on " and " and flip "Last, First" to "First Last"
    const authors = authorString
        .split(/\s+and\s+/i)
        .map(a => a.trim())
        .filter(a => a.toLowerCase() !== 'others')
        .map(a => {
            // Handle "Last, First" format
            if (a.includes(',')) {
                const parts = a.split(',').map(p => p.trim());
                return `${parts[1]} ${parts[0]}`;
            }
            return a;
        });
    
    if (authorString.toLowerCase().includes('others')) {
        authors.push('et al.');
    }
    
    return authors.join(', ');
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
    // A self-hosted PDF (url starting with "/") wins over the DOI
    if (entry.fields.url?.startsWith('/')) return entry.fields.url;
    if (entry.fields.doi) {
        const doi = entry.fields.doi;
        return doi.startsWith('http') ? doi : `https://doi.org/${doi}`;
    }
    return entry.fields.url || '';
}

// Awards recognised in the `note` field, in display order
const awardPatterns = [
    [/best pictorial/i, 'Best Pictorial'],
    [/best paper/i, 'Best Paper'],
    [/honou?rable mention/i, 'Honorable Mention'],
];

// Parse note field for badges
function parseBadges(note) {
    if (!note) return [];
    const badges = [];

    for (const [pattern, text] of awardPatterns) {
        if (pattern.test(note)) badges.push({ text, type: 'award' });
    }
    // "Under review" is filtered out, so we don't need a badge for it

    if (/accepted|revise/i.test(note)) {
        badges.push({ text: 'Accepted', type: 'status' });
    }

    return badges;
}

// BibTeX `month`: a number (1-12) or an English month name / abbreviation; 0 when unknown
const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseMonth(value) {
    if (!value) return 0;
    const v = value.trim().toLowerCase();
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 12) return n;
    const idx = monthNames.findIndex(name => v.startsWith(name));
    return idx === -1 ? 0 : idx + 1;
}

// Map thumbnail field names to actual existing image files
const thumbnailMap = {};

async function mapThumbnail(thumbnail) {
    if (!thumbnail) return null;
    const mapped = thumbnailMap[thumbnail] || thumbnail;
    // Check if the file actually exists
    const filePath = path.join(process.cwd(), 'public', 'images', 'publications', mapped);
    try {
        await fs.access(filePath);
        return mapped;
    } catch {
        return null;
    }
}

export async function loadPublications() {
    const bibPath = path.join(process.cwd(), 'publications.bib');
    const content = await fs.readFile(bibPath, 'utf-8');
    const entries = parseBibtex(content);

    const filtered = entries.filter(entry => !isUnderReview(entry));
    const publications = await Promise.all(filtered.map(async entry => ({
            key: entry.key,
            type: getType(entry),
            title: cleanTitle(entry.fields.title || ''),
            year: parseInt(entry.fields.year) || 0,
            month: parseMonth(entry.fields.month),
            authors: formatAuthors(entry.fields.author),
            venue: getVenue(entry),
            link: getLink(entry),
            thumbnail: await mapThumbnail(entry.fields.thumbnail),
            featured: entry.fields.featured?.toLowerCase() === 'true',
            badges: parseBadges(entry.fields.note),
        })));

    // Newest first: year, then month; within the same month full papers before workshops
    // and preprints, then title. `featured` only affects the front page.
    return publications.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (b.month !== a.month) return b.month - a.month;
        const rankCompare = (typeRank[a.type] ?? 1) - (typeRank[b.type] ?? 1);
        if (rankCompare !== 0) return rankCompare;
        return a.title.localeCompare(b.title);
    });
}

export async function getFeaturedPublications(limit = 4) {
    const all = await loadPublications();
    // Prioritize: featured first, then journals & dissertations, skip workshops
    const isWorkshop = (p) => {
        const v = p.venue.toLowerCase();
        return p.type === 'Workshop' || v.includes('companion') || v.includes('extended abstracts');
    };
    const featured = all.filter(p => p.featured && !isWorkshop(p));
    const journals = all.filter(p => !p.featured && p.type === 'Journal' && !isWorkshop(p));
    const rest = all.filter(p => !p.featured && p.type !== 'Journal' && p.type !== 'Dissertation' && !isWorkshop(p));
    return [...featured, ...journals, ...rest].slice(0, limit);
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
