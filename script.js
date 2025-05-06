document.addEventListener('DOMContentLoaded', () => {
    // International place value names
    const INT_PLACE_VALUES = [
        { value: 1, name: "Ones" },
        { value: 10, name: "Tens" },
        { value: 100, name: "Hundreds" },
        { value: 1000, name: "Thousands" },
        { value: 10000, name: "Ten Thousands" },
        { value: 100000, name: "Hundred Thousands" },
        { value: 1000000, name: "Millions" },
        { value: 10000000, name: "Ten Millions" },
        { value: 100000000, name: "Hundred Millions" },
        { value: 1000000000, name: "Billions" }
    ];

    // Game state
    const gameState = {
        targetNumber: 0,
        currentDigits: [],
        score: 0,
        timeLeft: 60,
        gameActive: false,
        difficulty: "medium",
        placeValueSlots: [],
        crates: [],
        batchInProgress: false,
        soundOn: true
    };

    // Conveyor constants
    const CRATE_WIDTH = 70;
    const CRATE_SPACING = 20;
    const CONVEYOR_SPEED = 10000; // ms to cross conveyor
    const ENTRY_DELAY = 800; // ms between crate entries
    const BATCH_SIZE = 3;

    // DOM elements
    const conveyorBelt = document.querySelector('.conveyor-belt');
    const slotsContainer = document.querySelector('.place-value-slots');
    const currentNumberDisplay = document.getElementById('current-number');
    const targetNumberDisplay = document.getElementById('target-number');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const soundToggle = document.querySelector('.sound-toggle');
    const machineLights = document.querySelectorAll('.machine-light');

    // Format numbers with commas
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Initialize game
    function initGame() {
        // Reset game state
        gameState.targetNumber = 0;
        gameState.currentDigits = [];
        gameState.score = 0;
        gameState.timeLeft = 60;
        gameState.gameActive = true;
        gameState.batchInProgress = false;
        gameState.crates = [];

        // Generate target number
        generateTargetNumber();
        gameState.currentDigits = Array(gameState.targetNumber.toString().length).fill(null);

        // Create place value slots
        createPlaceValueSlots();

        // Update displays
        updateDisplays();

        // Start systems
        startConveyor();
        startTimer();

        // Visual feedback
        animateMachineLights();
    }

    // Generate target number based on difficulty
    function generateTargetNumber() {
        let minDigits, maxDigits;

        switch (gameState.difficulty) {
            case "easy":
                minDigits = 1;
                maxDigits = 3;
                break;
            case "hard":
                minDigits = 7;
                maxDigits = 9;
                break;
            default: // medium
                minDigits = 4;
                maxDigits = 6;
        }

        const digits = Math.floor(Math.random() * (maxDigits - minDigits + 1)) + minDigits;
        gameState.targetNumber = Math.floor(Math.random() * (10 ** digits - 10 ** (digits - 1))) + 10 ** (digits - 1);
        targetNumberDisplay.textContent = formatNumber(gameState.targetNumber);
    }

    // Create place value slots
    function createPlaceValueSlots() {
        slotsContainer.innerHTML = '';
        gameState.placeValueSlots = [];
        const targetStr = gameState.targetNumber.toString();

        // Add decorative rivets (from your HTML)
        slotsContainer.innerHTML = `
            <div class="detail-rivets detail-rivet-tl"></div>
            <div class="detail-rivets detail-rivet-tr"></div>
            <div class="detail-rivets detail-rivet-bl"></div>
            <div class="detail-rivets detail-rivet-br"></div>
        `;

        // Create slots from right to left (ones first)
        for (let i = 0; i < targetStr.length; i++) {
            const placeValueIndex = targetStr.length - 1 - i;
            const placeValue = INT_PLACE_VALUES[i];
            if (!placeValue) break;

            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.value = placeValue.value;
            slot.dataset.position = placeValueIndex;
            slot.dataset.expectedDigit = targetStr[placeValueIndex];

            slot.innerHTML = `
                <div class="slot-label">${placeValue.name}</div>
                <div class="slot-value">${formatNumber(placeValue.value)}</div>
                <div class="slot-digit"></div>
            `;

            // Set up drag and drop
            slot.addEventListener('dragover', e => e.preventDefault());
            slot._dropHandler = e => {
                e.preventDefault();
                const digit = e.dataTransfer.getData('text/plain');
                handleDrop(digit, parseInt(slot.dataset.position), slot);
            };
            slot.addEventListener('drop', slot._dropHandler);

            slotsContainer.appendChild(slot);
            gameState.placeValueSlots.push(slot);
        }

        // Reverse to show highest place first
        const slots = [...gameState.placeValueSlots].reverse();
        gameState.placeValueSlots = slots;
        slots.forEach(slot => slotsContainer.appendChild(slot));
    }

    // Get missing digits
    function getMissingDigits() {
        const targetStr = gameState.targetNumber.toString();
        const missingDigits = [];
        for (let i = 0; i < targetStr.length; i++) {
            if (gameState.currentDigits[i] === null) {
                missingDigits.push(targetStr[i]);
            }
        }
        return missingDigits;
    }

    // Start conveyor system
    function startConveyor() {
        conveyorBelt.querySelector('.cargo-container').innerHTML = '';
        gameState.crates = [];
        gameState.batchInProgress = false;
        createBatch();
    }

    // Create batch of crates
    function createBatch() {
        if (!gameState.gameActive || gameState.batchInProgress) return;
        gameState.batchInProgress = true;

        const missingDigits = getMissingDigits();
        if (missingDigits.length === 0) return;

        const correctDigit = missingDigits[Math.floor(Math.random() * missingDigits.length)];

        // Create batch with one correct and two random digits
        const batchDigits = [
            correctDigit,
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
        ];

        // Create crates with staggered entry
        batchDigits.forEach((digit, i) => {
            setTimeout(() => {
                if (gameState.gameActive) createCrate(digit, i, i === 0);
            }, i * ENTRY_DELAY);
        });
    }

    // Create individual crate
    function createCrate(digit, positionInBatch, isFirstInBatch = false) {
        const cargoContainer = conveyorBelt.querySelector('.cargo-container');
        const crate = document.createElement('div');
        crate.className = 'cargo-crate';
        crate.textContent = digit;

        // Position with proper spacing
        const startOffset = positionInBatch * (CRATE_WIDTH + CRATE_SPACING);
        crate.style.left = `-${CRATE_WIDTH + startOffset}px`;
        cargoContainer.appendChild(crate);

        crate.draggable = true;
        crate.addEventListener('dragstart', dragStart);

        let speed = CONVEYOR_SPEED;
        if (gameState.difficulty === "easy") speed = 15000;
        if (gameState.difficulty === "hard") speed = 7000;

        const animation = crate.animate(
            [
                { transform: 'translateX(0)' },
                { transform: `translateX(${conveyorBelt.offsetWidth + CRATE_WIDTH + startOffset}px)` }
            ],
            { duration: speed, fill: 'forwards' }
        );

        // Start next batch when first crate is halfway through
        if (isFirstInBatch) {
            const checkProgress = setInterval(() => {
                if (animation.currentTime > speed * 0.5) {
                    clearInterval(checkProgress);
                    gameState.batchInProgress = false;
                    if (gameState.gameActive) createBatch();
                }
            }, 100);
        }

        animation.onfinish = () => {
            if (crate.parentNode) {
                cargoContainer.removeChild(crate);
                gameState.crates = gameState.crates.filter(c => c !== crate);
            }
        };

        gameState.crates.push(crate);
    }

    // Drag and drop handlers
    function dragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.textContent);
        setTimeout(() => e.target.classList.add('dragging'), 0);
        if (gameState.soundOn) {
            // Play drag sound
        }
    }

    function handleDrop(digit, position, slot) {
        const draggingCrate = document.querySelector('.dragging');
        if (draggingCrate) {
            draggingCrate.classList.remove('dragging');
            draggingCrate.parentNode.removeChild(draggingCrate);
            gameState.crates = gameState.crates.filter(c => c !== draggingCrate);

            if (digit === slot.dataset.expectedDigit) {
                // Correct placement
                gameState.currentDigits[position] = digit;
                const digitDisplay = slot.querySelector('.slot-digit');
                digitDisplay.textContent = digit;
                digitDisplay.classList.add('correct-digit');
                slot.classList.add('disabled');
                slot.removeEventListener('drop', slot._dropHandler);
                updateCurrentNumberDisplay();
                checkCompletion();

                // Visual feedback
                slot.classList.add('correct-flash');
                setTimeout(() => slot.classList.remove('correct-flash'), 500);

                if (gameState.soundOn) {
                    // Play correct sound
                }
            } else {
                // Incorrect placement
                gameState.score = Math.max(0, gameState.score - 10);
                updateDisplays();

                // Visual feedback
                slot.classList.add('incorrect-flash');
                setTimeout(() => slot.classList.remove('incorrect-flash'), 500);

                if (gameState.soundOn) {
                    // Play incorrect sound
                }
            }
        }
    }

    // Timer system
    function startTimer() {
        const timer = setInterval(() => {
            if (!gameState.gameActive) {
                clearInterval(timer);
                return;
            }

            gameState.timeLeft--;
            timerDisplay.textContent = gameState.timeLeft;

            if (gameState.timeLeft <= 0) {
                clearInterval(timer);
                endGame();
            }
        }, 1000);
    }

    // Update displays
    function updateCurrentNumberDisplay() {
        const displayParts = [];
        const numDigits = gameState.currentDigits.length;

        for (let i = numDigits - 1; i >= 0; i--) {
            const digit = gameState.currentDigits[i];
            displayParts.unshift(digit !== null ? digit : '_');
            if (i > 0 && (numDigits - i) % 3 === 0) {
                displayParts.unshift(',');
            }
        }

        currentNumberDisplay.textContent = displayParts.join('');
    }

    function updateDisplays() {
        targetNumberDisplay.textContent = formatNumber(gameState.targetNumber);
        updateCurrentNumberDisplay();
        scoreDisplay.textContent = formatNumber(gameState.score);
        timerDisplay.textContent = gameState.timeLeft;
    }

    // Check game completion
    function checkCompletion() {
        if (gameState.currentDigits.every(digit => digit !== null)) {
            const points = gameState.difficulty === "easy" ? 50 :
                gameState.difficulty === "hard" ? 200 : 100;
            gameState.score += points;

            // Visual celebration
            targetNumberDisplay.classList.add('celebrate');
            setTimeout(() => {
                targetNumberDisplay.classList.remove('celebrate');
                showCongratulatoryModal(points);
            }, 1000);
        }
    }

    // Create confetti animation
    function createConfetti() {
        const container = document.getElementById('confetti-container');
        const colors = ['red', 'blue', 'yellow', 'green'];

        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;

            // Random position, rotation and size
            const size = Math.random() * 10 + 5;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = `-${size}px`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

            // Animation
            confetti.style.animation = `
            fall ${Math.random() * 3 + 2}s linear forwards,
            sway ${Math.random() * 5 + 3}s ease-in-out infinite alternate
          `;

            container.appendChild(confetti);

            // Remove confetti after animation
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }

    // Show success modal
    function showCongratulatoryModal(points) {

        document.querySelector('.game-modal-backdrop').style.display = 'flex';
        document.querySelector('.result-value').textContent = gameState.targetNumber.toString();
        createConfetti()
        // Close modal or go to next level
        document.querySelector('.next-btn').addEventListener('click', function () {
            // Replace with your game's next level function
            console.log('Moving to next number');
            document.querySelector('.game-modal-backdrop').style.display = 'none';
        });
    }

    // End game
    function endGame() {
        gameState.gameActive = false;
        
    }

    // Animate machine lights
    function animateMachineLights() {
        machineLights.forEach((light, i) => {
            setInterval(() => {
                light.style.opacity = light.style.opacity === '0.3' ? '1' : '0.3';
            }, 1000 + (i * 300));
        });
    }

    // Toggle sound
    soundToggle.addEventListener('click', () => {
        gameState.soundOn = !gameState.soundOn;
        soundToggle.innerHTML = gameState.soundOn
            ? '<i class="fas fa-volume-up"></i>'
            : '<i class="fas fa-volume-mute"></i>';
    });

    // Initialize game
    initGame();
});