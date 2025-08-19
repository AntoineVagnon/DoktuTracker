# PRD Sécurité Doktu.co - Corrections Critiques Urgentes

**Document:** Product Requirements Document - Sécurité  
**Plateforme:** Doktu.co  
**Environnement:** Replit  
**Auteur:** Manus AI  
**Date:** 19 Août 2025  
**Priorité:** CRITIQUE - IMPLÉMENTATION IMMÉDIATE REQUISE

## Résumé Exécutif

Suite à un audit de sécurité complet de la plateforme Doktu.co, **12 vulnérabilités critiques et de haut niveau** ont été identifiées, nécessitant une correction immédiate. Ces vulnérabilités exposent la plateforme à des risques majeurs incluant la fraude financière, la violation du RGPD, l'exposition de données médicales sensibles, et l'exécution de code malveillant.

**Impact financier potentiel:** Perte de 99.97% du chiffre d'affaires due à la manipulation de prix  
**Impact légal:** Violation massive du RGPD avec exposition de données de santé  
**Impact sécuritaire:** Exécution de code JavaScript malveillant et vol de sessions

## Vulnérabilités Critiques Identifiées

### 🚨 NIVEAU CRITIQUE MAXIMUM

#### 1. Exposition API Non Sécurisée `/api/doctors`
- **Endpoint:** `GET /api/doctors`
- **Statut:** Accessible sans authentification
- **Données exposées:** Emails, IDs utilisateurs, numéros RPPS, statuts d'approbation, données Stripe

#### 2. Manipulation de Prix Côté Client
- **Vulnérabilité:** Prix modifiable via paramètres URL
- **Test confirmé:** €35.00 → €0.01 accepté par le système
- **Impact:** Fraude financière massive possible

#### 3. Cross-Site Scripting (XSS)
- **Localisation:** Champ "First Name" formulaire d'inscription
- **Payload confirmé:** `<script>alert('XSS')</script>`
- **Impact:** Exécution de code malveillant, vol de sessions

## Architecture Technique Actuelle

### Stack Technologique Identifié
- **Frontend:** React SPA
- **Backend:** Express.js (Node.js)
- **Base de données:** Supabase
- **Paiements:** Stripe (mode test)
- **Hébergement:** Google Cloud Platform
- **Environnement:** Replit

### Endpoints API Découverts
```
/api/auth/user          - Authentification (protégé ✅)
/api/auth/login         - Connexion
/api/auth/register      - Inscription
/api/auth/reset-password - Réinitialisation
/api/auth/logout        - Déconnexion
/api/doctors            - Liste médecins (NON PROTÉGÉ ❌)
/api/doctors/{id}       - Profil médecin individuel
/api/time-slots         - Créneaux horaires (protégé ✅)
/api/analytics/events   - Analytics (erreur de configuration)
/api/health-profile     - Profil de santé
```


## Corrections Prioritaires - Phase 1 (IMMÉDIAT)

### 🔥 CORRECTION 1: Sécurisation de l'API `/api/doctors`

**Problème:** L'endpoint `/api/doctors` expose toutes les données sensibles des médecins sans authentification.

**Solution technique:**

```javascript
// AVANT (vulnérable)
app.get('/api/doctors', async (req, res) => {
  const doctors = await supabase
    .from('doctors')
    .select(`
      *,
      user:users(*)
    `);
  res.json(doctors.data);
});

// APRÈS (sécurisé)
app.get('/api/doctors', authenticateToken, async (req, res) => {
  const doctors = await supabase
    .from('doctors')
    .select(`
      id,
      specialty,
      rating,
      reviewCount,
      consultationPrice,
      availableSlots,
      user:users(
        title,
        firstName,
        lastName,
        profileImageUrl
      )
    `);
  res.json(doctors.data);
});
```

**Middleware d'authentification requis:**

```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}
```

### 🔥 CORRECTION 2: Validation des Prix Côté Serveur

**Problème:** Les prix sont manipulables via les paramètres URL, permettant des consultations à €0.01.

**Solution technique:**

```javascript
// Route de réservation sécurisée
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { doctorId, slot } = req.body;
  
  // Récupérer le prix réel depuis la base de données
  const { data: doctor, error } = await supabase
    .from('doctors')
    .select('consultationPrice, id')
    .eq('id', doctorId)
    .single();
    
  if (error || !doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  
  // Utiliser UNIQUEMENT le prix de la base de données
  const realPrice = parseFloat(doctor.consultationPrice);
  
  // Créer la session Stripe avec le prix validé
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Consultation médicale - Dr. ${doctorName}`,
        },
        unit_amount: Math.round(realPrice * 100), // Prix en centimes
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/booking/cancel`,
    metadata: {
      doctorId: doctorId.toString(),
      slot: slot,
      userId: req.user.id.toString()
    }
  });
  
  res.json({ sessionId: session.id, price: realPrice });
});
```

**Modification du frontend:**

```javascript
// Supprimer le prix des paramètres URL
// AVANT
const bookingUrl = `/register?doctorId=${doctorId}&slot=${slot}&price=${price}`;

// APRÈS
const bookingUrl = `/register?doctorId=${doctorId}&slot=${slot}`;

// Le prix sera récupéré côté serveur lors de la création de la session de paiement
```

### 🔥 CORRECTION 3: Protection XSS

**Problème:** Les champs de formulaire acceptent du code JavaScript malveillant.

**Solution technique:**

```javascript
// Installation des dépendances de sécurité
npm install helmet express-validator dompurify

// Middleware de sécurité
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Configuration Helmet pour CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Validation et nettoyage des entrées
const window = new JSDOM('').window;
const purify = DOMPurify(window);

const validateAndSanitizeUser = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le prénom doit contenir entre 1 et 50 caractères')
    .customSanitizer(value => purify.sanitize(value)),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom doit contenir entre 1 et 50 caractères')
    .customSanitizer(value => purify.sanitize(value)),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Le mot de passe doit contenir au moins 12 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial')
];

// Route d'inscription sécurisée
app.post('/api/auth/register', validateAndSanitizeUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { firstName, lastName, email, password } = req.body;
  
  // Hachage sécurisé du mot de passe
  const bcrypt = require('bcrypt');
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  // Insertion en base avec données nettoyées
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        first_name: firstName, // Déjà nettoyé par DOMPurify
        last_name: lastName,   // Déjà nettoyé par DOMPurify
      }
    }
  });
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  res.status(201).json({ message: 'Compte créé avec succès' });
});
```


## Corrections Prioritaires - Phase 2 (URGENT)

### 🔧 CORRECTION 4: Gestion Sécurisée des Erreurs

**Problème:** Messages d'erreur verbeux révélant la structure interne de l'API.

**Solution technique:**

```javascript
// Middleware de gestion d'erreurs globale
const errorHandler = (err, req, res, next) => {
  // Log détaillé pour les développeurs (côté serveur uniquement)
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Réponse générique pour le client
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.status === 404) {
    return res.status(404).json({ 
      error: 'Resource not found',
      code: 'RESOURCE_NOT_FOUND'
    });
  }
  
  if (err.status === 401) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  // Erreur générique pour éviter la fuite d'informations
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && { details: err.message })
  });
};

app.use(errorHandler);

// Route sécurisée pour les profils de médecins
app.get('/api/doctors/:id', authenticateToken, async (req, res, next) => {
  try {
    const doctorId = parseInt(req.params.id);
    
    if (isNaN(doctorId)) {
      return res.status(400).json({ 
        error: 'Invalid doctor ID format',
        code: 'INVALID_ID_FORMAT'
      });
    }
    
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select(`
        id,
        specialty,
        bio,
        education,
        experience,
        languages,
        consultationPrice,
        rating,
        reviewCount,
        user:users(
          title,
          firstName,
          lastName,
          profileImageUrl
        )
      `)
      .eq('id', doctorId)
      .single();
      
    if (error || !doctor) {
      const notFoundError = new Error('Doctor not found');
      notFoundError.status = 404;
      return next(notFoundError);
    }
    
    res.json(doctor);
  } catch (error) {
    next(error);
  }
});
```

### 🔧 CORRECTION 5: Configuration Sécurisée de Supabase

**Problème:** Configuration Supabase potentiellement exposée et permissions trop larges.

**Solution technique:**

```javascript
// Configuration Supabase sécurisée
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Clé service, pas anon

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Politique RLS (Row Level Security) à implémenter dans Supabase
/*
-- Politique pour la table doctors
CREATE POLICY "Doctors visible to authenticated users only" ON doctors
FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour la table users (données sensibles)
CREATE POLICY "Users can only see their own data" ON users
FOR SELECT USING (auth.uid() = id);

-- Politique pour les réservations
CREATE POLICY "Users can only see their own bookings" ON bookings
FOR ALL USING (auth.uid() = user_id);

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
*/
```

### 🔧 CORRECTION 6: Sécurisation de l'Intégration Stripe

**Problème:** Clé publique Stripe exposée dans le JavaScript et configuration non sécurisée.

**Solution technique:**

```javascript
// Configuration Stripe côté serveur
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Endpoint pour créer une session de paiement sécurisée
app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { doctorId, slot } = req.body;
    
    // Validation des paramètres
    if (!doctorId || !slot) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Récupération sécurisée du médecin et du prix
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select(`
        id,
        consultationPrice,
        user:users(firstName, lastName)
      `)
      .eq('id', doctorId)
      .single();
      
    if (error || !doctor) {
      return res.status(404).json({ 
        error: 'Doctor not found',
        code: 'DOCTOR_NOT_FOUND'
      });
    }
    
    // Vérification de la disponibilité du créneau
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('slot', slot)
      .single();
      
    if (existingBooking) {
      return res.status(409).json({ 
        error: 'Time slot already booked',
        code: 'SLOT_UNAVAILABLE'
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Consultation - Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
            description: `Consultation médicale le ${new Date(slot).toLocaleDateString('fr-FR')}`,
          },
          unit_amount: Math.round(parseFloat(doctor.consultationPrice) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/booking/cancel`,
      metadata: {
        doctorId: doctorId.toString(),
        slot: slot,
        userId: req.user.id.toString()
      },
      customer_email: req.user.email,
    });
    
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ 
      error: 'Payment session creation failed',
      code: 'PAYMENT_SESSION_ERROR'
    });
  }
});

// Webhook Stripe pour confirmer les paiements
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Créer la réservation en base après paiement confirmé
    const { error } = await supabase
      .from('bookings')
      .insert({
        user_id: session.metadata.userId,
        doctor_id: session.metadata.doctorId,
        slot: session.metadata.slot,
        amount_paid: session.amount_total / 100,
        stripe_session_id: session.id,
        status: 'confirmed'
      });
      
    if (error) {
      console.error('Booking creation error:', error);
    }
  }
  
  res.json({received: true});
});
```

### 🔧 CORRECTION 7: Variables d'Environnement Sécurisées

**Problème:** Potentielle exposition des secrets et configuration non sécurisée.

**Fichier `.env` requis:**

```bash
# Base de données
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# JWT
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_minimum_32_characters

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application
NODE_ENV=production
FRONTEND_URL=https://doktu.co
PORT=3000

# Sécurité
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900

# Email (pour les notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

**Configuration Replit:**

```json
{
  "secrets": {
    "SUPABASE_URL": "your_supabase_url",
    "SUPABASE_SERVICE_ROLE_KEY": "your_service_key",
    "JWT_SECRET": "your_jwt_secret",
    "STRIPE_SECRET_KEY": "your_stripe_secret",
    "STRIPE_WEBHOOK_SECRET": "your_webhook_secret"
  }
}
```


## Configurations de Sécurité Avancées

### 🛡️ CORRECTION 8: En-têtes de Sécurité HTTP

**Implémentation complète avec Helmet:**

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://replit.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "wss://doktu.co"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Pour compatibilité Zoom
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// En-têtes personnalisés additionnels
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
```

### 🛡️ CORRECTION 9: Limitation du Taux de Requêtes

**Protection contre les attaques par force brute:**

```javascript
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Limitation générale
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limitation stricte pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentatives de connexion par IP
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
});

// Ralentissement progressif
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: 500,
  maxDelayMs: 20000,
});

// Application des limiteurs
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/auth/', speedLimiter);

// Limitation spécifique pour les endpoints sensibles
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 requêtes par heure
  message: {
    error: 'Sensitive endpoint rate limit exceeded',
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED'
  }
});

app.use('/api/doctors', strictLimiter);
```

### 🛡️ CORRECTION 10: Audit et Logging de Sécurité

**Système de logging complet:**

```javascript
const winston = require('winston');
const morgan = require('morgan');

// Configuration Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'doktu-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Middleware de logging des requêtes
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Middleware d'audit de sécurité
const securityAudit = (req, res, next) => {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    userId: req.user?.id || 'anonymous',
    sessionId: req.sessionID
  };
  
  // Log des événements sensibles
  if (req.url.includes('/api/auth/') || 
      req.url.includes('/api/doctors/') ||
      req.url.includes('/api/bookings/')) {
    logger.info('Security event', securityEvent);
  }
  
  // Détection d'activités suspectes
  if (req.url.includes('<script>') || 
      req.url.includes('javascript:') ||
      req.url.includes('data:text/html')) {
    logger.warn('Potential XSS attempt detected', {
      ...securityEvent,
      severity: 'HIGH',
      type: 'XSS_ATTEMPT'
    });
  }
  
  next();
};

app.use(securityAudit);
```

## Plan d'Implémentation par Priorité

### 🚨 PHASE 1 - CRITIQUE (À implémenter IMMÉDIATEMENT)

**Durée estimée:** 2-3 jours  
**Ressources requises:** 1 développeur senior

#### Jour 1:
1. **Sécurisation API `/api/doctors`** (2h)
   - Ajout middleware d'authentification
   - Limitation des champs exposés
   - Tests de validation

2. **Correction manipulation de prix** (3h)
   - Modification route de réservation
   - Validation côté serveur
   - Tests de paiement

3. **Protection XSS basique** (2h)
   - Installation DOMPurify
   - Validation des champs critiques
   - Tests d'injection

#### Jour 2:
4. **Gestion d'erreurs sécurisée** (2h)
   - Middleware d'erreurs globales
   - Messages génériques
   - Logging sécurisé

5. **Configuration Stripe sécurisée** (3h)
   - Endpoint de paiement sécurisé
   - Webhook de confirmation
   - Tests de transaction

6. **Variables d'environnement** (1h)
   - Configuration `.env`
   - Secrets Replit
   - Validation configuration

#### Jour 3:
7. **Tests de sécurité** (4h)
   - Tests d'authentification
   - Tests de manipulation de prix
   - Tests XSS
   - Validation complète

### 🔧 PHASE 2 - URGENT (Semaine suivante)

**Durée estimée:** 3-4 jours  
**Ressources requises:** 1 développeur senior

#### Implémentations:
- En-têtes de sécurité HTTP complets
- Limitation du taux de requêtes
- Système d'audit et logging
- Configuration Supabase RLS
- Tests de pénétration internes

### 🛡️ PHASE 3 - IMPORTANT (Dans les 2 semaines)

**Durée estimée:** 5 jours  
**Ressources requises:** 1 développeur + 1 DevOps

#### Implémentations:
- Monitoring de sécurité en temps réel
- Sauvegarde et récupération sécurisées
- Audit de conformité RGPD
- Documentation de sécurité
- Formation équipe

## Tests de Validation Requis

### Tests Automatisés de Sécurité

```javascript
// Tests Jest pour la sécurité
describe('Security Tests', () => {
  describe('API Authentication', () => {
    test('should require authentication for /api/doctors', async () => {
      const response = await request(app)
        .get('/api/doctors')
        .expect(401);
      
      expect(response.body.error).toBe('Access token required');
    });
    
    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/doctors')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);
      
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
  
  describe('Price Validation', () => {
    test('should use database price, not URL parameter', async () => {
      const token = await getValidToken();
      const response = await request(app)
        .post('/api/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({
          doctorId: 9,
          slot: '2025-08-20T15:30:00'
        })
        .expect(200);
      
      // Le prix doit être celui de la base de données (35.00)
      const session = await stripe.checkout.sessions.retrieve(response.body.sessionId);
      expect(session.amount_total).toBe(3500); // 35.00 EUR en centimes
    });
  });
  
  describe('XSS Protection', () => {
    test('should sanitize user input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: maliciousInput,
          lastName: 'Test',
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(201);
      
      // Vérifier que le script a été nettoyé
      const user = await getUserFromDatabase(response.body.userId);
      expect(user.firstName).not.toContain('<script>');
    });
  });
});
```

## Métriques de Succès

### Indicateurs de Sécurité à Surveiller

1. **Taux d'authentification réussie:** > 95%
2. **Tentatives d'accès non autorisé:** < 10/jour
3. **Temps de réponse API sécurisée:** < 200ms
4. **Erreurs de validation:** < 1%
5. **Incidents de sécurité:** 0

### Monitoring Continu

```javascript
// Métriques de sécurité avec Prometheus
const prometheus = require('prom-client');

const securityMetrics = {
  authAttempts: new prometheus.Counter({
    name: 'auth_attempts_total',
    help: 'Total authentication attempts',
    labelNames: ['status', 'ip']
  }),
  
  apiRequests: new prometheus.Counter({
    name: 'api_requests_total',
    help: 'Total API requests',
    labelNames: ['endpoint', 'method', 'status']
  }),
  
  securityEvents: new prometheus.Counter({
    name: 'security_events_total',
    help: 'Total security events',
    labelNames: ['type', 'severity']
  })
};

// Middleware de métriques
app.use((req, res, next) => {
  res.on('finish', () => {
    securityMetrics.apiRequests
      .labels(req.route?.path || req.path, req.method, res.statusCode)
      .inc();
  });
  next();
});
```

## Conclusion et Prochaines Étapes

Cette implémentation de sécurité est **critique et urgente**. Les vulnérabilités identifiées exposent la plateforme à des risques financiers, légaux et de réputation majeurs. 

**Actions immédiates requises:**
1. Arrêt temporaire des nouvelles inscriptions jusqu'à correction XSS
2. Audit de tous les paiements existants pour détecter les fraudes
3. Notification des autorités compétentes si des données ont été compromises
4. Implémentation des corrections Phase 1 dans les 48h

**Contact d'urgence:** En cas de problème durant l'implémentation, contacter l'équipe de sécurité immédiatement.

---

*Ce document est confidentiel et ne doit être partagé qu'avec les membres autorisés de l'équipe de développement.*

