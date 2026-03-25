import './globals.css';

export const metadata = {
    title: 'AI Cricket Bowling Coach — ML-Powered Coaching System',
    description: 'Advanced AI bowling coach with real-time video analysis using MediaPipe pose detection, biomechanical analysis, performance tracking, and personalized training plans for cricket bowlers.',
    keywords: 'cricket, bowling, AI coach, biomechanics, MediaPipe, pose detection, training',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏏</text></svg>" />
            </head>
            <body>
                <nav className="navbar">
                    <a href="/" className="navbar-logo">
                        <div className="navbar-logo-icon">🏏</div>
                        <span className="navbar-logo-text">BowlCoach AI</span>
                    </a>
                    <ul className="navbar-links">
                        <li><a href="/">Home</a></li>
                        <li><a href="/analysis">Analysis</a></li>
                        <li><a href="/dashboard">Dashboard</a></li>
                        <li><a href="/training">Training</a></li>
                    </ul>
                </nav>

                <main>{children}</main>

                <footer className="footer">
                    <p>© 2026 BowlCoach AI — ML-Powered Cricket Bowling Intelligence</p>
                </footer>
            </body>
        </html>
    );
}
