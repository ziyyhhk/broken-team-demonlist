export default [
    { path: '/', component: () => import('./pages/List.js') },
    { path: '/leaderboard', component: () => import('./pages/Leaderboard.js') },
    { path: '/roulette', component: () => import('./pages/Roulette.js') },
    { path: '/server-hardest', component: () => import('./pages/ServerHardest.js') },
    { path: '/info', component: () => import('./pages/Info.js') },
    { path: '/rules', component: () => import('./pages/Rules.js') },
    { path: '/credits', component: () => import('./pages/Credits.js') },
    { path: '/login', component: () => import('./pages/Login.js') },
    { path: '/register', component: () => import('./pages/Register.js') },
    { path: '/admin', component: () => import('./pages/Admin.js?v=8') },
];
