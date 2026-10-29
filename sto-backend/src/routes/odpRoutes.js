const express = require('express');
const router = express.Router();
const {
  getAllOdp,
  createOdp,
  updateOdp,
  deleteOdp,
  patchPortOdp
} = require('../controllers/odpController');

router.get('/', getAllOdp);
router.post('/', createOdp);
router.put('/:id', updateOdp);
router.delete('/:id', deleteOdp);
router.patch('/:id/port', patchPortOdp);

module.exports = router;
