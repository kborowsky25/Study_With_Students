"""Exam-specification topics that lesson notes and progress are tracked against.

One level of topics per subject, in specification order and worded after the common
English specifications (AQA, Pearson Edexcel, OCR); the A-level Maths list follows the
DfE subject content headings that every board shares.

Keys are stored with every rating, so never rename or reuse one — change the name
instead. Ratings for a key that is later removed are kept but no longer counted.
"""

SUBJECTS = [
    {
        'key': 'gcse-maths', 'level': 'GCSE', 'subject': 'Maths',
        'topics': [
            ('fractions-decimals-percentages', 'Fractions, decimals and percentages'),
            ('factors-multiples-primes',       'Factors, multiples and primes'),
            ('indices-surds-standard-form',    'Indices, surds and standard form'),
            ('rounding-estimation-bounds',     'Rounding, estimation and bounds'),
            ('expanding-factorising',          'Expanding and factorising'),
            ('linear-equations-inequalities',  'Linear equations and inequalities'),
            ('quadratic-equations',            'Quadratic equations'),
            ('simultaneous-equations',         'Simultaneous equations'),
            ('sequences',                      'Sequences'),
            ('graphs',                         'Graphs of functions'),
            ('ratio-proportion',               'Ratio and proportion'),
            ('compound-measures-growth',       'Compound measures, growth and decay'),
            ('angles-polygons',                'Angles and polygons'),
            ('constructions-loci-bearings',    'Constructions, loci and bearings'),
            ('perimeter-area-volume',          'Perimeter, area and volume'),
            ('pythagoras-trigonometry',        'Pythagoras and trigonometry'),
            ('transformations-vectors',        'Transformations and vectors'),
            ('congruence-similarity',          'Congruence and similarity'),
            ('circle-theorems',                'Circle theorems'),
            ('probability',                    'Probability'),
            ('statistics',                     'Statistics and data'),
        ],
    },
    {
        'key': 'alevel-maths', 'level': 'A-level', 'subject': 'Maths',
        'topics': [
            ('proof',                   'Proof'),
            ('algebra-functions',       'Algebra and functions'),
            ('coordinate-geometry',     'Coordinate geometry'),
            ('sequences-series',        'Sequences and series'),
            ('trigonometry',            'Trigonometry'),
            ('exponentials-logarithms', 'Exponentials and logarithms'),
            ('differentiation',         'Differentiation'),
            ('integration',             'Integration'),
            ('numerical-methods',       'Numerical methods'),
            ('vectors',                 'Vectors'),
            ('sampling',                'Statistical sampling'),
            ('data-presentation',       'Data presentation and interpretation'),
            ('probability',             'Probability'),
            ('distributions',           'Statistical distributions'),
            ('hypothesis-testing',      'Statistical hypothesis testing'),
            ('kinematics',              'Kinematics'),
            ('forces-newtons-laws',     "Forces and Newton's laws"),
            ('moments',                 'Moments'),
        ],
    },
    {
        'key': 'gcse-physics', 'level': 'GCSE', 'subject': 'Physics',
        'topics': [
            ('energy-stores-transfers',        'Energy stores and transfers'),
            ('energy-resources',               'Energy resources'),
            ('current-pd-resistance',          'Current, potential difference and resistance'),
            ('series-parallel-circuits',       'Series and parallel circuits'),
            ('mains-electricity',              'Mains electricity and power'),
            ('static-electricity',             'Static electricity'),
            ('particle-model',                 'Particle model of matter'),
            ('atomic-structure-radioactivity', 'Atomic structure and radioactivity'),
            ('forces-interactions',            'Forces and their interactions'),
            ('forces-elasticity',              'Forces and elasticity'),
            ('moments-levers-gears',           'Moments, levers and gears'),
            ('pressure-fluids',                'Pressure in fluids'),
            ('forces-motion',                  'Forces and motion'),
            ('momentum',                       'Momentum'),
            ('waves',                          'Waves'),
            ('electromagnetic-waves',          'Electromagnetic waves'),
            ('magnetism-electromagnetism',     'Magnetism and electromagnetism'),
            ('space-physics',                  'Space physics'),
        ],
    },
    {
        'key': 'alevel-physics', 'level': 'A-level', 'subject': 'Physics',
        'topics': [
            ('measurements-errors',                 'Measurements and their errors'),
            ('particles-radiation',                 'Particles and radiation'),
            ('quantum-phenomena',                   'Quantum phenomena'),
            ('progressive-stationary-waves',        'Progressive and stationary waves'),
            ('refraction-diffraction-interference', 'Refraction, diffraction and interference'),
            ('force-energy-momentum',               'Force, energy and momentum'),
            ('materials',                           'Materials'),
            ('current-electricity',                 'Current electricity'),
            ('circular-motion',                     'Circular motion'),
            ('simple-harmonic-motion',              'Simple harmonic motion'),
            ('thermal-physics',                     'Thermal physics'),
            ('gravitational-fields',                'Gravitational fields'),
            ('electric-fields',                     'Electric fields'),
            ('capacitance',                         'Capacitance'),
            ('magnetic-fields',                     'Magnetic fields and electromagnetic induction'),
            ('nuclear-physics',                     'Nuclear physics'),
            ('astrophysics',                        'Astrophysics'),
        ],
    },
    {
        'key': 'gcse-chemistry', 'level': 'GCSE', 'subject': 'Chemistry',
        'topics': [
            ('atomic-structure-periodic-table', 'Atomic structure and the periodic table'),
            ('bonding-structure',               'Bonding, structure and the properties of matter'),
            ('quantitative-chemistry',          'Quantitative chemistry'),
            ('chemical-changes',                'Chemical changes'),
            ('electrolysis',                    'Electrolysis'),
            ('energy-changes',                  'Energy changes'),
            ('rate-extent',                     'The rate and extent of chemical change'),
            ('organic-chemistry',               'Organic chemistry'),
            ('chemical-analysis',               'Chemical analysis'),
            ('atmosphere',                      'Chemistry of the atmosphere'),
            ('using-resources',                 'Using resources'),
        ],
    },
    {
        'key': 'alevel-chemistry', 'level': 'A-level', 'subject': 'Chemistry',
        'topics': [
            ('atomic-structure',        'Atomic structure'),
            ('amount-of-substance',     'Amount of substance'),
            ('bonding',                 'Bonding'),
            ('energetics',              'Energetics'),
            ('kinetics',                'Kinetics'),
            ('equilibria',              'Chemical equilibria, Kc and Kp'),
            ('redox',                   'Oxidation, reduction and redox equations'),
            ('thermodynamics',          'Thermodynamics'),
            ('rate-equations',          'Rate equations'),
            ('electrode-potentials',    'Electrode potentials and electrochemical cells'),
            ('acids-bases',             'Acids and bases'),
            ('periodicity-groups',      'Periodicity, Group 2 and the halogens'),
            ('transition-metals',       'Transition metals'),
            ('intro-organic',           'Introduction to organic chemistry'),
            ('alkanes-halogenoalkanes', 'Alkanes and halogenoalkanes'),
            ('alkenes-alcohols',        'Alkenes and alcohols'),
            ('carbonyls',               'Aldehydes, ketones and carboxylic acids'),
            ('aromatics-amines',        'Aromatic chemistry and amines'),
            ('polymers-biochemistry',   'Polymers, amino acids and DNA'),
            ('synthesis-analysis',      'Organic synthesis and analysis'),
        ],
    },
    {
        'key': 'gcse-biology', 'level': 'GCSE', 'subject': 'Biology',
        'topics': [
            ('cell-structure',            'Cell structure'),
            ('cell-division',             'Cell division'),
            ('transport-in-cells',        'Transport in cells'),
            ('digestion-enzymes',         'Digestion and enzymes'),
            ('heart-blood',               'The heart and blood'),
            ('non-communicable-diseases', 'Non-communicable diseases'),
            ('plant-organisation',        'Plant tissues, organs and systems'),
            ('communicable-diseases',     'Communicable diseases'),
            ('photosynthesis',            'Photosynthesis'),
            ('respiration',               'Respiration'),
            ('homeostasis-nervous',       'Homeostasis and the nervous system'),
            ('hormonal-coordination',     'Hormonal coordination'),
            ('reproduction-inheritance',  'Reproduction and inheritance'),
            ('variation-evolution',       'Variation and evolution'),
            ('ecosystems',                'Ecosystems and interdependence'),
            ('biodiversity-human-impact', 'Biodiversity and human impact'),
        ],
    },
    {
        'key': 'alevel-biology', 'level': 'A-level', 'subject': 'Biology',
        'topics': [
            ('biological-molecules',  'Biological molecules'),
            ('enzymes',               'Enzymes'),
            ('cell-structure',        'Cell structure'),
            ('membrane-transport',    'Transport across cell membranes'),
            ('cell-cycle',            'Mitosis and the cell cycle'),
            ('immune-system',         'Cell recognition and the immune system'),
            ('gas-exchange',          'Gas exchange'),
            ('mass-transport',        'Mass transport'),
            ('dna-protein-synthesis', 'DNA, genes and protein synthesis'),
            ('genetic-diversity',     'Genetic diversity and adaptation'),
            ('taxonomy-biodiversity', 'Species, taxonomy and biodiversity'),
            ('photosynthesis',        'Photosynthesis'),
            ('respiration',           'Respiration'),
            ('energy-cycles',         'Energy transfer and nutrient cycles'),
            ('nervous-coordination',  'Nervous coordination and muscle contraction'),
            ('homeostasis',           'Homeostasis'),
            ('inheritance',           'Inheritance'),
            ('populations-evolution', 'Populations, evolution and speciation'),
            ('gene-expression',       'Control of gene expression'),
        ],
    },
]

SUBJECTS_BY_KEY = {s['key']: s for s in SUBJECTS}
TOPIC_NAMES = {s['key']: dict(s['topics']) for s in SUBJECTS}
TOPIC_ORDER = {s['key']: {key: i for i, (key, _) in enumerate(s['topics'])} for s in SUBJECTS}


def subject_name(key):
    """'alevel-maths' → 'A-level Maths'; None for subjects outside the catalogue."""
    s = SUBJECTS_BY_KEY.get(key)
    return f"{s['level']} {s['subject']}" if s else None


def topic_name(subject, topic):
    """Display name of a topic, falling back to its key for retired topics."""
    return TOPIC_NAMES.get(subject, {}).get(topic) or topic.replace('-', ' ').capitalize()


def is_topic(subject, topic):
    return topic in TOPIC_NAMES.get(subject, {})


def topic_sort_key(subject, topic):
    """Specification order; retired topics go last."""
    return TOPIC_ORDER.get(subject, {}).get(topic, len(TOPIC_ORDER.get(subject, {})))


def catalogue():
    """The whole catalogue as JSON-ready dicts, GCSE before A-level within each subject."""
    return [
        {
            'key': s['key'], 'name': subject_name(s['key']), 'level': s['level'], 'subject': s['subject'],
            'topics': [{'key': key, 'name': name} for key, name in s['topics']],
        }
        for s in SUBJECTS
    ]
