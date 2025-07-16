import mongoose from 'mongoose';

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://mongo:27017/Gateway', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
};

export default connectDB;
