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
        soundOn: true,
        audio: {
            backgroundMusic: null,
            correctSound: null,
            incorrectSound: null,
            selectSound: null,
            dropSound: null
        }
    };

    // Conveyor constants
    const CRATE_WIDTH = 70;
    const CRATE_SPACING = 20;
    const CONVEYOR_SPEED = 10000; // ms to cross conveyor
    const ENTRY_DELAY = 800; // ms between crate entries

    // DOM elements
    const conveyorBelt = document.querySelector('.conveyor-belt');
    const slotsContainer = document.querySelector('.place-value-slots');
    const currentNumberDisplay = document.getElementById('current-number');
    const targetNumberDisplay = document.getElementById('target-number');
    const scoreDisplay = document.getElementById('score');
    // const timerDisplay = document.getElementById('timer');
    const soundToggle = document.querySelector('.sound-toggle');
    const machineLights = document.querySelectorAll('.machine-light');
    // Get elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const gameContainer = document.getElementById('game-container');
    const startButton = document.getElementById('start-game');

    // Event listener for start button
    startButton.addEventListener('click', function () {
        // Hide welcome screen
        welcomeScreen.style.display = 'none';
        // Show game container
        gameContainer.style.display = 'block';
        // Initialize game
        initGame();
    });

    // Format numbers with commas
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Add this function to initialize audio:
    function initAudio() {
        gameState.audio.backgroundMusic = document.getElementById('background-music');
        // gameState.audio.correctSound = document.getElementById('correct-sound');
        // gameState.audio.incorrectSound = document.getElementById('incorrect-sound');
        gameState.audio.selectSound = document.getElementById('select-sound');
        gameState.audio.dropSound = document.getElementById('drop-sound');

        // Set initial volumes
        gameState.audio.backgroundMusic.volume = 0.3; // 30% volume for background
        // gameState.audio.correctSound.volume = 0.7;
        // gameState.audio.incorrectSound.volume = 0.7;
        // gameState.audio.selectSound.volume = 0.5;

        // Start background music (muted until user interaction)
        // gameState.audio.backgroundMusic.muted = true;
        gameState.audio.backgroundMusic.play().catch(e => console.log("Audio play prevented:", e));
    }

    // Modify your sound toggle button handler:
    soundToggle.addEventListener('click', () => {
        gameState.soundOn = !gameState.soundOn;

        // Update icon
        soundToggle.innerHTML = gameState.soundOn
            ? '<i class="fas fa-volume-up"></i>'
            : '<i class="fas fa-volume-mute"></i>';

        // Toggle all audio
        gameState.audio.backgroundMusic.muted = !gameState.soundOn;

        // Play a test sound when enabling
        if (gameState.soundOn) {
            gameState.audio.selectSound.currentTime = 0;
            gameState.audio.selectSound.play();
        }
    });

    // Initialize game
    function initGame() {
        initAudio(); // Initialize audio
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
        //startTimer();

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

            // Set up tap/click handler
            slot._clickHandler = () => {
                handleSlotClick(slot);
            };
            slot.addEventListener('click', slot._clickHandler);

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
        createCrates()
    }

    function createCrates() {

        setInterval(() => {

            const missingDigits = getMissingDigits();
            const correctDigit = missingDigits[Math.floor(Math.random() * missingDigits.length)];

            // Create batch with one correct and two random digits
            const batchDigits = [
                correctDigit,
                Math.floor(Math.random() * 10),
                Math.floor(Math.random() * 10)
            ];

            batchDigits.forEach((digit, i) => {

                const cargoContainer = conveyorBelt.querySelector('.cargo-container');
                const crate = document.createElement('div');
                crate.className = 'cargo-crate';
                crate.textContent = digit;

                crate.addEventListener('click', () => handleCrateClick(crate));

                // Position with proper spacing
                const startOffset = i * (CRATE_WIDTH + CRATE_SPACING);
                crate.style.left = `-${CRATE_WIDTH + startOffset}px`;
                cargoContainer.appendChild(crate);

                let speed = CONVEYOR_SPEED;
                if (gameState.difficulty === "easy") speed = 15000;
                if (gameState.difficulty === "hard") speed = 7000;

                const animation = crate.animate(
                    [
                        { transform: 'translateX(0)' },
                        { transform: `translateX(${conveyorBelt.offsetWidth + CRATE_WIDTH + 200}px)` }
                    ],
                    { duration: speed, fill: 'forwards' }
                );

                animation.onfinish = () => {
                    if (crate.parentNode) {
                        cargoContainer.removeChild(crate);
                        gameState.crates = gameState.crates.filter(c => c !== crate);
                    }
                };
            })
        }, 4000)
    }

    // Handle crate click/tap
    function handleCrateClick(crate) {
        // Deselect any currently selected crate
        if (gameState.selectedCrate) {
            gameState.selectedCrate.classList.remove('selected');
        }

        // Select the new crate
        if (gameState.selectedCrate !== crate) {
            gameState.selectedCrate = crate;
            crate.classList.add('selected');
            if (gameState.soundOn) {
                // Play select sound

                gameState.audio.selectSound.play()

            }
        } else {
            // If clicking the same crate, deselect it
            gameState.selectedCrate = null;
        }
    }

    // Handle slot click/tap
    function handleSlotClick(slot) {
        // Only process if we have a selected crate and the slot isn't already filled
        if (!gameState.selectedCrate || slot.classList.contains('disabled')) {
            return;
        }

        const crate = gameState.selectedCrate;
        const digit = crate.textContent;
        const position = parseInt(slot.dataset.position);

        // Pause crate animation
        if (crate._animation) {
            crate._animation.pause();
        }

        // Animate crate movement to the slot
        animateCrateToSlot(crate, slot, () => {
            processPlacement(digit, position, slot);
        });


    }


    // Animate crate to slot
    function animateCrateToSlot(crate, slot, callback) {
        // Get positions
        const crateRect = crate.getBoundingClientRect();
        const slotRect = slot.querySelector('.slot-digit').getBoundingClientRect();

        // Create a clone to animate
        const clone = crate.cloneNode(true);
        document.body.appendChild(clone);

        // Style the clone to position absolutely
        clone.style.position = 'fixed';
        clone.style.left = `${crateRect.left}px`;
        clone.style.top = `${crateRect.top}px`;
        clone.style.width = `${crateRect.width}px`;
        clone.style.height = `${crateRect.height}px`;
        clone.style.zIndex = '1000';
        clone.style.transition = 'all 0.5s ease-in-out';

        // Allow browser to establish initial position
        setTimeout(() => {
            // Animate to destination
            clone.style.left = `${slotRect.left}px`;
            clone.style.top = `${slotRect.top}px`;
            clone.style.width = `${slotRect.width}px`;
            clone.style.height = `${slotRect.height}px`;

            // Remove original crate
            crate.parentNode.removeChild(crate);
            gameState.crates = gameState.crates.filter(c => c !== crate);
            gameState.selectedCrate = null;

            // After animation completes
            setTimeout(() => {
                document.body.removeChild(clone);
                callback();
                gameState.audio.dropSound.play()
            }, 500);


        }, 10);
    }


    // Process digit placement after animation
    function processPlacement(digit, position, slot) {

        console.log("Correct digit:", digit, "at position:", position);
        // Correct placement
        gameState.currentDigits[position] = digit;
        const digitDisplay = slot.querySelector('.slot-digit');
        digitDisplay.textContent = digit;
        digitDisplay.classList.add('correct-digit');
        slot.classList.add('disabled');
        slot.removeEventListener('click', slot._clickHandler);
        updateCurrentNumberDisplay();
        checkCompletion();

        // Visual feedback
        slot.classList.add('correct-flash');
        setTimeout(() => slot.classList.remove('correct-flash'), 500);

        if (gameState.soundOn) {
            // Play correct sound
        }

    }

    // // Timer system
    // function startTimer() {
    //     const timer = setInterval(() => {
    //         if (!gameState.gameActive) {
    //             clearInterval(timer);
    //             return;
    //         }

    //         gameState.timeLeft--;
    //         timerDisplay.textContent = gameState.timeLeft;

    //         if (gameState.timeLeft <= 0) {
    //             clearInterval(timer);
    //             endGame();
    //         }
    //     }, 1000);
    // }

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
        gameState.currentNumber = displayParts.join('');
    }

    function updateDisplays() {
        targetNumberDisplay.textContent = formatNumber(gameState.targetNumber);
        updateCurrentNumberDisplay();
        scoreDisplay.textContent = formatNumber(gameState.score);
        // timerDisplay.textContent = gameState.timeLeft;
    }

    // Check game completion
    function checkCompletion() {
        if (gameState.currentDigits.every(digit => digit !== null)) {

            if (gameState.currentNumber == formatNumber(gameState.targetNumber)) {
                const points = gameState.difficulty === "easy" ? 50 :
                    gameState.difficulty === "hard" ? 200 : 100;
                gameState.score += points;

                // Visual celebration
                targetNumberDisplay.classList.add('celebrate');
                showCongratulatoryModal(points);

            }
            else {
                showErrorModal()
            }

        }
    }

    // Create confetti animation
    function createConfetti() {
        // Create keyframes for confetti
        const style = document.createElement('style');
        style.textContent = `
      @keyframes fall {
        to { top: 100%; }
      }
      
      @keyframes sway {
        from { transform: translateX(-20px) rotate(0deg); }
        to { transform: translateX(20px) rotate(360deg); }
      }
    `;
        document.head.appendChild(style);
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

    //Show error modal
    function showErrorModal() {
        document.querySelector('.game-modal-backdrop').style.display = 'flex';
        document.querySelector('.error-modal').style.display = 'block';
        document.querySelector('.correct-answer').textContent = formatNumber(gameState.targetNumber);
        document.querySelector('.user-answer').textContent = gameState.currentNumber;
        // document.querySelector('.error-message').textContent = "Incorrect placement! Try again.";
        // // Close modal
        // document.querySelector('.close-btn').addEventListener('click', function () {
        //     document.querySelector('.game-modal-backdrop').style.display = 'none';
        // });
    }

    // Show success modal
    function showCongratulatoryModal(points) {

        document.querySelector('.game-modal-backdrop').style.display = 'flex';
        document.querySelector('.game-modal').style.display = 'block';
        document.querySelector('.result-value').textContent = formatNumber(gameState.targetNumber);
        createConfetti()

    }

    var nextBtns = document.querySelectorAll('.next-btn');

    nextBtns.forEach((nextBtn) => {

        // Close modal or go to next level
        nextBtn.addEventListener('click', function () {

            gameState.targetNumber = 0;
            gameState.currentDigits = [];
            gameState.timeLeft = 60;
            gameState.gameActive = true;
            gameState.batchInProgress = false;
            gameState.crates = [];

            const myDiv = document.querySelector('.cargo-container');
            while (myDiv.firstChild) {
                myDiv.removeChild(myDiv.firstChild);
            }

            // Generate target number
            generateTargetNumber();

            gameState.currentDigits = Array(gameState.targetNumber.toString().length).fill(null);

            // Create place value slots
            createPlaceValueSlots();

            // Update displays
            updateDisplays();

            // startConveyor()

            document.querySelector('.game-modal-backdrop').style.display = 'none';
            document.querySelector('.game-modal').style.display = 'none';
            document.querySelector('.error-modal').style.display = 'none';
        });


    })


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


});