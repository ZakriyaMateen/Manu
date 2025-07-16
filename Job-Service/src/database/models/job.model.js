import mongoose, { mongo } from 'mongoose';
import bcrypt from 'bcrypt';

const jobSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    qualifications: {
        type: String,
        required: true
    },
    salary: {
        type: Number,
        required: true
    },
    tags: {
        type: [String],
        default: []
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Company'
    }
}, {
    timestamps: true,
});


export default mongoose.model('Job', jobSchema);
