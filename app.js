import express from "express";
import session from "express-session";
import flash from "connect-flash";
import cookieParser from "cookie-parser";
import ejsLayouts from "express-ejs-layouts";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Routes
import authRoutes from "./routes/auth.js";
import workoutRoutes from "./routes/workout.js";
import historyRoutes from "./routes/history.js";
import exerciseRoutes from "./routes/exercise.js";
import profileRoutes from "./routes/profile.js";

// Middleware
import { isAuthenticated } from "./middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));
app.use(ejsLayouts);
app.set("layout", "layouts/main");

// Middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "workout-app-secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());

// Global middleware for template variables
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/workout");
  } else {
    res.redirect("/login");
  }
});

app.use("/", authRoutes);
app.use("/workout", isAuthenticated, workoutRoutes);
app.use("/history", isAuthenticated, historyRoutes);
app.use("/exercise", isAuthenticated, exerciseRoutes);
app.use("/profile", isAuthenticated, profileRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
