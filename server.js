require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const fetch = require('node-fetch');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// JWT secret
const JWT_SECRET = 'mindful-meals-expert-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        // Accept images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDF files are allowed'));
        }
    }
});

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
app.use(limiter);

// Grok AI Configuration
const GROK_API_ENDPOINT = 'https://api.grok.ai/v1/chat/completions';
const GROK_API_KEY = process.env.GROK_API_KEY;

if (!GROK_API_KEY) {
    console.error('GROK_API_KEY environment variable is not set');
    process.exit(1);
}

// OCR Worker
let ocrWorker = null;

async function initializeOCR() {
    try {
        ocrWorker = await createWorker('eng');
        console.log('OCR worker initialized');
    } catch (error) {
        console.error('Failed to initialize OCR worker:', error);
        process.exit(1);
    }
}

initializeOCR();

// Mock user database (replace with real database in production)
const users = [{
    id: 1,
    email: 'tushar.tyagi@example.com',
    password: 'tushar@12341234',
    type: 'user',
    name: 'Tushar Tyagi',
    created: new Date()
}];

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Auth routes
app.post('/api/auth', async (req, res) => {
    try {
        const { email, password, type, mode } = req.body;

        if (mode === 'signup') {
            // Check if user already exists
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Create new user
            const newUser = {
                id: users.length + 1,
                email,
                password, // In production, hash the password
                type,
                name: email.split('@')[0], // Default name
                created: new Date()
            };

            users.push(newUser);

            // Generate token
            const token = jwt.sign({ id: newUser.id, email, type }, JWT_SECRET, { expiresIn: '24h' });

            res.json({
                token,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    type: newUser.type,
                    name: newUser.name
                }
            });
        } else {
            // Login
            const user = users.find(u => u.email === email && u.password === password);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Generate token
            const token = jwt.sign({ id: user.id, email, type }, JWT_SECRET, { expiresIn: '24h' });

            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    type: user.type,
                    name: user.name
                }
            });
        }
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Login
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, type: user.type },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            type: user.type,
            name: user.name
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Protected user routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type
    });
});

app.get('/api/user/activity', authenticateToken, (req, res) => {
    // Mock activity data
    const activities = [
        {
            type: 'assessment',
            title: 'Health Assessment',
            description: 'Completed initial health assessment',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
            type: 'upload',
            title: 'Medical Report',
            description: 'Uploaded blood test results',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
    ];

    res.json(activities);
});

app.get('/api/user/nutrition-stats', authenticateToken, (req, res) => {
    // Mock nutrition stats
    const stats = {
        calories: { value: '2000', label: 'Daily Target' },
        protein: { value: '75g', label: 'Daily Target' },
        water: { value: '2.5L', label: 'Daily Target' },
        exercise: { value: '30min', label: 'Daily Target' }
    };

    res.json(stats);
});

// Routes
app.post('/api/ocr', authenticateToken, upload.array('reports', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = [];
        for (const file of req.files) {
            try {
                // Process image with Tesseract
                const { data: { text } } = await ocrWorker.recognize(file.buffer);
                
                // Extract medical data
                const medicalData = extractMedicalData(text);
                
                results.push({
                    filename: file.originalname,
                    medicalData
                });
            } catch (error) {
                console.error(`OCR Error for file ${file.originalname}:`, error);
                results.push({
                    filename: file.originalname,
                    error: 'Failed to process file'
                });
            }
        }

        // Combine all medical data
        const combinedData = {
            bloodSugar: findLatestValue(results, 'bloodSugar'),
            cholesterol: findLatestValue(results, 'cholesterol'),
            bloodPressure: findLatestValue(results, 'bloodPressure'),
            diagnoses: combineUnique(results.map(r => r.medicalData?.diagnoses || []))
        };

        res.json({
            results,
            medicalData: combinedData
        });
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ error: 'OCR processing failed' });
    }
});

app.post('/api/diet-recommendation', authenticateToken, async (req, res) => {
    try {
        const {
            medicalData,
            preferences = '',
            allergies = '',
            lifestyle = 'moderate'
        } = req.body;

        // Get user data
        const user = users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate diet recommendation using Grok AI
        const prompt = generateDietPrompt({
            name: user.name,
            medicalData,
            preferences,
            allergies,
            lifestyle
        });

        try {
            const response = await fetch(GROK_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'grok-3',
                    messages: [
                        {
                            role: "system",
                            content: "You are a professional nutritionist and diet expert. Provide detailed, safe, and personalized diet recommendations based on medical data and user preferences. Always consider potential health risks and contraindications. Format the response with clear sections for each day's meals."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                    top_p: 0.95,
                    frequency_penalty: 0.5,
                    presence_penalty: 0.5
                })
            });

            if (!response.ok) {
                throw new Error(`Grok AI API error: ${response.status}`);
            }

            const completion = await response.json();
            res.json({ recommendation: completion.choices[0].message.content });

        } catch (error) {
            console.error('Grok AI API Error:', error);
            throw error;
        }
    } catch (error) {
        console.error('Diet Recommendation Error:', error);
        res.status(500).json({ error: 'Failed to generate diet recommendation' });
    }
});

// Helper Functions
function extractMedicalData(text) {
    const data = {
        bloodSugar: extractValue(text, /(?:blood sugar|glucose)[:\s]+(\d+(?:\.\d+)?)/i),
        cholesterol: extractValue(text, /(?:total cholesterol|cholesterol)[:\s]+(\d+(?:\.\d+)?)/i),
        bloodPressure: extractValue(text, /(?:blood pressure|bp)[:\s]+(\d+\/\d+)/i),
        hdl: extractValue(text, /hdl[:\s]+(\d+(?:\.\d+)?)/i),
        ldl: extractValue(text, /ldl[:\s]+(\d+(?:\.\d+)?)/i),
        triglycerides: extractValue(text, /triglycerides[:\s]+(\d+(?:\.\d+)?)/i),
        thyroidTsh: extractValue(text, /(?:thyroid|tsh)[:\s]+(\d+(?:\.\d+)?)/i),
        hemoglobinA1c: extractValue(text, /(?:hba1c|a1c)[:\s]+(\d+(?:\.\d+)?)/i),
        diagnoses: extractDiagnoses(text)
    };

    return data;
}

function extractValue(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : null;
}

function extractDiagnoses(text) {
    const diagnoses = [];
    const conditions = [
        'diabetes',
        'hypertension',
        'high blood pressure',
        'cholesterol',
        'hypercholesterolemia',
        'obesity',
        'thyroid',
        'hypothyroidism',
        'hyperthyroidism',
        'anemia',
        'vitamin d deficiency',
        'iron deficiency'
    ];

    conditions.forEach(condition => {
        if (new RegExp(condition, 'i').test(text)) {
            diagnoses.push(condition.toLowerCase());
        }
    });

    return [...new Set(diagnoses)]; // Remove duplicates
}

function findLatestValue(results, key) {
    // Get the last non-null value
    for (let i = results.length - 1; i >= 0; i--) {
        const value = results[i].medicalData?.[key];
        if (value) return value;
    }
    return null;
}

function combineUnique(arrays) {
    return [...new Set([].concat(...arrays))];
}

function generateDietPrompt(userData) {
    return `Generate a personalized 7-day diet plan for ${userData.name}.

Medical Information:
${userData.medicalData.diagnoses.length > 0 ? 
    `Diagnosed Conditions: ${userData.medicalData.diagnoses.join(', ')}` : 
    'No specific medical conditions reported'}
Blood Sugar: ${userData.medicalData.bloodSugar || 'Not available'}
Cholesterol: ${userData.medicalData.cholesterol || 'Not available'}
Blood Pressure: ${userData.medicalData.bloodPressure || 'Not available'}
HDL: ${userData.medicalData.hdl || 'Not available'}
LDL: ${userData.medicalData.ldl || 'Not available'}
Triglycerides: ${userData.medicalData.triglycerides || 'Not available'}
Thyroid TSH: ${userData.medicalData.thyroidTsh || 'Not available'}
HbA1c: ${userData.medicalData.hemoglobinA1c || 'Not available'}

Dietary Preferences: ${userData.preferences || 'No specific preferences'}
Allergies: ${userData.allergies || 'No known allergies'}
Lifestyle: ${userData.lifestyle}

Please provide:
1. A detailed 7-day meal plan with breakfast, lunch, dinner, and snacks
2. Portion sizes and nutritional information for each meal
3. Specific considerations based on medical conditions
4. Alternative options for meals
5. General dietary guidelines and recommendations

Format the response with clear sections for each day, and include specific nutritional considerations based on the medical data provided.`;
}

// Serve static files from multiple directories
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Handle SPA routing - send index.html for all routes
app.get('*', (req, res) => {
    // Check if the request is for a specific HTML file
    if (req.path.endsWith('.html')) {
        const htmlFile = path.join(__dirname, req.path);
        if (fs.existsSync(htmlFile)) {
            return res.sendFile(htmlFile);
        }
    }
    // Default to index.html
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 