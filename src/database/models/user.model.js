
import mongoose from "mongoose";
import { gender } from "../../common/enums/index.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      minlength: [3, "First name must be at least 3 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      minlength: [3, "Last name must be at least 3 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },

    gender: {
      type: Number,
      required: true,
      enum: Object.values(gender),
      default : gender.Male
    },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

userSchema.virtual("userName").set(function(value){
    let [firstName,LastNamed] = value.split(" ")
    this.firstName = firstName,
    this.lastName = this.lastName
}).get(function(){
    return `${this.firstName} ${this.lastName} `
})



const User = mongoose.model("User", userSchema);

export default User;
