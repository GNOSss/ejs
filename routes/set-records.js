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

router.get('/', [jwtMiddleware, validate], (req, res) => {
  const userId = req.user_id;

  let sql = `
  WITH HighSet AS (
    SELECT
      sr.routine_id,
      sr.workout_id,
      sr.weight AS high_set_weight,
      sr.reps AS high_set_reps
    FROM SetRecord sr
    JOIN (
      SELECT
        routine_id,
        workout_id,
        MAX(weight * reps) AS max_weight_reps
      FROM SetRecord
      GROUP BY routine_id, workout_id
    ) max_set ON sr.routine_id = max_set.routine_id
              AND sr.workout_id = max_set.workout_id
              AND sr.weight * sr.reps = max_set.max_weight_reps
  ),
  SetCounts AS (
    SELECT
      sr.routine_id,
      sr.workout_id,
      COUNT(sr.set_id) AS set_count
    FROM SetRecord sr
    GROUP BY sr.routine_id, sr.workout_id
  )
  SELECT
    rt.routine_name,
    DATE(sr.SetRecord_created_at) AS date,
    DAYNAME(sr.SetRecord_created_at) AS day,
    SUM(sr.weight * sr.reps) AS total_weight,
    w.workout_id,
    w.workout_name,
    MAX(sc.set_count) AS set_count,
    MAX(hs.high_set_weight) AS high_set_weight,
    MAX(hs.high_set_reps) AS high_set_reps
  FROM
    SetRecord sr
  JOIN Routine rt ON sr.routine_id = rt.routine_id
  JOIN Workout w ON sr.workout_id = w.workout_id
  JOIN UserAndTemplate ut ON ut.template_id = rt.template_id
  LEFT JOIN HighSet hs ON sr.routine_id = hs.routine_id AND sr.workout_id = hs.workout_id
  LEFT JOIN SetCounts sc ON sr.routine_id = sc.routine_id AND sr.workout_id = sc.workout_id
  WHERE
    ut.user_id = ?
  GROUP BY
    rt.routine_name, DATE(sr.SetRecord_created_at), DAYNAME(sr.SetRecord_created_at), w.workout_id
  ORDER BY
    rt.routine_name, date;
`;

  conn.query(sql, [userId], function (err, results) {
    if (err) {
      console.log(err);
      req.flash('error', '데이터베이스 오류가 발생했습니다.');
      return res.redirect('/error');
    }

    if (results && results.length) {
      const set_records = results.reduce((acc, curr) => {
        const { routine_name, date, day, total_weight, workout_id, workout_name, set_count, high_set_weight, high_set_reps } = curr;

        let routine = acc.find((r) => r.routine_name === routine_name && r.date === date);
        if (!routine) {
          routine = {
            routine_name,
            date,
            day,
            total_weight: total_weight.toString(),
            workout: [],
          };
          acc.push(routine);
        }

        if (!routine.workout.some((w) => w.workout_id === workout_id.toString())) {
          routine.workout.push({
            workout_id: workout_id.toString(),
            workout_name,
            set_count: set_count.toString(),
            high_set: [high_set_weight, high_set_reps],
          });
        }

        return acc;
      }, []);

      return res.render('set-records/index', {
        title: '운동 기록',
        set_records,
        message: req.flash('message'),
        error: req.flash('error'),
      });
    } else {
      req.flash('error', '값을 가져올 수 없습니다.');
      res.redirect('/records');
    }
  });
});

router.get('/:routine_id', [jwtMiddleware, validate], (req, res) => {
  const routine_id = parseInt(req.params.routine_id, 10);
  if (isNaN(routine_id)) {
    req.flash('error', 'routine_id가 유효하지 않습니다.');
    return res.redirect('/records');
  }

  const userId = req.user_id;

  const sql = `
  SELECT
    rt.routine_id,
    rt.routine_name,
    DATE(sr.SetRecord_created_at) AS date,
    DAYNAME(sr.SetRecord_created_at) AS day,
    SUM(sr.weight * sr.reps) AS total_weight,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'workout_id', w.workout_id,
            'workout_name', w.workout_name,
            'reps', sr.reps,
            'weight', sr.weight
        )
    ) AS workout
  FROM
    SetRecord sr
  JOIN
    Routine rt ON sr.routine_id = rt.routine_id
  JOIN
    Workout w ON sr.workout_id = w.workout_id
  JOIN
    UserAndTemplate ut ON rt.template_id = ut.template_id
  WHERE
    sr.routine_id = ? AND ut.user_id = ?
  GROUP BY
    rt.routine_id, rt.routine_name, DATE(sr.SetRecord_created_at), DAYNAME(sr.SetRecord_created_at);
  `;

  conn.query(sql, [routine_id, userId], (err, results) => {
    if (err) {
      console.log(err);
      req.flash('error', '데이터베이스 오류가 발생했습니다.');
      return res.redirect('/error');
    }

    if (results && results.length) {
      const set_records = results.map((result) => {
        const { routine_id, routine_name, date, day, total_weight, workout } = result;

        // workout이 문자열인지 확인 후 처리
        let parsedWorkout = workout;
        if (typeof workout === 'string') {
          try {
            parsedWorkout = JSON.parse(workout); // 문자열인 경우만 파싱
          } catch (err) {
            console.error('JSON 파싱 오류:', err);
            parsedWorkout = []; // 파싱 실패 시 빈 배열로 처리
          }
        }

        return {
          routine_id,
          routine_name,
          date,
          day,
          total_weight,
          workout: parsedWorkout, // 파싱된 데이터를 사용
        };
      });

      return res.render('set-records/detail', {
        title: '운동 루틴 상세 기록',
        set_records,
        message: req.flash('message'),
        error: req.flash('error'),
      });
    } else {
      req.flash('error', '값을 가져올 수 없습니다.');
      res.redirect('/records');
    }
  });
});

module.exports = router;
