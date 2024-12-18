const express = require('express');
const router = express.Router();
const cors = require('cors');

router.use(express.json());
router.use(cors());

router.route('/').get((req, res) => {
  try {
    res.clearCookie('token'); // JWT 토큰 삭제
    res.render('auth/logout', {
      title: 'Logout',
      message: '로그아웃이 성공적으로 완료되었습니다.',
    });
  } catch (err) {
    console.log(err);
    res.render('auth/logout', {
      title: 'Logout',
      message: '로그아웃 중 에러가 발생했습니다.',
    });
  }
});

module.exports = router;
