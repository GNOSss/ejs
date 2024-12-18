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
    return res.redirect('/workouts'); // 회원가입 페이지로 리다이렉트
  }
  next();
};

router.route('/:workout_id').delete([jwtMiddleware, validate], (req, res) => {
  const workout_id = parseInt(req.params.workout_id, 10);

  if (isNaN(workout_id)) {
    req.flash('error', 'workout_id가 유효하지 않습니다.');
    return res.redirect('/workouts/index');
  }

  const userId = req.user_id;

  const sql = `DELETE FROM Workout WHERE workout_id =? AND user_id =?`;

  conn.query(sql, [workout_id, userId], (err, results) => {
    if (err) {
      console.log(err);
      req.flash('error', '데이터베이스 오류가 발생했습니다.');
      return res.redirect('/workouts/index');
    }

    if (results.affectedRows > 0) {
      req.flash('message', '운동이 성공적으로 삭제되었습니다.');
      return res.redirect('/workouts/index');
    } else {
      req.flash('error', '데이터 삭제 실패했습니다.');
      return res.redirect('/workouts/index');
    }
  });
});

router.route('/create').post([jwtMiddleware, validate], (req, res) => {
  const { workout_name, region, requipment, description } = req.body;

  if (!workout_name) {
    req.flash('error', 'workout_name이 유효하지 않습니다.');
    return res.redirect('/workouts/create');
  }

  const user_id = req.user_id;

  const sql = `INSERT INTO Workout (user_id, workout_name, region, requipment, description)
  VALUES(?,?,?,?,?)`;

  conn.query(sql, [user_id, workout_name, region, requipment, description], function (err, results) {
    if (err) {
      console.log(err);
      req.flash('error', '데이터베이스 오류가 발생했습니다.');
      return res.redirect('/workouts/index');
    }

    if (results.affectedRows > 0) {
      req.flash('message', '성공적으로 운동이 추가되었습니다.');
      return res.redirect('/workouts/index');
    } else {
      req.flash('error', '데이터 추가 실패했습니다.');
      return res.redirect('/workouts/index');
    }
  });
});

router.route('/').get([jwtMiddleware], (req, res) => {
  const user_id = req.user_id;

  const sql = `SELECT * FROM Workout WHERE user_id = ?`;

  conn.query(sql, [user_id], (err, results) => {
    if (err) {
      console.log(err);
      req.flash('error', '데이터베이스 오류가 발생했습니다.');
      return res.redirect('/error');
    }

    res.render('workouts/index', {
      title: '운동 리스트',
      workouts: results,
      message: req.flash('message'),
      error: req.flash('error'),
    });
  });
});

module.exports = router;
