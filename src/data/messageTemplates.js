export const MESSAGE_TEMPLATES = {
  connectionRequest: [
    { id:'cr1', title:'Fellow PM', context:'Connect with peers',
      message:`Hi [Name],\n\nI came across your profile and was impressed by your work at [Company] on [specific product/feature]. As a fellow PM with [X] years in [domain], I'd love to connect and exchange insights.\n\nLooking forward to connecting!` },
    { id:'cr2', title:'Opportunity Explorer', context:'You\'re job hunting',
      message:`Hi [Name],\n\nI've been following [Company]'s product journey — especially [feature/launch]. As a PM with [X] years in [domain], I'm selectively exploring new opportunities and [Company] is high on my list.\n\nWould love to connect!` },
    { id:'cr3', title:'After Their Post', context:'They shared a PM insight',
      message:`Hi [Name],\n\nYour post on [topic] really resonated — your point about [specific insight] was spot-on from my experience too.\n\nWould love to stay connected and continue the conversation!` },
  ],
  referralRequest: [
    { id:'rr1', title:'Direct Ask', context:'Clear, confident ask',
      message:`Hi [Name],\n\nThank you for connecting! I noticed [Company] is hiring for [Role] — it aligns perfectly with my background.\n\nKey highlights:\n• [Achievement 1 with metric, e.g. "Grew DAU 40% in Q2"]\n• [Achievement 2 with metric]\n• [Domain expertise]\n\nWould you be open to a referral? I'd be happy to share my resume and make it as easy as possible for you.\n\nThank you!` },
    { id:'rr2', title:'Warm Exploration', context:'Test the waters first',
      message:`Hi [Name],\n\nHope you're doing well! [Company] has been on my radar because of [specific reason — product, culture, mission].\n\nI'd love to learn a bit more:\n1. How's the PM team's culture / ways of working?\n2. Are there opportunities suited to [X years] PM experience in [domain]?\n\nIf there's a fit, I'd really value your referral — and I promise to make the process smooth for you.` },
    { id:'rr3', title:'Warm Intro via Mutual', context:'You have a mutual connection',
      message:`Hi [Name],\n\n[Mutual friend's name] suggested I reach out — they spoke highly of you and the PM culture at [Company].\n\nI'm a PM with [X] years in [domain], and I'm exploring opportunities. [Company]'s work on [product area] excites me.\n\nWould you be open to a quick chat, and potentially a referral if there's a fit?` },
  ],
  followUp: [
    { id:'fu1', title:'Gentle Nudge', context:'1 week of silence',
      message:`Hi [Name],\n\nHope you're having a great week! Just following up on my previous note — no pressure at all.\n\nIf you've been swamped, totally understandable. Would love to connect when you have a moment.\n\nBest!` },
    { id:'fu2', title:'Post-Interview Thank You', context:'Within 24hrs of interview',
      message:`Hi [Name],\n\nThank you for the conversation about [Role] — I really enjoyed learning about [specific topic you discussed].\n\nOur discussion reinforced my excitement about [Company]. My experience in [specific skill] feels very aligned with [challenge/goal you discussed].\n\nLooking forward to next steps — please let me know if you need anything else from my end!` },
    { id:'fu3', title:'Status Check', context:'2+ weeks post-application',
      message:`Hi [Name],\n\nI hope you're well! I applied for [Role] [X weeks] ago and wanted to follow up.\n\nI remain very interested — [Company]'s approach to [specific thing] is exactly the kind of challenge I'm looking for.\n\nIs there any update on the timeline? Happy to provide any additional info.` },
  ],
  coldOutreach: [
    { id:'co1', title:'To Hiring Manager', context:'Direct, high-signal',
      message:`Hi [Name],\n\nI noticed you're building the PM team at [Company]. I've been following your product journey, especially [feature/launch you admire].\n\nI'm a PM with [X] years specializing in [domain]:\n• [Achievement 1 — quantified]\n• [Achievement 2 — quantified]\n\nI believe I can help [Company] [specific value you can add].\n\nWould you be open to a 15-min call? No pressure at all.\n\nBest` },
    { id:'co2', title:'To a PM at Target Company', context:'Informational first',
      message:`Hi [Name],\n\nYour journey from [previous role/company] to PM at [Company] is really inspiring!\n\nI'm exploring a transition/move into [Company] and would love 15 minutes to understand what the PM role really looks like day-to-day — not just the JD.\n\nNo ask beyond your time and candid perspective. Would you be open to a quick chat?` },
  ],
};
