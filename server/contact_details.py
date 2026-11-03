"""Contact-detail guard for messages between tutors and families.

Finds phone numbers, email addresses and off-platform handles or links (WhatsApp, Snapchat,
Instagram, Telegram…) and replaces each with PLACEHOLDER. The message keeps the original text
for moderation (messages.original_message); everyone else only ever sees the hidden version.

It is tuned to leave ordinary tutoring talk alone: times (17:30), prices (£22.50), dates and
years, exam paper codes (8300/1H), decimals and lists of numbers. The cases are in
tests/test_contact_details.py.
"""
import re

PLACEHOLDER = '[contact details hidden]'

_GAP = r'[^\S\n]*'  # spaces on the same line

# ── Phone numbers ─────────────────────────────────────────────────────────────
# Digits with spaces, dots, hyphens or brackets between them (a leading + or ( included).
# Each run is searched for a stretch shaped like a phone number, so "17:30 07700 900123"
# or a list of numbers with a phone number in it still finds the number.
_NUMBER_RUN = re.compile(r'(?<![\d+])(?:\(?\+|\()?\d(?:[ \t().\-]*\d)+')
_DIGIT_GROUP = re.compile(r'\d+')
_NANP = re.compile(r'\(?\d{3}\)?[ .\-]?\d{3}[ .\-]\d{4}')  # (202) 555-0143
MAX_PHONE_DIGITS = 15


def _phone_shaped(stretch, groups):
    """`stretch`: digits and separators (with any leading + or bracket); `groups`: its digit blocks."""
    digits = ''.join(groups)
    singles = sum(len(g) == 1 for g in groups)
    if stretch.lstrip('(').startswith('+'):          # +44 7700 900123, +33 6 12 34 56 78
        return (10 <= len(digits) <= MAX_PHONE_DIGITS
                and (len(groups) == 1 or singles == len(groups) or (len(groups) <= 7 and singles <= 2)))
    if stretch.startswith('0.'):                       # 0.5 0.25 0.125 are decimals
        return False
    if digits.startswith('00'):                        # 0044 7700 900123, not "00 08.00 09.00"
        return 12 <= len(digits) <= MAX_PHONE_DIGITS and len(groups[0]) >= 3
    if digits.startswith('0') and 10 <= len(digits) <= 11 and digits[1] in '12378':
        # UK: one block, digit by digit, or a 3–5 digit prefix and blocks after it (07700 900 123,
        # 020 7946 0958). Times and lists of small numbers (07.30 - 08.30, 0 1 1 2 3 5 8 13 21)
        # are none of these.
        if len(groups) == 1 or singles == len(groups):
            return True
        return len(groups) <= 5 and 3 <= len(groups[0]) <= 5 and all(len(g) >= 2 for g in groups[1:])
    return bool(_NANP.fullmatch(stretch))


def _phone_spans(text):
    spans = []
    for run in _NUMBER_RUN.finditer(text):
        groups = [(run.start() + m.start(), run.start() + m.end()) for m in _DIGIT_GROUP.finditer(run.group())]
        if sum(end - start for start, end in groups) < 10:
            continue
        blocks = [text[start:end] for start, end in groups]
        i = 0
        while i < len(groups):
            start = run.start() if i == 0 else groups[i][0]
            if i and text[start - 1] == '(':
                start -= 1
            found, count = None, 0
            for j in range(i, len(groups)):  # keep the longest stretch from here that's a number
                count += len(blocks[j])
                if count > MAX_PHONE_DIGITS:
                    break
                if count >= 10 and _phone_shaped(text[start:groups[j][1]], blocks[i:j + 1]):
                    found = j
            if found is None:
                i += 1
                continue
            end = groups[found][1]
            if text[start] == '(' and ')' not in text[start:end]:  # (07700 900123): keep the brackets
                start += 1
            spans.append((start, end, 'phone'))
            i = found + 1
    return spans


_NUMBER_WORD = r'(?:zero|oh|nought|one|two|three|four|five|six|seven|eight|nine|\d)'
# "zero seven seven zero zero nine…": ten or more digits, spelled out, starting with a zero
_SPELLED_PHONE = re.compile(rf'\b(?:zero|oh|nought)\b(?:[\s,.\-]*\b{_NUMBER_WORD}\b){{9,}}', re.I)

# ── Email addresses ───────────────────────────────────────────────────────────
_TLD = r'(?:com|co|uk|org|net|io|me|edu|ac|gov|info|biz|us|ca|au|ie|de|fr|es|it|nl|in|xyz|app|dev|live)'
_MAIL_HOST = (r'(?:gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|aol|protonmail|proton'
              r'|gmx|btinternet|sky)')
_DOT = r'\s*(?:[\[({<]\s*(?:dot|\.)\s*[\])}>]|\bdot\b|\.)\s*'   # . dot [dot] (.)
_DOT_WORD = r'\s*(?:[\[({<]\s*(?:dot|\.)\s*[\])}>]|\bdot\b)\s*'  # dot [dot] (.) — not a plain "."
_AT_BRACKETED = r'\s*[\[({<]\s*(?:at|@)\s*[\])}>]\s*'           # [at] (at) {@}
_LOCAL = r'(?<![\w.+\-])[\w.+\-]+'  # a whole token, so long words are scanned once
_LABEL = r'[\w\-]+'

_EMAILS = [
    re.compile(rf'{_LOCAL}@{_LABEL}(?:\.{_LABEL})*\.[a-z]{{2,}}\b', re.I),                  # maya@gmail.com
    re.compile(rf'{_LOCAL}[^\S\n]+@[^\S\n]*{_LABEL}(?:{_DOT}{_LABEL})*{_DOT}{_TLD}\b', re.I),  # maya @ gmail . com
    re.compile(rf'{_LOCAL}{_AT_BRACKETED}{_LABEL}(?:{_DOT}{_LABEL})*{_DOT}{_TLD}\b', re.I),     # maya [at] gmail.com
    # The plain word "at" only counts with a spelled-out dot or a mail provider, so that
    # "have a look at desmos.com" stays as it is.
    re.compile(rf'{_LOCAL}\s+at\s+{_LABEL}(?:{_DOT}{_LABEL})*{_DOT_WORD}{_TLD}\b', re.I),    # maya at gmail dot com
    re.compile(rf'{_LOCAL}\s+at\s+{_MAIL_HOST}{_DOT}{_TLD}\b', re.I),                       # maya at gmail.com
    re.compile(rf'{_LOCAL}@{_MAIL_HOST}\b', re.I),                                             # maya@gmail
]

# ── Off-platform links and handles ────────────────────────────────────────────
_LINK = re.compile(
    r'(?<![\w.@\-])(?:https?://)?(?:www\.)?'
    r'(?:wa\.me|(?:chat|api)\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.(?:me|dog)|snapchat\.com'
    r'|instagram\.com|instagr\.am|(?:vm\.)?tiktok\.com|discord\.gg|discord(?:app)?\.com/invite'
    r'|facebook\.com|fb\.(?:com|me)|m\.me|messenger\.com|twitter\.com|x\.com|kik\.me'
    r'|signal\.(?:me|group)|wechat\.com|weixin\.qq\.com|(?:join\.)?skype\.com|linktr\.ee|bereal\.com'
    r'|threads\.net)\b(?:/\S*)?',
    re.I,
)

# Names that are only ever the app, and names that are also ordinary words ("the Zimmermann
# telegram", "a snap decision"). After the second kind, a handle has to look like a username,
# except that "my snap is …" and "add me on snap …" are clearly the app.
_APPS = r'whats\s?app|snap\s?chat|insta(?:gram)?|tik\s?tok|discord|kik|we\s?chat|skype|viber|bereal'
_APPS_AMBIGUOUS = r'snap|telegram|messenger|facebook|twitter'
_APPS_AMBIGUOUS_AFTER_INTENT = r'telegram|messenger|facebook|twitter'
_APPS_SHORT = r'ig|sc|wa|tg|fb'
_ANY_APP = rf'(?:{_APPS}|{_APPS_AMBIGUOUS})'

_HANDLE = r'@?[\w.\-#]{2,40}'
_APP_LABEL = r'(?:id|name|user(?:name)?|handle|acc(?:ount)?|number|no\.?)?'
_INTENT = (r'\b(?:my|me\s+on|add\s+me\s+on|follow\s+me\s+on|find\s+me\s+on|dm\s+me\s+on|message\s+me\s+on'
           r'|msg\s+me\s+on|text\s+me\s+on|contact\s+me\s+on|reach\s+me\s+on|chat\s+on|talk\s+on|hmu\s+on)')

# (pattern, which group holds the handle, does the handle always need to look like a username)
_HANDLE_RULES = [
    # snap: maya_p · insta id = maya · discord: maya#1234 · ig: maya.p · snapchat - maya_p
    (re.compile(rf'\b(?:{_APPS}|{_APPS_AMBIGUOUS}|{_APPS_SHORT}){_GAP}{_APP_LABEL}{_GAP}[:=\-]{_GAP}({_HANDLE})', re.I),
     1, False),
    # insta @maya.p · telegram is @mayap · find me on snap @maya
    (re.compile(rf'\b(?:{_ANY_APP}|{_APPS_SHORT}){_GAP}(?:is|-|on)?{_GAP}(@[\w.]{{2,30}})', re.I), 1, False),
    # my snap is mayap · add me on snapchat maya_p23
    (re.compile(rf'{_INTENT}{_GAP}(?:{_APPS}|snap)\b{_GAP}(?:is|:|-|=)?{_GAP}({_HANDLE})', re.I), 1, False),
    (re.compile(rf'{_INTENT}{_GAP}(?:{_APPS_AMBIGUOUS_AFTER_INTENT})\b{_GAP}(?:is|:|-|=)?{_GAP}({_HANDLE})', re.I),
     1, True),
]
# @maya_p on insta
_HANDLE_THEN_APP = re.compile(rf'@[\w.]{{2,30}}{_GAP}(?:on|via){_GAP}(?:{_ANY_APP}|ig|sc)\b', re.I)
# maya#1234 (Discord's old tags)
_DISCORD_TAG = re.compile(r'(?<![\w#])[\w.]{2,32}#\d{4}\b')
_APP_WORD = re.compile(rf'\b(?:{_ANY_APP}|{_APPS_SHORT})\b', re.I)
_USERNAME_CHARS = re.compile(r'[\d_.#@]')
_SENTENCE_END = re.compile(r'[^\S\n]*(?:$|[.!?,;)\n])')


def _handle_spans(text):
    spans = []
    for pattern, group, strict in _HANDLE_RULES:
        for m in pattern.finditer(text):
            handle = m.group(group).rstrip('.-')
            if not handle.lstrip('@'):
                continue
            end = m.start(group) + len(handle)
            # A username has a digit, _ . # or @ in it, or ends the sentence; "whatsapp is
            # better" and "message me on whatsapp if you're late" are just talk.
            looks_like_username = bool(_USERNAME_CHARS.search(handle))
            if not looks_like_username and (strict or not _SENTENCE_END.match(text, end)):
                continue
            app = _APP_WORD.search(text, m.start(), m.start(group))
            spans.append((app.start() if app else m.start(group), end, 'handle'))
    spans += [(m.start(), m.end(), 'handle') for m in _HANDLE_THEN_APP.finditer(text)]
    spans += [(m.start(), m.end(), 'handle') for m in _DISCORD_TAG.finditer(text)]
    return spans


# ── Putting it together ───────────────────────────────────────────────────────

def find_contact_details(text):
    """[(start, end, kind)] for each contact detail in `text`, in order; overlapping finds are
    merged (the first one's kind wins). Kinds: phone, email, link, handle."""
    if not text:
        return []
    spans = _phone_spans(text)
    spans += [(m.start(), m.end(), 'phone') for m in _SPELLED_PHONE.finditer(text)]
    for pattern in _EMAILS:
        spans += [(m.start(), m.end(), 'email') for m in pattern.finditer(text)]
    spans += [(m.start(), m.end(), 'link') for m in _LINK.finditer(text)]
    spans += _handle_spans(text)

    merged = []
    for start, end, kind in sorted(spans):
        if merged and start < merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]), merged[-1][2])
        else:
            merged.append((start, end, kind))
    return merged


def hide_contact_details(text):
    """(text with each contact detail replaced by PLACEHOLDER, sorted kinds that were hidden)."""
    found = find_contact_details(text)
    if not found:
        return text, []
    parts, last = [], 0
    for start, end, _ in found:
        parts += [text[last:start], PLACEHOLDER]
        last = end
    parts.append(text[last:])
    return ''.join(parts), sorted({kind for _, _, kind in found})
