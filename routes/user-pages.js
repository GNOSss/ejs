const express = require('express');
const router = express.Router();
router.use(express.json());
const conn = require('../db');
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

// 유효성 검사 결과 처리 미들웨어
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 에러가 있는 경우 플래시 메시지와 함께 로그인 페이지 렌더링
    req.flash('error', errors.array()[0].msg); // 첫 번째 에러 메시지 플래시에 저장
    return res.redirect('/user-pages');
  }
  next();
};

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

router.get('/records', [jwtMiddleware, validate], (req, res) => {
  const userId = req.user_id;

  const query = `
    SELECT 
    DATE_FORMAT(SetRecord_created_at - INTERVAL (DAYOFWEEK(SetRecord_created_at) - 2) DAY, '%Y-%m-%d') AS week_start,
    DATE_FORMAT(SetRecord_created_at - INTERVAL (DAYOFWEEK(SetRecord_created_at) - 2) DAY + INTERVAL 6 DAY, '%Y-%m-%d') AS week_end,
    COUNT(DISTINCT sr.routine_id) AS workout_count
  FROM 
    SetRecord sr
  JOIN 
    Routine rt ON sr.routine_id = rt.routine_id
  JOIN 
    UserAndTemplate ut ON rt.template_id = ut.template_id
  WHERE 
    ut.user_id = ?
    AND sr.SetRecord_created_at >= CURDATE() - INTERVAL 42 DAY
  GROUP BY 
    week_start, week_end
  ORDER BY 
    week_start DESC
  LIMIT 6;
  `;

  conn.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      req.flash('error', '데이터베이스 오류가 발생했습니다.');
      return res.redirect('/error');
    }

    if (results && results.length) {
      const formattedResults = {
        user_id: userId,
        weekly_workout_counts: results.map((result) => ({
          week_start: result.week_start,
          week_end: result.week_end,
          workout_count: parseInt(result.workout_count, 10),
        })),
      };
    }

    res.render('user-pages/index', {
      title: '주간 운동 기록',
      user_id: userId,
      weekly_workout_counts: results.map((result) => ({
        week_start: result.week_start,
        week_end: result.week_end,
        workout_count: parseInt(result.workout_count, 10),
      })),
    });
  });
});

router.post(
  '/physical-info',
  [
    jwtMiddleware,
    body('height').notEmpty().isFloat({ min: 0 }).withMessage('height는 0 이상의 숫자여야 합니다.'),
    body('weight').notEmpty().isFloat({ min: 0 }).withMessage('weight는 0 이상의 숫자여야 합니다.'),
    body('birth').notEmpty().isISO8601().withMessage('birth는 올바른 날짜 형식이어야 합니다.'),
    validate,
  ],
  (req, res) => {
    const { height, weight, birth } = req.body;
    const user_id = req.user_id;

    if (!height || !weight || !birth) {
      req.flash('error', 'height, weight, birth가 유효하지 않습니다.');
      return res.redirect('/user-pages/physical-info');
    }

    const sql = `
    INSERT INTO UserPhysical (user_id, height, weight, birth, userphysical_created_at)
    VALUES (?, ?, ?, ?, CURDATE())
    ON DUPLICATE KEY UPDATE
      height = VALUES(height),
      weight = VALUES(weight),
      birth = VALUES(birth),
      userphysical_created_at = CURDATE();
    `;

    conn.query(sql, [user_id, height, weight, birth], function (err, results) {
      if (err) {
        console.error(err);
        req.flash('error', '데이터베이스 오류가 발생했습니다.');
        return res.redirect('/user-pages/physical-info');
      }

      if (results && results.affectedRows > 0) {
        req.flash('message', '신체 정보가 성공적으로 저장되었습니다.');
        return res.redirect('/user-pages/records');
      } else {
        req.flash('error', '데이터 추가 실패.');
        return res.redirect('/user-pages/physical-info');
      }
    });
  }
);

module.exports = router;
