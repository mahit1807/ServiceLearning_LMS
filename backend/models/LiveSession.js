const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
    },
    scheduled_time: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      default: 60,
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    zoom_meeting_id: {
      type: String,
      default: null,
    },
    join_url: {
      type: String,
      default: null,
    },
    start_url: {
      type: String,
      default: null,
    },
    recording_url: {
      type: String,
      default: null,
    },
    recording_play_url: {
      type: String,
      default: null,
    },
    recording_duration: {
      type: Number,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

liveSessionSchema.index({ course_id: 1, scheduled_time: 1 });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
