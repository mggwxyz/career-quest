// src/app/_data/items.ts
// SME-rated item bank for the adaptive RIASEC assessment.
// 78 forced-choice pairs. Each option carries RIASEC, work-value, and
// work-context loadings plus a 1..5 desirability rating. See
// docs/superpowers/plans/ and src/lib/assessment/itemBank.ts for the
// validator rules this bank satisfies.

import { Item, Option, RiasecScale } from '@/lib/assessment/types'
import { contrastCategory } from '@/lib/assessment/hexagon'

function topScale(opt: Option): RiasecScale {
  const r = opt.loadings.riasec
  return (['R', 'I', 'A', 'S', 'E', 'C'] as const).reduce(
    (best, s) => (r[s] > r[best] ? s : best),
    'R' as RiasecScale,
  )
}

function buildItem(
  id: string,
  opt1: Option,
  opt2: Option,
  minGradeBand?: Item['minGradeBand'],
): Item {
  const s1 = topScale(opt1)
  const s2 = topScale(opt2)
  return {
    id,
    option1: opt1,
    option2: opt2,
    dimensionContrast: contrastCategory([s1], [s2]),
    primaryScales: [s1, s2],
    ...(minGradeBand ? { minGradeBand } : {}),
  }
}

export const items: Item[] = [
  // ======================================================================
  // OPPOSITE PAIRS — R ↔ S (10 items)
  // ======================================================================
  buildItem(
    'rs-bike-tutor',
    {
      id: 'rs-bike-tutor-1',
      text: 'Fix a broken bicycle',
      imageUrl: '/would-you-rather/images/rs-bike-tutor-1.webp',
      prompt: 'A teen kneeling next to a bicycle with tools spread on the floor, focused on fixing it',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: -1 },
      },
    },
    {
      id: 'rs-bike-tutor-2',
      text: 'Tutor a struggling classmate',
      imageUrl: '/would-you-rather/images/rs-bike-tutor-2.webp',
      prompt: 'A teen helping a classmate at a desk, both looking at a textbook together',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'middle',
  ),
  buildItem(
    'rs-mentor-treehouse',
    {
      id: 'rs-mentor-treehouse-1',
      text: 'Mentor a younger student through a tough week',
      imageUrl: '/would-you-rather/images/rs-mentor-treehouse-1.webp',
      prompt: 'An older teen talking warmly with a younger student on a school bench',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 1 },
      },
    },
    {
      id: 'rs-mentor-treehouse-2',
      text: 'Build a treehouse with hand tools',
      imageUrl: '/would-you-rather/images/rs-mentor-treehouse-2.webp',
      prompt: 'Two teens hammering planks into a half-built treehouse in a backyard',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 0, indoorOutdoor: 2, soloTeam: 0 },
      },
    },
    'middle',
  ),
  buildItem(
    'rs-appliance-counsel',
    {
      id: 'rs-appliance-counsel-1',
      text: 'Repair a broken household appliance',
      imageUrl: '/would-you-rather/images/rs-appliance-counsel-1.webp',
      prompt: 'A young adult unscrewing the back of a toaster at a kitchen table, tools laid out',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'rs-appliance-counsel-2',
      text: 'Lead a peer-counseling group',
      imageUrl: '/would-you-rather/images/rs-appliance-counsel-2.webp',
      prompt: 'A small circle of teens sitting and listening as one facilitates a supportive conversation',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 1, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'rs-coach-3dprint',
    {
      id: 'rs-coach-3dprint-1',
      text: 'Coach a youth sports team after school',
      imageUrl: '/would-you-rather/images/rs-coach-3dprint-1.webp',
      prompt: 'A high-schooler demonstrating a soccer drill to a group of younger kids on a field',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 1, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 2, soloTeam: 2 },
      },
    },
    {
      id: 'rs-coach-3dprint-2',
      text: 'Operate a 3D printer on a custom design',
      imageUrl: '/would-you-rather/images/rs-coach-3dprint-2.webp',
      prompt: 'A teen watching the build plate of a 3D printer as a colorful part prints',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),
  buildItem(
    'rs-firefighter-nurse',
    {
      id: 'rs-firefighter-nurse-1',
      text: 'Train on firefighter rescue drills',
      imageUrl: '/would-you-rather/images/rs-firefighter-nurse-1.webp',
      prompt: 'A firefighter in full gear climbing a ladder during a training exercise',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 1, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 2, indoorOutdoor: 1, soloTeam: 1 },
      },
    },
    {
      id: 'rs-firefighter-nurse-2',
      text: 'Shadow a nurse caring for patients',
      imageUrl: '/would-you-rather/images/rs-firefighter-nurse-2.webp',
      prompt: 'A student observing a nurse at a hospital bedside checking a chart',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -2, soloTeam: 1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'rs-carpentry-teach',
    {
      id: 'rs-carpentry-teach-1',
      text: 'Teach a history lesson to a middle-school class',
      imageUrl: '/would-you-rather/images/rs-carpentry-teach-1.webp',
      prompt: 'A young teacher at the front of a classroom pointing to a timeline on the board',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'rs-carpentry-teach-2',
      text: 'Frame a wall on a carpentry crew',
      imageUrl: '/would-you-rather/images/rs-carpentry-teach-2.webp',
      prompt: 'A carpenter hammering studs into place on a wooden wall frame',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 1, soloTeam: 0 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'rs-mechanic-therapy',
    {
      id: 'rs-mechanic-therapy-1',
      text: 'Work as a car mechanic diagnosing problems',
      imageUrl: '/would-you-rather/images/rs-mechanic-therapy-1.webp',
      prompt: 'A mechanic under the hood of a car running a diagnostic scanner',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    {
      id: 'rs-mechanic-therapy-2',
      text: 'Work as a counselor helping people through problems',
      imageUrl: '/would-you-rather/images/rs-mechanic-therapy-2.webp',
      prompt: 'A counselor in a comfortable office listening attentively to a client',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -2, soloTeam: 1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'rs-gardening-crisis',
    {
      id: 'rs-gardening-crisis-1',
      text: 'Plant and tend a community garden',
      imageUrl: '/would-you-rather/images/rs-gardening-crisis-1.webp',
      prompt: 'A young adult kneeling in a garden bed planting seedlings in rich soil',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 1, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 0, indoorOutdoor: 2, soloTeam: 0 },
      },
    },
    {
      id: 'rs-gardening-crisis-2',
      text: 'Staff a crisis helpline for a few hours',
      imageUrl: '/would-you-rather/images/rs-gardening-crisis-2.webp',
      prompt: 'A volunteer wearing a headset at a quiet desk, listening carefully',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'rs-landscape-socialwork',
    {
      id: 'rs-landscape-socialwork-1',
      text: 'Work with a social worker visiting families',
      imageUrl: '/would-you-rather/images/rs-landscape-socialwork-1.webp',
      prompt: 'A social worker meeting with a family on a front porch, taking notes',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 0, soloTeam: 1 },
      },
    },
    {
      id: 'rs-landscape-socialwork-2',
      text: 'Do landscape work on a public park crew',
      imageUrl: '/would-you-rather/images/rs-landscape-socialwork-2.webp',
      prompt: 'A park worker pruning bushes along a paved walking trail',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: -1, indoorOutdoor: 2, soloTeam: 0 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'rs-construction-eldercare',
    {
      id: 'rs-construction-eldercare-1',
      text: 'Help build affordable housing on a construction site',
      imageUrl: '/would-you-rather/images/rs-construction-eldercare-1.webp',
      prompt: 'Volunteers on a job site raising a wall frame together on a sunny day',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 1, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 1, soloTeam: 1 },
      },
    },
    {
      id: 'rs-construction-eldercare-2',
      text: 'Help care for residents at an elder-care home',
      imageUrl: '/would-you-rather/images/rs-construction-eldercare-2.webp',
      prompt: 'A young caregiver sharing a coffee and conversation with an elderly resident',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 1, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -2, soloTeam: 1 },
      },
    },
    'early-hs',
  ),

  // ======================================================================
  // OPPOSITE PAIRS — I ↔ E (10 items)
  // ======================================================================
  buildItem(
    'ie-plants-fundraiser',
    {
      id: 'ie-plants-fundraiser-1',
      text: 'Investigate why plants grow faster under colored lights',
      imageUrl: '/would-you-rather/images/ie-plants-fundraiser-1.webp',
      prompt: 'A student with a notebook beside plants growing under red and blue LED lights',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ie-plants-fundraiser-2',
      text: 'Run a school fundraiser and persuade donors',
      imageUrl: '/would-you-rather/images/ie-plants-fundraiser-2.webp',
      prompt: 'A student pitching at a community fundraiser table with a clipboard and smile',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 0, soloTeam: 2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ie-pitch-detective',
    {
      id: 'ie-pitch-detective-1',
      text: 'Pitch a new product idea to classmates',
      imageUrl: '/would-you-rather/images/ie-pitch-detective-1.webp',
      prompt: 'A student confidently presenting a product mockup to a room of classmates',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 1, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'ie-pitch-detective-2',
      text: 'Solve a detective-style logic puzzle',
      imageUrl: '/would-you-rather/images/ie-pitch-detective-2.webp',
      prompt: 'A teen at a desk with notes, clues, and a corkboard of connections, thinking hard',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ie-chem-debate',
    {
      id: 'ie-chem-debate-1',
      text: 'Run a chemistry experiment in the lab',
      imageUrl: '/would-you-rather/images/ie-chem-debate-1.webp',
      prompt: 'A student carefully pouring a solution between beakers at a lab bench with goggles on',
      desirability: 3.5,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    {
      id: 'ie-chem-debate-2',
      text: 'Lead the debate team in a tournament',
      imageUrl: '/would-you-rather/images/ie-chem-debate-2.webp',
      prompt: 'A debater at a podium making a point with confident body language',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'middle',
  ),
  buildItem(
    'ie-marketing-research',
    {
      id: 'ie-marketing-research-1',
      text: 'Plan a marketing campaign for a local business',
      imageUrl: '/would-you-rather/images/ie-marketing-research-1.webp',
      prompt: 'A young marketer at a whiteboard sketching ad ideas with sticky notes',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 1, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    {
      id: 'ie-marketing-research-2',
      text: 'Work as a research assistant reading studies',
      imageUrl: '/would-you-rather/images/ie-marketing-research-2.webp',
      prompt: 'A young researcher at a laptop beside stacks of journal articles and highlighters',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -2, soloTeam: -1 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ie-sales-microscope',
    {
      id: 'ie-sales-microscope-1',
      text: 'Work a sales role, closing deals on the phone',
      imageUrl: '/would-you-rather/images/ie-sales-microscope-1.webp',
      prompt: 'A young professional at an office desk with a headset, smiling during a call',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 1 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -2, soloTeam: 1 },
      },
    },
    {
      id: 'ie-sales-microscope-2',
      text: 'Use a microscope to study unusual samples',
      imageUrl: '/would-you-rather/images/ie-sales-microscope-2.webp',
      prompt: 'A student peering into a microscope, sketching what they see in a lab notebook',
      desirability: 3,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ie-data-persuasion',
    {
      id: 'ie-data-persuasion-1',
      text: 'Dig through datasets to find surprising patterns',
      imageUrl: '/would-you-rather/images/ie-data-persuasion-1.webp',
      prompt: 'A young analyst at a laptop examining charts and scatter plots',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ie-data-persuasion-2',
      text: 'Persuade a room of strangers to change their minds',
      imageUrl: '/would-you-rather/images/ie-data-persuasion-2.webp',
      prompt: 'A speaker on a small stage gesturing emphatically to an attentive audience',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 1, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ie-campaign-physics',
    {
      id: 'ie-campaign-physics-1',
      text: 'Run a school-election campaign for a friend',
      imageUrl: '/would-you-rather/images/ie-campaign-physics-1.webp',
      prompt: 'A campaign team putting up posters in a school hallway, laughing and planning',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 1, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'ie-campaign-physics-2',
      text: 'Work through a hard physics problem set',
      imageUrl: '/would-you-rather/images/ie-campaign-physics-2.webp',
      prompt: 'A student at a desk filling a notebook with equations under a warm lamp',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ie-negotiate-astronomy',
    {
      id: 'ie-negotiate-astronomy-1',
      text: 'Negotiate a sponsorship deal for your club',
      imageUrl: '/would-you-rather/images/ie-negotiate-astronomy-1.webp',
      prompt: 'A student shaking hands with a local business owner across a table',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 1 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    {
      id: 'ie-negotiate-astronomy-2',
      text: 'Chart star positions through a telescope',
      imageUrl: '/would-you-rather/images/ie-negotiate-astronomy-2.webp',
      prompt: 'A stargazer at a backyard telescope marking coordinates on a star map at night',
      desirability: 3,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 0, indoorOutdoor: 1, soloTeam: -2 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ie-entrepreneur-biology',
    {
      id: 'ie-entrepreneur-biology-1',
      text: 'Start a small online business from your dorm',
      imageUrl: '/would-you-rather/images/ie-entrepreneur-biology-1.webp',
      prompt: 'A young entrepreneur packing orders at a desk covered with shipping labels and a laptop',
      desirability: 4,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ie-entrepreneur-biology-2',
      text: 'Dissect a specimen in a biology lab',
      imageUrl: '/would-you-rather/images/ie-entrepreneur-biology-2.webp',
      prompt: 'A student in a lab coat carefully dissecting a specimen beside a diagram',
      desirability: 4,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ie-political-geology',
    {
      id: 'ie-political-geology-1',
      text: 'Study rock samples to trace the region\'s geologic history',
      imageUrl: '/would-you-rather/images/ie-political-geology-1.webp',
      prompt: 'A field geologist examining rock layers along a cliff face with a hammer',
      desirability: 3,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 1, indoorOutdoor: 2, soloTeam: 0 },
      },
    },
    {
      id: 'ie-political-geology-2',
      text: 'Run a political campaign as an organizer',
      imageUrl: '/would-you-rather/images/ie-political-geology-2.webp',
      prompt: 'A campaign organizer coordinating volunteers with a phone bank and map',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 2, indoorOutdoor: 0, soloTeam: 2 },
      },
    },
    'late-hs',
  ),

  // ======================================================================
  // OPPOSITE PAIRS — A ↔ C (10 items)
  // ======================================================================
  buildItem(
    'ac-poster-budget',
    {
      id: 'ac-poster-budget-1',
      text: 'Design a digital poster from scratch',
      imageUrl: '/would-you-rather/images/ac-poster-budget-1.webp',
      prompt: 'A student designing a poster on a tablet with vibrant colors and custom typography',
      desirability: 4,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ac-poster-budget-2',
      text: 'Keep the club\'s budget in a spreadsheet',
      imageUrl: '/would-you-rather/images/ac-poster-budget-2.webp',
      prompt: 'A student at a laptop entering expenses into a tidy color-coded spreadsheet',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),
  buildItem(
    'ac-catalog-comic',
    {
      id: 'ac-catalog-comic-1',
      text: 'Catalog library books by call number',
      imageUrl: '/would-you-rather/images/ac-catalog-comic-1.webp',
      prompt: 'A student placing books on shelves and checking a list in a quiet library',
      desirability: 2.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ac-catalog-comic-2',
      text: 'Write and illustrate a short comic',
      imageUrl: '/would-you-rather/images/ac-catalog-comic-2.webp',
      prompt: 'A young artist at a drawing tablet sketching a character in a comic panel',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ac-film-bookkeeping',
    {
      id: 'ac-film-bookkeeping-1',
      text: 'Direct a short film with friends',
      imageUrl: '/would-you-rather/images/ac-film-bookkeeping-1.webp',
      prompt: 'A young director behind a camera calling action on a small film set',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 1, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 2, indoorOutdoor: 0, soloTeam: 2 },
      },
    },
    {
      id: 'ac-film-bookkeeping-2',
      text: 'Do bookkeeping for a small business',
      imageUrl: '/would-you-rather/images/ac-film-bookkeeping-2.webp',
      prompt: 'A bookkeeper at a desk reconciling invoices with an accounting program on screen',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: -1 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ac-inventory-mural',
    {
      id: 'ac-inventory-mural-1',
      text: 'Keep inventory records in a warehouse',
      imageUrl: '/would-you-rather/images/ac-inventory-mural-1.webp',
      prompt: 'A worker scanning boxes and logging items in a clipboard in a warehouse aisle',
      desirability: 2.5,
      loadings: {
        riasec: { R: 1, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ac-inventory-mural-2',
      text: 'Paint a mural on a long wall',
      imageUrl: '/would-you-rather/images/ac-inventory-mural-2.webp',
      prompt: 'An artist on a scaffolding painting a colorful community mural',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 1, soloTeam: 0 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ac-song-database',
    {
      id: 'ac-song-database-1',
      text: 'Compose an original song',
      imageUrl: '/would-you-rather/images/ac-song-database-1.webp',
      prompt: 'A teen with a guitar and notebook writing lyrics in a cozy room',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    {
      id: 'ac-song-database-2',
      text: 'Keep the member database for a nonprofit',
      imageUrl: '/would-you-rather/images/ac-song-database-2.webp',
      prompt: 'An admin entering member records into a clean tabular database view',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ac-accounting-photography',
    {
      id: 'ac-accounting-photography-1',
      text: 'Prepare month-end accounting statements',
      imageUrl: '/would-you-rather/images/ac-accounting-photography-1.webp',
      prompt: 'An accountant reviewing printed statements at a desk with a calculator',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: -1 },
      },
    },
    {
      id: 'ac-accounting-photography-2',
      text: 'Shoot and edit a photo portfolio',
      imageUrl: '/would-you-rather/images/ac-accounting-photography-2.webp',
      prompt: 'A photographer reviewing shots on a camera screen on a downtown sidewalk',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 2, indoorOutdoor: 1, soloTeam: -1 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ac-dance-records',
    {
      id: 'ac-dance-records-1',
      text: 'Choreograph a dance routine for a showcase',
      imageUrl: '/would-you-rather/images/ac-dance-records-1.webp',
      prompt: 'A dancer in a studio with mirrors teaching a group a new sequence',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 1, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    {
      id: 'ac-dance-records-2',
      text: 'Maintain medical records at a clinic',
      imageUrl: '/would-you-rather/images/ac-dance-records-2.webp',
      prompt: 'A medical records assistant filing charts behind the front desk of a clinic',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: 0 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ac-payroll-sculpture',
    {
      id: 'ac-payroll-sculpture-1',
      text: 'Run payroll for a small company',
      imageUrl: '/would-you-rather/images/ac-payroll-sculpture-1.webp',
      prompt: 'An office worker processing payroll on two monitors with payslips stacked',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: -1 },
      },
    },
    {
      id: 'ac-payroll-sculpture-2',
      text: 'Sculpt a piece from clay for a gallery show',
      imageUrl: '/would-you-rather/images/ac-payroll-sculpture-2.webp',
      prompt: 'A sculptor shaping clay on a spinning wheel in a sunlit art studio',
      desirability: 3,
      loadings: {
        riasec: { R: 1, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ac-theater-tax',
    {
      id: 'ac-theater-tax-1',
      text: 'Act in a school theater production',
      imageUrl: '/would-you-rather/images/ac-theater-tax-1.webp',
      prompt: 'A student on stage in costume mid-scene, lit warmly by stage lights',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 1, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 2, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'ac-theater-tax-2',
      text: 'Help prepare tax returns at a volunteer tax clinic',
      imageUrl: '/would-you-rather/images/ac-theater-tax-2.webp',
      prompt: 'A volunteer at a fold-out table reviewing tax forms with a client',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 0, C: 3 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -2, soloTeam: 1 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'ac-audit-fashion',
    {
      id: 'ac-audit-fashion-1',
      text: 'Audit a charity\'s monthly expenses',
      imageUrl: '/would-you-rather/images/ac-audit-fashion-1.webp',
      prompt: 'A young auditor at a conference table reviewing receipts and ledgers',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: 0 },
      },
    },
    {
      id: 'ac-audit-fashion-2',
      text: 'Design a clothing line and sketch the pieces',
      imageUrl: '/would-you-rather/images/ac-audit-fashion-2.webp',
      prompt: 'A fashion designer sketching outfits on a drawing tablet with fabric swatches nearby',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 1, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'late-hs',
  ),

  // ======================================================================
  // ALTERNATE PAIRS — R ↔ A (4 items)
  // ======================================================================
  buildItem(
    'ra-electronics-sketch',
    {
      id: 'ra-electronics-sketch-1',
      text: 'Build an electronics kit with a soldering iron',
      imageUrl: '/would-you-rather/images/ra-electronics-sketch-1.webp',
      prompt: 'A teen at a workbench soldering a circuit board, smoke curling up from the tip',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ra-electronics-sketch-2',
      text: 'Sketch portraits of your friends',
      imageUrl: '/would-you-rather/images/ra-electronics-sketch-2.webp',
      prompt: 'A young artist sketching a friend with charcoal on a sunny park bench',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 1, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 1, soloTeam: 0 },
      },
    },
    'middle',
  ),
  buildItem(
    'ra-photography-woodworking',
    {
      id: 'ra-photography-woodworking-1',
      text: 'Photograph wildlife in a nearby wetland',
      imageUrl: '/would-you-rather/images/ra-photography-woodworking-1.webp',
      prompt: 'A photographer crouched with a long lens beside reeds, focused on a bird',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 1, indoorOutdoor: 2, soloTeam: -2 },
      },
    },
    {
      id: 'ra-photography-woodworking-2',
      text: 'Build a wooden chair in a woodshop',
      imageUrl: '/would-you-rather/images/ra-photography-woodworking-2.webp',
      prompt: 'A woodworker clamping pieces of a chair frame together on a workbench',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 0, A: 1, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ra-trailmap-sculpture',
    {
      id: 'ra-trailmap-sculpture-1',
      text: 'Weld a metal sculpture for an art show',
      imageUrl: '/would-you-rather/images/ra-trailmap-sculpture-1.webp',
      prompt: 'A young artist in protective gear welding a sculpture with bright sparks flying',
      desirability: 3.5,
      loadings: {
        riasec: { R: 1, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ra-trailmap-sculpture-2',
      text: 'Map out a hiking trail using GPS tools',
      imageUrl: '/would-you-rather/images/ra-trailmap-sculpture-2.webp',
      prompt: 'A hiker recording coordinates on a GPS device near a forest trail marker',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 1, indoorOutdoor: 2, soloTeam: -1 },
      },
    },
    'middle',
  ),
  buildItem(
    'ra-motion-mechanics',
    {
      id: 'ra-motion-mechanics-1',
      text: 'Make a stop-motion animation short',
      imageUrl: '/would-you-rather/images/ra-motion-mechanics-1.webp',
      prompt: 'A creator positioning clay figures under bright lights with a camera on a tripod',
      desirability: 3.5,
      loadings: {
        riasec: { R: 1, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ra-motion-mechanics-2',
      text: 'Rebuild a bicycle\'s gears and brakes',
      imageUrl: '/would-you-rather/images/ra-motion-mechanics-2.webp',
      prompt: 'A teen adjusting a derailleur on a bike frame mounted on a stand',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),

  // ======================================================================
  // ALTERNATE PAIRS — R ↔ E (4 items)
  // ======================================================================
  buildItem(
    're-engine-campaign',
    {
      id: 're-engine-campaign-1',
      text: 'Take apart and reassemble a small engine',
      imageUrl: '/would-you-rather/images/re-engine-campaign-1.webp',
      prompt: 'A student on a garage floor rebuilding a small engine on a mat of spread parts',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 're-engine-campaign-2',
      text: 'Plan a campaign to win a school election',
      imageUrl: '/would-you-rather/images/re-engine-campaign-2.webp',
      prompt: 'A student strategist mapping out a campaign plan on a whiteboard with a friend',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 1 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    'middle',
  ),
  buildItem(
    're-salesfloor-construction',
    {
      id: 're-salesfloor-construction-1',
      text: 'Work the sales floor at a busy store, hitting targets',
      imageUrl: '/would-you-rather/images/re-salesfloor-construction-1.webp',
      prompt: 'A young salesperson in a retail store helping a customer try on gear',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 're-salesfloor-construction-2',
      text: 'Operate heavy equipment on a construction site',
      imageUrl: '/would-you-rather/images/re-salesfloor-construction-2.webp',
      prompt: 'An operator in a cab handling the controls of an excavator on a job site',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 2, soloTeam: -1 },
      },
    },
    'late-hs',
  ),
  buildItem(
    're-startup-repair',
    {
      id: 're-startup-repair-1',
      text: 'Pitch a startup idea to a panel of investors',
      imageUrl: '/would-you-rather/images/re-startup-repair-1.webp',
      prompt: 'A young founder pitching slides to a small panel in a conference room',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 2, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    {
      id: 're-startup-repair-2',
      text: 'Run a mobile phone repair side business',
      imageUrl: '/would-you-rather/images/re-startup-repair-2.webp',
      prompt: 'A repair tech at a small kiosk swapping a phone screen with precision tools',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 1, A: 0, S: 0, E: 1, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    'late-hs',
  ),
  buildItem(
    're-landscape-negotiate',
    {
      id: 're-landscape-negotiate-1',
      text: 'Negotiate a client contract with a coworker',
      imageUrl: '/would-you-rather/images/re-landscape-negotiate-1.webp',
      prompt: 'Two young professionals in an office reviewing a contract with a client across the table',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 1 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -2, soloTeam: 1 },
      },
    },
    {
      id: 're-landscape-negotiate-2',
      text: 'Run a landscape crew trimming trees and hedges',
      imageUrl: '/would-you-rather/images/re-landscape-negotiate-2.webp',
      prompt: 'A crew member using a pole saw to trim a tall hedge on a bright morning',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: -1, indoorOutdoor: 2, soloTeam: 0 },
      },
    },
    'late-hs',
  ),

  // ======================================================================
  // ALTERNATE PAIRS — I ↔ S (4 items)
  // ======================================================================
  buildItem(
    'is-shelter-survey',
    {
      id: 'is-shelter-survey-1',
      text: 'Volunteer at an animal shelter caring for animals',
      imageUrl: '/would-you-rather/images/is-shelter-survey-1.webp',
      prompt: 'A volunteer walking a dog and checking on cages in a cheerful shelter',
      desirability: 3.5,
      loadings: {
        riasec: { R: 1, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 1 },
      },
    },
    {
      id: 'is-shelter-survey-2',
      text: 'Analyze data from a survey of your school',
      imageUrl: '/would-you-rather/images/is-shelter-survey-2.webp',
      prompt: 'A student at a laptop creating charts from survey responses in a spreadsheet',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),
  buildItem(
    'is-lab-volunteer',
    {
      id: 'is-lab-volunteer-1',
      text: 'Volunteer tutoring English to new arrivals',
      imageUrl: '/would-you-rather/images/is-lab-volunteer-1.webp',
      prompt: 'A volunteer at a community center pointing out words on a page with a new English learner',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    {
      id: 'is-lab-volunteer-2',
      text: 'Assist in a university research lab',
      imageUrl: '/would-you-rather/images/is-lab-volunteer-2.webp',
      prompt: 'A student research assistant pipetting samples beside a grad-school mentor',
      desirability: 3.5,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'is-research-mentor',
    {
      id: 'is-research-mentor-1',
      text: 'Mentor a younger teammate through a rough season',
      imageUrl: '/would-you-rather/images/is-research-mentor-1.webp',
      prompt: 'An older athlete talking with a young teammate on a bench after practice',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 1, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 1 },
      },
    },
    {
      id: 'is-research-mentor-2',
      text: 'Write a research paper summarizing a year of studies',
      imageUrl: '/would-you-rather/images/is-research-mentor-2.webp',
      prompt: 'A student writing at a laptop beside printouts of journal articles with highlighter',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 1, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -2, soloTeam: -2 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'is-biology-counsel',
    {
      id: 'is-biology-counsel-1',
      text: 'Run a field biology study on local insects',
      imageUrl: '/would-you-rather/images/is-biology-counsel-1.webp',
      prompt: 'A young biologist with a net and notebook recording insect species in a meadow',
      desirability: 3,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 1, indoorOutdoor: 2, soloTeam: 0 },
      },
    },
    {
      id: 'is-biology-counsel-2',
      text: 'Counsel a friend through a hard time',
      imageUrl: '/would-you-rather/images/is-biology-counsel-2.webp',
      prompt: 'Two teens talking in quiet concern on a porch step at dusk',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 1 },
      },
    },
    'middle',
  ),

  // ======================================================================
  // ALTERNATE PAIRS — I ↔ C (3 items)
  // ======================================================================
  buildItem(
    'ic-journal-closet',
    {
      id: 'ic-journal-closet-1',
      text: 'Reorganize your closet by category and color',
      imageUrl: '/would-you-rather/images/ic-journal-closet-1.webp',
      prompt: 'A teen carefully folding clothes into a color-graded closet system',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 1, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    {
      id: 'ic-journal-closet-2',
      text: 'Read a long science journal article',
      imageUrl: '/would-you-rather/images/ic-journal-closet-2.webp',
      prompt: 'A reader curled up with a thick science journal and a cup of tea',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ic-spreadsheet-data',
    {
      id: 'ic-spreadsheet-data-1',
      text: 'Keep a spreadsheet tracking every expense of a class trip',
      imageUrl: '/would-you-rather/images/ic-spreadsheet-data-1.webp',
      prompt: 'A student entering receipts into a tidy shared spreadsheet for a class trip',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ic-spreadsheet-data-2',
      text: 'Analyze a dataset to answer a curious question',
      imageUrl: '/would-you-rather/images/ic-spreadsheet-data-2.webp',
      prompt: 'A student with a laptop open to scatter plots, smiling at something in the data',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ic-records-lab',
    {
      id: 'ic-records-lab-1',
      text: 'Run a careful lab experiment following an exact protocol',
      imageUrl: '/would-you-rather/images/ic-records-lab-1.webp',
      prompt: 'A student with goggles precisely measuring a reagent in a graduated cylinder',
      desirability: 3.5,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    {
      id: 'ic-records-lab-2',
      text: 'Maintain official records in a government office',
      imageUrl: '/would-you-rather/images/ic-records-lab-2.webp',
      prompt: 'A records clerk filing stamped documents into archival drawers at a government counter',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: 0 },
      },
    },
    'late-hs',
  ),

  // ======================================================================
  // ALTERNATE PAIRS — A ↔ E (3 items)
  // ======================================================================
  buildItem(
    'ae-song-fundraiser',
    {
      id: 'ae-song-fundraiser-1',
      text: 'Plan a community fundraiser, recruit sponsors',
      imageUrl: '/would-you-rather/images/ae-song-fundraiser-1.webp',
      prompt: 'A young organizer on a phone with a clipboard, checking off sponsor names',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 3, C: 1 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'ae-song-fundraiser-2',
      text: 'Compose an original song for the fundraiser',
      imageUrl: '/would-you-rather/images/ae-song-fundraiser-2.webp',
      prompt: 'A teen at a piano humming and jotting down chord changes on sheet music',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ae-promote-design',
    {
      id: 'ae-promote-design-1',
      text: 'Promote a local band on social media',
      imageUrl: '/would-you-rather/images/ae-promote-design-1.webp',
      prompt: 'A promoter at a phone and laptop scheduling social posts and answering DMs',
      desirability: 4,
      loadings: {
        riasec: { R: 0, I: 0, A: 1, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 2, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    {
      id: 'ae-promote-design-2',
      text: 'Design the album cover and merch for the band',
      imageUrl: '/would-you-rather/images/ae-promote-design-2.webp',
      prompt: 'A designer at a tablet creating a bold album cover with layered typography',
      desirability: 4,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 1, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ae-pitch-film',
    {
      id: 'ae-pitch-film-1',
      text: 'Pitch a movie idea to producers',
      imageUrl: '/would-you-rather/images/ae-pitch-film-1.webp',
      prompt: 'A young screenwriter presenting concept art to two producers across a table',
      desirability: 4,
      loadings: {
        riasec: { R: 0, I: 0, A: 1, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'ae-pitch-film-2',
      text: 'Write the screenplay for that movie',
      imageUrl: '/would-you-rather/images/ae-pitch-film-2.webp',
      prompt: 'A writer at a laptop in a cafe typing a screenplay with coffee steam rising',
      desirability: 4,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'late-hs',
  ),

  // ======================================================================
  // ALTERNATE PAIRS — S ↔ C (3 items)
  // ======================================================================
  buildItem(
    'sc-retreat-audit',
    {
      id: 'sc-retreat-audit-1',
      text: 'Plan a youth retreat for a community group',
      imageUrl: '/would-you-rather/images/sc-retreat-audit-1.webp',
      prompt: 'A young adult leading an icebreaker with teens at a retreat lodge',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 1, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 1, soloTeam: 2 },
      },
    },
    {
      id: 'sc-retreat-audit-2',
      text: 'Audit a nonprofit\'s monthly expenses',
      imageUrl: '/would-you-rather/images/sc-retreat-audit-2.webp',
      prompt: 'An auditor at a desk flipping through ledger printouts with a cup of coffee',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: 0 },
      },
    },
    'late-hs',
  ),
  buildItem(
    'sc-counseling-records',
    {
      id: 'sc-counseling-records-1',
      text: 'File and organize charts at a counselor\'s office',
      imageUrl: '/would-you-rather/images/sc-counseling-records-1.webp',
      prompt: 'A student assistant organizing color-coded folders in a counselor\'s office',
      desirability: 2.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 1, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -2, soloTeam: -1 },
      },
    },
    {
      id: 'sc-counseling-records-2',
      text: 'Facilitate a peer-counseling session at school',
      imageUrl: '/would-you-rather/images/sc-counseling-records-2.webp',
      prompt: 'A teen peer counselor listening attentively across a small round table',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'middle',
  ),
  buildItem(
    'sc-volunteer-database',
    {
      id: 'sc-volunteer-database-1',
      text: 'Run a database of volunteer hours for a nonprofit',
      imageUrl: '/would-you-rather/images/sc-volunteer-database-1.webp',
      prompt: 'An administrator logging volunteer hours on a clean database interface',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'sc-volunteer-database-2',
      text: 'Run the volunteer program itself, recruiting and training people',
      imageUrl: '/would-you-rather/images/sc-volunteer-database-2.webp',
      prompt: 'A program lead welcoming new volunteers at an orientation with nametags and coffee',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 1, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    'late-hs',
  ),

  // ======================================================================
  // ADJACENT PAIRS — R ↔ I (2 items)
  // ======================================================================
  buildItem(
    'ri-track-history',
    {
      id: 'ri-track-history-1',
      text: 'Run laps on a track until you beat your PR',
      imageUrl: '/would-you-rather/images/ri-track-history-1.webp',
      prompt: 'A runner on a red track at sunrise checking a stopwatch',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: -1, indoorOutdoor: 2, soloTeam: -1 },
      },
    },
    {
      id: 'ri-track-history-2',
      text: 'Read a long history book cover to cover',
      imageUrl: '/would-you-rather/images/ri-track-history-2.webp',
      prompt: 'A student curled up with a thick history book and a highlighter on a rainy afternoon',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ri-hike-astronomy',
    {
      id: 'ri-hike-astronomy-1',
      text: 'Identify and name stars with a friend\'s telescope',
      imageUrl: '/would-you-rather/images/ri-hike-astronomy-1.webp',
      prompt: 'Two teens at a backyard telescope pointing up at a starry sky',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 1, indoorOutdoor: 2, soloTeam: 0 },
      },
    },
    {
      id: 'ri-hike-astronomy-2',
      text: 'Go on a long backcountry hike',
      imageUrl: '/would-you-rather/images/ri-hike-astronomy-2.webp',
      prompt: 'A hiker with a full pack cresting a forested ridge on a sunny morning',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 1, indoorOutdoor: 2, soloTeam: -1 },
      },
    },
    'middle',
  ),

  // ======================================================================
  // ADJACENT PAIRS — R ↔ C (2 items)
  // ======================================================================
  buildItem(
    'rc-desk-filing',
    {
      id: 'rc-desk-filing-1',
      text: 'Build a desk from an IKEA-style kit',
      imageUrl: '/would-you-rather/images/rc-desk-filing-1.webp',
      prompt: 'A teen following an instruction booklet while assembling a desk on the floor',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 1 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'rc-desk-filing-2',
      text: 'File and organize digital records on a shared drive',
      imageUrl: '/would-you-rather/images/rc-desk-filing-2.webp',
      prompt: 'A student at a laptop renaming and foldering files into a clean directory tree',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 1, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'rc-workshop-inventory',
    {
      id: 'rc-workshop-inventory-1',
      text: 'Keep the tool inventory in a campus workshop',
      imageUrl: '/would-you-rather/images/rc-workshop-inventory-1.webp',
      prompt: 'A student checking tools in and out and logging them in a shared sheet',
      desirability: 3,
      loadings: {
        riasec: { R: 1, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    {
      id: 'rc-workshop-inventory-2',
      text: 'Rebuild a go-kart from parts in the workshop',
      imageUrl: '/would-you-rather/images/rc-workshop-inventory-2.webp',
      prompt: 'A teen assembling a go-kart frame with wrenches and a can-do grin',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 0, soloTeam: 0 },
      },
    },
    'early-hs',
  ),

  // ======================================================================
  // ADJACENT PAIRS — I ↔ A (2 items)
  // ======================================================================
  buildItem(
    'ia-microscope-lyrics',
    {
      id: 'ia-microscope-lyrics-1',
      text: 'Conduct a microscope investigation of pond water',
      imageUrl: '/would-you-rather/images/ia-microscope-lyrics-1.webp',
      prompt: 'A student watching microorganisms swim across a microscope slide in class',
      desirability: 3,
      loadings: {
        riasec: { R: 1, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    {
      id: 'ia-microscope-lyrics-2',
      text: 'Write song lyrics inspired by something true',
      imageUrl: '/would-you-rather/images/ia-microscope-lyrics-2.webp',
      prompt: 'A teen with a notebook and headphones, writing lyrics by a rainy window',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ia-lab-sketch',
    {
      id: 'ia-lab-sketch-1',
      text: 'Sketch the specimens you see in biology lab',
      imageUrl: '/would-you-rather/images/ia-lab-sketch-1.webp',
      prompt: 'A student carefully drawing a leaf specimen in a science notebook',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 1, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ia-lab-sketch-2',
      text: 'Write a short research essay on a science question',
      imageUrl: '/would-you-rather/images/ia-lab-sketch-2.webp',
      prompt: 'A student drafting an essay at a laptop with printed articles fanned out',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 1, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -2, soloTeam: -2 },
      },
    },
    'middle',
  ),

  // ======================================================================
  // ADJACENT PAIR — A ↔ S (1 item)
  // ======================================================================
  buildItem(
    'as-mural-study',
    {
      id: 'as-mural-study-1',
      text: 'Lead a study group through a tough unit',
      imageUrl: '/would-you-rather/images/as-mural-study-1.webp',
      prompt: 'A student at a whiteboard explaining a concept to a group around a table',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'as-mural-study-2',
      text: 'Paint a mural in the school hallway',
      imageUrl: '/would-you-rather/images/as-mural-study-2.webp',
      prompt: 'A student on a step stool painting vivid colors onto a blank hallway wall',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 1, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    'middle',
  ),

  // ======================================================================
  // ADJACENT PAIR — S ↔ E (1 item)
  // ======================================================================
  buildItem(
    'se-tutor-pitch',
    {
      id: 'se-tutor-pitch-1',
      text: 'Tutor an elementary student in reading',
      imageUrl: '/would-you-rather/images/se-tutor-pitch-1.webp',
      prompt: 'A teen reading a picture book aloud with an elementary-school student at a library table',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    {
      id: 'se-tutor-pitch-2',
      text: 'Pitch a new app idea to a panel of classmates',
      imageUrl: '/would-you-rather/images/se-tutor-pitch-2.webp',
      prompt: 'A student presenting slides about an app concept to a group of engaged classmates',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 1, A: 0, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    'middle',
  ),

  // ======================================================================
  // ADJACENT PAIR — E ↔ C (1 item)
  // ======================================================================
  buildItem(
    'ec-talent-database',
    {
      id: 'ec-talent-database-1',
      text: 'MC a school talent show on stage',
      imageUrl: '/would-you-rather/images/ec-talent-database-1.webp',
      prompt: 'A confident student at a stage microphone hyping up a crowd of classmates',
      desirability: 4,
      loadings: {
        riasec: { R: 0, I: 0, A: 1, S: 0, E: 3, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    {
      id: 'ec-talent-database-2',
      text: 'Update the club\'s membership database',
      imageUrl: '/would-you-rather/images/ec-talent-database-2.webp',
      prompt: 'A student entering names and contacts into a tidy membership spreadsheet',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),

  // ======================================================================
  // EXTRA ITEMS — added to improve engine accuracy on within-top-3 ordering
  // 5 adjacent pairs × 1 item + 7 opposite items = 12 items total
  // ======================================================================

  // Adjacent: I ↔ A (add 1, was 2 → now 3)
  buildItem(
    'ia-biology-design',
    {
      id: 'ia-biology-design-1',
      text: 'Dissect and label a specimen for biology class',
      imageUrl: '/would-you-rather/images/ia-biology-design-1.webp',
      prompt: 'A student with gloves and a scalpel examining a specimen on a tray',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 0 },
      },
    },
    {
      id: 'ia-biology-design-2',
      text: 'Design a logo for a school club',
      imageUrl: '/would-you-rather/images/ia-biology-design-2.webp',
      prompt: 'A student sketching logo concepts on a tablet with design software',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'early-hs',
  ),

  // Adjacent: A ↔ S (add 1, was 1 → now 2)
  buildItem(
    'as-photography-community',
    {
      id: 'as-photography-community-1',
      text: 'Take photos for a school art exhibition',
      imageUrl: '/would-you-rather/images/as-photography-community-1.webp',
      prompt: 'A student with a camera composing a shot in a school corridor',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 1, soloTeam: -1 },
      },
    },
    {
      id: 'as-photography-community-2',
      text: 'Volunteer at a community food bank',
      imageUrl: '/would-you-rather/images/as-photography-community-2.webp',
      prompt: 'A teen sorting and packing food boxes alongside other volunteers',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 2 },
      },
    },
    'middle',
  ),

  // Adjacent: S ↔ E (add 1, was 1 → now 2)
  buildItem(
    'se-listening-campaign',
    {
      id: 'se-listening-campaign-1',
      text: 'Listen and offer advice to a friend going through something hard',
      imageUrl: '/would-you-rather/images/se-listening-campaign-1.webp',
      prompt: 'Two teens talking quietly on a bench outside school',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: 1 },
      },
    },
    {
      id: 'se-listening-campaign-2',
      text: 'Run a campaign to get elected to student government',
      imageUrl: '/would-you-rather/images/se-listening-campaign-2.webp',
      prompt: 'A student posting flyers and greeting classmates in a busy hallway',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 0, soloTeam: 2 },
      },
    },
    'middle',
  ),

  // Adjacent: E ↔ C (add 1, was 1 → now 2)
  buildItem(
    'ec-debate-bookkeeping',
    {
      id: 'ec-debate-bookkeeping-1',
      text: 'Compete in a debate tournament at another school',
      imageUrl: '/would-you-rather/images/ec-debate-bookkeeping-1.webp',
      prompt: 'A student at a podium making a convincing argument to judges',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    {
      id: 'ec-debate-bookkeeping-2',
      text: 'Keep the club\'s financial records organized and accurate',
      imageUrl: '/would-you-rather/images/ec-debate-bookkeeping-2.webp',
      prompt: 'A student updating a budget spreadsheet with receipts nearby',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),

  // Adjacent: C ↔ R (add 1, was 2 → now 3)
  buildItem(
    'cr-inventory-construction',
    {
      id: 'cr-inventory-construction-1',
      text: 'Count and record inventory in a storeroom',
      imageUrl: '/would-you-rather/images/cr-inventory-construction-1.webp',
      prompt: 'A student with a clipboard checking items on shelves in a supply room',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'cr-inventory-construction-2',
      text: 'Help build a deck at a Habitat for Humanity project',
      imageUrl: '/would-you-rather/images/cr-inventory-construction-2.webp',
      prompt: 'Volunteers nailing boards onto a deck frame at a construction site',
      desirability: 3.5,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 0, REL: 0, SUP: 0, WC: 1 },
        workContext: { structureVariety: 0, indoorOutdoor: 2, soloTeam: 1 },
      },
    },
    'early-hs',
  ),

  // Opposite: R ↔ S (add 2, was 10 → now 12) — balance adjacent additions
  buildItem(
    'rs-wiring-advocacy',
    {
      id: 'rs-wiring-advocacy-1',
      text: 'Wire an electrical outlet under supervision',
      imageUrl: '/would-you-rather/images/rs-wiring-advocacy-1.webp',
      prompt: 'A student carefully connecting wires in an electrical outlet box',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'rs-wiring-advocacy-2',
      text: 'Advocate for a classmate being treated unfairly',
      imageUrl: '/would-you-rather/images/rs-wiring-advocacy-2.webp',
      prompt: 'A student speaking up to a teacher on behalf of a friend',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'rs-engine-counselor',
    {
      id: 'rs-engine-counselor-1',
      text: 'Diagnose what is wrong with a small engine',
      imageUrl: '/would-you-rather/images/rs-engine-counselor-1.webp',
      prompt: 'A student examining a small lawn mower engine with a diagnostic tool',
      desirability: 3,
      loadings: {
        riasec: { R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: -1 },
      },
    },
    {
      id: 'rs-engine-counselor-2',
      text: 'Be a camp counselor supporting homesick kids',
      imageUrl: '/would-you-rather/images/rs-engine-counselor-2.webp',
      prompt: 'A counselor sitting with a small group of campers around a campfire',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: 2, soloTeam: 2 },
      },
    },
    'early-hs',
  ),

  // Opposite: I ↔ E (add 2, was 10 → now 12)
  buildItem(
    'ie-geology-marketing',
    {
      id: 'ie-geology-marketing-1',
      text: 'Study rock samples to identify their mineral content',
      imageUrl: '/would-you-rather/images/ie-geology-marketing-1.webp',
      prompt: 'A student examining rock samples under a magnifier with labeled jars nearby',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ie-geology-marketing-2',
      text: 'Plan a marketing campaign for a local small business',
      imageUrl: '/would-you-rather/images/ie-geology-marketing-2.webp',
      prompt: 'A student sketching a marketing plan on a whiteboard',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ie-chemistry-negotiate',
    {
      id: 'ie-chemistry-negotiate-1',
      text: 'Complete a chemistry experiment independently',
      imageUrl: '/would-you-rather/images/ie-chemistry-negotiate-1.webp',
      prompt: 'A student carefully titrating a solution in a lab setting',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ie-chemistry-negotiate-2',
      text: 'Negotiate a budget allocation for your school club',
      imageUrl: '/would-you-rather/images/ie-chemistry-negotiate-2.webp',
      prompt: 'A student presenting a budget proposal to a school administrator',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 3, C: 0 },
        workValues: { ACH: 1, IND: 0, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'early-hs',
  ),

  // Alternate: C ↔ I (add 3, was 3 → now 6) — critical for C-top and I-top ordering
  buildItem(
    'ci-filing-research',
    {
      id: 'ci-filing-research-1',
      text: 'Set up and maintain a filing system for club records',
      imageUrl: '/would-you-rather/images/ci-filing-research-1.webp',
      prompt: 'A student organizing folders in a filing cabinet with labels',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ci-filing-research-2',
      text: 'Investigate why plants grow faster in certain soils',
      imageUrl: '/would-you-rather/images/ci-filing-research-2.webp',
      prompt: 'A student examining seedlings in different soil types in a greenhouse',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 1, soloTeam: -1 },
      },
    },
    'early-hs',
  ),
  buildItem(
    'ci-schedule-decode',
    {
      id: 'ci-schedule-decode-1',
      text: 'Build a weekly schedule for a school event series',
      imageUrl: '/would-you-rather/images/ci-schedule-decode-1.webp',
      prompt: 'A student filling in a color-coded weekly schedule on a large calendar',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ci-schedule-decode-2',
      text: 'Decode a cipher to find a hidden message',
      imageUrl: '/would-you-rather/images/ci-schedule-decode-2.webp',
      prompt: 'A student working through a coded message using a cipher grid',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    'middle',
  ),
  buildItem(
    'ci-checklist-physics',
    {
      id: 'ci-checklist-physics-1',
      text: 'Create a detailed checklist for the school supply drive',
      imageUrl: '/would-you-rather/images/ci-checklist-physics-1.webp',
      prompt: 'A student typing a formatted checklist on a laptop at a desk',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ci-checklist-physics-2',
      text: 'Experiment to test how angle affects a projectile\'s range',
      imageUrl: '/would-you-rather/images/ci-checklist-physics-2.webp',
      prompt: 'A student launching a small ball at different angles and measuring distances',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 0, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: 0, soloTeam: -1 },
      },
    },
    'middle',
  ),

  // Alternate: C ↔ S (add 3, was 3 → now 6) — critical for C-top ordering vs S
  buildItem(
    'cs-timesheet-counselor',
    {
      id: 'cs-timesheet-counselor-1',
      text: 'Fill in timesheets and track hours for a club project',
      imageUrl: '/would-you-rather/images/cs-timesheet-counselor-1.webp',
      prompt: 'A student entering hours into a time-tracking spreadsheet',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'cs-timesheet-counselor-2',
      text: 'Run a peer tutoring session for struggling students',
      imageUrl: '/would-you-rather/images/cs-timesheet-counselor-2.webp',
      prompt: 'A teen guiding a younger student through a math problem at a table',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'middle',
  ),
  buildItem(
    'cs-data-entry-mentoring',
    {
      id: 'cs-data-entry-mentoring-1',
      text: 'Enter survey results into a database accurately',
      imageUrl: '/would-you-rather/images/cs-data-entry-mentoring-1.webp',
      prompt: 'A student typing responses into a database one by one',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    {
      id: 'cs-data-entry-mentoring-2',
      text: 'Mentor a younger student through a challenging personal situation',
      imageUrl: '/would-you-rather/images/cs-data-entry-mentoring-2.webp',
      prompt: 'An older teen and a younger student in a supportive conversation',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 0, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'middle',
  ),
  buildItem(
    'cs-compliance-volunteer',
    {
      id: 'cs-compliance-volunteer-1',
      text: 'Check that club activities comply with school rules',
      imageUrl: '/would-you-rather/images/cs-compliance-volunteer-1.webp',
      prompt: 'A student reviewing a rulebook and marking items on a checklist',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'cs-compliance-volunteer-2',
      text: 'Volunteer at a hospital to support patients and families',
      imageUrl: '/would-you-rather/images/cs-compliance-volunteer-2.webp',
      prompt: 'A teen volunteer pushing a cart to deliver items to patients',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 3, E: 0, C: 0 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 1, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: 1 },
      },
    },
    'early-hs',
  ),

  // Opposite: A ↔ C (add 3, was 10 → now 13)
  buildItem(
    'ac-animation-filing',
    {
      id: 'ac-animation-filing-1',
      text: 'Create a short animation using simple software',
      imageUrl: '/would-you-rather/images/ac-animation-filing-1.webp',
      prompt: 'A student moving frames in animation software on a laptop',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ac-animation-filing-2',
      text: 'File and organize a backlog of club documents',
      imageUrl: '/would-you-rather/images/ac-animation-filing-2.webp',
      prompt: 'A student sorting papers into clearly labeled binders at a desk',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),
  buildItem(
    'ac-ceramics-spreadsheet',
    {
      id: 'ac-ceramics-spreadsheet-1',
      text: 'Throw a ceramic vase on a pottery wheel',
      imageUrl: '/would-you-rather/images/ac-ceramics-spreadsheet-1.webp',
      prompt: 'A student shaping clay on a spinning pottery wheel in an art room',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    {
      id: 'ac-ceramics-spreadsheet-2',
      text: 'Enter survey results into a structured spreadsheet',
      imageUrl: '/would-you-rather/images/ac-ceramics-spreadsheet-2.webp',
      prompt: 'A student carefully inputting data rows into a formatted spreadsheet',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),
  buildItem(
    'ac-journaling-reporting',
    {
      id: 'ac-journaling-reporting-1',
      text: 'Write journal entries exploring your thoughts on a topic',
      imageUrl: '/would-you-rather/images/ac-journaling-reporting-1.webp',
      prompt: 'A student writing freely in a personal journal at a sunny window',
      desirability: 3.5,
      loadings: {
        riasec: { R: 0, I: 0, A: 3, S: 0, E: 0, C: 0 },
        workValues: { ACH: 1, IND: 1, REC: 1, REL: 0, SUP: 0, WC: 0 },
        workContext: { structureVariety: 1, indoorOutdoor: -1, soloTeam: -2 },
      },
    },
    {
      id: 'ac-journaling-reporting-2',
      text: 'Compile a detailed compliance report for a student organization',
      imageUrl: '/would-you-rather/images/ac-journaling-reporting-2.webp',
      prompt: 'A student assembling formatted pages into a report with a cover sheet',
      desirability: 3,
      loadings: {
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 3 },
        workValues: { ACH: 0, IND: 0, REC: 0, REL: 0, SUP: 1, WC: 0 },
        workContext: { structureVariety: -2, indoorOutdoor: -1, soloTeam: -1 },
      },
    },
    'middle',
  ),
]
