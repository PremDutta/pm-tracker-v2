// A copy-paste brief for any AI assistant to draft a one-page product teardown
// for a specific application. A teardown sent to the hiring manager alongside
// the application is what separates a senior PM from the resume pile. Same
// manual-handoff pattern as Resume Match's "copy gap summary for AI": nothing
// is sent anywhere automatically, and you edit before sending.
export function buildTeardownBrief(app, profile = {}) {
  const me = [
    profile.years && `${profile.years} years of PM experience`,
    profile.domain && `domain: ${profile.domain}`,
  ].filter(Boolean).join(', ');
  const wins = (profile.achievements || []).filter(Boolean);
  return [
    `I'm applying for ${app.role ? `the ${app.role} role` : 'a product role'} at ${app.company}.${app.link ? ` Listing: ${app.link}` : ''}`,
    me && `About me: ${me}.`,
    wins.length && `My relevant wins:\n${wins.map(w => `- ${w}`).join('\n')}`,
    '',
    `Draft a one-page product teardown of ${app.company}'s core product that I can send to the hiring manager with my application:`,
    '1. Who the product serves and the one job it does for them (2 lines).',
    '2. Three specific friction points or missed opportunities in the current experience, each with evidence I can verify myself (a flow, a review theme, a metric).',
    '3. For the strongest one: the problem, a proposed solution, how I would measure success, and what I would ship first in 30 days.',
    '4. One line connecting it to my experience above.',
    'Keep it under 400 words, concrete, no generic advice. Flag anything you are unsure about so I can check it before sending.',
  ].filter(v => typeof v === 'string').join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
