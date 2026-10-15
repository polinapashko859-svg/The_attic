const express = require('express');
const router = express.Router();
const sketchController = require('../controllers/sketchController');
const { authMiddleware } = require('../middleware/auth'); 

router.get('/', sketchController.getAllSketches);
router.get('/:id', sketchController.getSketchById);

router.post('/', authMiddleware, sketchController.createSketch);
router.put('/:id', authMiddleware, sketchController.updateSketch);
router.delete('/:id', authMiddleware, sketchController.deleteSketch);

module.exports = router;