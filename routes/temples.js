const express = require('express');
const router = express.Router();
router.use(express.json());
const conn = require('../db');
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

const jwtMiddleware = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    req.flash('error', '유효하지 않은 토큰입니다.');
    return res.redirect('/login'); // 로그인 페이지로 리다이렉트
  }

  jwt.verify(token, process.env.PRIVATE_KEY, (err, decoded) => {
    if (err) {
      req.flash('error', '유효하지 않은 토큰입니다.');
      return res.redirect('/login');
    }

    req.user_id = decoded.user_id;
    res.locals.user = decoded; // EJS에서 사용 가능
    next();
  });
};

// 유효성 검사 결과 처리 미들웨어
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 에러가 있는 경우 플래시 메시지와 함께 로그인 페이지 렌더링
    req.flash('error', errors.array()[0].msg); // 첫 번째 에러 메시지 플래시에 저장
    return res.redirect('/temples'); // 회원가입 페이지로 리다이렉트
  }
  next();
};

router.get('/', (req, res) => {
  res.render('user-pages/index', {
    title: 'user-pages',
    message: req.flash('message'),
  });
});

module.exports = router;
