import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Info from './pages/Info.js';
import Rules from './pages/Rules.js';
import Credits from './pages/Credits.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Admin from './pages/Admin.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/info', component: Info },
    { path: '/rules', component: Rules },
    { path: '/credits', component: Credits },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/admin', component: Admin },
];
