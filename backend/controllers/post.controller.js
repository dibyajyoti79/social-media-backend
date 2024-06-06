import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinaryDestroy, cloudinaryUpload } from "../utils/cloudinary.js";

export const createPost = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  let { img } = req.body;
  const userId = req.user._id.toString();

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (!text && !img) {
    throw new ApiError(404, "Post must have text or image");
  }

  if (img) {
    const uploadedResponse = await cloudinaryUpload(img);
    img = uploadedResponse.secure_url;
  }

  const newPost = new Post({
    user: userId,
    text,
    img,
  });

  await newPost.save();
  res.status(201).json(new ApiResponse(201, newPost, "Post Created"));
});

export const deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.user.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to delete this post");
  }

  if (post.img) {
    const imgId = post.img.split("/").pop().split(".")[0];
    await cloudinaryDestroy(imgId);
  }

  await Post.findByIdAndDelete(req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Post deleted successfully"));
});

export const commentOnPost = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  const postId = req.params.id;
  const userId = req.user._id;

  if (!text) {
    throw new ApiError(400, "Text field is required");
  }
  const post = await Post.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = { user: userId, text };

  post.comments.push(comment);
  await post.save();

  res.status(200).json(new ApiResponse(200, post, "Comment Added"));
});

export const likeUnlikePost = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { id: postId } = req.params;

  const post = await Post.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const userLikedPost = post.likes.includes(userId);

  if (userLikedPost) {
    // Unlike post
    await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
    await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

    const updatedLikes = post.likes.filter(
      (id) => id.toString() !== userId.toString()
    );
    res.status(200).json(new ApiResponse(200, updatedLikes));
  } else {
    // Like post
    post.likes.push(userId);
    await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
    await post.save();

    const notification = new Notification({
      from: userId,
      to: post.user,
      type: "like",
    });
    await notification.save();

    const updatedLikes = post.likes;
    res.status(200).json(new ApiResponse(200, updatedLikes));
  }
});

export const getAllPosts = asyncHandler(async (req, res, next) => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate({
      path: "user",
      select: "-password",
    })
    .populate({
      path: "comments.user",
      select: "-password",
    });

  if (posts.length === 0) {
    return res.status(200).json(new ApiResponse(200, []));
  }

  res.status(200).json(new ApiResponse(200, posts));
});

export const getLikedPosts = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId);

  if (!user) throw new ApiError(404, "User not found");

  const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
    .populate({
      path: "user",
      select: "-password",
    })
    .populate({
      path: "comments.user",
      select: "-password",
    });

  res.status(200).json(new ApiResponse(200, likedPosts));
});

export const getFollowingPosts = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const following = user.following;

  const feedPosts = await Post.find({ user: { $in: following } })
    .sort({ createdAt: -1 })
    .populate({
      path: "user",
      select: "-password",
    })
    .populate({
      path: "comments.user",
      select: "-password",
    });

  res.status(200).json(new ApiResponse(200, feedPosts));
});

export const getUserPosts = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  const user = await User.findOne({ username });
  if (!user) throw new ApiError(404, "User not found");

  const posts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "user",
      select: "-password",
    })
    .populate({
      path: "comments.user",
      select: "-password",
    });
  res.status(200).json(new ApiResponse(200, posts));
});
