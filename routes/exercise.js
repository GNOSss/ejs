import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.render('exercise/index', {
    title: 'Exercise'
  });
});

export default router;