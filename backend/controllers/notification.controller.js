import Notification from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ to: userId }).populate({
    path: "from",
    select: "username profileImg",
  });

  await Notification.updateMany({ to: userId }, { read: true });

  res.status(200).json(new ApiResponse(200, notifications));
});

export const deleteNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  await Notification.deleteMany({ to: userId });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Notifications deleted successfully"));
});
