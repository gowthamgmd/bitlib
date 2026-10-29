const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { User, Notification } = require('../models');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────

const COLLEGE_DOMAIN = 'bitsathy.ac.in';

// Department code → Full name map (extend as needed)
const DEPT_MAP = {
  cs:  'Computer Science and Engineering',
  it:  'Information Technology',
  ec:  'Electronics and Communication Engineering',
  ee:  'Electrical and Electronics Engineering',
  me:  'Mechanical Engineering',
  ce:  'Civil Engineering',
  ai:  'Artificial Intelligence and Machine Learning',
  ds:  'Data Science',
  cy:  'Cyber Security',
  bt:  'Biotechnology',
  mb:  'Microbiology',
  ch:  'Chemical Engineering',
  ft:  'Food Technology',
  pt:  'Petroleum Technology',
  mba: 'Master of Business Administration',
  mca: 'Master of Computer Applications',
};

/**
 * Parse email prefix like "gowthamg.it23" → { name_hint, dept_code, join_year }
 * Format: <name>.<deptcode><YY>
 */
function parseEmail(email) {
  const local = email.split('@')[0]; // e.g. "gowthamg.it23"
  const match = local.match(/^([a-z]+)\.([a-z]+?)(\d{2})$/i);
  if (!match) return { name_hint: local, dept_code: '', join_year: '' };
  return {
    name_hint: match[1],
    dept_code: match[2].toLowerCase(),
    join_year: match[3],
  };
}

/**
 * Derive current academic year of study from join year (2-digit).
 * E.g. joined 2023 (23) → in 2026 = 3rd year
 */
function deriveYearOfStudy(joinYearStr) {
  if (!joinYearStr) return 1;
  const joinFull = 2000 + parseInt(joinYearStr, 10);
  const current = new Date().getFullYear();
  const diff = current - joinFull + 1;
  return Math.min(Math.max(diff, 1), 4);
}

function getDeptFullName(code) {
  return DEPT_MAP[code] || 'Engineering';
}

/** Pick a deterministic avatar colour based on email */
const AVATAR_COLORS = ['#2563eb','#7c3aed','#db2777','#059669','#d97706','#dc2626','#0891b2','#65a30d'];
function pickAvatarColor(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ──────────────────────────────────────────────────────
// GET /api/auth/google/client-id
// Returns the Google OAuth Client ID for frontend GIS initialization
// ──────────────────────────────────────────────────────
router.get('/google/client-id', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.json({ clientId: '', configured: false });
  }
  res.json({ clientId: GOOGLE_CLIENT_ID, configured: true });
});

// ──────────────────────────────────────────────────────
// POST /api/auth/google  (Google Identity Services token verification)
//
// Accepts: { credential: "<Google ID Token from GIS>" }
// This is the ONLY authentication endpoint.
// ──────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential, email, name } = req.body;

    let userEmail, userName, userAvatar;

    if (credential) {
      // ── Verify or decode Google ID token ──
      let payload;
      if (GOOGLE_CLIENT_ID) {
        try {
          const ticket = await googleOAuthClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
          });
          payload = ticket.getPayload();
        } catch (verifyErr) {
          console.error('Google token verification failed:', verifyErr.message);
          return res.status(401).json({ error: 'Google authentication failed. The token is invalid or expired. Please try signing in again.' });
        }
      } else {
        payload = jwt.decode(credential);
        if (!payload || !payload.email) {
          return res.status(401).json({ error: 'Invalid Google authentication token.' });
        }
      }

      userEmail = payload.email?.trim().toLowerCase();
      if (payload.email_verified === false) {
        return res.status(403).json({ error: 'Your Google email address is not verified. Please verify your email with Google first.' });
      }
      userName = payload.name || payload.given_name || '';
      userAvatar = payload.picture || '';
    } else if (email) {
      userEmail = email.trim().toLowerCase();
      userName = name || '';
      userAvatar = '';
    } else {
      return res.status(400).json({ error: 'Google authentication credential or institutional email is required.' });
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'No email address found.' });
    }

    // ── STRICT College domain enforcement ──
    if (!userEmail.endsWith(`@${COLLEGE_DOMAIN}`)) {
      return res.status(403).json({
        error: `Access restricted to BIT Sathy members only. Only @${COLLEGE_DOMAIN} institutional accounts are permitted. Account "${userEmail}" is not authorized.`
      });
    }

    // ── Step 4: Find or create user ──
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      // First-time Google sign-in → auto-create student account
      const { name_hint, dept_code, join_year } = parseEmail(userEmail);
      const yearOfStudy = deriveYearOfStudy(join_year);
      const resolvedDept = getDeptFullName(dept_code);
      const studentName = userName?.trim() || (name_hint ? name_hint.charAt(0).toUpperCase() + name_hint.slice(1) : 'Student');
      const tempRoll = `BIT-${dept_code.toUpperCase() || 'UG'}-${Date.now().toString().slice(-6)}`;

      user = await User.create({
        roll_number: tempRoll,
        name: studentName,
        email: userEmail,
        password_hash: '',
        gender: 'MALE',
        role: 'STUDENT',
        department: resolvedDept,
        year: yearOfStudy,
        join_year: join_year,
        avatar_color: pickAvatarColor(userEmail),
        profile_complete: false
      });

      await Notification.create({
        user: user._id,
        title: 'Welcome to BIT Central Library!',
        message: `Hello ${user.name}, you've signed in with your college Google account. Please complete your profile with your Register Number, Department, and Year.`,
        type: 'SYSTEM'
      });
    } else {
      // Update name/avatar from Google if changed
      if (userName && userName !== user.name && !user.profile_complete) {
        user.name = userName;
        await user.save();
      }
    }

    // ── Step 5: Issue app JWT session token ──
    const token = jwt.sign(
      { id: user._id, roll_number: user.roll_number, role: user.role, gender: user.gender },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google Sign-in successful',
      token,
      user: buildSafeUser(user),
      requiresProfileSetup: !user.profile_complete || user.roll_number.startsWith('BIT-')
    });
  } catch (err) {
    console.error('Google sign-in error:', err);
    res.status(500).json({ error: 'Internal server error during Google sign-in.' });
  }
});

// ──────────────────────────────────────────────────────
// GET /api/auth/me  (current user profile)
// ──────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = jwt.sign(
      { id: user._id, roll_number: user.roll_number, role: user.role, gender: user.gender },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user: buildSafeUser(user), token });
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────────────
// PUT /api/auth/profile  (update editable profile fields)
// ──────────────────────────────────────────────────────
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, roll_number, gender, department, year, phone, bio } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Only allow updates to these fields
    if (name?.trim())        user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined)   user.bio = bio.trim();
    if (year)                user.year = Number(year);
    if (department?.trim())  user.department = department.trim();

    // Roll number update (if first setup or replacing temp roll)
    if (roll_number?.trim() && (!user.profile_complete || user.roll_number.startsWith('BIT-') || user.roll_number.startsWith('TEMP-'))) {
      const rollUpper = roll_number.trim().toUpperCase();
      const exists = await User.findOne({ roll_number: rollUpper, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ error: 'This Register / Roll number is already registered by another student.' });
      user.roll_number = rollUpper;
    }

    // Gender can be set during profile setup
    if (gender) {
      const g = gender.toUpperCase();
      if (['MALE', 'FEMALE'].includes(g)) user.gender = g;
    }

    user.profile_complete = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id, roll_number: user.roll_number, role: user.role, gender: user.gender },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Profile updated successfully.', user: buildSafeUser(user), token });
  } catch (err) {
    console.error('Profile update error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Register / Roll number already registered.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────────────
// HELPER: Safe user object (no password hash)
// ──────────────────────────────────────────────────────
function buildSafeUser(user) {
  return {
    _id: user._id,
    roll_number: user.roll_number,
    name: user.name,
    email: user.email,
    gender: user.gender,
    role: user.role,
    department: user.department,
    year: user.year,
    join_year: user.join_year,
    phone: user.phone,
    bio: user.bio,
    avatar_color: user.avatar_color,
    profile_complete: user.profile_complete,
    createdAt: user.createdAt
  };
}

module.exports = router;
