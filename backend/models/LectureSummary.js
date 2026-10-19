const mongoose = require('mongoose');

const lectureSummarySchema = new mongoose.Schema(
  {
    live_session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveSession',
      required: true,
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    summary_text: {
      type: String,
      required: true,
    },
    key_points: {
      type: [String],
      default: [],
    },
    generated_at: {
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

module.exports = mongoose.model('LectureSummary', lectureSummarySchema);
