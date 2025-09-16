const express = require('express');
const { extractMLData } = require('../controllers/mlController');

const router = express.Router();

// POST /ml/extract - Extract ML data from document
router.post('/extract', extractMLData);

module.exports = router;