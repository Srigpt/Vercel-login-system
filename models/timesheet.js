const mongoose = require("mongoose");

const timesheetSchema = new mongoose.Schema({
  week: String,
  timesheetData: [
    {
      activity: String,
      hours: [Number],
    },
  ],
});

module.exports = mongoose.model("Timesheet", timesheetSchema);
