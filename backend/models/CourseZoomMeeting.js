const mongoose = require('mongoose');

const courseZoomMeetingSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      unique: true,
      index: true,
    },
    zoom_meeting_id: {
      type: String,
      required: true,
    },
    join_url: {
      type: String,
      required: true,
    },
    start_url: {
      type: String,
      default: null,
    },
    passcode: {
      type: String,
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('CourseZoomMeeting', courseZoomMeetingSchema);
