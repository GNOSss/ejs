const express = require('express');
const router = express.Router();
const conn = require('../db');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
router.use(express.json());

var jwt = require('jsonwebtoken');

// 유효성 검사 결과 처리 미들웨어
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 에러가 있는 경우 플래시 메시지와 함께 로그인 페이지 렌더링
    req.flash('error', errors.array()[0].msg); // 첫 번째 에러 메시지 플래시에 저장
    return res.redirect('/login'); // 로그인 페이지로 리다이렉트
  }
  next();
};

router
  .route('/')
  .get((req, res) => {
    res.render('auth/login', {
      title: 'Login',
      message: req.flash('message'),
      error: req.flash('error'),
    });
  })
  .post(
    [
      body('user_id').notEmpty().isString().withMessage('문자열 입력 필요'),
      body('pw').notEmpty().isString().withMessage('문자열 입력 필요'),
      validate,
    ],
    async (req, res, next) => {
      const { user_id, pw } = req.body;
      let sql = 'SELECT user_id, pw, name, email FROM User WHERE user_id = ?';
      let values = user_id;

      conn.query(sql, values, async function (err, results) {
        if (err) {
          console.log(err);
          req.flash('error', '데이터베이스 오류가 발생했습니다.');
          return res.redirect('/login');
        }

        var loginUser = results[0];
        if (!loginUser) {
          // id를 가진 유저가 없으면
          req.flash('error', '아이디 또는 비밀번호가 잘못되었습니다.');
          return res.redirect('/login');
        }

        const isPasswordValid = await bcrypt.compare(pw, loginUser.pw);
        if (isPasswordValid) {
          // id와 비밀번호 모두 일치
          const token = jwt.sign(
            {
              user_id: loginUser.user_id,
              email: loginUser.email,
              name: loginUser.name,
            },
            process.env.PRIVATE_KEY,
            {
              expiresIn: '1h', // 1시간 뒤 만료
              issuer: 'healthroot',
            }
          );

          res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 쿠키 유효 시간 7일
          });

          // 로그인 성공 시 플래시 메시지 설정 및 템플릿으로 리다이렉트
          req.flash('message', `${loginUser.name}님, 환영합니다!`);
          res.redirect('/templates');
        } else {
          // 비밀번호가 일치하지 않을 경우
          req.flash('error', '아이디 또는 비밀번호가 잘못되었습니다.');
          res.redirect('/login');
        }
      });
    }
  );

module.exports = router;
