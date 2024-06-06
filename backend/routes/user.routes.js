import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUserProfile,
  followUnfollowUser,
  getSuggestedUsers,
  updateUserProfile,
} from "../controllers/user.controller.js";
const router = Router();

router.route("/profile/:username").get(protectRoute, getUserProfile);
router.route("/suggested").get(protectRoute, getSuggestedUsers);
router.route("/follow/:id").post(protectRoute, followUnfollowUser);
router.route("/update").post(protectRoute, updateUserProfile);

export default router;
