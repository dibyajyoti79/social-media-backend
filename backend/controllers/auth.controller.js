import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

export const signup = asyncHandler(async (req, res, next) => {
  const { fullName, username, password, email } = req.body;
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new ApiError(400, "Username is already taken");
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new ApiError(400, "Email is already exist");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    fullName,
    username,
    email,
    password: hashedPassword,
  });
  if (newUser) {
    generateTokenAndSetCookie(newUser._id, res);
    await newUser.save();
    res.status(201).json(
      new ApiResponse(
        201,
        {
          _id: newUser._id,
          fullName: newUser.fullName,
          username: newUser.username,
          email: newUser.email,
          followers: newUser.followers,
          following: newUser.following,
          profileImg: newUser.profileImg,
          coverImg: newUser.coverImg,
        },
        "User created successfully"
      )
    );
  } else {
    throw new ApiError(400, "Invalid user data");
  }
});

export const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;
  if ([username, password].some((field) => !field || field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let user;
  if (emailRegex.test(username)) {
    user = await User.findOne({ email: username });
  } else {
    user = await User.findOne({ username });
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    user?.password || ""
  );

  if (!user || !isPasswordCorrect) {
    throw new ApiError(400, "Invalid username or password");
  }
  generateTokenAndSetCookie(user._id, res);
  res.status(200).json(
    new ApiResponse(200, {
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      followers: user.followers,
      following: user.following,
      profileImg: user.profileImg,
      coverImg: user.coverImg,
    })
  );
});

export const logout = asyncHandler(async (req, res, next) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("-password");
  res.status(200).json(new ApiResponse(200, user));
});
