export const BARTENDER_CHOICES = [
  { id: "night", question: "What happened last night?", answer: "You came in alone. Next thing I knew, you were asleep in that booth. I didn't see what happened before that." },
  { id: "exit", question: "Where’s the way out?", answer: "The green-lit back door, past the booths. It opens onto Canal Street." },
  { id: "home", question: "How do I get home?", answer: "Turn left outside and follow the pavement for two blocks. Your place is number 17, the little stone house with the teal door and porch light, just past the second crossing." },
] as const;

export const WITNESS_CHOICES = [
  { id: 'night', question: 'Did you see what happened to me?', answer: 'I was out here last night. I might know something about what happened to you. Spare me some money and we can talk.' },
  { id: 'money', question: 'You want money for telling me?', answer: 'I could use something to eat. Help me out with some money, and I’ll tell you what I know.' },
  { id: 'later', question: 'I’ll come back.', answer: 'I’ll be around here. Come find me when you’re ready.' },
] as const;