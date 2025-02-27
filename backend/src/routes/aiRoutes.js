const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

router.post('/analyze', aiController.analyze.bind(aiController));

module.exports = router; 