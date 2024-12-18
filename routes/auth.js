import express from "express";
const router = express.Router();

router.get("/login", (req, res) => {
  res.render("auth/login", {
    title: "Login",
    message: req.flash("message"),
  });
});

router.post("/login", (req, res) => {
  // TODO: Implement actual authentication
  req.session.user = { email: req.body.email };
  res.redirect("/workout");
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

export default router;
