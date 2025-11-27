// ===== GAME STATE =====
const gameState = {
    score: 0,
    customers: [],
    currentPita: [],
    maxCustomers: 3,
    isGameOver: false,
    customerSpawnInterval: null,
    nextCustomerId: 1
};

// Ingredient emoji mapping
const INGREDIENT_EMOJIS = {
    hummus: '🥜',
    salad: '🥗',
    falafel: '🧆',
    fries: '🍟'
};

// ===== DOM ELEMENTS =====
const elements = {
    scoreValue: document.querySelector('.score-value'),
    currentPita: document.getElementById('current-pita'),
    pitaIngredients: document.querySelector('.pita-ingredients'),
    serveButton: document.getElementById('serve-button'),
    ingredientBowls: document.querySelectorAll('.ingredient-bowl'),
    customerSlots: document.querySelectorAll('.customer-slot'),
    gameOverModal: document.getElementById('game-over-modal'),
    finalScoreValue: document.getElementById('final-score-value'),
    restartButton: document.getElementById('restart-button')
};

// ===== CUSTOMER CLASS =====
class Customer {
    constructor(id, slotElement) {
        this.id = id;
        this.slotElement = slotElement;
        this.order = this.generateOrder();
        this.patience = 0;
        this.maxPatience = 100;
        this.patienceInterval = null;
    }

    generateOrder() {
        const ingredients = ['hummus', 'salad', 'falafel', 'fries'];
        const orderSize = Math.floor(Math.random() * 2) + 2; // 2-3 ingredients
        const order = [];

        for (let i = 0; i < orderSize; i++) {
            const randomIngredient = ingredients[Math.floor(Math.random() * ingredients.length)];
            order.push(randomIngredient);
        }

        return order;
    }

    render() {
        const orderDisplay = this.slotElement.querySelector('.order-display');
        orderDisplay.innerHTML = '';

        this.order.forEach(ingredient => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.textContent = INGREDIENT_EMOJIS[ingredient];
            orderDisplay.appendChild(orderItem);
        });

        this.slotElement.classList.add('active');
    }

    startPatience() {
        this.patienceInterval = setInterval(() => {
            this.patience += 0.5;
            this.updatePatienceBar();

            if (this.patience >= this.maxPatience) {
                gameOver();
            }

            // Add angry state at 70%
            if (this.patience >= 70) {
                this.slotElement.classList.add('angry');
            }
        }, 100);
    }

    updatePatienceBar() {
        const patienceFill = this.slotElement.querySelector('.patience-fill');
        patienceFill.style.width = `${this.patience}%`;
    }

    stopPatience() {
        clearInterval(this.patienceInterval);
    }

    remove() {
        this.stopPatience();
        this.slotElement.classList.remove('active', 'angry');
        this.slotElement.querySelector('.order-display').innerHTML = '';
        this.slotElement.querySelector('.patience-fill').style.width = '0%';
    }
}

// ===== GAME FUNCTIONS =====
function init() {
    gameState.score = 0;
    gameState.customers = [];
    gameState.currentPita = [];
    gameState.isGameOver = false;

    updateScore();
    clearPita();

    // Add event listeners
    elements.ingredientBowls.forEach(bowl => {
        bowl.addEventListener('click', () => addIngredient(bowl.dataset.ingredient));
    });

    elements.customerSlots.forEach(slot => {
        slot.addEventListener('click', () => serveCustomer(slot));
    });

    elements.restartButton.addEventListener('click', restart);

    // Start spawning customers
    spawnCustomer();
    gameState.customerSpawnInterval = setInterval(() => {
        if (gameState.customers.length < gameState.maxCustomers && !gameState.isGameOver) {
            spawnCustomer();
        }
    }, 5000); // New customer every 5 seconds
}

function addIngredient(ingredient) {
    if (gameState.isGameOver) return;

    gameState.currentPita.push(ingredient);

    // Add to visual
    const ingredientItem = document.createElement('div');
    ingredientItem.className = 'ingredient-item';
    ingredientItem.textContent = INGREDIENT_EMOJIS[ingredient];
    elements.pitaIngredients.appendChild(ingredientItem);

    // Show serve button if pita has ingredients
    if (gameState.currentPita.length > 0) {
        elements.serveButton.classList.remove('hidden');
    }

    playSound('click');
}

function serveCustomer(slotElement) {
    if (gameState.isGameOver) return;
    if (gameState.currentPita.length === 0) return;

    const customer = gameState.customers.find(c => c.slotElement === slotElement);
    if (!customer) return;

    // Validate order
    const isCorrect = validateOrder(gameState.currentPita, customer.order);

    if (isCorrect) {
        // Correct order
        const points = customer.order.length + 5; // +1 per ingredient + 5 bonus
        changeScore(points);
        playSound('success');
        slotElement.classList.add('serving');
        setTimeout(() => slotElement.classList.remove('serving'), 500);
    } else {
        // Wrong order
        const correctCount = countCorrectIngredients(gameState.currentPita, customer.order);
        const incorrectCount = gameState.currentPita.length - correctCount;
        const points = correctCount - incorrectCount;
        changeScore(points);
        playSound('fail');
    }

    // Remove customer
    removeCustomer(customer);

    // Clear pita
    clearPita();
}

function validateOrder(pita, order) {
    if (pita.length !== order.length) return false;

    const pitaSorted = [...pita].sort();
    const orderSorted = [...order].sort();

    return JSON.stringify(pitaSorted) === JSON.stringify(orderSorted);
}

function countCorrectIngredients(pita, order) {
    const orderCopy = [...order];
    let correctCount = 0;

    pita.forEach(ingredient => {
        const index = orderCopy.indexOf(ingredient);
        if (index !== -1) {
            correctCount++;
            orderCopy.splice(index, 1);
        }
    });

    return correctCount;
}

function spawnCustomer() {
    if (gameState.isGameOver) return;

    const availableSlot = elements.customerSlots[gameState.customers.length];
    if (!availableSlot) return;

    const customer = new Customer(gameState.nextCustomerId++, availableSlot);
    gameState.customers.push(customer);
    customer.render();
    customer.startPatience();
}

function removeCustomer(customer) {
    const index = gameState.customers.indexOf(customer);
    if (index > -1) {
        customer.remove();
        gameState.customers.splice(index, 1);

        // Shift remaining customers
        gameState.customers.forEach((c, idx) => {
            c.remove();
            c.slotElement = elements.customerSlots[idx];
            c.render();
            c.startPatience();
        });
    }
}

function clearPita() {
    gameState.currentPita = [];
    elements.pitaIngredients.innerHTML = '';
    elements.serveButton.classList.add('hidden');
}

function changeScore(amount) {
    gameState.score += amount;
    if (gameState.score < 0) gameState.score = 0;
    updateScore();
}

function updateScore() {
    elements.scoreValue.textContent = gameState.score;
}

function gameOver() {
    if (gameState.isGameOver) return;

    gameState.isGameOver = true;
    clearInterval(gameState.customerSpawnInterval);

    gameState.customers.forEach(customer => customer.stopPatience());

    elements.finalScoreValue.textContent = gameState.score;
    elements.gameOverModal.classList.remove('hidden');

    playSound('gameOver');
}

function restart() {
    // Clear all customers
    gameState.customers.forEach(customer => customer.remove());
    gameState.customers = [];

    elements.gameOverModal.classList.add('hidden');

    clearInterval(gameState.customerSpawnInterval);

    init();
}

// ===== SOUND EFFECTS (Web Audio API) =====
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
        case 'click':
            oscillator.frequency.value = 400;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'success':
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'fail':
            oscillator.frequency.value = 200;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'gameOver':
            oscillator.frequency.value = 150;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
    }
}

// ===== START GAME =====
init();
