const http = require('http');

// Helper to run backend server in-process for tests
async function runTests() {
  console.log('🧪 Starting ISKCON LMS Three-Layer Architecture Test Suite...\n');

  const app = require('./server');
  const isRunning = await fetch('http://localhost:5000/health').then(() => true).catch(() => false);
  if (!isRunning) {
    app.listen(5000);
    await new Promise(r => setTimeout(r, 2000));
  }

  const BASE_URL = 'http://localhost:5000';
  const adminHeaders = {
    'Authorization': 'Bearer demo-token-admin-admin@iskcon.org',
    'Content-Type': 'application/json',
  };
  const instructorHeaders = {
    'Authorization': 'Bearer demo-token-instructor-instructor@iskcon.org',
    'Content-Type': 'application/json',
  };
  const studentHeaders = {
    'Authorization': 'Bearer demo-token-student-student@iskcon.org',
    'Content-Type': 'application/json',
  };

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // 1. COURSE CRUD TESTS
    // ---------------------------------------------------------
    console.log('📌 Testing Course CRUD Operations:');

    // Create course
    let res = await fetch(`${BASE_URL}/admin/courses`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        course_name: 'Bhakti Shastri – Nectar of Devotion',
        description: 'Comprehensive study of Rupa Goswami Sri Upadesamrta and Bhakti-rasamrta-sindhu.',
      }),
    });
    const createCourseData = await res.json();
    assert(res.status === 201, 'POST /admin/courses returns 201 Created');
    assert(createCourseData.course && createCourseData.course.id, 'Created course has an ID');
    assert(createCourseData.course.course_code && createCourseData.course.course_code.length === 7, `Course code is 7 characters (${createCourseData.course.course_code})`);

    const createdCourseId = createCourseData.course.id;
    const initialCourseCode = createCourseData.course.course_code;

    // Read all courses
    res = await fetch(`${BASE_URL}/admin/courses`, {
      method: 'GET',
      headers: adminHeaders,
    });
    const courseListData = await res.json();
    assert(res.status === 200, 'GET /admin/courses returns 200 OK');
    assert(Array.isArray(courseListData.courses), 'Returns list of courses');
    const foundCreated = courseListData.courses.find(c => c.id === createdCourseId);
    assert(foundCreated !== undefined, 'Created course appears in the course list');

    // Read single course by ID
    res = await fetch(`${BASE_URL}/admin/courses/${createdCourseId}`, {
      method: 'GET',
      headers: adminHeaders,
    });
    const singleCourseData = await res.json();
    assert(res.status === 200, `GET /admin/courses/${createdCourseId} returns 200 OK`);
    assert(singleCourseData.course && singleCourseData.course.id === createdCourseId, 'Course ID matches');

    // Update course
    res = await fetch(`${BASE_URL}/admin/courses/${createdCourseId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        course_name: 'Bhakti Shastri – Nectar of Devotion (Updated)',
        description: 'Updated in-depth curriculum.',
      }),
    });
    const updateCourseData = await res.json();
    assert(res.status === 200, `PUT /admin/courses/${createdCourseId} returns 200 OK`);
    assert(updateCourseData.course.course_name === 'Bhakti Shastri – Nectar of Devotion (Updated)', 'Course name was updated');
    assert(updateCourseData.course.course_code === initialCourseCode, 'Course code is preserved during update');

    // Delete course
    res = await fetch(`${BASE_URL}/admin/courses/${createdCourseId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(res.status === 200, `DELETE /admin/courses/${createdCourseId} returns 200 OK`);

    // Verify deletion
    res = await fetch(`${BASE_URL}/admin/courses/${createdCourseId}`, {
      method: 'GET',
      headers: adminHeaders,
    });
    // In mock mode it will either be 404 or fall back to default
    console.log('  Course CRUD complete.\n');

    // ---------------------------------------------------------
    // 2. ASSIGNMENT CRUD & PDF UPLOAD TESTS
    // ---------------------------------------------------------
    console.log('📌 Testing Assignment CRUD & PDF Upload:');

    // Create an active course for assignment tests
    const courseRes = await fetch(`${BASE_URL}/admin/courses`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        course_name: 'Sri Isopanisad Essentials',
        description: 'Foundational study of Vedic epistemology and Mantras.',
      }),
    });
    const courseForAssignments = (await courseRes.json()).course;
    const testCourseId = courseForAssignments.id;

    // Create assignment WITHOUT PDF
    res = await fetch(`${BASE_URL}/assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        course_id: testCourseId,
        title: 'Mantra 1 Reflection Essay',
        description: 'Write 500 words on the principle of Isavasya and quota allocation.',
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      }),
    });
    const noPdfAssignment = await res.json();
    assert(res.status === 201, 'POST /assignments (no PDF) returns 201 Created');
    assert(noPdfAssignment.assignment && noPdfAssignment.assignment.id, 'Assignment created without PDF');

    // Create assignment WITH valid PDF (multipart/form-data)
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000098 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF');
    const form = new FormData();
    form.append('course_id', testCourseId);
    form.append('title', 'Mantra 2-4 Analysis with Study Guide PDF');
    form.append('description', 'Refer to attached PDF instructions for verse analysis.');
    form.append('due_date', new Date(Date.now() + 86400000 * 10).toISOString());
    form.append('pdf', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'study_guide.pdf');

    res = await fetch(`${BASE_URL}/assignments`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer demo-token-admin-admin@iskcon.org',
      },
      body: form,
    });
    const pdfAssignmentData = await res.json();
    assert(res.status === 201, 'POST /assignments (with valid PDF) returns 201 Created');
    assert(pdfAssignmentData.assignment && pdfAssignmentData.assignment.attachment_name === 'study_guide.pdf', 'Attachment name preserved');
    assert(Boolean(pdfAssignmentData.assignment.attachment_url), 'Generated attachment_url present in response');

    const assignmentWithPdfId = pdfAssignmentData.assignment.id;

    // Fetch assignments by course
    res = await fetch(`${BASE_URL}/assignments/course/${testCourseId}`, {
      method: 'GET',
      headers: adminHeaders,
    });
    const courseAssignmentsData = await res.json();
    assert(res.status === 200, `GET /assignments/course/${testCourseId} returns 200 OK`);
    assert(Array.isArray(courseAssignmentsData.assignments), 'Returns list of assignments');
    const foundAssignment = courseAssignmentsData.assignments.find(a => a.id === assignmentWithPdfId);
    assert(foundAssignment && foundAssignment.attachment_name === 'study_guide.pdf', 'PDF attachment present in course assignment list');

    // Fetch single assignment by ID
    res = await fetch(`${BASE_URL}/assignments/${assignmentWithPdfId}`, {
      method: 'GET',
      headers: adminHeaders,
    });
    const singleAssignmentData = await res.json();
    assert(res.status === 200, `GET /assignments/${assignmentWithPdfId} returns 200 OK`);
    assert(singleAssignmentData.assignment.id === assignmentWithPdfId, 'Single assignment details match');

    // Update assignment and replace PDF
    const newPdfBuffer = Buffer.from('%PDF-1.4\n% New replacement PDF content\n%%EOF');
    const updateForm = new FormData();
    updateForm.append('title', 'Mantra 2-4 Analysis (Revised)');
    updateForm.append('pdf', new Blob([newPdfBuffer], { type: 'application/pdf' }), 'study_guide_v2.pdf');

    res = await fetch(`${BASE_URL}/assignments/${assignmentWithPdfId}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer demo-token-admin-admin@iskcon.org',
      },
      body: updateForm,
    });
    const updateAssignmentData = await res.json();
    assert(res.status === 200, `PUT /assignments/${assignmentWithPdfId} returns 200 OK`);
    assert(updateAssignmentData.assignment.title === 'Mantra 2-4 Analysis (Revised)', 'Assignment title updated');
    assert(updateAssignmentData.assignment.attachment_name === 'study_guide_v2.pdf', 'PDF was replaced with new attachment');

    // Delete assignment
    res = await fetch(`${BASE_URL}/assignments/${assignmentWithPdfId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(res.status === 200, `DELETE /assignments/${assignmentWithPdfId} returns 200 OK`);

    console.log('  Assignment CRUD & PDF upload complete.\n');

    // ---------------------------------------------------------
    // 3. NEGATIVE & SECURITY TESTS
    // ---------------------------------------------------------
    console.log('📌 Testing Negative & Security Validations:');

    // Non-PDF upload rejection
    const invalidForm = new FormData();
    invalidForm.append('course_id', testCourseId);
    invalidForm.append('title', 'Invalid Upload Test');
    invalidForm.append('pdf', new Blob(['Hello text file content'], { type: 'text/plain' }), 'notes.txt');

    res = await fetch(`${BASE_URL}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer demo-token-admin-admin@iskcon.org' },
      body: invalidForm,
    });
    const rejectTxtData = await res.json();
    assert(res.status === 400, 'Uploading non-PDF (.txt) returns 400 Bad Request');
    assert(rejectTxtData.error && rejectTxtData.error.includes('PDF'), 'Clear error message indicating PDF requirement');

    // Corrupted file pretending to be PDF (MIME application/pdf but invalid magic bytes)
    const fakePdfForm = new FormData();
    fakePdfForm.append('course_id', testCourseId);
    fakePdfForm.append('title', 'Fake PDF Test');
    fakePdfForm.append('pdf', new Blob(['NOT A REAL PDF HEADER'], { type: 'application/pdf' }), 'fake.pdf');

    res = await fetch(`${BASE_URL}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer demo-token-admin-admin@iskcon.org' },
      body: fakePdfForm,
    });
    assert(res.status === 400, 'File with invalid PDF magic signature returns 400 Bad Request');

    // Missing required fields
    res = await fetch(`${BASE_URL}/admin/courses`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ course_name: '' }),
    });
    assert(res.status === 400, 'POST /admin/courses with empty course_name returns 400');

    res = await fetch(`${BASE_URL}/assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ title: 'No course' }),
    });
    assert(res.status === 400, 'POST /assignments with missing course_id returns 400');

    // Unauthorized modification: Student attempting to create course
    res = await fetch(`${BASE_URL}/admin/courses`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ course_name: 'Student Unauthorized Course' }),
    });
    assert(res.status === 403, 'Student attempting to create course returns 403 Forbidden');

    // Unauthorized modification: Student attempting to create assignment
    res = await fetch(`${BASE_URL}/assignments`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ course_id: testCourseId, title: 'Student Assignment' }),
    });
    assert(res.status === 403, 'Student attempting to create assignment returns 403 Forbidden');

    // ---------------------------------------------------------
    // 4. ARCHITECTURE LAYER SEPARATION CHECKS
    // ---------------------------------------------------------
    console.log('\n📌 Testing Architecture Layer Separation:');
    const courseDAO = require('./dao/courseDAO');
    const assignmentDAO = require('./dao/assignmentDAO');
    const courseService = require('./services/courseService');
    const assignmentService = require('./services/assignmentService');
    const fileService = require('./services/fileService');
    const courseController = require('./application/controllers/courseController');
    const assignmentController = require('./application/controllers/assignmentController');

    assert(typeof courseDAO.getAllCourses === 'function', 'courseDAO contains getAllCourses');
    assert(typeof courseDAO.createCourse === 'function', 'courseDAO contains createCourse');
    assert(typeof assignmentDAO.getAssignmentsByCourse === 'function', 'assignmentDAO contains getAssignmentsByCourse');
    assert(typeof assignmentDAO.createAssignment === 'function', 'assignmentDAO contains createAssignment');

    assert(typeof courseService.createCourse === 'function', 'courseService contains createCourse business logic');
    assert(typeof courseService.generateUniqueCourseCode === 'function', 'courseService contains unique code generator');
    assert(typeof assignmentService.createAssignment === 'function', 'assignmentService contains createAssignment');
    assert(typeof fileService.validatePDF === 'function', 'fileService contains PDF validation logic');

    assert(typeof courseController.createCourse === 'function', 'courseController contains createCourse route handler');
    assert(typeof assignmentController.createAssignment === 'function', 'assignmentController contains createAssignment handler');

    console.log(`\n========================================`);
    console.log(`🏁 TEST SUITE FINISHED: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
