document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // STATE & CONFIG
    // ==========================================
    const CONFIG = {
        spinDuration: 5000, // ms
        deceleration: 0.985,
        minSpeed: 0.002,
        colors: ['#FFCD00', '#00247D', '#CF142B'], // Ven Flag Colors
        bgColors: ['#0f0f32', '#1a1a3e']
    };

    // Traditional Animalitos List (0-36 technically, but shortened for demo as per plan)
    const DEFAULT_ANIMALS = [
        { id: 0, name: 'Delfín', emoji: '🐬', color: '#00e5ff' },
        { id: 1, name: 'Carnero', emoji: '🐏', color: '#ffffff' },
        { id: 2, name: 'Toro', emoji: '🐂', color: '#ff5252' },
        { id: 3, name: 'Ciempiés', emoji: '🐛', color: '#aeea00' },
        { id: 4, name: 'Alacrán', emoji: '🦂', color: '#ffab40' },
        { id: 5, name: 'León', emoji: '🦁', color: '#ffd700' },
        { id: 6, name: 'Rana', emoji: '🐸', color: '#00e676' },
        { id: 7, name: 'Perico', emoji: '🦜', color: '#76ff03' },
        { id: 8, name: 'Ratón', emoji: '🐭', color: '#e0e0e0' },
        { id: 9, name: 'Águila', emoji: '🦅', color: '#795548' },
        { id: 10, name: 'Tigre', emoji: '🐯', color: '#ff9100' },
        { id: 11, name: 'Gato', emoji: '🐱', color: '#ba68c8' },
        { id: 12, name: 'Caballo', emoji: '🐴', color: '#8d6e63' },
        { id: 13, name: 'Mono', emoji: '🐒', color: '#a1887f' },
        { id: 14, name: 'Paloma', emoji: '🕊️', color: '#f5f5f5' },
        { id: 15, name: 'Zorro', emoji: '🦊', color: '#ff7043' },
        { id: 16, name: 'Oso', emoji: '🐻', color: '#5d4037' },
        { id: 17, name: 'Pavo', emoji: '🦃', color: '#3e2723' },
        { id: 18, name: 'Burro', emoji: '🫏', color: '#bdbdbd' },
        { id: 19, name: 'Chivo', emoji: '🐐', color: '#757575' }
    ];

    let animals = JSON.parse(localStorage.getItem('animalitos_list')) || DEFAULT_ANIMALS;
    let history = JSON.parse(localStorage.getItem('animalitos_history')) || [];
    let isSpinning = false;
    let currentRotation = 0;
    let spinVelocity = 0;
    let soundEnabled = true;
    let audioContext = null;

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const canvas = document.getElementById('roulette-wheel');
    const ctx = canvas.getContext('2d');
    const spinBtn = document.getElementById('spin-btn');
    const spinBtnCenter = document.getElementById('spin-btn-center');
    const animalsListEl = document.getElementById('animals-list');
    const historyListEl = document.getElementById('history-list');
    const addForm = document.getElementById('add-animal-form');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const winnerOverlay = document.getElementById('winner-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const soundToggle = document.getElementById('sound-toggle');
    
    // Canvas dimensions
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10; // Padding for outer ring

    // ==========================================
    // AUDIO SYSTEM (Web Audio API)
    // ==========================================
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    function playTickSound() {
        if (!soundEnabled || !audioContext) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + 0.1);
    }

    function playWinSound() {
        if (!soundEnabled || !audioContext) return;
        
        // Simple fanfare
        const now = audioContext.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        
        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0.1, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.5);
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.5);
        });

        // Animal sound simulation (generic growl/chirp based on random)
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioContext.currentTime);
            osc.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 0.5);
        }, 600);
    }

    // ==========================================
    // ROULETTE RENDERER
    // ==========================================
    function drawWheel() {
        if (animals.length === 0) return;
        
        const arc = (2 * Math.PI) / animals.length;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        animals.forEach((animal, i) => {
            const angle = currentRotation + i * arc;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle, angle + arc);
            ctx.fillStyle = (i % 2 === 0) ? CONFIG.bgColors[0] : CONFIG.bgColors[1];
            
            // Highlight winning segment if stopped
            /*
            if (!isSpinning && spinVelocity === 0) {
                 // Check if this segment is at top (3*PI/2)
                 // Complex logic omitted for simplicity, using visual styles only
            }
            */
            
            ctx.fill();
            ctx.strokeStyle = '#rgba(255,215,0,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw Text/Emoji
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + arc / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = animal.color;
            ctx.font = 'bold 24px Arial';
            ctx.fillText(animal.emoji, radius - 20, 10);
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#fff';
            ctx.fillText(animal.name, radius - 55, 5);
            ctx.restore();
        });
    }

    // ==========================================
    // GAME LOGIC
    // ==========================================
    function spin() {
        if (isSpinning) return;
        if (animals.length < 2) {
            alert("¡Agrega al menos 2 animales para girar!");
            return;
        }

        initAudio(); // Ensure audio context is ready
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtnCenter.classList.add('spinning');
        
        // Random spin velocity (20-40 rads/sec initial)
        spinVelocity = Math.random() * 0.3 + 0.4; 
        
        requestAnimationFrame(animateSpin);
    }

    let lastTickAngle = 0;

    function animateSpin() {
        if (spinVelocity <= 0.001) {
            finishSpin();
            return;
        }

        currentRotation += spinVelocity;
        spinVelocity *= CONFIG.deceleration; // Friction

        // Normalize rotation
        currentRotation = currentRotation % (2 * Math.PI);

        // Sound Ticking Logic
        // Calculate which segment is passing the pointer (top: 3*PI/2 or -PI/2)
        // Simply check if rotation passed a segment boundary relative to fixed point
        // Using simplified tick rate based on velocity
        const sectorAngle = (2 * Math.PI) / animals.length;
        // Total angle traveled
        if (Math.floor(currentRotation / sectorAngle) !== lastTickAngle) {
            playTickSound();
            lastTickAngle = Math.floor(currentRotation / sectorAngle);
        }

        drawWheel();
        requestAnimationFrame(animateSpin);
    }

    function finishSpin() {
        isSpinning = false;
        spinVelocity = 0;
        spinBtn.disabled = false;
        spinBtnCenter.classList.remove('spinning');

        // Determine winner
        // Pointer is at -PI/2 (top). 
        // We need to find which segment is at -PI/2.
        // The wheel rendering starts at currentRotation.
        // Segment i starts at currentRotation + i * arc
        // We want (currentRotation + i * arc) <= -PI/2 <= (currentRotation + (i+1) * arc)
        // Normalize angles to [0, 2PI] for easier calculation
        
        const arc = (2 * Math.PI) / animals.length;
        // The angle of the pointer relative to the wheel's 0-index segment
        // Pointer is at 270deg (3PI/2) in canvas space usually, but here 0 is East.
        // Let's deduce:
        // Render: angle = current + i*arc.
        // Pointer is effectively at angle 3*PI/2 (Top) in canvas arc coordinates.
        // So we solve for i: 3*PI/2 = current + i*arc
        // i*arc = 3*PI/2 - current
        // i = (3*PI/2 - current) / arc
        
        let pointerAngle = (3 * Math.PI / 2); 
        let normalizedRotation = currentRotation % (2 * Math.PI);
        
        // Calculate index
        let winningIndex = Math.floor((pointerAngle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI) / arc);
        
        // Clamp just in case
        winningIndex = (winningIndex + animals.length) % animals.length;
        
        const winner = animals[winningIndex];
        announceWinner(winner);
        addToHistory(winner);
    }

    function announceWinner(winner) {
        const modalName = document.getElementById('winner-name');
        const modalEmoji = document.getElementById('winner-emoji');
        const modalNum = document.getElementById('winner-number');
        
        modalName.textContent = winner.name;
        modalEmoji.textContent = winner.emoji;
        modalNum.textContent = `Animalito #${winner.id}`; // Using ID as number
        
        // Show modal
        winnerOverlay.classList.add('active');
        playWinSound();
        spawnConfetti();
    }

    function addToHistory(animal) {
        const entry = {
            ...animal,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        history.unshift(entry); // Add to top
        if (history.length > 50) history.pop(); // Keep last 50
        
        localStorage.setItem('animalitos_history', JSON.stringify(history));
        renderHistory();
        
        // Update balance (Fake logic for demo)
        updateBalance();
    }

    function updateBalance() {
        const payout = (Math.random() * 50).toFixed(2);
        const balanceEl = document.querySelector('.pago-balance .amount');
        let current = parseFloat(balanceEl.textContent.replace(',', ''));
        // 30% chance to win "house money" just for effect
        if(Math.random() > 0.7) {
             current += parseFloat(payout);
             balanceEl.textContent = current.toLocaleString('en-US', {minimumFractionDigits: 2});
             // Flash effect
             balanceEl.style.color = '#76ff03';
             setTimeout(() => balanceEl.style.color = '#ffd700', 500);
        }
    }

    // ==========================================
    // UI MANAGEMENT
    // ==========================================
    function renderAnimalsList() {
        animalsListEl.innerHTML = '';
        animals.forEach((animal, index) => {
            const chip = document.createElement('div');
            chip.className = 'animal-chip';
            chip.innerHTML = `
                <span class="emoji">${animal.emoji}</span>
                <span class="name">${animal.name}</span>
                <button class="remove-btn" onclick="removeAnimal(${index})">×</button>
            `;
            animalsListEl.appendChild(chip);
        });
        localStorage.setItem('animalitos_list', JSON.stringify(animals));
        drawWheel();
    }

    window.removeAnimal = function(index) {
        if (animals.length <= 2) {
            alert("Debe haber al menos 2 animales.");
            return;
        }
        confirm(`¿Eliminar ${animals[index].name}?`) && animals.splice(index, 1);
        renderAnimalsList();
    };

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-animal-name').value.trim();
        const emoji = document.getElementById('new-animal-emoji').value.trim();
        
        if (!name || !emoji) return;
        
        const newAnimal = {
            id: animals.length, // Simple ID gen
            name: name,
            emoji: emoji,
            color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)]
        };
        
        animals.push(newAnimal);
        renderAnimalsList();
        addForm.reset();
    });

    function renderHistory() {
        historyListEl.innerHTML = '';
        if (history.length === 0) {
            historyListEl.innerHTML = '<div class="history-empty">Aún no hay resultados</div>';
            return;
        }
        
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-num">${item.id}</div>
                <div class="history-emoji">${item.emoji}</div>
                <div class="history-info">
                    <div class="history-name">${item.name}</div>
                    <div class="history-time">${item.timestamp}</div>
                </div>
            `;
            historyListEl.appendChild(div);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        if(confirm('¿Borrar todo el historial?')) {
            history = [];
            localStorage.setItem('animalitos_history', JSON.stringify([]));
            renderHistory();
        }
    });

    closeModalBtn.addEventListener('click', () => {
        winnerOverlay.classList.remove('active');
    });

    spinBtn.addEventListener('click', spin);
    spinBtnCenter.addEventListener('click', spin);

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.classList.toggle('muted', !soundEnabled);
        initAudio(); 
    });

    // ==========================================
    // CONFETTI
    // ==========================================
    function spawnConfetti() {
        const container = document.getElementById('confetti-wrapper');
        container.innerHTML = '';
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti-piece');
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.animationDelay = (Math.random() * 1) + 's';
            container.appendChild(confetti);
        }
        
        setTimeout(() => {
            container.innerHTML = '';
        }, 4000);
    }

    // ==========================================
    // INIT
    // ==========================================
    drawWheel();
    renderAnimalsList();
    renderHistory();
});
