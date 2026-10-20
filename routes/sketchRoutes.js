const express = require('express');
const router = express.Router();
const sketchController = require('../controllers/sketchController');

router.get('/', sketchController.getAllSketches);
router.get('/:id', sketchController.getSketchById);
router.post('/', sketchController.createSketch);
router.put('/:id', sketchController.updateSketch);
router.delete('/:id', sketchController.deleteSketch);

module.exports = router;