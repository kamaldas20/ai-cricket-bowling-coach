import React from 'react';
import './InspirationSection.css';

const InspirationSection = () => {
    const bowlers = [
        { name: 'Jasprit Bumrah', image: 'url-to-bumrah-image', description: 'Known for his unique bowling action and yorkers.' },
        { name: 'Lasith Malinga', image: 'url-to-malinga-image', description: 'Famous for his slinging action and deadly yorkers.' },
        { name: 'Brett Lee', image: 'url-to-brett-lee-image', description: 'One of the fastest bowlers in cricket history.' },
        { name: 'Waqar Younis', image: 'url-to-waqar-younis-image', description: 'Known for his reverse swing and lethal speed.' },
    ];

    return (
        <div className="inspiration-section">
            <h2>Inspiration from World-Class Bowlers</h2>
            <div className="bowlers-container">
                {bowlers.map((bowler, index) => (
                    <div className="bowler-card" key={index}>
                        <img src={bowler.image} alt={bowler.name} className="bowler-image" />
                        <h3>{bowler.name}</h3>
                        <p>{bowler.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InspirationSection;