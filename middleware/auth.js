module.exports.isAuthenticated = (req, res, next) => {
  // 사용자가 로그인되어 있는지 확인
  if (req.session.user) {
    return next(); // 인증된 경우 다음 미들웨어로 이동
  }
  res.redirect('/login'); // 인증되지 않은 경우 로그인 페이지로 리디렉션
};
