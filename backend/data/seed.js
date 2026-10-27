export const profile = {
  name: 'Mannan Sheth',
  introduction: 'I build software that makes complex workflows easier to use.',
  interests: 'Product engineering, interactive systems, and applied machine learning.',
  biography:
    'I’m a computer engineering student at MPSTME, NMIMS in Mumbai, graduating in 2028. I enjoy building across the stack, from the interface and API to the data model and automation behind it.\n\nRecently, I worked on a finance management platform at Scientific Scholar. Other projects explore civic reporting, interactive algorithms, and applied machine learning. I’m interested in product engineering and practical uses for AI.',
  location: 'Mumbai, India',
  graduationYear: '2028',
  education:
    'Integrated Diploma + B.Tech, Computer Engineering\nMukesh Patel School of Technology Management & Engineering, NMIMS · Mumbai\nAug 2022 – May 2028 · CGPA: 3.96 / 4.00',
  experience:
    'At Scientific Scholar Pvt. Ltd., I worked on a finance management platform built with C#, ASP.NET Core MVC, and MySQL. It brings billing, invoicing, payroll, royalties, and reporting into a traceable workflow. The project automated calculations and document generation; the reported outcomes were about 15% higher operational efficiency and 10% less billing overhead.',
  skills: [
    'JavaScript',
    'React',
    'Node.js',
    'Express',
    'Python',
    'Flask',
    'C#',
    'ASP.NET Core',
    'Flutter',
    'SQL',
    'MySQL',
    'TensorFlow',
    'PennyLane',
    'NumPy / SciPy',
    'SVM',
    'XGBoost',
    'GitHub Actions',
    'AWS EC2',
    'Linux',
    'NLP',
  ],
  github: 'https://github.com/mannansheth/',
  linkedin: 'https://www.linkedin.com/in/mannan-sheth-9b3b70295/',
  resumeUrl: '/resume.pdf',
  email: '',
};
const base = {
  contribution: '',
  challenges: '',
  learnings: '',
  coverImage: '',
  images: [],
  demoUrl: '',
  status: 'draft',
  featured: false,
  position: 0,
  missingInformation: ['Add your individual contribution, team context, and lessons learned.'],
  suggestedSections: [],
};
export const projects = [
  {
    title: 'Curatus',
    slug: 'curatus',
    tagline: 'A mental-wellbeing app joining reflection with community and therapist workflows.',
    overview:
      'Curatus combines journaling and mood tracking with community conversations and therapist appointment flows. Its React frontend connects to an Express/MySQL API, while a separate Flask service handles sentiment analysis.',
    problem:
      'Personal reflection, peer support, and appointment workflows can be scattered across separate tools. Curatus explores bringing those activities into one connected experience.',
    architecture:
      'A React client communicates with an Express API backed by MySQL. Backend routes cover authentication, journaling, community, therapist profiles, and appointments. Authenticated Socket.IO supports appointment messaging, and a Flask service provides sentiment analysis.',
    technologies: ['React', 'Node.js', 'Express', 'MySQL', 'Flask', 'Socket.IO'],
    features: [
      'Journal entries and mood-tracking screens',
      'Therapist directory and appointment booking flow',
      'Authenticated appointment messaging with Socket.IO',
      'Community conversations and message filtering',
      'Flask sentiment-analysis service',
    ],
    githubRepo: 'Curatus',
    featured: true,
    position: 0,
  },
  {
    title: 'Pathfinder',
    slug: 'pathfinder',
    tagline: 'Build a weighted graph and step through shortest-path algorithms.',
    overview:
      'An interactive graph editor for creating weighted networks, choosing source and destination nodes, and viewing shortest-path algorithm steps. The React interface draws the graph on a canvas and includes playback controls.',
    problem:
      'Algorithm walkthroughs are easier to understand when each node and edge update is visible. Pathfinder lets you build the graph and follow a run instead of only reading the final distance.',
    architecture:
      'A React interface manages graph and playback state, then draws nodes, weighted edges, and algorithm states on a canvas. Dijkstra and Bellman–Ford runs feed play, pause, and reset controls.',
    technologies: ['React', 'JavaScript', 'HTML Canvas'],
    features: [
      'Create and drag graph nodes',
      'Connect nodes with weighted edges',
      'Dijkstra and Bellman–Ford implementations',
      'Source and destination selection',
      'Play, pause, and reset algorithm animations',
      'Negative-weight validation for Dijkstra',
    ],
    githubRepo: 'pathfinder',
    images: ['/images/work/pathfinder.png'],
    featured: true,
    position: 1,
  },
  {
    title: 'AdaptQ',
    slug: 'adaptq',
    tagline: 'Testing bounded PPO corrections to an approved radiotherapy plan.',
    overview:
      'AdaptQ is a Python research prototype for warm-start correction: begin with a fitted baseline fluence, simulate anatomical drift across a treatment course, and compare classical and variational quantum PPO with do-nothing and greedy baselines.',
    problem:
      'A new plan starts from scratch. AdaptQ studies whether a policy can recover plan quality through small, bounded beam-weight changes in a simulated environment. The experiment is exploratory and does not establish clinical performance.',
    architecture:
      'An OpenKBP-Opt loader builds dose-influence matrices and fits baseline fluence. The warm-start environment applies bounded beam-weight actions as anatomy drifts over 30 fractions and five decision points. Classical and quantum PPO share rollout, training, and evaluation utilities; sweep scripts compare correction bounds.',
    technologies: ['Python', 'TensorFlow', 'PennyLane', 'NumPy', 'SciPy'],
    features: [
      'Simulated 30-fraction course with five decision points',
      'Bounded beam-weight actions starting from a fitted baseline plan',
      'Classical PPO and variational quantum PPO under a shared evaluation harness',
      'Do-nothing and greedy baselines',
      'Correction-bound sweep experiment',
    ],
    githubRepo: 'AdaptQ',
    featured: true,
    position: 2,
    missingInformation: [
      'Anatomical drift is simulated; the quantum policy uses a noiseless simulator.',
      'Baseline fluence is fitted rather than delivered clinical fluence.',
      'Add your individual contribution and independently validated experimental findings.',
    ],
  },
  {
    title: 'Reportr',
    slug: 'reportr',
    tagline: 'A Flutter app and Express API for documenting civic issues.',
    overview:
      'ReportR pairs a Flutter mobile client with a Node/Express API and MySQL storage. The repository includes report capture, map browsing, community reports, issue verification, resolution workflows, and PDF generation.',
    problem:
      'Civic reports need clear evidence and a way to follow what happens after submission. ReportR brings capture, location, status, and community workflows into one mobile service.',
    architecture:
      'The Flutter app handles camera input, report details, maps, and multilingual screens. An Express API exposes user, report, and community routes backed by MySQL. Maps, push notifications, media delivery, transcription, and Gemini analysis are separate integrations.',
    technologies: ['Flutter', 'Dart', 'Node.js', 'Express', 'MySQL'],
    features: [
      'Camera-based issue reports with photo evidence',
      'Map browsing and report-status views',
      'Issue analysis and verification services',
      'Community and resolution workflows',
      'Multilingual interfaces and generated report PDFs',
    ],
    githubRepo: 'sih2025-Reportr',
    position: 4,
    status: 'published',
  },
  {
    title: 'Wordle Clone',
    slug: 'wordle',
    tagline: 'A React word puzzle with physical and on-screen keyboard input.',
    overview:
      'A compact React implementation of a five-letter word-guessing game, with six guess rows, tile feedback, and a reusable on-screen keyboard.',
    problem:
      'The main state challenge is keeping guess rows, validation, and per-key feedback synchronized as input arrives from either the physical or on-screen keyboard.',
    architecture:
      'The interface separates the game, guess rows, keyboard, and individual keys into React components. Game state drives both the board feedback and the status shown for each keyboard key.',
    challenges:
      'Handling both physical and on-screen input while keeping valid guesses, tile feedback, and keyboard state in sync.',
    technologies: ['JavaScript', 'React', 'HTML', 'CSS'],
    features: [
      'Six-row guessing board with letter-state feedback',
      'Physical keyboard and clickable on-screen keyboard',
      'Reusable row and key components',
    ],
    images: ['/images/work/wordle.png'],
    githubRepo: 'wordle',
    demoUrl: 'https://mannansheth.github.io/wordle/',
    position: 3,
    status: 'published',
  },
  {
    title: 'RecipeVerse',
    slug: 'recipeverse',
    tagline: 'Recipes from a prompt to a narrated video.',
    overview:
      'RecipeVerse combines a React client with a Node/Express API and Python/Flask services. It uses locally hosted Mistral through Ollama for recipe generation and nutrition analysis, then uses Coqui TTS and MoviePy to turn recipes into narrated videos.',
    problem:
      'The app brings recipe discovery, personal recipes, and assisted recipe creation into one experience.',
    architecture:
      'The React client provides discovery, filter, detail, and profile views. Express handles accounts, reviews, and collections with MySQL. Flask coordinates recipe generation and nutrition analysis, while Ollama serves Mistral locally; Coqui TTS and MoviePy form the narration pipeline.',
    technologies: [
      'React',
      'Node.js',
      'Express',
      'Python',
      'Flask',
      'MySQL',
      'Ollama',
      'Mistral',
      'Coqui TTS',
      'MoviePy',
    ],
    features: [
      'Recipe browsing and filtering components',
      'Personal recipes and generated recipe collections',
      'Recipe reviews, registration, and authentication',
      'Locally hosted recipe generation and nutrition analysis',
      'Narrated recipe videos from Coqui TTS and MoviePy',
    ],
    githubRepo: 'recipeVerse',
    position: 5,
    status: 'published',
  },
].map((p) => ({
  ...base,
  ...p,
  status: p.status || (p.position < 3 ? 'published' : 'draft'),
  githubOwner: 'mannansheth',
  repositoryUrl: `https://github.com/mannansheth/${p.githubRepo}`,
}));
