import React, { useState, useEffect } from 'react';
import './TypingGame.css';

const sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Programming is fun and challenging.",
    "Practice makes perfect.",
    "Keep coding and learning new things.",
    "Hard work beats Talent",
];

const TypingGame = ({ score, setScore, socket }) => {
    const [currentSentence, setCurrentSentence] = useState('');
    const [userInput, setUserInput] = useState('');
    const [time, setTime] = useState(10);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [accuracy, setAccuracy] = useState(100);
    const [wordsPerMinute, setWordsPerMinute] = useState(0);
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        setCurrentSentence(sentences[Math.floor(Math.random() * sentences.length)]);
    }, []);

    useEffect(() => {
        if (time > 0 && isGameStarted) {
            const timer = setTimeout(() => setTime(time - 1), 1000);
            return () => clearTimeout(timer);
        } else if (time === 0 && isGameStarted) {
            if (socket) {
                socket.emit("game_over", wordsPerMinute); // Send WPM as score
            }
        }
    }, [time, isGameStarted]);

    const calculateWPM = (text, timeElapsed) => {
        const words = text.trim().split(/\s+/).length;
        const minutes = timeElapsed / 60;
        return Math.round(words / minutes);
    };

    const calculateAccuracy = (input, target) => {
        if (input.length === 0) return 100;
        let correct = 0;
        input.split('').forEach((char, i) => {
            if (char === target[i]) correct++;
        });
        return Math.round((correct / input.length) * 100);
    };

    const handleInput = (e) => {
        const value = e.target.value;
        setUserInput(value);

        if (!isGameStarted) {
            setIsGameStarted(true);
            setStartTime(Date.now());
        }

        // Calculate accuracy
        setAccuracy(calculateAccuracy(value, currentSentence));

        // Calculate WPM and update score
        if (startTime) {
            const timeElapsed = (Date.now() - startTime) / 1000;
            const currentWPM = calculateWPM(value, timeElapsed);
            setWordsPerMinute(currentWPM);
            
            // IMPORTANT: Just emit the raw score number
            if (socket) {
                socket.emit("score_update", Math.round(currentWPM));
            }
        }

        if (value === currentSentence) {
            setUserInput('');
            setCurrentSentence(sentences[Math.floor(Math.random() * sentences.length)]);
            // Reset start time for new sentence
            setStartTime(Date.now());
        }
    };

    return (
        <div className="typing-game">
            <div className="stats-container">
                <div className="stat-card">
                    <div className="stat-icon time-icon">⏱️</div>
                    <div className="stat-label">Time</div>
                    <div className="stat-value">{time}s</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon score-icon"></div>
                    <div className="stat-label">WPM</div>
                    <div className="stat-value">{wordsPerMinute}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon accuracy-icon">📊</div>
                    <div className="stat-label">Accuracy</div>
                    <div className="stat-value">{accuracy}%</div>
                </div>
            </div>

            <div className="accuracy-container">
                <div className="accuracy-label">Progress</div>
                <div className="accuracy-bar">
                    <div 
                        className="accuracy-fill"
                        style={{ width: `${accuracy}%` }}
                    ></div>
                </div>
            </div>

            <div className="sentence-container">
                {currentSentence.split('').map((char, index) => (
                    <span
                        key={index}
                        className={
                            index < userInput.length
                                ? userInput[index] === char
                                    ? 'correct'
                                    : 'incorrect'
                                : ''
                        }
                    >
                        {char}
                    </span>
                ))}
            </div>

            <input
                type="text"
                value={userInput}
                onChange={handleInput}
                disabled={time === 0}
                placeholder="Start typing..."
                className="typing-input"
            />

            {time === 0 && (
                <div className="game-over">
                    <div className="game-over-title">Game Over!</div>
                    <div className="final-score">Final WPM: {wordsPerMinute}</div>
                </div>
            )}
        </div>
    );
};

export default TypingGame;
