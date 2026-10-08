// app/src/engagement/tour/tourSteps.js
// 5 steps, one per tab. ids = tab bar targets registered in TabNavigator.js.

export const TOUR_STEPS = [
  {
    id: 'tab_home',
    mood: 'excited',
    title: 'home.',
    line: "your daily drop, deals and what's new on campus.",
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
    line: 'your campus feed and anonymous confessions. say hi.',
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
    line: "your points, badges and savings. that's the tour. sorted.",
  },
];
