const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

console.log('💡 Running with local JWT authentication.');
console.log('💡 Valid credentials:');
console.log('   Username: admin | Password: admin123 (Local Bypass)');
console.log('   Any valid CCBP credentials (verified via proxy).');

const JWT_SECRET = process.env.JWT_SECRET || 'nxttrenz_local_secret_key_12345';
let cachedCcbpToken = null;

// Helper to obtain CCBP JWT token under the hood for API proxying
async function getCcbpToken() {
  if (cachedCcbpToken) return cachedCcbpToken;
  try {
    const response = await fetch('https://apis.ccbp.in/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rahul', password: 'rahul@2021' })
    });
    if (response.ok) {
      const data = await response.json();
      cachedCcbpToken = data.jwt_token;
      console.log('🔑 Obtained system CCBP token for API proxying.');
      return cachedCcbpToken;
    }
  } catch (e) {
    console.error('Failed to retrieve CCBP token:', e.message);
  }
  return null;
}

// Authentication Middleware to verify token from cookie/headers
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.jwt_token;

  if (!token) {
    return res.status(401).json({ error_msg: 'Unauthorized access. Token missing.' });
  }

  // Validate with Local JWT Secret
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error_msg: 'Token verification failed. Please login again.' });
    }
    req.user = user;
    next();
  });
}

// Route: User Registration / Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error_msg: 'Username and password are required' });
  }

  // Local Fallback simulation
  const userEmail = email || `${username}@gmail.com`;
  console.log(`[Mock Signup] User: ${username}, Email: ${userEmail} registered locally.`);
  return res.status(200).json({ message: 'Mock registration successful!' });
});

// Route: User Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error_msg: 'Username and password are required' });
  }

  // 0. Quick Admin bypass check
  if (username === 'admin' && password === 'admin123') {
    const mockToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    console.log('🔑 Admin bypass login successful.');
    return res.status(200).json({
      jwt_token: mockToken,
      message: 'Admin login successful'
    });
  }

  // 1. Attempt to verify details with CCBP API request
  try {
    const ccbpResponse = await fetch('https://apis.ccbp.in/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (ccbpResponse.ok) {
      console.log(`✅ Login details verified with CCBP API for user: ${username}`);
      // Issue a local token instead of CCBP's token so our middleware can verify it
      const localToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
      return res.status(200).json({
        jwt_token: localToken,
        message: 'Login successful'
      });
    }
  } catch (error) {
    console.error('⚠️ CCBP login API request failed, falling back:', error.message);
  }

  // 2. Local Fallback Login check
  const validUsers = {
    'rahul': 'rahul@2021',
    'raja': 'raja@2021'
  };

  if (validUsers[username] && validUsers[username] === password) {
    const mockToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({
      jwt_token: mockToken,
      message: 'Mock login successful'
    });
  } else {
    return res.status(400).json({ error_msg: 'Invalid credentials. Try admin/admin123.' });
  }
});

// Route proxy: Get All Products
app.get('/api/products', authenticateToken, async (req, res) => {
  const ccbpToken = await getCcbpToken();
  const { sort_by = '', category = '', title_search = '', rating = '' } = req.query;

  const url = `https://apis.ccbp.in/products?sort_by=${sort_by}&category=${category}&title_search=${encodeURIComponent(title_search)}&rating=${rating}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${ccbpToken}` }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error_msg: 'Failed to fetch products from proxy server' });
  }
});

// Route proxy: Get Specific Product Details
app.get('/api/products/:id', authenticateToken, async (req, res) => {
  const ccbpToken = await getCcbpToken();
  const { id } = req.params;

  const url = `https://apis.ccbp.in/products/${id}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${ccbpToken}` }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error_msg: 'Failed to fetch product details from proxy server' });
  }
});

// Route proxy: Get Prime Deals
app.get('/api/prime-deals', authenticateToken, async (req, res) => {
  const ccbpToken = await getCcbpToken();
  const url = 'https://apis.ccbp.in/prime-deals';

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${ccbpToken}` }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error_msg: 'Failed to fetch prime deals from proxy server' });
  }
});

// Root check endpoint
app.get('/', (req, res) => {
  res.send('🚀 Nxt Trendz Backend with Supabase Auth is running!');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
