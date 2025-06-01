// DOM Elements
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const usernameElement = document.getElementById('username');
const balanceElement = document.getElementById('balance');
const tabButtons = document.querySelectorAll('.tab-btn');
const logoutButton = document.getElementById('logout-btn');

// API URL
const API_URL = 'http://localhost:3000';

let socket = null;
let currentUser = null;

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Update active tab
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show corresponding form
        const formType = button.dataset.tab;
        if (formType === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    });
});

// Logout handler
logoutButton.addEventListener('click', () => {
    // Disconnect socket
    if (socket) {
        socket.disconnect();
    }
    
    // Clear local storage
    localStorage.removeItem('token');
    
    // Reset UI
    chatSection.classList.add('hidden');
    authSection.style.display = 'block';
    
    // Clear chat messages
    chatMessages.innerHTML = '';
    
    // Reset forms
    loginForm.reset();
    registerForm.reset();
    
    // Reset current user
    currentUser = null;
    
    // Show login tab
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === 'login') {
            btn.click();
        }
    });
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = registerForm.querySelector('button');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const username = registerForm.querySelector('input[type="text"]').value;
    const email = registerForm.querySelector('input[type="email"]').value;
    const password = registerForm.querySelector('input[type="password"]').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        
        // Initialize chat
        initializeChat();
    } catch (error) {
        alert(error.message);
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
});

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = loginForm.querySelector('button');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        
        // Initialize chat
        initializeChat();
    } catch (error) {
        alert(error.message);
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
});

// Initialize Chat
function initializeChat() {
    // Hide auth section and show chat section
    authSection.style.display = 'none';
    chatSection.classList.remove('hidden');

    // Update user info
    usernameElement.textContent = currentUser.username;
    updateBalance(currentUser.balance);

    // Initialize Socket.IO connection
    socket = io(API_URL, {
        auth: {
            token: localStorage.getItem('token')
        }
    });

    // Socket event handlers
    socket.on('connect', () => {
        addMessage('System', 'Connected to Personal Finance Assistant');
    });

    socket.on('chat response', (response) => {
        addMessage('System', response.message);
        if (response.type === 'success' && response.data && response.data.balance !== undefined) {
            updateBalance(response.data.balance);
        }
    });

    socket.on('error', (error) => {
        addMessage('System', `Error: ${error.message}`);
    });

    socket.on('disconnect', () => {
        addMessage('System', 'Disconnected from server');
    });
}

// Update balance with animation
function updateBalance(newBalance) {
    const oldBalance = parseFloat(balanceElement.textContent.replace('Balance: $', '')) || 0;
    const duration = 1000; // Animation duration in milliseconds
    const steps = 60; // Number of steps in the animation
    const increment = (newBalance - oldBalance) / steps;
    let currentStep = 0;

    const animation = setInterval(() => {
        currentStep++;
        const currentBalance = oldBalance + (increment * currentStep);
        balanceElement.textContent = `Balance: $${currentBalance.toFixed(2)}`;

        if (currentStep >= steps) {
            clearInterval(animation);
            balanceElement.textContent = `Balance: $${newBalance.toFixed(2)}`;
        }
    }, duration / steps);
}

// Chat Form Handler
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    
    if (message) {
        // Send message to server
        socket.emit('chat message', message);
        
        // Add message to chat
        addMessage('You', message);
        
        // Clear input
        chatInput.value = '';
    }
});

// Add message to chat
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender.toLowerCase() === 'you' ? 'user' : 'system'}`;
    
    const timestamp = new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${sender}</strong>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${text}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Check for existing session
const token = localStorage.getItem('token');
if (token) {
    // Verify token and initialize chat if valid
    fetch(`${API_URL}/api/auth/verify`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.user) {
            currentUser = data.user;
            initializeChat();
        } else {
            localStorage.removeItem('token');
        }
    })
    .catch(() => {
        localStorage.removeItem('token');
    });
} 