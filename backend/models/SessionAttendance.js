const mongoose = require('mongoose');

const sessionAttendanceSchema = new mongoose.Schema(
  {
    live_session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveSession',
      required: true,
      index: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    participant_name: {
      type: String,
      required: true,
      trim: true,
    },
    user_email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    join_time: {
      type: Date,
      default: null,
    },
    leave_time: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0, // duration in minutes
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE'],
      default: 'PRESENT',
      index: true,
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

sessionAttendanceSchema.index({ live_session_id: 1, user_email: 1 });

module.exports = mongoose.model('SessionAttendance', sessionAttendanceSchema);
