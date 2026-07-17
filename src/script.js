"use strict";


/* ========================================
   SELECT HTML ELEMENTS
======================================== */

const playerNameInput = document.getElementById("playerName");

const startButton = document.getElementById("startButton");
const playAgainButton = document.getElementById("playAgainButton");
const closeModalButton = document.getElementById("closeModalButton");

const gameBoard = document.getElementById("gameBoard");
const startMessage = document.getElementById("startMessage");
const gameStatus = document.getElementById("gameStatus");

const timeDisplay = document.getElementById("timeDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const comboDisplay = document.getElementById("comboDisplay");
const accuracyDisplay = document.getElementById("accuracyDisplay");
const lastScoreDisplay = document.getElementById("lastScoreDisplay");
const bestScoreDisplay = document.getElementById("bestScoreDisplay");

const resultModal = document.getElementById("resultModal");
const resultHeading = document.getElementById("resultHeading");
const resultMessage = document.getElementById("resultMessage");
const finalScoreDisplay = document.getElementById("finalScoreDisplay");


/* ========================================
   GAME SETTINGS
======================================== */

const GAME_DURATION = 30;

let score = 0;
let combo = 0;
let bestCombo = 0;

let successfulHits = 0;
let totalClicks = 0;
let missedTargets = 0;

let timeRemaining = GAME_DURATION;
let gameIsRunning = false;

let currentPlayerName = "";
let previousBestScore = 0;

let gameTimer = null;
let spawnTimer = null;
let difficultyTimer = null;

let spawnSpeed = 420;
let targetLifetime = 950;
let maximumTargets = 5;
let targetSize = 68;

let targetId = 0;


/* ========================================
   LOCAL STORAGE
======================================== */

function createPlayerKey(playerName) {
    const safeName = playerName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    return `focusStrike_${safeName}`;
}


function getPlayerData(playerName) {
    const storageKey = createPlayerKey(playerName);
    const storedData = localStorage.getItem(storageKey);

    if (!storedData) {
        return {
            lastScore: 0,
            bestScore: 0,
            bestCombo: 0
        };
    }

    try {
        const parsedData = JSON.parse(storedData);

        return {
            lastScore: parsedData.lastScore || 0,
            bestScore: parsedData.bestScore || 0,
            bestCombo: parsedData.bestCombo || 0
        };
    } catch (error) {
        console.error("Unable to read saved player data:", error);

        return {
            lastScore: 0,
            bestScore: 0,
            bestCombo: 0
        };
    }
}


function savePlayerData(playerName, finalScore) {
    const oldData = getPlayerData(playerName);

    const updatedData = {
        lastScore: finalScore,

        bestScore: Math.max(
            oldData.bestScore,
            finalScore
        ),

        bestCombo: Math.max(
            oldData.bestCombo,
            bestCombo
        )
    };

    localStorage.setItem(
        createPlayerKey(playerName),
        JSON.stringify(updatedData)
    );

    return updatedData;
}


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


/* ========================================
   START GAME
======================================== */

function startGame() {
    const enteredName = playerNameInput.value.trim();

    if (!enteredName) {
        playerNameInput.focus();
        playerNameInput.classList.add("input-error");

        setTimeout(() => {
            playerNameInput.classList.remove("input-error");
        }, 1000);

        return;
    }

    clearGameTimers();
    removeGameElements();

    currentPlayerName = enteredName;

    const playerData = getPlayerData(currentPlayerName);

    previousBestScore = playerData.bestScore;

    score = 0;
    combo = 0;
    bestCombo = 0;

    successfulHits = 0;
    totalClicks = 0;
    missedTargets = 0;

    timeRemaining = GAME_DURATION;
    gameIsRunning = true;

    spawnSpeed = 420;
    targetLifetime = 950;
    maximumTargets = 5;
    targetSize = 68;

    timeDisplay.classList.remove("time-warning");
    comboDisplay.classList.remove("combo-active");

    startMessage.style.display = "none";
    resultModal.classList.remove("show");
    resultModal.setAttribute("aria-hidden", "true");

    playerNameInput.disabled = true;

    startButton.disabled = true;
    startButton.textContent = "Game Running";

    gameStatus.textContent = "Level 1";

    lastScoreDisplay.textContent = playerData.lastScore;
    bestScoreDisplay.textContent = playerData.bestScore;

    updateGameDisplay();

    createStartingTargets();
    startSpawnLoop();

    gameTimer = setInterval(() => {
        timeRemaining -= 1;

        updateGameDisplay();

        if (timeRemaining <= 5) {
            timeDisplay.classList.add("time-warning");
        }

        if (timeRemaining <= 0) {
            endGame();
        }
    }, 1000);

    difficultyTimer = setInterval(() => {
        increaseDifficulty();
    }, 5000);
}


function createStartingTargets() {
    for (let i = 0; i < 4; i += 1) {
        setTimeout(() => {
            if (gameIsRunning) {
                createTarget();
            }
        }, i * 90);
    }
}


/* ========================================
   TARGET SPAWNING
======================================== */

function startSpawnLoop() {
    clearInterval(spawnTimer);

    spawnTimer = setInterval(() => {
        if (!gameIsRunning) {
            return;
        }

        const targetsOnBoard =
            gameBoard.querySelectorAll(".target").length;

        if (targetsOnBoard >= maximumTargets) {
            return;
        }

        const availableSpaces =
            maximumTargets - targetsOnBoard;

        const desiredAmount = getSpawnAmount();

        const targetsToCreate = Math.min(
            desiredAmount,
            availableSpaces
        );

        for (let i = 0; i < targetsToCreate; i += 1) {
            createTarget();
        }
    }, spawnSpeed);
}


function getSpawnAmount() {
    if (timeRemaining <= 5) {
        return randomNumber(3, 5);
    }

    if (timeRemaining <= 10) {
        return randomNumber(3, 4);
    }

    if (timeRemaining <= 20) {
        return randomNumber(2, 3);
    }

    return randomNumber(1, 3);
}


/* ========================================
   CREATE TARGET
======================================== */

function createTarget() {
    if (!gameIsRunning) {
        return;
    }

    targetId += 1;

    const target = document.createElement("button");

    target.type = "button";
    target.className = "target";
    target.dataset.targetId = String(targetId);

    target.setAttribute(
        "aria-label",
        "Click reaction target"
    );

    const targetType = chooseTargetType();

    target.classList.add(targetType.className);

    target.dataset.points = String(targetType.points);
    target.dataset.targetType = targetType.type;

    const sizeVariation = randomNumber(-9, 7);

    const currentSize = Math.max(
        36,
        targetSize + sizeVariation
    );

    target.style.width = `${currentSize}px`;
    target.style.height = `${currentSize}px`;

    positionTarget(target, currentSize);

    target.innerHTML = `
        <span class="target-centre"></span>

        ${
            targetType.label
                ? `
                    <span class="target-label">
                        ${targetType.label}
                    </span>
                `
                : ""
        }
    `;

    gameBoard.appendChild(target);

    requestAnimationFrame(() => {
        target.classList.add("target-visible");
    });

    target.addEventListener(
        "click",
        handleTargetHit
    );

    const lifetimeVariation =
        randomNumber(-120, 130);

    const currentLifetime = Math.max(
        390,
        targetLifetime + lifetimeVariation
    );

    target.expireTimer = setTimeout(() => {
        expireTarget(target);
    }, currentLifetime);
}


function chooseTargetType() {
    const chance = Math.random();

    if (chance < 0.08) {
        return {
            type: "bomb",
            className: "bomb-target",
            points: -20,
            label: "AVOID"
        };
    }

    if (chance < 0.20) {
        return {
            type: "gold",
            className: "gold-target",
            points: 25,
            label: "+25"
        };
    }

    if (chance < 0.34) {
        return {
            type: "speed",
            className: "speed-target",
            points: 18,
            label: "FAST"
        };
    }

    return {
        type: "normal",
        className: "normal-target",
        points: 10,
        label: ""
    };
}


/* ========================================
   TARGET POSITIONING
======================================== */

function positionTarget(target, size) {
    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;

    const maximumX = Math.max(
        8,
        boardWidth - size - 8
    );

    const maximumY = Math.max(
        8,
        boardHeight - size - 8
    );

    let randomX = 8;
    let randomY = 8;

    let attempts = 0;
    let overlapsExistingTarget = true;

    while (
        overlapsExistingTarget &&
        attempts < 15
    ) {
        randomX = randomNumber(8, maximumX);
        randomY = randomNumber(8, maximumY);

        overlapsExistingTarget = checkTargetOverlap(
            randomX,
            randomY,
            size
        );

        attempts += 1;
    }

    target.style.left = `${randomX}px`;
    target.style.top = `${randomY}px`;
}


function checkTargetOverlap(x, y, size) {
    const existingTargets =
        gameBoard.querySelectorAll(".target");

    return Array.from(existingTargets).some(
        (existingTarget) => {
            const existingX =
                parseFloat(existingTarget.style.left) || 0;

            const existingY =
                parseFloat(existingTarget.style.top) || 0;

            const existingSize =
                existingTarget.offsetWidth || size;

            const horizontalDistance =
                Math.abs(x - existingX);

            const verticalDistance =
                Math.abs(y - existingY);

            const minimumDistance =
                Math.min(size, existingSize) * 0.7;

            return (
                horizontalDistance < minimumDistance &&
                verticalDistance < minimumDistance
            );
        }
    );
}


/* ========================================
   TARGET INTERACTIONS
======================================== */

function handleTargetHit(event) {
    event.stopPropagation();

    if (!gameIsRunning) {
        return;
    }

    const target = event.currentTarget;

    if (
        target.classList.contains("target-hit") ||
        target.classList.contains("target-missed")
    ) {
        return;
    }

    clearTimeout(target.expireTimer);

    totalClicks += 1;

    const targetType = target.dataset.targetType;
    const basePoints = Number(target.dataset.points);

    if (targetType === "bomb") {
        handleBombHit(target, event);

        return;
    }

    successfulHits += 1;
    combo += 1;

    if (combo > bestCombo) {
        bestCombo = combo;
    }

    const comboBonus = calculateComboBonus();
    const pointsEarned = basePoints + comboBonus;

    score += pointsEarned;

    showFloatingPoints(
        target,
        `+${pointsEarned}`,
        false
    );

    createHitEffect(
        event.clientX,
        event.clientY
    );

    flashBoard("success");

    target.classList.add("target-hit");

    setTimeout(() => {
        target.remove();
    }, 130);

    updateGameDisplay();
}


function handleBombHit(target, event) {
    combo = 0;
    score = Math.max(0, score - 20);

    showFloatingPoints(
        target,
        "-20",
        true
    );

    createHitEffect(
        event.clientX,
        event.clientY
    );

    flashBoard("miss");

    target.classList.add("target-hit");

    setTimeout(() => {
        target.remove();
    }, 130);

    updateGameDisplay();
}


function expireTarget(target) {
    if (!target.isConnected) {
        return;
    }

    const targetType = target.dataset.targetType;

    if (targetType !== "bomb") {
        missedTargets += 1;
        combo = 0;
    }

    target.classList.add("target-missed");

    setTimeout(() => {
        target.remove();
    }, 170);

    updateGameDisplay();
}


function handleBoardMiss(event) {
    if (!gameIsRunning) {
        return;
    }

    if (event.target.closest(".target")) {
        return;
    }

    totalClicks += 1;
    combo = 0;

    score = Math.max(0, score - 5);

    const boardRect =
        gameBoard.getBoundingClientRect();

    const clickX =
        event.clientX - boardRect.left;

    const clickY =
        event.clientY - boardRect.top;

    showMissText(clickX, clickY);
    flashBoard("miss");

    updateGameDisplay();
}


/* ========================================
   SCORE AND ACCURACY
======================================== */

function calculateComboBonus() {
    if (combo >= 20) {
        return 15;
    }

    if (combo >= 10) {
        return 10;
    }

    if (combo >= 5) {
        return 5;
    }

    return 0;
}


function calculateAccuracy() {
    if (totalClicks === 0) {
        return 100;
    }

    return Math.round(
        (successfulHits / totalClicks) * 100
    );
}


function updateGameDisplay() {
    scoreDisplay.textContent = score;
    comboDisplay.textContent = `${combo}x`;
    accuracyDisplay.textContent =
        `${calculateAccuracy()}%`;

    timeDisplay.textContent =
        Math.max(0, timeRemaining);

    if (combo >= 5) {
        comboDisplay.classList.add("combo-active");
    } else {
        comboDisplay.classList.remove("combo-active");
    }
}


/* ========================================
   DIFFICULTY SYSTEM
======================================== */

function increaseDifficulty() {
    if (!gameIsRunning) {
        return;
    }

    spawnSpeed = Math.max(
        150,
        spawnSpeed - 55
    );

    targetLifetime = Math.max(
        390,
        targetLifetime - 90
    );

    maximumTargets = Math.min(
        13,
        maximumTargets + 2
    );

    targetSize = Math.max(
        40,
        targetSize - 5
    );

    const secondsPlayed =
        GAME_DURATION - timeRemaining;

    const difficultyLevel =
        Math.floor(secondsPlayed / 5) + 1;

    gameStatus.textContent =
        `Level ${difficultyLevel}`;

    gameBoard.classList.add(
        "difficulty-pulse"
    );

    setTimeout(() => {
        gameBoard.classList.remove(
            "difficulty-pulse"
        );
    }, 400);

    createDifficultyMessage(
        difficultyLevel
    );

    startSpawnLoop();
}


/* ========================================
   VISUAL EFFECTS
======================================== */

function showFloatingPoints(
    target,
    text,
    isPenalty
) {
    const pointText =
        document.createElement("span");

    pointText.className = isPenalty
        ? "miss-text"
        : "floating-points";

    pointText.textContent = text;

    const targetX =
        parseFloat(target.style.left) +
        target.offsetWidth / 2;

    const targetY =
        parseFloat(target.style.top) +
        target.offsetHeight / 2;

    pointText.style.left = `${targetX}px`;
    pointText.style.top = `${targetY}px`;

    gameBoard.appendChild(pointText);

    setTimeout(() => {
        pointText.remove();
    }, 700);
}


function showMissText(x, y) {
    const missText =
        document.createElement("span");

    missText.className = "miss-text";
    missText.textContent = "-5";

    missText.style.left = `${x}px`;
    missText.style.top = `${y}px`;

    gameBoard.appendChild(missText);

    setTimeout(() => {
        missText.remove();
    }, 650);
}


function createHitEffect(clientX, clientY) {
    const boardRect =
        gameBoard.getBoundingClientRect();

    const effect =
        document.createElement("span");

    effect.className = "hit-effect";

    effect.style.left =
        `${clientX - boardRect.left}px`;

    effect.style.top =
        `${clientY - boardRect.top}px`;

    gameBoard.appendChild(effect);

    setTimeout(() => {
        effect.remove();
    }, 400);
}


function flashBoard(type) {
    gameBoard.classList.remove(
        "successful-hit",
        "missed-click"
    );

    if (type === "success") {
        gameBoard.classList.add(
            "successful-hit"
        );
    } else {
        gameBoard.classList.add(
            "missed-click"
        );
    }

    setTimeout(() => {
        gameBoard.classList.remove(
            "successful-hit",
            "missed-click"
        );
    }, 100);
}


function createDifficultyMessage(level) {
    const message =
        document.createElement("div");

    message.className =
        "difficulty-message";

    message.textContent =
        `LEVEL ${level}`;

    gameBoard.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 900);
}


/* ========================================
   END GAME
======================================== */

function endGame() {
    if (!gameIsRunning) {
        return;
    }

    gameIsRunning = false;

    clearGameTimers();
    removeGameElements();

    startButton.disabled = false;
    startButton.textContent =
        "Start New Game";

    playerNameInput.disabled = false;

    gameStatus.textContent = "Complete";

    timeDisplay.textContent = "0";
    timeDisplay.classList.remove(
        "time-warning"
    );

    const updatedData = savePlayerData(
        currentPlayerName,
        score
    );

    lastScoreDisplay.textContent =
        updatedData.lastScore;

    bestScoreDisplay.textContent =
        updatedData.bestScore;

    finalScoreDisplay.textContent = score;

    showGameResult(updatedData);
}


function showGameResult(updatedData) {
    const accuracy = calculateAccuracy();

    if (
        score > previousBestScore &&
        previousBestScore > 0
    ) {
        resultHeading.textContent =
            "New personal best!";

        resultMessage.textContent =
            `${currentPlayerName}, you scored ${score} points, ` +
            `reached a ${bestCombo}x combo and achieved ` +
            `${accuracy}% accuracy. You beat your previous record ` +
            `of ${previousBestScore}.`;
    } else if (
        score === previousBestScore &&
        previousBestScore > 0
    ) {
        resultHeading.textContent =
            "You matched your record";

        resultMessage.textContent =
            `${currentPlayerName}, you matched your best score of ` +
            `${score}. Your best combo was ${bestCombo}x and your ` +
            `accuracy was ${accuracy}%.`;
    } else if (previousBestScore === 0) {
        resultHeading.textContent =
            "First score recorded";

        resultMessage.textContent =
            `${currentPlayerName}, your score of ${score} has been saved. ` +
            `Your best combo was ${bestCombo}x with ${accuracy}% accuracy.`;
    } else {
        resultHeading.textContent =
            "Challenge complete";

        resultMessage.textContent =
            `${currentPlayerName}, you scored ${score}. ` +
            `Your personal record remains ${updatedData.bestScore}. ` +
            `Your accuracy was ${accuracy}% and your best combo was ` +
            `${bestCombo}x.`;
    }

    resultModal.classList.add("show");

    resultModal.setAttribute(
        "aria-hidden",
        "false"
    );
}


/* ========================================
   HELPER FUNCTIONS
======================================== */

function randomNumber(minimum, maximum) {
    return Math.floor(
        Math.random() *
        (maximum - minimum + 1)
    ) + minimum;
}


function removeGameElements() {
    const gameElements =
        gameBoard.querySelectorAll(
            ".target, " +
            ".floating-points, " +
            ".miss-text, " +
            ".hit-effect, " +
            ".difficulty-message"
        );

    gameElements.forEach((element) => {
        if (element.expireTimer) {
            clearTimeout(element.expireTimer);
        }

        element.remove();
    });
}


function clearGameTimers() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    clearInterval(difficultyTimer);

    gameTimer = null;
    spawnTimer = null;
    difficultyTimer = null;
}


function closeResultModal() {
    resultModal.classList.remove("show");

    resultModal.setAttribute(
        "aria-hidden",
        "true"
    );

    startMessage.style.display = "block";

    startMessage.innerHTML = `
        <h2>Ready for another round?</h2>

        <p>
            Your score has been saved.
            Press Start New Game and try to beat your personal record.
        </p>
    `;

    gameStatus.textContent = "Ready";
}


/* ========================================
   EVENT LISTENERS
======================================== */

startButton.addEventListener(
    "click",
    startGame
);


playAgainButton.addEventListener(
    "click",
    () => {
        resultModal.classList.remove("show");

        resultModal.setAttribute(
            "aria-hidden",
            "true"
        );

        startGame();
    }
);


closeModalButton.addEventListener(
    "click",
    closeResultModal
);


playerNameInput.addEventListener(
    "input",
    loadPlayerScores
);


playerNameInput.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Enter" &&
            !gameIsRunning
        ) {
            startGame();
        }
    }
);


gameBoard.addEventListener(
    "click",
    handleBoardMiss
);


resultModal.addEventListener(
    "click",
    (event) => {
        if (event.target === resultModal) {
            closeResultModal();
        }
    }
);


document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" &&
            resultModal.classList.contains("show")
        ) {
            closeResultModal();
        }
    }
)