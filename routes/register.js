const express = require('express');
const router = express.Router();
const conn = require('../db');
const { body, param, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

router.use(express.json());
router.use(cors());

// 유효성 검사 결과 처리 미들웨어
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 에러가 있는 경우 플래시 메시지와 함께 로그인 페이지 렌더링
    req.flash('error', errors.array()[0].msg); // 첫 번째 에러 메시지 플래시에 저장
    return res.redirect('/register'); // 회원가입 페이지로 리다이렉트
  }
  next();
};

router
  .route('/')
  .get((req, res) => {
    // 회원가입 페이지 렌더링
    res.render('auth/register', {
      title: 'Register',
      message: null,
      error: null,
    });
  })
  .post(
    [
      body('user_id').notEmpty().isString().withMessage('아이디 입력 필요'),
      body('pw').notEmpty().isString().withMessage('비밀번호 입력 필요'),
      body('name').notEmpty().isString().withMessage('이름 입력 필요'),
      body('email').notEmpty().isString().withMessage('이메일 입력 필요'),
      validate,
    ],
    async (req, res) => {
      const { user_id, pw, name, email } = req.body;
      try {
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(pw, 10);

        // 데이터베이스에 사용자 정보 저장
        const sql = 'INSERT INTO User (user_id, pw, name, email) VALUES (?, ?, ?, ?)';
        const values = [user_id, hashedPassword, name, email];

        conn.query(sql, values, (err, results) => {
          if (err) {
            console.error(err);
            return res.render('auth/register', {
              title: 'Register',
              message: null,
              error: '회원가입 중 오류가 발생했습니다.',
            });
          }

          // 회원가입 성공 후 메시지를 플래시에 저장하고 로그인 페이지로 리다이렉트
          req.flash('message', '회원가입이 성공적으로 완료되었습니다!');
          res.redirect('/login');
        });
      } catch (err) {
        console.error(err);
        res.render('auth/register', {
          title: 'Register',
          message: null,
          error: '회원가입 처리 중 오류가 발생했습니다.',
        });
      }
    }
  );

module.exports = router;
