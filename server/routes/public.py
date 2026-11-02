"""Public, indexable tutor pages: directory, profiles, subjects and the sitemap. No login.

Anyone can read these endpoints, so every response is built from an explicit allowlist:
first name + last initial, university, course, subjects, levels, hourly rate, about text,
avatar, verified flag, rating and a few recent reviews. Never emails, ages, LinkedIn,
availability, screening or DBS details — and contact details are scrubbed from free text.
"""
import math
import re
import unicodedata
from xml.sax.saxutils import escape

from flask import Blueprint, Response, jsonify, request

from ..config import Config
from ..db import get_db
from ..matching import LEVELS, SUBJECT_ALIASES, parse_subjects, smoothed_rating
from .tutors import TUTOR_JOINS, decorate_tutors

bp = Blueprint('public', __name__, url_prefix='/api')

PAGE_SIZE       = 24
MIN_ABOUT_CHARS = 30   # a shorter bio means the profile isn't finished (and makes a thin page)
RECENT_REVIEWS  = 5

# Marketing pages listed in the sitemap next to every tutor and subject page
STATIC_PAGES = ('/', '/how-it-works', '/about', '/become-tutor', '/tutors')

# The only columns public pages ever read
PUBLIC_COLUMNS = """
    tp.id_tutor, u.name, tp.university, tp.course, tp.about_me, tp.subjects, tp.levels,
    tp.hourly_rate, tp.avatar_path, tp.screening_status = 'approved' AS verified,
    rv.rating, COALESCE(rv.review_count, 0) AS review_count
"""

# Listed publicly: a finished profile (name, university, subjects, a real bio), not rejected
PUBLIC_WHERE = """
    WHERE TRIM(u.name) <> '' AND TRIM(COALESCE(tp.university, '')) <> ''
      AND TRIM(COALESCE(tp.subjects, '')) <> ''
      AND CHAR_LENGTH(TRIM(COALESCE(tp.about_me, ''))) >= %s
      AND tp.screening_status <> 'rejected'
"""

CONTACT_DETAILS = re.compile(
    r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+'                                     # emails
    r'|(?:https?://|www\.)\S*[^\s.,;:!?)]'                              # links
    r'|\b(?:[\w-]+\.)+(?:com|co\.uk|org|net|io|me|uk)\b(?:/\S*)?'       # bare domains
    r'|\+?\d(?:[\s().-]*\d){9,}',                                       # phone numbers
    re.IGNORECASE,
)

LEVEL_PREFIX = re.compile(r'^(?:i?gcse|a[\s-]?levels?|as[\s-]?levels?|ib)(?:\s+|$)')
ACRONYMS     = {'ict', 'it', 'pe', 're', 'rs', 'dt', 'epq'}
SMALL_WORDS  = {'and', 'of', 'the', 'in', 'for'}


# ── Formatting ────────────────────────────────────────────────────────────────

def slugify(text):
    """'Further Mathematics' → 'further-mathematics' (accents folded, everything else dropped)."""
    ascii_text = unicodedata.normalize('NFKD', text or '').encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', ascii_text.lower().replace('&', ' and ')).strip('-')


LEVEL_SLUGS = {slugify(level): level for level in LEVELS if level != 'Other'}  # gcse, a-level, ib, university


def public_name(name):
    """'oliver grant' → ('Oliver G.', 'Oliver'): the surname never leaves the API."""
    parts = (name or '').split()
    if not parts:
        return 'Tutor', 'Tutor'
    first = parts[0][:1].upper() + parts[0][1:]
    return (first if len(parts) == 1 else f'{first} {parts[-1][:1].upper()}.'), first


def scrub(text, full_name=''):
    """Public text never carries contact details (bookings and messages stay on the platform),
    and the tutor's full name in it shrinks to first name + initial."""
    text = CONTACT_DETAILS.sub('[hidden]', (text or '').strip())
    parts = full_name.split()
    if len(parts) > 1:
        short = public_name(full_name)[0]
        names = '|'.join(r'\s+'.join(map(re.escape, p)) for p in (parts, [parts[0], parts[-1]]))
        text = re.sub(rf'\b(?:{names})\b\.?', lambda _: short, text, flags=re.IGNORECASE)
    return text


def summary(text, limit=160):
    text = ' '.join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(' ', 1)[0].rstrip(',.;:-') + '…'


def subject_label(subject):
    """'further mathematics' → 'Further Mathematics', 'ict' → 'ICT'."""
    words = subject.split()
    return ' '.join(
        w.upper() if w in ACRONYMS else w if i and w in SMALL_WORDS else w[:1].upper() + w[1:]
        for i, w in enumerate(words)
    )


def tutor_subjects(text):
    """Canonical subjects in the tutor's own order, normalised as server/matching.py does
    ('Maths' → 'mathematics'), without level prefixes ('A-level Physics' → 'physics')."""
    out = []
    for piece in (text or '').split(','):
        for subject in sorted(parse_subjects(piece)):
            subject = LEVEL_PREFIX.sub('', subject)
            subject = SUBJECT_ALIASES.get(subject, subject)
            if slugify(subject) and subject not in out:
                out.append(subject)
    return out


def tutor_levels(text):
    """'GCSE, a level' → ['GCSE', 'A-level'], in LEVELS order; 'Other' and unknown values dropped."""
    given = {slugify(level) for level in (text or '').split(',')}
    return [level for slug, level in LEVEL_SLUGS.items() if slug in given]


def public_tutor(row, full=False):
    """The public shape of one tutor — built field by field, never from the row itself."""
    name, first = public_name(row['name'])
    about = scrub(row['about_me'], row['name'])
    tutor = {
        'id':           row['id_tutor'],
        'slug':         f"{row['id_tutor']}-{slugify(name)}".rstrip('-'),
        'name':         name,
        'first_name':   first,
        'university':   row['university'].strip(),
        'course':       (row['course'] or '').strip() or None,
        'subjects':     [{'slug': slugify(s), 'name': subject_label(s)} for s in tutor_subjects(row['subjects'])],
        'levels':       tutor_levels(row['levels']),
        'hourly_rate':  float(row['hourly_rate'] or 0),
        'avatar_url':   row['avatar_url'],
        'verified':     row['verified'],
        'rating':       row['rating'],
        'review_count': int(row['review_count']),
    }
    if full:
        tutor['about'] = about
    else:
        tutor['summary'] = summary(about)
    return tutor


# ── Queries ───────────────────────────────────────────────────────────────────

def load_public_tutors(cur, tutor_id=None):
    """Every publicly listed tutor (or just one), best first: verified, then rating."""
    query = f"SELECT {PUBLIC_COLUMNS} {TUTOR_JOINS} {PUBLIC_WHERE}"
    params = [MIN_ABOUT_CHARS]
    if tutor_id is not None:
        query += " AND tp.id_tutor = %s"
        params.append(tutor_id)
    cur.execute(query, params)
    tutors = [public_tutor(row, full=tutor_id is not None) for row in decorate_tutors(cur.fetchall())]
    tutors = [t for t in tutors if t['subjects']]
    tutors.sort(key=lambda t: (not t['verified'], -smoothed_rating(t['rating'], t['review_count']),
                               -t['review_count'], t['id']))
    return tutors


def public_tutors():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        return load_public_tutors(cur)
    finally:
        cur.close(); conn.close()


def subject_index(tutors):
    """slug → {slug, name, tutor_count, levels: {level: count}} for every subject taught."""
    index = {}
    for t in tutors:
        for s in t['subjects']:
            entry = index.setdefault(s['slug'], {**s, 'tutor_count': 0, 'levels': {}})
            entry['tutor_count'] += 1
            for level in t['levels']:
                entry['levels'][level] = entry['levels'].get(level, 0) + 1
    return index


def find_topic(value, level_value, index):
    """'a-level-physics' / 'Maths' / 'physics' + level → (subject entry | None, level | None).

    A subject may start with a level slug ('gcse-mathematics'); aliases resolve like the
    matching model's ('maths' → mathematics), so the page can redirect to its canonical slug.
    """
    level = LEVEL_SLUGS.get(slugify(level_value))
    slug = slugify(value)
    if not slug:
        return None, level

    def resolve(candidate):
        if candidate in index:
            return index[candidate]
        names = tutor_subjects(candidate.replace('-', ' '))
        return index.get(slugify(names[0])) if names else None

    if slug in index:
        return index[slug], level
    for level_slug, name in LEVEL_SLUGS.items():
        if slug.startswith(f'{level_slug}-'):
            subject = resolve(slug[len(level_slug) + 1:])
            if subject:
                return subject, name
    return resolve(slug), level


def level_ref(level):
    return {'slug': slugify(level), 'name': level} if level else None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@bp.after_request
def cache_public(response):
    # Same answer for every visitor: let the CDN keep it briefly so crawlers don't each hit MySQL.
    if response.status_code == 200:
        response.headers.setdefault('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return response


@bp.route('/public/tutors', methods=['GET'])
def list_public_tutors():
    """Public directory. `subject`: slug or name, optionally level-first ('a-level-physics');
    `level`: GCSE / A-level / IB / University; `university`: part of the name; `page`: 1-based."""
    tutors = public_tutors()
    index = subject_index(tutors)
    subject, level = find_topic(request.args.get('subject', ''), request.args.get('level', ''), index)
    university = request.args.get('university', '').strip().lower()

    if request.args.get('subject', '').strip() and subject is None:
        tutors = []                    # unknown subject: nobody teaches it (yet)
    if subject:
        tutors = [t for t in tutors if any(s['slug'] == subject['slug'] for s in t['subjects'])]
    if level:
        tutors = [t for t in tutors if level in t['levels']]

    # University choices for the current subject/level, before the university filter itself
    universities = {}
    for t in tutors:
        key = t['university'].lower()
        name, count = universities.get(key, (t['university'], 0))
        universities[key] = (name, count + 1)

    if university:
        tutors = [t for t in tutors if university in t['university'].lower()]

    total = len(tutors)
    pages = max(1, math.ceil(total / PAGE_SIZE))
    page = min(max(request.args.get('page', 1, type=int), 1), pages)
    rates = [t['hourly_rate'] for t in tutors]
    return jsonify({
        'tutors':         tutors[(page - 1) * PAGE_SIZE:page * PAGE_SIZE],
        'total':          total,
        'page':           page,
        'pages':          pages,
        'page_size':      PAGE_SIZE,
        'subject':        {'slug': subject['slug'], 'name': subject['name']} if subject else None,
        'level':          level_ref(level),
        'rates':          {'from': min(rates), 'to': max(rates)} if rates else None,
        'verified_count': sum(t['verified'] for t in tutors),
        'universities':   [{'name': name, 'tutor_count': count}
                           for name, count in sorted(universities.values(), key=lambda u: (-u[1], u[0].lower()))],
    })


@bp.route('/public/tutors/<int:tutor_id>', methods=['GET'])
def get_public_tutor(tutor_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        found = load_public_tutors(cur, tutor_id)
        if not found:
            return jsonify({'error': 'Tutor not found'}), 404
        tutor = found[0]
        cur.execute("""
            SELECT r.rating, r.comment, r.created_at, su.name AS reviewer, tu.name AS tutor
            FROM reviews r
            JOIN users su ON su.id_user = r.student_user_id
            JOIN tutor_profiles tp ON tp.id_tutor = r.tutor_id
            JOIN users tu ON tu.id_user = tp.id_user
            WHERE r.tutor_id = %s AND TRIM(COALESCE(r.comment, '')) <> ''
            ORDER BY r.created_at DESC, r.id DESC
            LIMIT %s
        """, (tutor_id, RECENT_REVIEWS))
        tutor['reviews'] = [{
            'rating':   int(r['rating']),
            'comment':  scrub(scrub(r['comment'], r['tutor']), r['reviewer']),
            'date':     r['created_at'].date() if r['created_at'] else None,
            'reviewer': public_name(r['reviewer'])[0],
        } for r in cur.fetchall()]
        return jsonify({'tutor': tutor})
    finally:
        cur.close(); conn.close()


@bp.route('/public/subjects', methods=['GET'])
def list_public_subjects():
    """Every subject a public tutor teaches, most tutors first, with the per-level pages."""
    subjects = sorted(subject_index(public_tutors()).values(), key=lambda s: (-s['tutor_count'], s['name']))
    return jsonify({'subjects': [{
        'slug':        s['slug'],
        'name':        s['name'],
        'tutor_count': s['tutor_count'],
        'levels':      [{'slug': f"{slugify(level)}-{s['slug']}", 'level': level, 'tutor_count': s['levels'][level]}
                        for level in LEVEL_SLUGS.values() if level in s['levels']],
    } for s in subjects]})


@bp.route('/public/sitemap.xml', methods=['GET'])
def sitemap():
    """Marketing pages, every public tutor and every subject (and subject + level) page."""
    tutors = public_tutors()
    index = subject_index(tutors)
    paths = [*STATIC_PAGES, *(f"/tutors/{t['slug']}" for t in sorted(tutors, key=lambda t: t['id']))]
    for slug in sorted(index):
        paths.append(f'/subjects/{slug}')
        paths += [f'/subjects/{slugify(level)}-{slug}' for level in LEVEL_SLUGS.values() if level in index[slug]['levels']]

    base = Config.FRONTEND_URL.rstrip('/')
    body = '\n'.join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        *(f'  <url><loc>{escape(base + path)}</loc></url>' for path in paths),
        '</urlset>',
        '',
    ])
    return Response(body, mimetype='application/xml', headers={'Cache-Control': 'public, max-age=3600, s-maxage=3600'})


# Vercel passes the visitor's path to the function, so the /sitemap.xml rewrite arrives
# here as /sitemap.xml — serve it at the site root as well as under /api/public.
bp.record_once(lambda state: state.app.add_url_rule('/sitemap.xml', 'public_sitemap_root', sitemap))
