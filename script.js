/**
 * Place Value Game - Educational number placement game
 * Players drag digits from a conveyor belt to correct place value positions
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ========================================
    // CONSTANTS AND CONFIGURATION
    // ========================================
    
    /**
     * International place value names and their numeric values
     * Used for creating slot labels and determining digit positions
     */
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

    /**
     * Conveyor belt animation and timing constants
     */
    const CONVEYOR_CONFIG = {
        CRATE_WIDTH: 70,           // Width of each crate in pixels
        CRATE_SPACING: 20,         // Space between crates in pixels
        CONVEYOR_SPEED: 20000,     // Time (ms) for crate to cross conveyor
        ENTRY_DELAY: 800,          // Delay (ms) between crate entries
        BATCH_INTERVAL: 5000       // Time (ms) between new batches
    };

    // ========================================
    // GAME STATE MANAGEMENT
    // ========================================
    
    /**
     * Central game state object containing all game variables
     * This maintains the current state of the game session
     */
    const gameState = {
        targetNumber: 0,           // The number player needs to build
        currentDigits: [],         // Array of placed digits (null = empty slot)
        score: 0,                  // Player's current score
        timeLeft: 45,              // Remaining time in seconds
        gameActive: false,         // Whether game is currently running
        difficulty: "medium",      // Current difficulty level
        placeValueSlots: [],       // Array of slot DOM elements
        crates: [],               // Array of active crate elements
        selectedCrate: null,       // Currently selected crate element
        batchInProgress: false,    // Whether crates are being created
        soundOn: true,            // Audio enabled/disabled state
        currentNumber: "",        // Formatted current number string
        
        // Audio elements for game sounds
        audio: {
            backgroundMusic: null,
            correctSound: null,
            incorrectSound: null,
            selectSound: null,
            dropSound: null
        }
    };

    /**
     * Timer reference for crate creation intervals
     */
    let cratesTimer = null;

    // ========================================
    // DOM ELEMENT REFERENCES
    // ========================================
    
    /**
     * Cache frequently used DOM elements for better performance
     */
    const domElements = {
        // Game containers
        welcomeScreen: document.getElementById('welcome-screen'),
        gameContainer: document.getElementById('game-container'),
        conveyorBelt: document.querySelector('.conveyor-belt'),
        slotsContainer: document.querySelector('.place-value-slots'),
        
        // Display elements
        currentNumberDisplay: document.getElementById('current-number'),
        targetNumberDisplay: document.getElementById('target-number'),
        scoreDisplay: document.getElementById('score'),
        timerDisplay: document.getElementById('timer'),
        
        // Control elements
        startButton: document.getElementById('start-game'),
        soundToggle: document.querySelector('.sound-toggle'),
        machineLights: document.querySelectorAll('.machine-light'),
        
        // Modal elements
        modalBackdrop: document.querySelector('.game-modal-backdrop'),
        successModal: document.querySelector('.success-modal'),
        errorModal: document.querySelector('.error-modal'),
        restartModal: document.querySelector('.restart-modal'),
        nextBtns: document.querySelectorAll('.next-btn'),
        restartBtn: document.querySelector('.restart-btn')
    };

    // ========================================
    // INITIALIZATION AND SETUP
    // ========================================
    
    /**
     * Initialize the game when start button is clicked
     * Sets up the welcome screen transition and game startup
     */
    function setupGameStart() {
        domElements.startButton.addEventListener('click', function() {
            // Hide welcome screen and show game
            domElements.welcomeScreen.style.display = 'none';
            domElements.gameContainer.style.display = 'block';
            
            // Initialize the game
            initGame();
        });
    }

    /**
     * Initialize audio system and set up sound controls
     * Handles browser audio policy restrictions
     */
    function initAudio() {
        // Get audio elements from DOM
        gameState.audio.backgroundMusic = document.getElementById('background-music');
        gameState.audio.selectSound = document.getElementById('select-sound');
        gameState.audio.dropSound = document.getElementById('drop-sound');

        // Set appropriate volume levels
        if (gameState.audio.backgroundMusic) {
            gameState.audio.backgroundMusic.volume = 0.3; // Background music quieter
            // Attempt to start background music (may fail due to browser policies)
            gameState.audio.backgroundMusic.play().catch(e => 
                console.log("Audio play prevented by browser:", e)
            );
        }
    }

    /**
     * Set up sound toggle functionality
     * Allows players to enable/disable game audio
     */
    function setupSoundToggle() {
        domElements.soundToggle.addEventListener('click', () => {
            // Toggle sound state
            gameState.soundOn = !gameState.soundOn;

            // Update button icon
            domElements.soundToggle.innerHTML = gameState.soundOn
                ? '<i class="fas fa-volume-up"></i>'
                : '<i class="fas fa-volume-mute"></i>';

            // Control background music
            if (gameState.audio.backgroundMusic) {
                gameState.audio.backgroundMusic.muted = !gameState.soundOn;
            }

            // Play test sound when enabling audio
            if (gameState.soundOn && gameState.audio.selectSound) {
                gameState.audio.selectSound.currentTime = 0;
                gameState.audio.selectSound.play();
            }
        });
    }

    /**
     * Main game initialization function
     * Resets all game state and starts new game session
     */
    function initGame() {
        initAudio();
        resetGameState();
        generateTargetNumber();
        setupGameBoard();
        startGameSystems();
        updateAllDisplays();
        animateMachineLights();
    }

    /**
     * Reset all game state variables to starting values
     */
    function resetGameState() {
        gameState.targetNumber = 0;
        gameState.currentDigits = [];
        gameState.score = 0;
        gameState.timeLeft = 45;
        gameState.gameActive = true;
        gameState.crates = [];
        gameState.selectedCrate = null;

        // Clear any existing crates from conveyor
        const cargoContainer = document.querySelector('.cargo-container');
        while (cargoContainer && cargoContainer.firstChild) {
            cargoContainer.removeChild(cargoContainer.firstChild);
        }
    }

    // ========================================
    // GAME BOARD SETUP
    // ========================================
    
    /**
     * Generate a random target number based on current difficulty
     * Different difficulties have different digit ranges
     */
    function generateTargetNumber() {
        let minDigits, maxDigits;

        // Set digit range based on difficulty
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

        // Generate random number within digit range
        const digits = Math.floor(Math.random() * (maxDigits - minDigits + 1)) + minDigits;
        const minValue = Math.pow(10, digits - 1);
        const maxValue = Math.pow(10, digits) - 1;
        
        gameState.targetNumber = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
    }

    /**
     * Set up the game board with target number and empty slots
     */
    function setupGameBoard() {
        // Initialize current digits array with null values
        gameState.currentDigits = Array(gameState.targetNumber.toString().length).fill(null);
        
        // Create place value slots for the target number
        createPlaceValueSlots();
    }

    /**
     * Create place value slots based on target number length
     * Each slot represents a digit position (ones, tens, hundreds, etc.)
     */
    function createPlaceValueSlots() {
        // Clear existing slots
        domElements.slotsContainer.innerHTML = '';
        gameState.placeValueSlots = [];
        
        const targetStr = gameState.targetNumber.toString();

        // Add decorative elements to slots container
        domElements.slotsContainer.innerHTML = `
            <div class="detail-rivets detail-rivet-tl"></div>
            <div class="detail-rivets detail-rivet-tr"></div>
            <div class="detail-rivets detail-rivet-bl"></div>
            <div class="detail-rivets detail-rivet-br"></div>
        `;

        // Create slots from right to left (ones place first)
        for (let i = 0; i < targetStr.length; i++) {
            const placeValueIndex = targetStr.length - 1 - i;
            const placeValue = INT_PLACE_VALUES[i];
            
            if (!placeValue) break; // Stop if we run out of place values

            const slot = createSlotElement(placeValueIndex, placeValue, targetStr);
            gameState.placeValueSlots.push(slot);
        }

        // Reverse array and append to show highest place value first
        const slots = [...gameState.placeValueSlots].reverse();
        gameState.placeValueSlots = slots;
        slots.forEach(slot => domElements.slotsContainer.appendChild(slot));
    }

    /**
     * Create individual slot element with proper styling and event handlers
     * @param {number} placeValueIndex - Position in the number (0 = ones, 1 = tens, etc.)
     * @param {Object} placeValue - Place value object with name and numeric value
     * @param {string} targetStr - String representation of target number
     * @returns {HTMLElement} The created slot element
     */
    function createSlotElement(placeValueIndex, placeValue, targetStr) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.position = placeValueIndex;
        slot.dataset.expectedDigit = targetStr[placeValueIndex];

        // Create slot HTML structure
        slot.innerHTML = `
            <div class="slot-label">${placeValue.name}</div>
            <div class="slot-digit"></div>
        `;

        // Set up click handler for slot interaction
        slot._clickHandler = () => handleSlotClick(slot);
        slot.addEventListener('click', slot._clickHandler);

        return slot;
    }

    // ========================================
    // CONVEYOR SYSTEM
    // ========================================
    
    /**
     * Start the conveyor belt system
     * Initializes crate creation and movement
     */
    function startConveyor() {
        // Clear existing crates
        const cargoContainer = domElements.conveyorBelt.querySelector('.cargo-container');
        cargoContainer.innerHTML = '';
        gameState.crates = [];
        
        // Start creating crates
        createCrateSystem();
    }

    /**
     * Set up the crate creation system with regular intervals
     */
    function createCrateSystem() {
        // Create initial batch
        createCrateBatch();

        // Set up recurring crate creation
        cratesTimer = setInterval(() => {
            if (!gameState.gameActive) {
                console.log('Crate creation stopped - game inactive');
                clearInterval(cratesTimer);
                return;
            }
            createCrateBatch();
        }, CONVEYOR_CONFIG.BATCH_INTERVAL);
    }

    /**
     * Create a batch of 3 crates with digits
     * One crate contains a needed digit, two contain random digits
     */
    function createCrateBatch() {
        const missingDigits = getMissingDigits();
        
        // If no digits are missing, don't create crates
        if (missingDigits.length === 0) return;

        // Select one correct digit and two random digits
        const correctDigit = missingDigits[Math.floor(Math.random() * missingDigits.length)];
        const batchDigits = [
            correctDigit,
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
        ];

        // Create and animate each crate in the batch
        batchDigits.forEach((digit, index) => {
            createAndAnimateCrate(digit, index);
        });
    }

    /**
     * Create individual crate element and set up its animation
     * @param {number} digit - The digit to display on the crate
     * @param {number} index - Position in the batch (0, 1, or 2)
     */
    function createAndAnimateCrate(digit, index) {
        const cargoContainer = domElements.conveyorBelt.querySelector('.cargo-container');
        const crate = document.createElement('div');
        
        // Set up crate element
        crate.className = 'cargo-crate';
        crate.textContent = digit;
        crate.addEventListener('click', () => handleCrateClick(crate));

        // Position crate with proper spacing
        const startOffset = index * (CONVEYOR_CONFIG.CRATE_WIDTH + CONVEYOR_CONFIG.CRATE_SPACING);
        crate.style.left = `-${CONVEYOR_CONFIG.CRATE_WIDTH + startOffset}px`;
        cargoContainer.appendChild(crate);

        // Animate crate across conveyor belt
        const animation = crate.animate(
            [
                { transform: 'translateX(0)' },
                { transform: `translateX(${domElements.conveyorBelt.offsetWidth + CONVEYOR_CONFIG.CRATE_WIDTH + 200}px)` }
            ],
            { 
                duration: CONVEYOR_CONFIG.CONVEYOR_SPEED, 
                fill: 'forwards' 
            }
        );

        // Clean up crate when animation completes
        animation.onfinish = () => {
            if (crate.parentNode) {
                cargoContainer.removeChild(crate);
                gameState.crates = gameState.crates.filter(c => c !== crate);
            }
        };

        // Store animation reference for pause/control
        crate._animation = animation;
    }

    /**
     * Get array of digits that are still missing from current number
     * @returns {Array} Array of digit strings that need to be placed
     */
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

    // ========================================
    // USER INTERACTION HANDLERS
    // ========================================
    
    /**
     * Handle clicking/tapping on a crate
     * Manages crate selection state and visual feedback
     * @param {HTMLElement} crate - The clicked crate element
     */
    function handleCrateClick(crate) {
        // Deselect currently selected crate if any
        if (gameState.selectedCrate) {
            gameState.selectedCrate.classList.remove('selected');
        }

        // Toggle selection of clicked crate
        if (gameState.selectedCrate !== crate) {
            // Select new crate
            gameState.selectedCrate = crate;
            crate.classList.add('selected');
            
            // Play selection sound
            if (gameState.soundOn && gameState.audio.selectSound) {
                gameState.audio.selectSound.currentTime = 0;
                gameState.audio.selectSound.play();
            }
        } else {
            // Deselect if clicking same crate again
            gameState.selectedCrate = null;
        }
    }

    /**
     * Handle clicking/tapping on a place value slot
     * Processes digit placement if a crate is selected
     * @param {HTMLElement} slot - The clicked slot element
     */
    function handleSlotClick(slot) {
        // Only process if we have a selected crate
        if (!gameState.selectedCrate) {
            return;
        }

        const crate = gameState.selectedCrate;
        const digit = crate.textContent;
        const position = parseInt(slot.dataset.position);

        // Pause crate's conveyor animation
        if (crate._animation) {
            crate._animation.pause();
        }

        // Animate crate movement to slot and process placement
        animateCrateToSlot(crate, slot, () => {
            processDigitPlacement(digit, position, slot);
        });
    }

    // ========================================
    // ANIMATION SYSTEM
    // ========================================
    
    /**
     * Animate selected crate moving to target slot
     * Transforms crate from square to rectangular slot shape
     * @param {HTMLElement} crate - The crate element to animate
     * @param {HTMLElement} slot - The target slot element
     * @param {Function} callback - Function to call when animation completes
     */
    function animateCrateToSlot(crate, slot, callback) {
        const slotDigitElement = slot.querySelector('.slot-digit');
        
        // Stop any existing animations
        if (crate._animation) crate._animation.cancel();
        
        // Set up crate for animated movement
        crate.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        crate.style.position = 'absolute';
        crate.style.zIndex = '1000';
        
        // Calculate final dimensions to match slot
        const slotRect = slotDigitElement.getBoundingClientRect();
        const finalWidth = slotRect.width;
        const finalHeight = slotRect.height;
        
        // Move crate to slot container
        slotDigitElement.innerHTML = '';
        slotDigitElement.appendChild(crate);
        
        // Animate transformation to slot dimensions
        setTimeout(() => {
            crate.style.width = `${finalWidth}px`;
            crate.style.height = `${finalHeight}px`;
            crate.style.left = '0';
            crate.style.top = '0';
            crate.style.transform = 'none';
            
            // Finalize crate placement after animation
            setTimeout(() => {
                crate.style.transition = 'none';
                crate.classList.remove('selected');
                crate.style.pointerEvents = 'none';
                
                // Play drop sound effect
                if (gameState.soundOn && gameState.audio.dropSound) {
                    gameState.audio.dropSound.currentTime = 0;
                    gameState.audio.dropSound.play();
                }
                
                callback();
            }, 500);
        }, 10);
    }

    /**
     * Create celebratory confetti animation
     * Generates colored squares that fall and sway across screen
     */
    function createConfetti() {
        // Add CSS keyframes for confetti animation
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

        // Create 100 confetti pieces
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;

            // Set random properties for each piece
            const size = Math.random() * 10 + 5;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = `-${size}px`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

            // Apply fall and sway animations
            confetti.style.animation = `
                fall ${Math.random() * 3 + 2}s linear forwards,
                sway ${Math.random() * 5 + 3}s ease-in-out infinite alternate
            `;

            container.appendChild(confetti);

            // Clean up confetti after animation
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }

    /**
     * Animate machine lights with staggered blinking effect
     * Creates industrial machine atmosphere
     */
    function animateMachineLights() {
        domElements.machineLights.forEach((light, index) => {
            setInterval(() => {
                light.style.opacity = light.style.opacity === '0.3' ? '1' : '0.3';
            }, 1000 + (index * 300)); // Stagger the timing for each light
        });
    }

    // ========================================
    // GAME LOGIC AND PROGRESSION
    // ========================================
    
    /**
     * Process digit placement after successful slot animation
     * Updates game state and checks for completion
     * @param {string} digit - The placed digit
     * @param {number} position - Position in the number
     * @param {HTMLElement} slot - The target slot element
     */
    function processDigitPlacement(digit, position, slot) {
        // Update game state with placed digit
        gameState.currentDigits[position] = digit;
        
        // Add visual feedback for correct placement
        const digitDisplay = slot.querySelector('.slot-digit');
        digitDisplay.classList.add('correct-digit');
        
        // Update displays and check if game is complete
        updateCurrentNumberDisplay();
        checkGameCompletion();

        // Show brief flash animation for successful placement
        slot.classList.add('correct-flash');
        setTimeout(() => slot.classList.remove('correct-flash'), 500);

        // Clear selected crate
        gameState.selectedCrate = null;
    }

    /**
     * Check if the game is complete and handle end conditions
     * Compares built number with target number
     */
    function checkGameCompletion() {
        // Check if all digits have been placed
        if (gameState.currentDigits.every(digit => digit !== null)) {
            const builtNumber = gameState.currentNumber;
            const targetNumber = formatNumber(gameState.targetNumber);

            if (builtNumber === targetNumber) {
                // Success! Calculate points and show celebration
                const points = calculatePoints();
                gameState.score += points;
                gameState.gameActive = false;
                
                // Show success feedback
                domElements.targetNumberDisplay.classList.add('celebrate');
                showSuccessModal(points);
                
            } else {
                // Incorrect number built
                showErrorModal();
            }
        }
    }

    /**
     * Calculate points based on difficulty level
     * @returns {number} Points to award for successful completion
     */
    function calculatePoints() {
        switch (gameState.difficulty) {
            case "easy": return 5;
            case "hard": return 20;
            default: return 10; // medium
        }
    }

    // ========================================
    // TIMER SYSTEM
    // ========================================
    
    /**
     * Start the game timer countdown
     * Updates display every second and handles time expiration
     */
    function startTimer() {
        const timer = setInterval(() => {
            if (!gameState.gameActive) {
                clearInterval(timer);
                return;
            }

            gameState.timeLeft--;
            domElements.timerDisplay.textContent = gameState.timeLeft;

            // End game when time runs out
            if (gameState.timeLeft <= 0) {
                clearInterval(timer);
                gameState.gameActive = false;
                endGame();
            }
        }, 1000);
    }

    // ========================================
    // DISPLAY UPDATES
    // ========================================
    
    /**
     * Format number with comma separators for better readability
     * @param {number} num - Number to format
     * @returns {string} Formatted number string
     */
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Update the current number display with placed digits
     * Shows underscores for empty positions and proper comma formatting
     */
    function updateCurrentNumberDisplay() {
        const displayParts = [];
        const numDigits = gameState.currentDigits.length;

        // Build display string from right to left (ones to highest place)
        for (let i = numDigits - 1; i >= 0; i--) {
            const digit = gameState.currentDigits[i];
            displayParts.unshift(digit !== null ? digit : '_');
            
            // Add comma separators every 3 digits
            if (i > 0 && (numDigits - i) % 3 === 0) {
                displayParts.unshift(',');
            }
        }

        const formattedNumber = displayParts.join('');
        domElements.currentNumberDisplay.textContent = formattedNumber;
        gameState.currentNumber = formattedNumber;
    }

    /**
     * Update all game displays with current values
     */
    function updateAllDisplays() {
        domElements.targetNumberDisplay.textContent = formatNumber(gameState.targetNumber);
        updateCurrentNumberDisplay();
        domElements.scoreDisplay.textContent = formatNumber(gameState.score);
        domElements.timerDisplay.textContent = gameState.timeLeft;
    }

    // ========================================
    // MODAL SYSTEM
    // ========================================
    
    /**
     * Show success modal when player completes number correctly
     * @param {number} points - Points earned for completion
     */
    function showSuccessModal(points) {
        domElements.modalBackdrop.style.display = 'flex';
        domElements.successModal.style.display = 'block';
        document.querySelector('.result-value').textContent = formatNumber(gameState.targetNumber);
        
        clearInterval(cratesTimer);
        createConfetti();
    }

    /**
     * Show error modal when player builds incorrect number
     */
    function showErrorModal() {
        domElements.modalBackdrop.style.display = 'flex';
        domElements.errorModal.style.display = 'block';
        document.querySelector('.correct-answer').textContent = formatNumber(gameState.targetNumber);
        document.querySelector('.user-answer').textContent = gameState.currentNumber;
        gameState.gameActive = false;
    }

    /**
     * Show restart modal when time runs out
     */
    function endGame() {
        gameState.gameActive = false;
        domElements.modalBackdrop.style.display = 'flex';
        domElements.restartModal.style.display = 'block';
        clearInterval(cratesTimer);
    }

    // ========================================
    // GAME CONTROL SYSTEM
    // ========================================
    
    /**
     * Set up "Next" button handlers for continuing after success/error
     */
    function setupNextButtons() {
        domElements.nextBtns.forEach((nextBtn) => {
            nextBtn.addEventListener('click', function() {
                hideAllModals();
                startNewRound();
            });
        });
    }

    /**
     * Set up restart button handler for starting over after time expires
     */
    function setupRestartButton() {
        domElements.restartBtn.addEventListener('click', function() {
            hideAllModals();
            gameState.score = 0; // Reset score on full restart
            startNewRound();
        });
    }

    /**
     * Hide all game modals
     */
    function hideAllModals() {
        domElements.modalBackdrop.style.display = 'none';
        domElements.successModal.style.display = 'none';
        domElements.errorModal.style.display = 'none';
        domElements.restartModal.style.display = 'none';
    }

    /**
     * Start a new round of the game
     * Resets game state but preserves score (unless full restart)
     */
    function startNewRound() {
        // Reset round-specific state
        gameState.targetNumber = 0;
        gameState.currentDigits = [];
        gameState.timeLeft = 45;
        gameState.gameActive = true;
        gameState.crates = [];
        gameState.selectedCrate = null;

        // Clear conveyor belt
        clearInterval(cratesTimer);
        const cargoContainer = document.querySelector('.cargo-container');
        while (cargoContainer && cargoContainer.firstChild) {
            cargoContainer.removeChild(cargoContainer.firstChild);
        }

        // Set up new round
        generateTargetNumber();
        setupGameBoard();
        updateAllDisplays();
        startGameSystems();
    }

    /**
     * Start all game systems (conveyor and timer)
     */
    function startGameSystems() {
        startConveyor();
        startTimer();
    }

    // ========================================
    // MAIN INITIALIZATION
    // ========================================
    
    /**
     * Initialize all game systems and event handlers
     * This is the main entry point called when DOM is loaded
     */
    function initializeGame() {
        setupGameStart();
        setupSoundToggle();
        setupNextButtons();
        setupRestartButton();
    }

    // Start the initialization process
    initializeGame();
});