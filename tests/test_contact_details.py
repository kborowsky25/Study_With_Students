"""The contact-detail guard: phone numbers, emails and off-platform handles are hidden, and
everyday tutoring talk (times, prices, dates, exam codes, maths) passes through untouched.

Pure unit tests: no database.
"""
import pytest

from server.contact_details import PLACEHOLDER, find_contact_details, hide_contact_details


def hidden(text):
    return hide_contact_details(text)[0]


def kinds(text):
    return hide_contact_details(text)[1]


# ── Hidden ────────────────────────────────────────────────────────────────────

PHONES = [
    '07700 900123',
    '07700900123',
    '07700 900 123',
    '07700-900-123',
    '07700.900.123',
    '077 009 001 23',
    '0 7 7 0 0 9 0 0 1 2 3',
    '0-7-7-0-0-9-0-0-1-2-3',
    '+44 7700 900123',
    '+447700900123',
    '+44 (0)7700 900123',
    '0044 7700 900123',
    '(020) 7946 0958',
    '020 7946 0958',
    '0207 946 0958',
    '01632 960983',
    '0161 496 0000',
    '+1 202 555 0143',
    '+1 (202) 555-0143',
    '(202) 555-0143',
    '202-555-0143',
    '+33 6 12 34 56 78',
    '+353 85 123 4567',
    '+44-7700-900123',
    '+4 4 7 7 0 0 9 0 0 1 2 3',
    '00447700900123',
]


@pytest.mark.parametrize('number', PHONES)
def test_phone_numbers_are_hidden(number):
    text = f'Text me on {number} if you can'
    assert hidden(text) == f'Text me on {PLACEHOLDER} if you can'
    assert kinds(text) == ['phone']


@pytest.mark.parametrize('text, expected', [
    ('My number is 07700900123.', f'My number is {PLACEHOLDER}.'),
    ('07700 900123', PLACEHOLDER),
    ('call 07700900123!', f'call {PLACEHOLDER}!'),
    ('Ring me (07700 900123) after school', f'Ring me ({PLACEHOLDER}) after school'),
    ('See you at 17:30 07700 900123', f'See you at 17:30 {PLACEHOLDER}'),
    ('tel:07700900123', f'tel:{PLACEHOLDER}'),
    ('Mob07700900123', f'Mob{PLACEHOLDER}'),
    ('1 2 3 07700 900123 4 5 6', f'1 2 3 {PLACEHOLDER} 4 5 6'),
    ('zero seven seven zero zero nine zero zero one two three', PLACEHOLDER),
    ('oh seven seven oh oh nine oh oh one two three', PLACEHOLDER),
    ('Zero 7 7 0 0, 9 0 0 1 2 3', PLACEHOLDER),
    ('07700 900123 or 07700 900456', f'{PLACEHOLDER} or {PLACEHOLDER}'),
    ('Call me\n07700 900123', f'Call me\n{PLACEHOLDER}'),
])
def test_phone_numbers_in_context(text, expected):
    assert hidden(text) == expected


EMAILS = [
    'maya.patel@gmail.com',
    'maya_p+tutor@school.ac.uk',
    'Maya.Patel@Example.co.uk',
    'maya @ gmail . com',
    'maya @gmail.com',
    'maya [at] gmail [dot] com',
    'maya(at)gmail(dot)co(dot)uk',
    'maya{at}gmail.com',
    'maya [@] gmail.com',
    'maya at gmail dot com',
    'maya.patel at hotmail dot co dot uk',
    'maya at gmail.com',
    'maya@gmail',
    'maya@icloud',
    'MAYA@GMAIL.COM',
    'maya.patel@school.sch.uk',
]


@pytest.mark.parametrize('email', EMAILS)
def test_email_addresses_are_hidden(email):
    text = f'Email {email} with the answers'
    assert hidden(text) == f'Email {PLACEHOLDER} with the answers'
    assert kinds(text) == ['email']


LINKS = [
    'wa.me/447700900123',
    'https://wa.me/447700900123',
    'https://chat.whatsapp.com/AbCdEf123',
    't.me/mayap',
    'https://t.me/mayap',
    'telegram.me/mayap',
    'instagram.com/maya.p',
    'https://www.instagram.com/maya.p/',
    'https://www.snapchat.com/add/mayap',
    'discord.gg/abc123',
    'https://discord.com/invite/abc123',
    'tiktok.com/@maya',
    'facebook.com/maya.patel',
    'm.me/maya.patel',
    'x.com/mayap',
    'linktr.ee/mayap',
]


@pytest.mark.parametrize('link', LINKS)
def test_off_platform_links_are_hidden(link):
    text = f'Find me at {link} later'
    assert hidden(text) == f'Find me at {PLACEHOLDER} later'


@pytest.mark.parametrize('text, expected', [
    ('snap: maya_p', PLACEHOLDER),
    ('Snapchat: mayap', PLACEHOLDER),
    ('my snap is mayap', f'my {PLACEHOLDER}'),
    ('my snap is maya_p23 btw', f'my {PLACEHOLDER} btw'),
    ('add me on snapchat maya_p23', f'add me on {PLACEHOLDER}'),
    ('add me on snap maya.p', f'add me on {PLACEHOLDER}'),
    ('insta @maya.p', PLACEHOLDER),
    ('my insta is @maya.p!', f'my {PLACEHOLDER}!'),
    ('Instagram: maya.p', PLACEHOLDER),
    ('ig: maya.p', PLACEHOLDER),
    ('IG - @mayap', PLACEHOLDER),
    ('find me on tiktok @maya_p', f'find me on {PLACEHOLDER}'),
    ('my telegram is @mayap', f'my {PLACEHOLDER}'),
    ('my telegram is maya_p1', f'my {PLACEHOLDER}'),
    ('discord: maya#1234', PLACEHOLDER),
    ('my discord is maya#1234', f'my {PLACEHOLDER}'),
    ('add maya#1234', f'add {PLACEHOLDER}'),
    ('@maya_p on insta', PLACEHOLDER),
    ('dm @maya.p on snapchat', f'dm {PLACEHOLDER}'),
    ('whatsapp: 07700 900123', PLACEHOLDER),
    ('my whatsapp is 07700900123', f'my {PLACEHOLDER}'),
    ('kik: maya_p', PLACEHOLDER),
    ('wechat id: maya2008', PLACEHOLDER),
    ('Snapchat - maya_p', PLACEHOLDER),
    ('my snapchat is maya.patel and my insta is @maya.p',
     f'my {PLACEHOLDER} and my {PLACEHOLDER}'),
])
def test_handles_are_hidden(text, expected):
    assert hidden(text) == expected
    assert 'handle' in kinds(text) or 'phone' in kinds(text)


def test_several_kinds_in_one_message():
    text = 'Text 07700 900123, email maya@gmail.com or snap: maya_p'
    assert hidden(text) == f'Text {PLACEHOLDER}, email {PLACEHOLDER} or {PLACEHOLDER}'
    assert kinds(text) == ['email', 'handle', 'phone']


def test_spans_point_at_the_details():
    text = 'Call 07700 900123 or email maya@gmail.com'
    assert [(text[start:end], kind) for start, end, kind in find_contact_details(text)] == [
        ('07700 900123', 'phone'), ('maya@gmail.com', 'email'),
    ]


def test_hiding_twice_changes_nothing():
    once = hidden('Call 07700 900123 or snap: maya_p')
    assert hidden(once) == once
    assert kinds(once) == []


# ── Untouched ─────────────────────────────────────────────────────────────────

UNTOUCHED = [
    # times
    'See you at 17:30 tomorrow',
    'Shall we do 5:30pm or 17.30?',
    'Lessons run 07:30-08:30 and 17.30–18.30',
    'Times: 07.30 - 08.30 - 09.30 - 10.30',
    'Meet at 5pm, or at 1700',
    'Slots: 07.00 08.00 09.00 10.00 11.00',
    'Slots: 07:00 08:00 09:00 10:00 11:00',
    'Free 08.00-09.00, 10.00-11.00 and 12.00-13.00',
    # prices
    'Sessions are £22 an hour',
    'That’s £22.50 plus a £1.13 booking fee',
    'The course costs £1,200 or £1200',
    'It was $25.00 or €30',
    # dates and years
    'The exam is on 12/06/2026',
    'Mocks start 2026-06-12',
    'Due 12.06.26 at the latest',
    'Years 2019, 2020 and 2021',
    'In 1066 and 1215',
    'The 2025/26 spec',
    '2019 2020 2021 2022 2023 2024',
    # exam codes, questions and grades
    'Paper 1 is 8300/1H and paper 2 is 8300/2H',
    'Edexcel 9MA0/01, OCR H240/02 and 1MA1/3H',
    'AQA 7357/1 and 8464/P/1H',
    'IGCSE 0580/42 and 0580/22, room 0161',
    'Page 123, question 4b(ii)',
    'Q12(b)(ii) is worth 6 marks',
    'Grade boundaries 7-9 and 4-6',
    'Do questions 1-10 then 20-30',
    'ISBN 978-0-19-852663-6',
    # maths and science
    'Solve x^2 + 3x - 4 = 0',
    'pi is 3.14159265358979',
    'e = 2.718281828459045',
    'Halve it: 0.5 0.25 0.125 0.0625 0.03125',
    'Fibonacci: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55',
    'Fibonacci: 0 1 1 2 3 5 8 13 21 34 55 89',
    'Primes 2 3 5 7 11 13 17 19 23 29 31',
    'Evens 2 4 6 8 10 12 14 16 18 20',
    'Speed of light 299 792 458 m/s',
    'Avogadro is 6.022 x 10^23 or 6.02214076e23',
    'The answer is 1000000000000',
    'Big number: 12345678901234',
    'A 10 digit number like 1234567890',
    'Plot (0, 7) and (7, 0)',
    'IP 192.168.0.100',
    # the platform's own links and teaching links
    'https://meet.jit.si/StudyWithStudents-34-0a1b2c3d4e',
    'Have a look at desmos.com/calculator',
    'Have a look at desmos.com',
    'https://www.physicsandmathstutor.com/maths-revision/',
    'https://docs.google.com/document/d/1AbC/edit',
    'youtube.com/watch?v=dQw4w9WgXcQ',
    'Join zoom.us/j/123456789 at 6',
    # people talking about apps, not sharing a contact
    'I use WhatsApp with my friends',
    'Message me on WhatsApp if you’re late',
    'WhatsApp is better than texting',
    'The Zimmermann telegram is key to this question',
    'Telegram: a message sent by wire',
    'Instagram: owned by Meta since 2012',
    'Signal processing is next week',
    'That was a snap decision',
    'Look at Outlook for the invite',
    'See you @ 5',
    '@Oliver thanks for today!',
    'Email me the answers',
    'My email is broken today',
    'Our school site is at school.ac.uk/maths',
    'Question #1234 on the sheet',
    # numbers next to each other
    'Rooms 101 and 102',
    'Answers: 12 15 18 21 24 27 30 33',
    'Scores went +1 2 3 4 5 6 7 8 9 10',
    'Instagram - owned by Meta',
    'Use 0 1 2 3 in the table',
    '£0.50 each, 0.05 per gram',
    '',
]


@pytest.mark.parametrize('text', UNTOUCHED)
def test_everyday_text_is_untouched(text):
    assert hidden(text) == text
    assert kinds(text) == []
