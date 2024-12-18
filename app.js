const express = require('express');
const app = express();
require('dotenv').config();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const session = require('express-session'); // Express에서 세션 관리를 위한 미들웨어
const flash = require('connect-flash'); // 임시 메시지 저장(일회성 메시지) 기능 제공
const ejsLayouts = require('express-ejs-layouts'); // EJS 레이아웃 지원을 위한 미들웨어
// const { fileURLToPath } = require('url'); // URL 객체를 파일 경로로 변환하는 유틸리티
const { join } = require('path'); // 파일 경로 처리를 위한 유틸리티 (dirname: 디렉토리명, join: 경로 결합)

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

// Routes
const loginRouter = require('./routes/login.js');
const registerRouter = require('./routes/register.js');
const logoutRouter = require('./routes/logout.js');
const setrecordsRouter = require('./routes/set-records.js');
const userpagesRouter = require('./routes/user-pages.js');
const workoutRouter = require('./routes/workouts.js');
const templesRouter = require('./routes/temples.js');

// const __filename = fileURLToPath(import.meta.url); // 현재 파일의 절대 경로를 설정
// const __dirname = dirname(__filename); // 현재 파일이 위치한 디렉토리 절대 경로를 설정

// View engine setup
app.set('view engine', 'ejs'); // 템플릿 엔진으로 ejs 설정 -> .ejs확장자 파일 접근 및 렌더링 가능
app.set('views', join(__dirname, 'views')); // 템플릿 파일을 찾을 디렉토리 설정 -> /views 폴더 접근
app.use(ejsLayouts); // ejs템플릿 엔진에 레이아웃을 지원해주는 미들웨어 -> 여러 템플릿 파일에 공통 레이아웃 사용 가능
app.set('layout', 'layouts/main'); // /views/layouts/main 파일을 공통 레이아웃으로 선언

// Middleware
app.use(express.static('public')); // public폴더의 static 파일들 클라이언트로 서빙
app.use(express.urlencoded({ extended: true })); // 요청 본문(body) 파싱 후 req.body객체로 변환
app.use(cookieParser()); // http 요청에 포함된 쿠키 파싱 후 req.cookies 변환
app.use(
  // 사용자 세션 관리 (비사용시 제거)
  session({
    secret: 'workout-app-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash()); // 성공/오류 메시지 저장 및 전달

//JWT 검증 미들웨어
app.use((req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
      res.locals.user = decoded; // 사용자 정보를 EJS 템플릿으로 전달
    } catch (err) {
      console.error('Invalid token:', err);
      res.locals.user = null; // 토큰이 유효하지 않으면 사용자 정보를 null로 설정
    }
  } else {
    res.locals.user = null; // 토큰이 없으면 사용자 정보를 null로 설정
  }

  res.locals.currentPath = req.path;
  next();
});

// Middleware
const { isAuthenticated } = require('./middleware/auth'); // 로그인 인증 미들웨어

// 메인페이지에서 토큰 검증 후 redirection
app.get('/', (req, res) => {
  const { token } = req.cookies;
  if (token) {
    try {
      res.redirect('/workout'); // JWT가 유효하면 '/workout'으로 리다이렉트
    } catch (err) {
      res.redirect('/login'); // JWT가 유효하지 않으면 '/login'으로 리다이렉트
    }
  } else {
    res.redirect('/login'); // 토큰이 없으면 '/login'으로 리다이렉트
  }
});

app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/logout', logoutRouter);
app.use('/set-records', setrecordsRouter);
app.use('/user-pages', userpagesRouter);
app.use('/workouts', workoutRouter);
app.use('/templates', templesRouter);
