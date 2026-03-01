const cron = require("node-cron");
const Booking = require("../models/Booking");
const Room = require("../models/Room");

cron.schedule("0 0 * * *", async () => {
  const today = new Date();

  await Booking.updateMany(
    { checkOutDate: { $lt: today }, status: "confirmed" },
    { status: "completed" }
  );

  const rooms = await Room.find();

  for (const room of rooms) {
    const active = await Booking.findOne({
      room: room._id,
      checkInDate: { $lte: today },
      checkOutDate: { $gt: today },
      status: "confirmed",
    });

    room.status = active ? "booked" : "available";
    await room.save();
  }
});