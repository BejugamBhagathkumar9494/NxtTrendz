const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Initialize Supabase Client if credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
let supabaseAdmin = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseKey !== 'YOUR_SUPABASE_KEY') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    isSupabaseConfigured = true;
    console.log('✅ Supabase connected successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
  }
} else {
  console.log('⚠️ Supabase credentials not found or placeholder values used. Running in LOCAL FALLBACK mode.');
  console.log('💡 In fallback mode, use the following credentials to login:');
  console.log('   Username: rahul | Password: rahul@2021');
  console.log('   Username: raja  | Password: raja@2021');
}

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

  if (isSupabaseConfigured) {
    // Validate with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error_msg: 'Invalid or expired session. Please login again.' });
    }
    req.user = user;
    next();
  } else {
    // Validate with Local JWT Secret
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error_msg: 'Token verification failed.' });
      }
      req.user = user;
      next();
    });
  }
}

// Route: User Registration / Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error_msg: 'Username and password are required' });
  }

  // Determine email (Supabase requires emails for password auth)
  const userEmail = email || `${username}@gmail.com`;

  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username
      }
    });

    if (error) {
      return res.status(400).json({ error_msg: error.message });
    }
    return res.status(200).json({ message: 'User registered successfully', data });
  } else {
    // Local Fallback simulation
    console.log(`[Mock Signup] User: ${username}, Email: ${userEmail} registered locally.`);
    return res.status(200).json({ message: 'Mock registration successful!' });
  }
});

// Route: User Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error_msg: 'Username and password are required' });
  }

  if (isSupabaseConfigured) {
    // Supposing username is email, or it's formatted as username@gmail.com
    const userEmail = username.includes('@') ? username : `${username}@gmail.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password
    });

    if (error) {
      return res.status(401).json({ error_msg: error.message });
    }

    return res.status(200).json({
      jwt_token: data.session.access_token,
      message: 'Login successful'
    });
  } else {
    // Local Fallback Login check
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
      return res.status(400).json({ error_msg: 'Invalid credentials. Try rahul/rahul@2021.' });
    }
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
