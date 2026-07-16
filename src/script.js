"use strict";

/* ================================
   SELECT HTML ELEMENTS
================================ */

const playerNameInput = document.getElementById("playerName");
const startButton = document.getElementById("startButton");
const playAgainButton = document.getElementById("playAgainButton");
const closeModalButton = document.getElementById("closeModalButton");

const gameBoard = document.getElementById("gameBoard");
const target = document.getElementById("target");
const startMessage = document.getElementById("startMessage");
const gameStatus = document.getElementById("gameStatus");

const timeDisplay = document.getElementById("timeDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const lastScoreDisplay = document.getElementById("lastScoreDisplay");
const bestScoreDisplay = document.getElementById("bestScoreDisplay");

const resultModal = document.getElementById("resultModal");
const resultHeading = document.getElementById("resultHeading");
const resultMessage = document.getElementById("resultMessage");
const finalScoreDisplay = document.getElementById("finalScoreDisplay");


/* ================================
   GAME SETTINGS
================================ */

const GAME_DURATION = 30;
const TARGET_MOVE_TIME = 1300;

let score = 0;
let timeRemaining = GAME_DURATION;
let gameIsRunning = false;

let timerInterval = null;
let targetTimeout = null;
let targetShownTime = 0;

let currentPlayerName = "";
let previousBestScore = 0;


/* ================================
   PLAYER STORAGE
================================ */

/**
 * Creates a safe storage key using the player's name.
 */
function createPlayerKey(playerName) {
    return `focusStrike_${playerName.trim().toLowerCase()}`;
}


/**
 * Gets the saved score information for a player.
 */
function getPlayerData(playerName) {
    const playerKey = createPlayerKey(playerName);
    const storedData = localStorage.getItem(playerKey);

    if (!storedData) {
        return {
            lastScore: 0,
            bestScore: 0
        };
    }

    try {
        return JSON.parse(storedData);
    } catch (error) {
        console.error("Could not read saved player data:", error);

        return {
            lastScore: 0,
            bestScore: 0
        };
    }
}


/**
 * Saves the player's last score and best score.
 */
function savePlayerData(playerName, finalScore) {
    const oldData = getPlayerData(playerName);

    const newBestScore = Math.max(
        oldData.bestScore,
        finalScore
    );

    const updatedData = {
        lastScore: finalScore,
        bestScore: newBestScore
    };

    const playerKey = createPlayerKey(playerName);

    localStorage.setItem(
        playerKey,
        JSON.stringify(updatedData)
    );

    return updatedData;
}


/**
 * Displays the saved scores when a player enters their name.
 */
function loadPlayerScores() {
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        lastScoreDisplay.textContent = "0";
        bestScoreDisplay.textContent = "0";
        return;
    }

    const playerData = getPlayerData(playerName);

    lastScoreDisplay.textContent = playerData.lastScore;
    bestScoreDisplay.textContent = playerData.bestScore;
}


/* ================================
   GAME FUNCTIONS
================================ */

/**
 * Starts a new game.
 */
function startGame() {
    const enteredName = playerNameInput.value.trim();

    if (!enteredName) {
        playerNameInput.focus();

        playerNameInput.style.borderColor = "#e46b6b";

        setTimeout(() => {
            playerNameInput.style.borderColor = "";
        }, 1500);

        return;
    }

    clearGameTimers();

    currentPlayerName = enteredName;

    const playerData = getPlayerData(currentPlayerName);
    previousBestScore = playerData.bestScore;

    score = 0;
    timeRemaining = GAME_DURATION;
    gameIsRunning = true;

    scoreDisplay.textContent = score;
    timeDisplay.textContent = timeRemaining;
    lastScoreDisplay.textContent = playerData.lastScore;
    bestScoreDisplay.textContent = playerData.bestScore;

    gameStatus.textContent = "Playing";
    startButton.textContent = "Game Running";
    startButton.disabled = true;

    playerNameInput.disabled = true;

    startMessage.style.display = "none";
    resultModal.classList.remove("show");

    moveTarget();

    timerInterval = setInterval(() => {
        timeRemaining -= 1;
        timeDisplay.textContent = timeRemaining;

        if (timeRemaining <= 5) {
            timeDisplay.style.color = "#e46b6b";
        }

        if (timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}


/**
 * Moves the target to a random position.
 */
function moveTarget() {
    if (!gameIsRunning) {
        return;
    }

    clearTimeout(targetTimeout);

    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;

    const targetWidth = target.offsetWidth || 66;
    const targetHeight = target.offsetHeight || 66;

    const maximumX = boardWidth - targetWidth - 10;
    const maximumY = boardHeight - targetHeight - 10;

    const randomX = Math.max(
        5,
        Math.floor(Math.random() * maximumX)
    );

    const randomY = Math.max(
        5,
        Math.floor(Math.random() * maximumY)
    );

    target.style.left = `${randomX}px`;
    target.style.top = `${randomY}px`;

    target.classList.remove("active");

    void target.offsetWidth;

    target.classList.add("active");

    targetShownTime = Date.now();

    targetTimeout = setTimeout(() => {
        moveTarget();
    }, TARGET_MOVE_TIME);
}


/**
 * Calculates points based on reaction speed.
 */
function calculatePoints(reactionTime) {
    if (reactionTime <= 300) {
        return 15;
    }

    if (reactionTime <= 500) {
        return 10;
    }

    if (reactionTime <= 800) {
        return 7;
    }

    return 5;
}


/**
 * Runs whenever the player clicks the target.
 */
function handleTargetClick(event) {
    event.stopPropagation();

    if (!gameIsRunning) {
        return;
    }

    const reactionTime = Date.now() - targetShownTime;
    const pointsEarned = calculatePoints(reactionTime);

    score += pointsEarned;
    scoreDisplay.textContent = score;

    target.animate(
        [
            {
                transform: "scale(1)",
                opacity: 1
            },
            {
                transform: "scale(0.75)",
                opacity: 0.5
            },
            {
                transform: "scale(1)",
                opacity: 1
            }
        ],
        {
            duration: 140
        }
    );

    moveTarget();
}


/**
 * Ends the current game and saves the result.
 */
function endGame() {
    if (!gameIsRunning) {
        return;
    }

    gameIsRunning = false;

    clearGameTimers();

    target.classList.remove("active");

    startButton.disabled = false;
    startButton.textContent = "Start New Game";

    playerNameInput.disabled = false;

    gameStatus.textContent = "Complete";
    timeDisplay.textContent = "0";
    timeDisplay.style.color = "";

    const updatedData = savePlayerData(
        currentPlayerName,
        score
    );

    lastScoreDisplay.textContent = updatedData.lastScore;
    bestScoreDisplay.textContent = updatedData.bestScore;
    finalScoreDisplay.textContent = score;

    showGameResult(updatedData);
}


/**
 * Shows the result message after the game.
 */
function showGameResult(updatedData) {
    if (score > previousBestScore && previousBestScore > 0) {
        resultHeading.textContent = "New personal best!";

        resultMessage.textContent =
            `${currentPlayerName}, you beat your previous best score of ` +
            `${previousBestScore}.`;
    } else if (
        score === previousBestScore &&
        previousBestScore > 0
    ) {
        resultHeading.textContent = "You matched your best score";

        resultMessage.textContent =
            `${currentPlayerName}, one more round could set a new record.`;
    } else if (previousBestScore === 0) {
        resultHeading.textContent = "First score recorded";

        resultMessage.textContent =
            `${currentPlayerName}, your first score has been saved. ` +
            `Try again and beat ${score}.`;
    } else {
        resultHeading.textContent = "Challenge complete";

        resultMessage.textContent =
            `${currentPlayerName}, your best score is still ` +
            `${updatedData.bestScore}. Try again to beat it.`;
    }

    resultModal.classList.add("show");
}


/**
 * Clears all active game timers.
 */
function clearGameTimers() {
    clearInterval(timerInterval);
    clearTimeout(targetTimeout);

    timerInterval = null;
    targetTimeout = null;
}


/**
 * Closes the result modal.
 */
function closeResultModal() {
    resultModal.classList.remove("show");

    startMessage.style.display = "block";

    startMessage.innerHTML = `
        <h2>Ready for another round?</h2>
        <p>
            Your last score has been saved.
            Start a new game and try to beat your best score.
        </p>
    `;

    gameStatus.textContent = "Ready";
}


/* ================================
   EVENT LISTENERS
================================ */

startButton.addEventListener("click", startGame);

playAgainButton.addEventListener("click", () => {
    resultModal.classList.remove("show");
    startGame();
});

closeModalButton.addEventListener(
    "click",
    closeResultModal
);

target.addEventListener(
    "click",
    handleTargetClick
);

playerNameInput.addEventListener(
    "input",
    loadPlayerScores
);

playerNameInput.addEventListener(
    "keydown",
    (event) => {
        if (event.key === "Enter" && !gameIsRunning) {
            startGame();
        }
    }
);

resultModal.addEventListener(
    "click",
    (event) => {
        if (event.target === resultModal) {
            closeResultModal();
        }
    }
)