// app/src/engagement/tour/tourSteps.js
// 5 steps, one per tab. ids = tab bar targets registered in TabNavigator.js.
// Every line says what the tab is for and works for a guest (no points, daily drop
// or missions, which guests don't have).

export const TOUR_STEPS = [
  {
    id: 'tab_home',
    mood: 'excited',
    title: 'home.',
    line: "student deals, top discounts and what's new on campus.",
  },
  {
    id: 'tab_explore',
    mood: 'broke',
    title: 'explore.',
    line: 'every tdc tool in one place: deals, events, travel, scholarships.',
  },
  {
    id: 'tab_social',
    mood: 'cheeky',
    title: 'social.',
    line: 'the campus feed and anonymous confessions from students.',
  },
  {
    id: 'tab_campus',
    mood: 'shook',
    title: 'campus.',
    line: 'resume, jobs and skills for what comes after uni.',
  },
  {
    id: 'tab_profile',
    mood: 'sorted',
    title: 'profile.',
    line: "your account, student card and saved discounts. that's the tour. sorted.",
  },
];
