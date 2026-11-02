"""Referrals: invite codes, signing up through a link, booking-fee credits (spent, given back,
earned once per family, capped) and XP for tutors who bring in tutors. Stripe is the fake from
test_payments.py; nothing leaves the machine."""
import pytest

from server.referrals import CODE_ALPHABET, CODE_LENGTH, MAX_EARNED_CREDITS, TUTOR_REFERRAL_XP, mailbox
from server.routes import payments
from tests.support import ADMIN_SECRET, Person, iso, local
from tests.test_payments import FakeStripe

ADMIN = {'X-Admin-Secret': ADMIN_SECRET}


@pytest.fixture
def stripe(monkeypatch):
    fake = FakeStripe()
    monkeypatch.setattr(payments, 'stripe', fake)
    monkeypatch.setattr(payments, 'stripe_enabled', lambda: True)
    return fake


# ── Helpers ───────────────────────────────────────────────────────────────────

def code_of(api, person):
    return api.get('/api/referrals', user=person).get_json()['code']


def summary(api, person):
    return api.get('/api/referrals', user=person).get_json()


def sign_up(api, db, code, email='sam@example.com', name='Sam Lee'):
    """Register the way the sign-up page does, with the code from the invite link."""
    assert api.post('/api/auth/send-verification', json={'email': email}).status_code == 200
    otp = db.value('SELECT code FROM email_verifications WHERE email = %s', (email.lower(),))
    return api.post('/api/auth/register', json={
        'name': name, 'email': email, 'password': 'a-long-password', 'verification_code': otp,
        'referral_code': code,
    })


def joined(api, db, code, **kwargs):
    """A family that signed up through an invite link."""
    res = sign_up(api, db, code, **kwargs)
    assert res.status_code == 201, res.get_json()
    user = res.get_json()['user']
    student_id = db.value('SELECT id_student FROM student_profiles WHERE id_user = %s', (user['id'],))
    return Person(user['id'], user['name'], user['email'], student_id)


def book(api, student, tutor, *, days=3, weeks=1, **extra):
    res = api.post('/api/events', user=student, json={
        'tutor_id': tutor.tutor_id, 'title': 'Mechanics', 'repeat_weeks': weeks,
        'start_time': iso(local(days, hour=17)), 'end_time': iso(local(days, hour=18)), **extra})
    assert res.status_code == 201, res.get_json()
    return res.get_json()['events']


def fees(db, ids):
    rows = db.all(f"SELECT booking_fee, fee_waived FROM events WHERE id_event IN ({', '.join(['%s'] * len(ids))})"
                  " ORDER BY start_time", tuple(ids))
    return [(float(r['booking_fee']), float(r['fee_waived'])) for r in rows]


def pay(api, stripe, student, tutor, event_id):
    """The tutor confirms, Stripe confirms the checkout and the family comes back to the site."""
    api.put(f'/api/events/{event_id}/status', user=tutor, json={'status': 'confirmed'})
    stripe.sessions[f'cs_{event_id}'] = {'mode': 'payment', 'payment_status': 'paid',
                                         'metadata': {'event_id': str(event_id), 'user_id': str(student.id)}}
    res = api.post(f'/api/payments/verify/{event_id}', user=student, json={'session_id': f'cs_{event_id}'})
    assert res.status_code == 200, res.get_json()


@pytest.fixture
def invited(api, db, make):
    """Maya invited Sam, who signed up with her link and is connected to Oliver (£22/hour)."""
    maya, oliver = make.user('Maya Patel', email='maya@example.com'), make.tutor('Oliver Grant', rate=22)
    sam = joined(api, db, code_of(api, maya))
    make.connect(sam, oliver)
    make.connect(maya, oliver)
    return maya, sam, oliver


# ── Codes ─────────────────────────────────────────────────────────────────────

class TestCodes:
    def test_everyone_gets_a_code_on_their_first_visit(self, api, db, make):
        maya, sam = make.user('Maya Patel'), make.user('Sam Lee')
        assert db.value('SELECT referral_code FROM users WHERE id_user = %s', (maya.id,)) is None

        code = code_of(api, maya)
        assert len(code) == CODE_LENGTH and set(code) <= set(CODE_ALPHABET)
        assert db.value('SELECT referral_code FROM users WHERE id_user = %s', (maya.id,)) == code
        assert code_of(api, maya) == code
        assert code_of(api, sam) not in (None, code)

    def test_the_lookup_shows_only_a_first_name(self, api, make):
        maya = make.user('Maya Patel', email='maya@example.com')
        code = code_of(api, maya)
        for typed in (code, code.lower(), f'  {code} '):
            res = api.get('/api/referrals/lookup', query_string={'code': typed})  # no login needed
            assert res.status_code == 200
            assert res.get_json() == {'first_name': 'Maya'}

    @pytest.mark.parametrize('code', ['', 'ABCDEFGH', 'ABCDEF0O', 'ABCDEFGHJ', "' OR 1=1 --"])
    def test_unknown_codes_are_not_found(self, api, make, code):
        make.user('Maya Patel')
        assert api.get('/api/referrals/lookup', query_string={'code': code}).status_code == 404

    def test_lookups_are_rate_limited(self, api):
        for _ in range(60):
            api.get('/api/referrals/lookup?code=ABCDEFGH')
        assert api.get('/api/referrals/lookup?code=ABCDEFGH').status_code == 429

    def test_the_page_needs_a_login(self, api):
        assert api.get('/api/referrals').status_code == 401


# ── Signing up ────────────────────────────────────────────────────────────────

class TestSignUp:
    def test_a_code_links_the_inviter_and_waives_the_first_booking_fee(self, api, db, make):
        maya = make.user('Maya Patel')
        res = sign_up(api, db, code_of(api, maya))

        assert res.status_code == 201
        assert res.get_json()['invited_by'] == 'Maya'
        sam_id = res.get_json()['user']['id']
        assert db.value('SELECT referred_by FROM users WHERE id_user = %s', (sam_id,)) == maya.id
        assert db.all('SELECT user_id, referred_id, kind, event_id FROM referral_rewards') == [
            {'user_id': sam_id, 'referred_id': sam_id, 'kind': 'welcome', 'event_id': None}]
        assert summary(api, Person(sam_id, 'Sam Lee', 'sam@example.com'))['credits'] == 1

    def test_unknown_codes_are_ignored(self, api, db):
        res = sign_up(api, db, 'ABCDEFGH')
        assert res.status_code == 201
        assert res.get_json()['invited_by'] is None
        assert db.value('SELECT referred_by FROM users') is None
        assert db.value('SELECT COUNT(*) FROM referral_rewards') == 0

    @pytest.mark.parametrize('email', ['maya.patel@gmail.com', 'MayaPatel+sws@gmail.com', 'mayapatel@googlemail.com'])
    def test_inviting_yourself_is_ignored(self, api, db, make, email):
        maya = make.user('Maya Patel', email='mayapatel@gmail.com')
        res = sign_up(api, db, code_of(api, maya), email=email, name='Maya Patel')
        assert res.status_code == 201
        assert res.get_json()['invited_by'] is None
        assert db.value('SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL') == 0
        assert db.value('SELECT COUNT(*) FROM referral_rewards') == 0

    def test_an_email_that_already_has_an_account_is_never_linked(self, api, db, make):
        maya = make.user('Maya Patel')
        code = code_of(api, maya)
        assert api.post('/api/auth/send-verification', json={'email': 'sam@example.com'}).status_code == 200
        otp = db.value('SELECT code FROM email_verifications')
        sam = make.user('Sam Lee', email='sam@example.com')  # registered elsewhere in the meantime

        res = api.post('/api/auth/register', json={
            'name': 'Sam Lee', 'email': 'sam@example.com', 'password': 'a-long-password',
            'verification_code': otp, 'referral_code': code})
        assert res.status_code == 409
        assert db.value('SELECT referred_by FROM users WHERE id_user = %s', (sam.id,)) is None
        assert db.value('SELECT COUNT(*) FROM referral_rewards') == 0

    def test_mailbox(self):
        assert mailbox(' Maya.P+sws@GoogleMail.com ') == 'mayap@gmail.com'
        assert mailbox('maya.p+sws@school.ac.uk') == 'maya.p@school.ac.uk'  # dots only matter to Gmail


# ── Spending credits ──────────────────────────────────────────────────────────

class TestCredits:
    def test_the_first_booking_has_no_fee_and_the_next_one_does(self, api, db, invited):
        _, sam, oliver = invited
        assert api.get(f'/api/tutors/{oliver.tutor_id}/booking-info', user=sam).get_json()['fee_credits'] == 1

        first = book(api, sam, oliver)[0]
        assert (first['amount'], first['booking_fee'], first['fee_waived']) == (22, 0, 1.1)
        assert db.value('SELECT event_id FROM referral_rewards') == first['id_event']
        assert summary(api, sam)['credits'] == 0

        second = book(api, sam, oliver, days=4)[0]
        assert (second['booking_fee'], second['fee_waived']) == (1.1, 0)
        listed = {e['id_event']: e for e in api.get('/api/payments?role=student', user=sam).get_json()['events']}
        assert listed[first['id_event']]['fee_waived'] == 1.1

    def test_credits_pay_for_the_first_weeks_of_a_series(self, api, db, invited):
        _, sam, oliver = invited
        db.run("INSERT INTO referral_rewards (user_id, referred_id, kind) VALUES (%s, 99, 'family')", (sam.id,))
        weeks = book(api, sam, oliver, weeks=3)
        assert fees(db, [w['id_event'] for w in weeks]) == [(0, 1.1), (0, 1.1), (1.1, 0)]
        assert summary(api, sam)['credits'] == 0

    def test_free_intro_calls_keep_the_credit(self, api, db, invited):
        _, sam, oliver = invited
        intro = book(api, sam, oliver, kind='intro')[0]
        assert (intro['amount'], intro['booking_fee'], intro['fee_waived']) == (0, 0, 0)
        assert summary(api, sam)['credits'] == 1

    def test_a_session_the_tutor_schedules_uses_the_familys_credit(self, api, db, invited):
        _, sam, oliver = invited
        res = api.post('/api/events', user=oliver, json={
            'student_id': sam.student_id, 'start_time': iso(local(3)), 'end_time': iso(local(3, hour=18))})
        assert res.status_code == 201
        assert (res.get_json()['event']['booking_fee'], res.get_json()['event']['fee_waived']) == (0, 1.1)

    def test_checkout_has_no_fee_line_and_says_why(self, api, db, invited, stripe):
        _, sam, oliver = invited
        event_id = book(api, sam, oliver)[0]['id_event']
        api.put(f'/api/events/{event_id}/status', user=oliver, json={'status': 'confirmed'})

        assert api.post(f'/api/payments/checkout/{event_id}', user=sam).status_code == 200
        (line,) = stripe.created[0]['line_items']
        assert line['price_data']['unit_amount'] == 2200
        assert line['price_data']['product_data'] == {
            'name': 'Mechanics with Oliver Grant',
            'description': 'Booking fee of £1.10 waived with an invite credit'}


class TestCreditsComeBack:
    def test_withdrawing_the_request_gives_the_credit_back(self, api, db, invited):
        _, sam, oliver = invited
        event_id = book(api, sam, oliver)[0]['id_event']
        assert api.put(f'/api/events/{event_id}/status', user=sam, json={'status': 'canceled'}).status_code == 200
        assert db.one('SELECT event_id, used_at FROM referral_rewards') == {'event_id': None, 'used_at': None}
        assert summary(api, sam)['credits'] == 1

        again = book(api, sam, oliver, days=5)[0]
        assert (again['booking_fee'], again['fee_waived']) == (0, 1.1)

    def test_a_declined_or_cancelled_session_gives_the_credit_back(self, api, db, invited):
        _, sam, oliver = invited
        declined = book(api, sam, oliver)[0]['id_event']
        api.put(f'/api/events/{declined}/status', user=oliver, json={'status': 'canceled'})
        assert summary(api, sam)['credits'] == 1

        confirmed = book(api, sam, oliver, days=5)[0]['id_event']
        api.put(f'/api/events/{confirmed}/status', user=oliver, json={'status': 'confirmed'})
        assert summary(api, sam)['credits'] == 0
        api.put(f'/api/events/{confirmed}/status', user=oliver, json={'status': 'canceled'})
        assert summary(api, sam)['credits'] == 1

    def test_cancelling_a_series_gives_every_credit_back(self, api, db, invited):
        _, sam, oliver = invited
        db.run("INSERT INTO referral_rewards (user_id, referred_id, kind) VALUES (%s, 99, 'family')", (sam.id,))
        first = book(api, sam, oliver, weeks=3)[0]['id_event']
        assert summary(api, sam)['credits'] == 0
        api.put(f'/api/events/{first}/status', user=sam, json={'status': 'canceled', 'scope': 'series'})
        assert summary(api, sam)['credits'] == 2

    def test_a_request_that_expired_unanswered_frees_its_credit(self, api, db, invited):
        _, sam, oliver = invited
        event_id = book(api, sam, oliver)[0]['id_event']
        db.run('UPDATE events SET start_time = %s, end_time = %s WHERE id_event = %s',
               (local(-1), local(-1, hour=18), event_id))
        assert summary(api, sam)['credits'] == 1

        again = book(api, sam, oliver, days=5)[0]
        assert (again['booking_fee'], again['fee_waived']) == (0, 1.1)
        assert db.value('SELECT event_id FROM referral_rewards') == again['id_event']

    def test_a_paid_session_keeps_its_credit(self, api, db, invited, stripe):
        _, sam, oliver = invited
        event_id = book(api, sam, oliver)[0]['id_event']
        pay(api, stripe, sam, oliver, event_id)
        assert api.put(f'/api/events/{event_id}/status', user=sam, json={'status': 'canceled'}).status_code == 400
        assert db.value("SELECT event_id FROM referral_rewards WHERE kind = 'welcome'") == event_id
        assert summary(api, sam)['credits'] == 0


# ── Earning credits ───────────────────────────────────────────────────────────

class TestEarning:
    def test_the_inviter_earns_a_credit_when_the_first_session_is_paid(self, api, db, invited, stripe):
        maya, sam, oliver = invited
        event_id = book(api, sam, oliver)[0]['id_event']
        api.put(f'/api/events/{event_id}/status', user=oliver, json={'status': 'confirmed'})
        assert summary(api, maya)['credits'] == 0  # booked and confirmed isn't enough

        pay(api, stripe, sam, oliver, event_id)
        assert db.all("SELECT user_id, referred_id FROM referral_rewards WHERE kind = 'family'") == [
            {'user_id': maya.id, 'referred_id': sam.id}]
        assert summary(api, maya)['credits'] == 1
        assert summary(api, maya)['earned'] == 1

    def test_the_inviters_credit_waives_their_next_fee(self, api, db, invited, stripe):
        maya, sam, oliver = invited
        assert book(api, maya, oliver)[0]['booking_fee'] == 1.1  # nothing earned yet
        pay(api, stripe, sam, oliver, book(api, sam, oliver, days=4)[0]['id_event'])

        later = book(api, maya, oliver, days=5)[0]
        assert (later['booking_fee'], later['fee_waived']) == (0, 1.1)

    def test_one_reward_per_family(self, api, db, invited, stripe):
        maya, sam, oliver = invited
        first, second = (book(api, sam, oliver, days=d)[0]['id_event'] for d in (3, 4))
        pay(api, stripe, sam, oliver, first)
        pay(api, stripe, sam, oliver, second)
        # Stripe's webhook recording the same payment again changes nothing either
        with api.app.app_context():
            conn = payments.get_db(); cur = conn.cursor()
            assert payments.mark_event_paid(cur, first, sam.id)
            conn.commit(); cur.close(); conn.close()
        assert db.value("SELECT COUNT(*) FROM referral_rewards WHERE kind = 'family'") == 1
        assert summary(api, maya)['earned'] == 1

    def test_families_nobody_invited_earn_nobody_anything(self, api, db, make, stripe):
        lee, oliver = make.user('Lee Chan'), make.tutor('Oliver Grant')
        make.connect(lee, oliver)
        pay(api, stripe, lee, oliver, book(api, lee, oliver)[0]['id_event'])
        assert db.value('SELECT COUNT(*) FROM referral_rewards') == 0

    def test_earned_credits_are_capped(self, api, db, invited, stripe):
        maya, sam, oliver = invited
        for n in range(MAX_EARNED_CREDITS):
            db.run("INSERT INTO referral_rewards (user_id, referred_id, kind) VALUES (%s, %s, 'family')",
                   (maya.id, 1000 + n))
        pay(api, stripe, sam, oliver, book(api, sam, oliver)[0]['id_event'])

        assert db.value("SELECT COUNT(*) FROM referral_rewards WHERE kind = 'family'") == MAX_EARNED_CREDITS
        mine = summary(api, maya)
        assert (mine['earned'], mine['cap']) == (MAX_EARNED_CREDITS, MAX_EARNED_CREDITS)
        assert {p['name']: p['stage'] for p in mine['invited']} == {'Sam L.': 'paid'}

    def test_the_invite_list(self, api, db, make, invited, stripe):
        maya, sam, oliver = invited
        joined(api, db, code_of(api, maya), email='lee@example.com', name='Lee')
        pay(api, stripe, sam, oliver, book(api, sam, oliver)[0]['id_event'])

        mine = summary(api, maya)
        assert [(p['name'], p['tutor'], p['stage']) for p in mine['invited']] == [
            ('Lee', False, 'joined'), ('Sam L.', False, 'credit')]
        assert 'sam@example.com' not in str(mine) and 'Sam Lee' not in str(mine)
        assert summary(api, sam)['invited'] == []


# ── Tutors bringing in tutors ─────────────────────────────────────────────────

def tutor_joins(api, db, make, code, email='priya@example.com'):
    """Priya signs up with the link and applies to tutor: screening pending, a DBS check submitted."""
    priya = joined(api, db, code, email=email, name='Priya Shah')
    tutor_id = db.run("INSERT INTO tutor_profiles (id_user, screening_status) VALUES (%s, 'pending')", (priya.id,))
    check_id = db.run("""
        INSERT INTO background_checks (tutor_id, check_type, certificate_last4, issue_date, legal_name,
                                       on_update_service, consent_at, status, submitted_at)
        VALUES (%s, 'enhanced_barred', '4321', CURDATE() - INTERVAL 30 DAY, 'Priya Shah', 1, NOW(), 'pending', NOW())
    """, (tutor_id,))
    return priya, tutor_id, check_id


def approve(api, tutor_id):
    assert api.post(f'/api/admin/screening/{tutor_id}/approve', headers=ADMIN).status_code == 200


def verify_dbs(api, check_id):
    assert api.post(f'/api/admin/background-checks/{check_id}/verify', headers=ADMIN, json={}).status_code == 200


class TestTutorXP:
    @pytest.mark.parametrize('dbs_first', [False, True])
    def test_a_tutor_earns_xp_once_the_tutor_they_invited_is_approved(self, api, db, make, dbs_first):
        oliver = make.tutor('Oliver Grant')
        _, tutor_id, check_id = tutor_joins(api, db, make, code_of(api, oliver))

        (verify_dbs if dbs_first else approve)(api, check_id if dbs_first else tutor_id)
        assert db.value('SELECT xp FROM users WHERE id_user = %s', (oliver.id,)) == 0  # one step isn't enough
        (approve if dbs_first else verify_dbs)(api, tutor_id if dbs_first else check_id)

        assert db.value('SELECT xp FROM users WHERE id_user = %s', (oliver.id,)) == TUTOR_REFERRAL_XP
        assert api.get('/api/auth/me', user=oliver).get_json()['user']['xp'] == TUTOR_REFERRAL_XP
        mine = summary(api, oliver)
        assert mine['xp'] == TUTOR_REFERRAL_XP
        assert [(p['name'], p['tutor'], p['stage']) for p in mine['invited']] == [('Priya S.', True, 'xp')]

    def test_the_xp_is_earned_once(self, api, db, make):
        oliver = make.tutor('Oliver Grant')
        _, tutor_id, check_id = tutor_joins(api, db, make, code_of(api, oliver))
        approve(api, tutor_id)
        verify_dbs(api, check_id)
        # A new check after the first one is revoked and verified again
        db.run("UPDATE background_checks SET status = 'pending' WHERE id = %s", (check_id,))
        verify_dbs(api, check_id)
        db.run("UPDATE tutor_profiles SET screening_status = 'pending' WHERE id_tutor = %s", (tutor_id,))
        approve(api, tutor_id)
        assert db.value('SELECT xp FROM users WHERE id_user = %s', (oliver.id,)) == TUTOR_REFERRAL_XP
        assert db.value("SELECT COUNT(*) FROM referral_rewards WHERE kind = 'tutor'") == 1

    def test_only_tutors_earn_xp_for_inviting_tutors(self, api, db, make):
        maya = make.user('Maya Patel')
        _, tutor_id, check_id = tutor_joins(api, db, make, code_of(api, maya))
        approve(api, tutor_id)
        verify_dbs(api, check_id)
        assert db.value('SELECT xp FROM users WHERE id_user = %s', (maya.id,)) == 0
        assert [p['stage'] for p in summary(api, maya)['invited']] == ['approved']

    def test_no_xp_until_the_dbs_check_is_verified(self, api, db, make):
        oliver = make.tutor('Oliver Grant')
        _, tutor_id, _ = tutor_joins(api, db, make, code_of(api, oliver))
        approve(api, tutor_id)
        assert db.value('SELECT xp FROM users WHERE id_user = %s', (oliver.id,)) == 0
        assert [p['stage'] for p in summary(api, oliver)['invited']] == ['joined']
