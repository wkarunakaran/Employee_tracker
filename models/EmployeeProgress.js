import mongoose from "mongoose";

const employeeProgressSchema = new mongoose.Schema(
  {
    // 👩‍💻 Intern Basic Details
    internName: {
      type: String,
      required: true,
      trim: true,
    },
    internEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    internId: {
      type: String,
      required: true,
      trim: true,
    },

    // 🎯 Internship Domain
    internDomain: {
      type: String,
      required: true,
      enum: [
        "Full Stack",
        "Frontend",
        "Backend",
        "AIML",
        "Database Management",
        "Cloud Technologies",
        "Cyber Security",
        "Data Engineering",
        "Data Visualization",
        "Testing",
        "Others",
      ],
    },

    // 📅 Date of Submission
    date: {
      type: Date,
      default: Date.now,
    },

    // 👨‍🏫 Tech Lead Information
    techLeadName: {
      type: String,
      required: true,
      enum: [
        "Balamanikandan",
        "Karunamoorthy S",
        "Dharshini",
        "Dhanush Chakravarthy",
        "Gowtham",
        "Dowlath Nisha",
        "KarunaKaran",
        "Sachin",
        "Martin",
      ],
    },

    // 🧩 Task and Work Details
    assignedTask: {
      type: String,
      required: true,
      trim: true,
    },
    workStatus: {
      type: String,
      required: true,
      enum: ["Completed", "In Progress", "Pending", "Blocked", "On Hold"],
    },
    learnedToday: {
      type: String,
      trim: true,
    },
    workDescription: {
      type: String,
      trim: true,
    },
    challengesFaced: {
      type: String,
      trim: true,
    },
    supportRequired: {
      type: String,
      trim: true,
    },

    // 📎 File Uploads
    fileAttachments: [
      {
        originalName: String,
        fileName: String,
        filePath: String,
        fileSize: Number,
        mimeType: String,
      },
    ],

    // 🕓 Submission Metadata
    submissionTimestamp: {
      type: Date,
      default: Date.now,
    },
    formSubmissionTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ⚡ Indexes for faster querying
employeeProgressSchema.index({ internEmail: 1 });
employeeProgressSchema.index({ internDomain: 1 });
employeeProgressSchema.index({ techLeadName: 1 });
employeeProgressSchema.index({ date: -1 });

// ✅ Export Model
export default mongoose.model("EmployeeProgress", employeeProgressSchema);
