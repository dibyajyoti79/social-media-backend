import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import { cloudinaryDestroy, cloudinaryUpload } from "../utils/cloudinary.js";

export const getUserProfile = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const user = await User.findOne({ username }).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.status(200).json(new ApiResponse(200, user));
});

export const followUnfollowUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userToModify = await User.findById(id);
  const currentUser = await User.findById(req.user._id);
  if (id === req.user._id.toString()) {
    throw new ApiError(400, "You can't follow/unfollow yourself");
  }
  if (!userToModify || !currentUser) {
    throw new ApiError(404, "User not found");
  }

  const isFollowing = currentUser.following.includes(id);
  if (isFollowing) {
    // unfollow the user
    await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
    // TODO return the id of the user as a response

    res
      .status(200)
      .json(new ApiResponse(200, null, "User unfollowed successfully"));
  } else {
    // follow the user
    await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

    // send notification to the user
    const newNotification = new Notification({
      type: "follow",
      from: req.user._id,
      to: userToModify._id,
    });
    await newNotification.save();

    // TODO return the id of the user as a response
    res
      .status(200)
      .json(new ApiResponse(200, null, "User followed successfully"));
  }
});

export const getSuggestedUsers = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const usersFollowedByMe = await User.findById(userId).select("following");
  const users = await User.aggregate([
    {
      $match: {
        _id: { $ne: userId },
      },
    },
    { $sample: { size: 10 } },
  ]);

  const filteredUsers = users.filter(
    (user) => !usersFollowedByMe.following.includes(user._id)
  );
  const suggestedUsers = filteredUsers.slice(0, 4);

  suggestedUsers.forEach((user) => (user.password = null));
  res.status(200).json(new ApiResponse(200, suggestedUsers, "Suggested users"));
});

export const updateUserProfile = asyncHandler(async (req, res, next) => {
  const { fullName, email, username, currentPassword, newPassword, bio, link } =
    req.body;
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  let user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
    throw new ApiError(
      404,
      "Please provide both current password and new password"
    );
  }

  if (currentPassword && newPassword) {
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new ApiError(400, "Current password is incorrect");
    if (newPassword.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters long");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
  }

  if (profileImg) {
    if (user.profileImg) {
      // https://res.cloudinary.com/dyfqon1v6/image/upload/v1712997552/zmxorcxexpdbh8r0bkjb.png
      const publicId = user.profileImg.split("/").pop().split(".")[0];
      await cloudinaryDestroy(publicId);
    }

    const uploadedResponse = await cloudinaryUpload(profileImg);
    console.log("uploadedResponse", uploadedResponse);
    profileImg = uploadedResponse.secure_url;
  }

  if (coverImg) {
    if (user.coverImg) {
      const publicId = user.coverImg.split("/").pop().split(".")[0];
      await cloudinaryDestroy(publicId);
    }

    const uploadedResponse = await cloudinaryUpload(coverImg);
    coverImg = uploadedResponse.secure_url;
  }

  user.fullName = fullName || user.fullName;
  user.email = email || user.email;
  user.username = username || user.username;
  user.bio = bio || user.bio;
  user.link = link || user.link;
  user.profileImg = profileImg || user.profileImg;
  user.coverImg = coverImg || user.coverImg;

  user = await user.save();

  // password should be null in response
  user.password = null;

  return res.status(200).json(new ApiResponse(200, user, "Profile Updated"));
});
