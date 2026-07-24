const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../services/automationService');

// @route   GET /api/courses
// @desc    Get all courses in catalog
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const courses = await Course.find({}).sort({ title: 1 });
    res.json({ data: courses, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/courses
// @desc    Add a course to catalog (with tech stack and sections)
// @access  Private (Teacher, Super Admin)
router.post('/', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const { title, description, category, prerequisites, sections, stack } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ data: null, error: 'Title, description, and category are required' });
    }

    const course = await Course.create({
      title,
      description,
      category,
      prerequisites: prerequisites || [],
      sections: sections || [],
      stack: stack || [],
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE',
      entity: 'Course',
      entityId: course._id.toString(),
      details: `Added course: "${title}" to the catalog`,
    });

    res.status(201).json({ data: course, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course from catalog
// @access  Private (Teacher, Super Admin)
router.delete('/:id', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ data: null, error: 'Course not found' });
    }

    await Course.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE',
      entity: 'Course',
      entityId: req.params.id,
      details: `Deleted course: "${course.title}" from catalog`,
    });

    res.json({ data: { message: 'Course deleted successfully' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/courses/:id/sections
// @desc    Add a syllabus section to a course
// @access  Private (Teacher, Super Admin)
router.post('/:id/sections', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const { sectionName } = req.body;
    if (!sectionName) {
      return res.status(400).json({ data: null, error: 'Section name is required' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ data: null, error: 'Course not found' });
    }

    course.sections.push(sectionName);
    await course.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Course',
      entityId: course._id.toString(),
      details: `Added section "${sectionName}" to course: ${course.title}`,
    });

    res.json({ data: course, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/courses/:id/sections
// @desc    Remove a syllabus section from a course
// @access  Private (Teacher, Super Admin)
router.delete('/:id/sections', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const { sectionName } = req.body;
    if (!sectionName) {
      return res.status(400).json({ data: null, error: 'Section name is required' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ data: null, error: 'Course not found' });
    }

    course.sections = course.sections.filter(s => s !== sectionName);
    await course.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Course',
      entityId: course._id.toString(),
      details: `Removed section "${sectionName}" from course: ${course.title}`,
    });

    res.json({ data: course, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
