import DOMPurify from 'dompurify';
import {marked} from 'marked';

const allowedTags = [
    'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'li', 'ol', 'p', 'pre', 'strong', 'u', 'ul',
];

export function renderMarkdown(markdown: string): string {
    const html = marked.parse(markdown, {async: false, breaks: true, gfm: true});
    return DOMPurify.sanitize(html, {
        ALLOWED_ATTR: ['data-list', 'href', 'title'],
        ALLOWED_TAGS: allowedTags,
    });
}
