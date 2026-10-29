const express = require('express');
const path = require('path');
const fs = require('fs');
const {
  DigitalResource,
  ResourceBookmark,
  ResourceActivity,
  User
} = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper: 8 Standard Categories with Descriptions & Lucide Icon mappings
const RESOURCE_CATEGORIES = [
  {
    id: 'E-books and Textbooks',
    title: 'E-books and Textbooks',
    icon: 'BookOpen',
    description: 'Curated standard engineering textbooks, reference volumes, and course reading.',
    accent_color: '#2563eb'
  },
  {
    id: 'Research Papers and Journals',
    title: 'Research Papers and Journals',
    icon: 'FileText',
    description: 'Peer-reviewed IEEE, ACM, Springer journal reprints, and faculty research publications.',
    accent_color: '#7c3aed'
  },
  {
    id: 'Previous-Year Question Papers',
    title: 'Previous-Year Question Papers',
    icon: 'History',
    description: 'Autonomous and Anna University end-semester question banks with model answer keys.',
    accent_color: '#d97706'
  },
  {
    id: 'Lecture Notes and Study Materials',
    title: 'Lecture Notes and Study Materials',
    icon: 'Layers',
    description: 'Departmental faculty unit-wise presentations, condensed notes, and formula sheets.',
    accent_color: '#059669'
  },
  {
    id: 'Laboratory Manuals',
    title: 'Laboratory Manuals',
    icon: 'Wrench',
    description: 'Prescribed practical laboratory observation guides, circuit designs, and code experiments.',
    accent_color: '#0284c7'
  },
  {
    id: 'Programming and Technical Tutorials',
    title: 'Programming and Technical Tutorials',
    icon: 'Code',
    description: 'Hands-on engineering tutorials for Full-Stack, AI/ML, Cloud, IoT, and Embedded systems.',
    accent_color: '#db2777'
  },
  {
    id: 'Online Courses and Educational Videos',
    title: 'Online Courses and Educational Videos',
    icon: 'Video',
    description: 'Selected NPTEL, SWAYAM, MIT OpenCourseWare, and institutional video lecture series.',
    accent_color: '#ea580c'
  },
  {
    id: 'Other Academic Resources',
    title: 'Other Academic Resources',
    icon: 'Bookmark',
    description: 'GATE/GRE guides, competitive exam prep, academic syllabi, and research templates.',
    accent_color: '#475569'
  }
];

// 1. Get Categories Metadata with Live Resource Counts
router.get('/categories', async (req, res) => {
  try {
    const counts = await DigitalResource.aggregate([
      { $match: { publication_status: 'PUBLISHED' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach(c => {
      countMap[c._id] = c.count;
    });

    const enriched = RESOURCE_CATEGORIES.map(cat => ({
      ...cat,
      resources_count: countMap[cat.id] || 0
    }));

    res.json({ categories: enriched });
  } catch (err) {
    console.error('Error fetching resource categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// 2. Featured / Recently Added Resources
router.get('/featured', async (req, res) => {
  try {
    const featured = await DigitalResource.find({ publication_status: 'PUBLISHED' })
      .sort({ views_count: -1, createdAt: -1 })
      .limit(6)
      .lean();

    res.json({ featured, resources: featured });
  } catch (err) {
    console.error('Error fetching featured resources:', err);
    res.status(500).json({ error: 'Failed to fetch featured resources.' });
  }
});

// 3. Catalogue List with Filters, Search, and Pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      department,
      resource_type,
      access_type,
      sort = 'recent',
      page = 1,
      limit = 12
    } = req.query;

    const query = { publication_status: 'PUBLISHED' };

    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (department && department !== 'ALL') {
      query.department = department;
    }
    if (resource_type && resource_type !== 'ALL') {
      query.resource_type = resource_type;
    }
    if (access_type && access_type !== 'ALL') {
      query.access_type = access_type;
    }

    if (search && search.trim()) {
      const q = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: q },
        { description: q },
        { author: q },
        { publisher: q },
        { subject: q },
        { tags: q }
      ];
    }

    // Sort order
    let sortOptions = { createdAt: -1 };
    if (sort === 'title') sortOptions = { title: 1 };
    else if (sort === 'popular') sortOptions = { views_count: -1, downloads_count: -1 };
    else if (sort === 'category') sortOptions = { category: 1, title: 1 };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [resources, totalCount, departmentsList] = await Promise.all([
      DigitalResource.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DigitalResource.countDocuments(query),
      DigitalResource.distinct('department', { publication_status: 'PUBLISHED' })
    ]);

    // Optional user token for bookmark annotation
    let userBookmarksSet = new Set();
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const bookmarks = await ResourceBookmark.find({ user: decoded.id }).lean();
        bookmarks.forEach(b => userBookmarksSet.add(b.resource.toString()));
      } catch (e) {
        // Guest user or expired token; proceed without bookmarks
      }
    }

    const enriched = resources.map(r => ({
      ...r,
      is_bookmarked: userBookmarksSet.has(r._id.toString()),
      has_file: Boolean(r.file_reference && r.file_reference.filename),
      has_link: Boolean(r.external_url)
    }));

    res.json({
      resources: enriched,
      total: totalCount,
      page: pageNum,
      pages: Math.ceil(totalCount / limitNum),
      departments: ['ALL', ...departmentsList.filter(Boolean)]
    });
  } catch (err) {
    console.error('Error fetching digital resources:', err);
    res.status(500).json({ error: 'Failed to retrieve digital resources.' });
  }
});

// 4. Authenticated Student: My Bookmarked Resources
router.get('/my/bookmarks', authenticateToken, async (req, res) => {
  try {
    const bookmarks = await ResourceBookmark.find({ user: req.user.id })
      .populate('resource')
      .sort({ createdAt: -1 })
      .lean();

    const validResources = bookmarks
      .filter(b => b.resource && b.resource.publication_status === 'PUBLISHED')
      .map(b => ({
        ...b.resource,
        is_bookmarked: true,
        bookmarked_at: b.createdAt
      }));

    res.json({ bookmarks: validResources });
  } catch (err) {
    console.error('Error fetching user bookmarks:', err);
    res.status(500).json({ error: 'Failed to retrieve bookmarked resources.' });
  }
});

// 5. Authenticated Student: My Recent Access History
router.get('/my/activity', authenticateToken, async (req, res) => {
  try {
    const activities = await ResourceActivity.find({ user: req.user.id })
      .populate('resource')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const filtered = activities
      .filter(a => a.resource && a.resource.publication_status === 'PUBLISHED')
      .map(a => ({
        _id: a._id,
        activity_type: a.activity_type,
        accessed_at: a.createdAt,
        resource: a.resource
      }));

    res.json({ activities: filtered });
  } catch (err) {
    console.error('Error fetching user activity:', err);
    res.status(500).json({ error: 'Failed to retrieve access history.' });
  }
});

// 6. Single Resource Details (Tracks View Engagement)
router.get('/:id', async (req, res) => {
  try {
    const resource = await DigitalResource.findById(req.params.id).lean();
    if (!resource || resource.publication_status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Academic resource not found or currently unpublished.' });
    }

    // Increment views count atomically
    await DigitalResource.findByIdAndUpdate(resource._id, { $inc: { views_count: 1 } });

    // Optional user bookmark and view activity recording
    let isBookmarked = false;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const [bm] = await Promise.all([
          ResourceBookmark.findOne({ user: decoded.id, resource: resource._id }),
          ResourceActivity.create({
            user: decoded.id,
            resource: resource._id,
            activity_type: 'VIEW'
          })
        ]);
        isBookmarked = Boolean(bm);
      } catch (e) {
        // Optional tracking error ignored
      }
    }

    res.json({
      resource: {
        ...resource,
        views_count: resource.views_count + 1,
        is_bookmarked: isBookmarked
      }
    });
  } catch (err) {
    console.error('Error fetching resource details:', err);
    res.status(500).json({ error: 'Failed to retrieve resource details.' });
  }
});

// 7. Toggle Bookmark for Authenticated Student
router.post('/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user.id;

    const resource = await DigitalResource.findById(resourceId);
    if (!resource || resource.publication_status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    const existing = await ResourceBookmark.findOne({ user: userId, resource: resourceId });

    if (existing) {
      await ResourceBookmark.findByIdAndDelete(existing._id);
      await DigitalResource.findByIdAndUpdate(resourceId, { $inc: { bookmarks_count: -1 } });
      return res.json({
        is_bookmarked: false,
        message: 'Removed from your academic bookmarks.'
      });
    } else {
      await ResourceBookmark.create({ user: userId, resource: resourceId });
      await DigitalResource.findByIdAndUpdate(resourceId, { $inc: { bookmarks_count: 1 } });
      return res.json({
        is_bookmarked: true,
        message: 'Bookmarked for quick revision and study.'
      });
    }
  } catch (err) {
    console.error('Error toggling bookmark:', err);
    res.status(500).json({ error: 'Failed to update bookmark.' });
  }
});

// 8. Secure Resource Access / File Streaming / Download
router.get('/:id/access', async (req, res) => {
  try {
    const resource = await DigitalResource.findById(req.params.id);
    if (!resource || resource.publication_status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Resource not available.' });
    }

    // Permission checks: INSTITUTIONAL / RESTRICTED require active login
    let userId = null;
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    if (resource.access_type !== 'OPEN_ACCESS' && !userId) {
      return res.status(401).json({
        error: 'Institutional Access Required: Please sign in with your @bitsathy.ac.in account to view or download this material.'
      });
    }

    // Handle Uploaded File
    if (resource.file_reference && (resource.file_reference.storage_path || resource.file_reference.filename)) {
      const storageRef = resource.file_reference.storage_path || resource.file_reference.filename;
      let filePath = path.resolve(__dirname, '..', storageRef);
      if (!fs.existsSync(filePath)) {
        filePath = path.resolve(path.join(__dirname, '../uploads/digital-resources', path.basename(storageRef)));
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.resolve(storageRef);
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Associated document file not found on library server.' });
      }

      // Record engagement
      await Promise.all([
        DigitalResource.findByIdAndUpdate(resource._id, { $inc: { downloads_count: 1 } }),
        userId ? ResourceActivity.create({
          user: userId,
          resource: resource._id,
          activity_type: 'DOWNLOAD'
        }) : Promise.resolve()
      ]);

      const downloadName = resource.file_reference.original_name || `${resource.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      res.setHeader('Content-Type', resource.file_reference.mime_type || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
      return fs.createReadStream(filePath).pipe(res);
    }

    // Handle External URL
    if (resource.external_url) {
      // Validate safe protocol
      if (!resource.external_url.startsWith('https://') && !resource.external_url.startsWith('http://')) {
        return res.status(400).json({ error: 'Configured external resource URL protocol is invalid.' });
      }

      if (userId) {
        await ResourceActivity.create({
          user: userId,
          resource: resource._id,
          activity_type: 'EXTERNAL_VISIT'
        });
      }
      await DigitalResource.findByIdAndUpdate(resource._id, { $inc: { views_count: 1 } });

      return res.json({
        type: 'EXTERNAL',
        url: resource.external_url,
        message: 'Redirecting to external academic repository.'
      });
    }

    res.status(400).json({ error: 'No associated file or external link configured for this resource.' });
  } catch (err) {
    console.error('Error accessing digital resource:', err);
    res.status(500).json({ error: 'Failed to access digital resource.' });
  }
});

module.exports = router;
