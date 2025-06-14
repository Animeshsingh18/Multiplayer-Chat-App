import React, { useState, useEffect } from 'react';
import TypingGame from './components/TypingGame';
import './App.css';
import io from 'socket.io-client';
import Swal from 'sweetalert2';
import ChatBox from './components/ChatBox';

const App = () => {
    const [socket, setSocket] = useState(null);
    const [playerName, setPlayerName] = useState("");
    const [gameState, setGameState] = useState('login');
    const [players, setPlayers] = useState({
        count: 0,
        required: 4,
        list: []
    });
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        if (socket) {
            socket.on("waiting_for_players", ({ currentPlayers, requiredPlayers, players }) => {
                console.log(`Waiting for players: ${currentPlayers}/${requiredPlayers}`);
                setGameState('waiting');
                setPlayers({
                    count: currentPlayers,
                    required: requiredPlayers,
                    list: players || []
                });
            });

            socket.on("game_start", ({ players }) => {
                console.log("Game starting!", players);
                setGameState('playing');
                setPlayers(prev => ({
                    ...prev,
                    list: players
                }));
                setIsGameOver(false);
                setScore(0);
            });

            socket.on("players_update", (updatedPlayers) => {
                setPlayers(prev => ({
                    ...prev,
                    list: updatedPlayers
                }));
            });

            socket.on("score_update", ({ playerId, newScore }) => {
                setPlayers(prev => ({
                    ...prev,
                    list: prev.list.map(player =>
                        player.id === playerId
                            ? { ...player, score: newScore }
                            : player
                    )
                }));
            });

            socket.on("show_leaderboard", (leaderboardData) => {
                console.log("Showing leaderboard:", leaderboardData);
                setLeaderboard(leaderboardData);
                setGameState('leaderboard');
            });

            return () => {
                socket.off("players_update");
            };
        }
    }, [socket]);

    const playOnlineClick = async () => {
        const result = await Swal.fire({
            title: "Enter your name",
            input: "text",
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return "You need to write something!";
                }
            },
        });

        if (result.isConfirmed) {
            const username = result.value;
            setPlayerName(username);

            const newSocket = io("http://localhost:3000");
            newSocket.on("connect", () => {
                console.log("Connected to server!");
                newSocket.emit("request_to_play", {
                    playerName: username
                });
            });

            setSocket(newSocket);
        }
    };

    // Render leaderboard screen
    if (gameState === 'leaderboard') {
        return (
            <div className="leaderboard-container">
                <div className="leaderboard-card">
                    <div className="trophy-animation">👑</div>
                    <h2 className="leaderboard-title">Game Over - Final Rankings</h2>
                    <div className="leaderboard-list">
                        {leaderboard.map((player, index) => (
                            <div
                                key={index}
                                className={`leaderboard-item rank-${index + 1}`}
                            >
                                <div className="rank-badge">{index + 1}</div>
                                <div className="player-info">
                                    <div className="player-name">{player.name}</div>
                                    <div className="player-score">{player.score} points</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        className="play-again-btn"
                        onClick={() => {
                            setGameState('login');
                            setLeaderboard([]);
                            setScore(0);
                            if (socket) {
                                socket.disconnect();
                                setSocket(null);
                            }
                        }}
                    >
                        Play Again
                    </button>
                </div>
            </div>
        );
    }

    // Render waiting room
    if (gameState === 'waiting') {
        return (
            <div className="waiting-container">
                <div className="waiting-card">
                    <h2 className="waiting-title">Waiting for Players</h2>
                    <div className="players-count">
                        <p>Players in room: {players.count} / {players.required}</p>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${(players.count / players.required) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="players-grid">
                        {players.list && players.list.map((player, index) => (
                            <div key={index} className="player-item">
                                {player.name}
                            </div>
                        ))}
                        {[...Array(players.required - players.count)].map((_, index) => (
                            <div key={`empty-${index}`} className="player-item empty">
                                Waiting...
                            </div>
                        ))}
                    </div>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    // Render login screen
    if (gameState === 'login') {
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="login-content">
                        <h1 className="login-title">TypeChamp</h1>
                        <p className="login-subtitle">
                            Compete with 3 other players in this typing challenge!
                        </p>
                        <button className="login-button" onClick={playOnlineClick}>
                            Login to Play
                        </button>
                    </div>
                    <div className="login-image">
                        <img
                            src="https://whisper.favour.dev/landing%20page%20image.jpg"
                            alt="Landing Page"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Render game screen
    return (
        <div className="game-container">
            <div className="players-header">
                {players.list && players.list.map((player, index) => (
                    <div key={index} className="player-score">
                        {player.name}: {player.score}
                    </div>
                ))}
            </div>
            <TypingGame
                score={score}
                setScore={setScore}
                isGameOver={isGameOver}
                setIsGameOver={setIsGameOver}
                socket={socket}
            />
            <ChatBox socket={socket} playerName={playerName} />
        </div>
    );
};

export default App;