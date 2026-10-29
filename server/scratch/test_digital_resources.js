const fetch = global.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('========================================================');
  console.log('STARTING DIGITAL RESOURCES MODULE END-TO-END VALIDATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Categories API
    console.log('--> Testing Public / Student Categories Endpoint...');
    const catRes = await fetch(`${BASE_URL}/api/digital-resources/categories`);
    const catData = await catRes.json();
    assert(catRes.status === 200, 'Categories endpoint returns 200 OK');
    assert(Array.isArray(catData.categories), 'Categories is an array');
    assert(catData.categories.length === 8, `Exact 8 academic categories present (found ${catData.categories.length})`);
    
    const categoryTitles = catData.categories.map(c => c.title);
    assert(categoryTitles.includes('E-books and Textbooks'), 'Includes E-books and Textbooks');
    assert(categoryTitles.includes('Research Papers and Journals'), 'Includes Research Papers and Journals');
    assert(categoryTitles.includes('Previous-Year Question Papers'), 'Includes Previous-Year Question Papers');
    assert(categoryTitles.includes('Lecture Notes and Study Materials'), 'Includes Lecture Notes and Study Materials');
    assert(categoryTitles.includes('Laboratory Manuals'), 'Includes Laboratory Manuals');
    assert(categoryTitles.includes('Programming and Technical Tutorials'), 'Includes Programming and Technical Tutorials');
    assert(categoryTitles.includes('Online Courses and Educational Videos'), 'Includes Online Courses and Educational Videos');
    assert(categoryTitles.includes('Other Academic Resources'), 'Includes Other Academic Resources');

    // 2. Featured Resources API
    console.log('\n--> Testing Featured Resources...');
    const featRes = await fetch(`${BASE_URL}/api/digital-resources/featured`);
    const featData = await featRes.json();
    const featuredList = featData.resources || featData.featured || [];
    assert(featRes.status === 200, 'Featured endpoint returns 200 OK');
    assert(featuredList.length > 0, `Featured resources returned (${featuredList.length})`);

    // 3. Catalogue Search and Filtering
    console.log('\n--> Testing Catalogue Search & Filters...');
    const allRes = await fetch(`${BASE_URL}/api/digital-resources?limit=20`);
    const allData = await allRes.json();
    assert(allData.total >= 16, `Seeded catalogue contains at least 16 materials (found ${allData.total})`);

    // Filter by category
    const qpRes = await fetch(`${BASE_URL}/api/digital-resources?category=${encodeURIComponent('Previous-Year Question Papers')}`);
    const qpData = await qpRes.json();
    assert(qpData.resources.every(r => r.category === 'Previous-Year Question Papers'), 'Category filter strictly matches requested category');

    // Search query
    const searchRes = await fetch(`${BASE_URL}/api/digital-resources?search=Silberschatz`);
    const searchData = await searchRes.json();
    assert(searchData.resources.some(r => r.title.includes('Database System Concepts')), 'Keyword search matches "Silberschatz" to DBMS textbook');

    // 4. Authenticate as Student
    console.log('\n--> Authenticating as Student (gowthamg.it23@bitsathy.ac.in)...');
    const authRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gowthamg.it23@bitsathy.ac.in', name: 'Gowtham G' })
    });
    const authData = await authRes.json();
    assert(authRes.status === 200 && authData.token, 'Student authentication succeeded');
    const studentToken = authData.token;

    // 5. Toggle Bookmark
    const targetResource = allData.resources[0];
    console.log(`\n--> Testing Bookmark toggle on "${targetResource.title}"...`);
    const bmRes = await fetch(`${BASE_URL}/api/digital-resources/${targetResource._id}/bookmark`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const bmData = await bmRes.json();
    assert(bmRes.status === 200, 'Bookmark endpoint returns 200');
    assert(typeof bmData.is_bookmarked === 'boolean', `Bookmark toggled, is_bookmarked: ${bmData.is_bookmarked}`);

    // Verify in Student Dashboard
    console.log('\n--> Testing Student Dashboard Digital Resources Integration...');
    const dashRes = await fetch(`${BASE_URL}/api/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200, 'Dashboard returns 200');
    assert(dashData.digital_resources !== undefined, 'Dashboard payload contains digital_resources');
    assert(Array.isArray(dashData.digital_resources.bookmarks), 'Dashboard digital_resources.bookmarks is array');
    assert(typeof dashData.stats.saved_resources_count === 'number', `Saved resources count reported: ${dashData.stats.saved_resources_count}`);

    // 6. Test File Access (PDF Streaming)
    console.log(`\n--> Testing Secure PDF Document Access...`);
    const pdfResource = allData.resources.find(r => r.file_reference && r.file_reference.storage_path);
    if (pdfResource) {
      const accessRes = await fetch(`${BASE_URL}/api/digital-resources/${pdfResource._id}/access`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert(accessRes.status === 200, `Secure file streaming returns 200 OK (${accessRes.headers.get('content-type')})`);
      assert(accessRes.headers.get('content-type')?.includes('application/pdf'), 'Correct application/pdf mime-type streamed');
      assert(accessRes.headers.get('content-disposition')?.includes('inline'), 'Correct inline Content-Disposition header');
    }

    // 7. Authenticate as Librarian
    console.log('\n--> Authenticating as Dedicated Librarian (librarian@bitsathy.ac.in)...');
    const libAuthRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'librarian@bitsathy.ac.in', name: 'Dr. S. Ramanathan (Librarian)' })
    });
    const libAuthData = await libAuthRes.json();
    assert(libAuthRes.status === 200 && libAuthData.user.role === 'LIBRARIAN', 'Librarian authentication granted with LIBRARIAN role');
    const librarianToken = libAuthData.token;

    // 8. Librarian Overview Metrics
    console.log('\n--> Testing Librarian Overview Dashboard Metrics...');
    const ovRes = await fetch(`${BASE_URL}/api/librarian/overview`, {
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    const ovData = await ovRes.json();
    assert(ovRes.status === 200, 'Overview returns 200');
    assert(ovData.metrics?.digital_resources?.total >= 16, `Overview reflects digital_resources total: ${ovData.metrics?.digital_resources?.total}`);

    // 9. Librarian Digital Resources Management (CRUD)
    console.log('\n--> Testing Librarian Digital Resource Creation...');
    const createRes = await fetch(`${BASE_URL}/api/librarian/digital-resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${librarianToken}`
      },
      body: JSON.stringify({
        title: 'Artificial Intelligence & Neural Networks Autonomous Notes 2025',
        description: 'Comprehensive exam revision handouts for BITSathy CSE/AI&DS students.',
        author: 'Prof. S. Karthikeyan',
        publisher: 'BITSathy Academic Centre',
        category: 'Lecture Notes and Study Materials',
        subject: 'Artificial Intelligence',
        department: 'Artificial Intelligence & Data Science',
        resource_type: 'EXTERNAL_LINK',
        publication_year: 2025,
        external_url: 'https://arxiv.org/abs/2301.00001',
        access_type: 'INSTITUTIONAL',
        publication_status: 'PUBLISHED',
        tags: 'AI, Neural Networks, Deep Learning'
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201 && createData.resource?._id, 'Librarian successfully created new digital resource');
    const createdId = createData.resource?._id;

    // 10. Librarian Update Resource Metadata
    console.log(`\n--> Testing Librarian Updating Resource (${createdId})...`);
    const updateRes = await fetch(`${BASE_URL}/api/librarian/digital-resources/${createdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${librarianToken}`
      },
      body: JSON.stringify({
        title: 'Artificial Intelligence & Neural Networks Autonomous Notes 2025 (Updated)',
        access_type: 'OPEN_ACCESS'
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Resource metadata updated successfully');
    assert(updateData.resource?.access_type === 'OPEN_ACCESS', 'Updated access_type verified');

    // 11. Librarian Quick Status Toggle
    console.log(`\n--> Testing Librarian Status Toggle to DRAFT...`);
    const statusRes = await fetch(`${BASE_URL}/api/librarian/digital-resources/${createdId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${librarianToken}`
      },
      body: JSON.stringify({ publication_status: 'DRAFT' })
    });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200 && statusData.resource?.publication_status === 'DRAFT', 'Resource status changed to DRAFT');

    // 12. Librarian Delete Resource
    console.log(`\n--> Testing Librarian Resource Deletion...`);
    const delRes = await fetch(`${BASE_URL}/api/librarian/digital-resources/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    const delData = await delRes.json();
    assert(delRes.status === 200, `Resource successfully deleted: ${delData.message}`);

    // Verify deletion
    const verifyDelRes = await fetch(`${BASE_URL}/api/digital-resources/${createdId}`);
    assert(verifyDelRes.status === 404, 'Deleted resource returns 404 in catalogue');

    console.log('\n========================================================');
    console.log(`ALL DIGITAL RESOURCES TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
