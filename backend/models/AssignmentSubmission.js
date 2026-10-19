const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submission_url: {
      type: String,
      default: null,
    },
    submission_text: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'late', 'graded'],
      default: 'submitted',
      index: true,
    },
    marks: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: null,
    },
    graded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    graded_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'submitted_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

assignmentSubmissionSchema.index({ assignment_id: 1, student_id: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
